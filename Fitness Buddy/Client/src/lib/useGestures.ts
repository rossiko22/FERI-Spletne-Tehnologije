// Real hand-gesture recognition via MediaPipe Tasks Vision (GestureRecognizer).
// OWNER: Marko. Runs on the camera stream from useCamera() and emits high-level
// gestures: static poses (thumbs up / open palm) from the model, plus left/right
// swipes derived from wrist motion. Static poses come from the single-frame
// classifier; swipes are detected by tracking the wrist landmark over time —
// the model itself cannot recognize a swipe because it has no temporal input.
//
// Robustness comes from three things on top of the raw landmarks:
//   1. Moving-average smoothing of the wrist x, so a single noisy frame doesn't
//      register as motion.
//   2. A monotonic check across the window — the hand must travel consistently
//      in one direction, which rejects jittery / shaking hands.
//   3. A small state machine (idle → tracking → fired → cooldown) so a real
//      swipe fires exactly once instead of three or four times as the hand
//      crosses the threshold across several frames.
//
// Loads the wasm + model from the CDN, so it needs network on first use.
// If loading fails the panel's simulate buttons still work as a fallback.
import { useEffect, useRef, useState, type RefObject } from 'react';

const VERSION = '0.10.35'; // keep in sync with package.json @mediapipe/tasks-vision
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/wasm`;
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task';

export type DetectedGesture = 'thumbsUp' | 'palm' | 'swipeRight' | 'swipeLeft';

const COOLDOWN_MS = 1200;       // min gap between fired commands
const STATIC_CONFIDENCE = 0.6;
const STATIC_STABLE_FRAMES = 4; // hold a pose this many frames before firing

const SWIPE_WINDOW_MS = 600;    // look at hand travel over this window
const SWIPE_DX = 0.10;          // normalized centroid travel to count as a swipe
const SMOOTH_N = 3;             // moving-average window for the raw hand x (small = responsive to fast motion)
const MIN_SAMPLES = 3;          // need at least this many smoothed points before checking
const MONOTONIC_TOL = 0.03;     // tolerate this much back-jitter per frame (fast motion is noisier)
const STILL_MAX = 0.05;         // recent x-travel must be below this for "still"
const MISSING_GRACE_MS = 250;   // keep the buffer alive if the hand briefly disappears

type SwipeState = 'idle' | 'cooldown';

export function useGestures(
  videoRef: RefObject<HTMLVideoElement | null>,
  active: boolean,
  onGesture: (g: DetectedGesture) => void,
) {
  const [ready, setReady] = useState(false);
  const [live, setLive] = useState('—');
  const [error, setError] = useState<string | null>(null);
  const onGestureRef = useRef(onGesture);
  onGestureRef.current = onGesture;

  useEffect(() => {
    if (!active) { setLive('—'); return; }

    let cancelled = false;
    let raf = 0;
    let recognizer: any = null;
    let lastFire = 0;
    let stableName = '';
    let stableCount = 0;
    let rawXs: number[] = [];                       // last N raw wrist x values (smoothing buffer)
    let smoothed: { t: number; x: number }[] = [];  // smoothed x over the swipe window
    let swipe: SwipeState = 'idle';

    const resetMotion = () => { rawXs = []; smoothed = []; };

    (async () => {
      try {
        const { GestureRecognizer, FilesetResolver } = await import('@mediapipe/tasks-vision');
        const fileset = await FilesetResolver.forVisionTasks(WASM_URL);

        const make = (delegate: 'GPU' | 'CPU') =>
          GestureRecognizer.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: MODEL_URL, delegate },
            runningMode: 'VIDEO',
            numHands: 1,
          });
        recognizer = await make('GPU').catch(() => make('CPU'));
        if (cancelled) { recognizer?.close?.(); return; }
        setReady(true);
        setError(null);

        const loop = () => {
          if (cancelled) return;
          const video = videoRef.current;
          if (video && video.readyState >= 2 && video.videoWidth > 0) {
            try {
              const now = performance.now();
              const res = recognizer.recognizeForVideo(video, now);
              const cat = res.gestures?.[0]?.[0];
              const name: string = cat?.categoryName ?? 'None';
              const score: number = cat?.score ?? 0;
              const handDetected = !!res.landmarks?.[0];

              // Drop out of cooldown once enough time has passed.
              if (swipe === 'cooldown' && now - lastFire > COOLDOWN_MS) swipe = 'idle';

              // --- Swipe: track the *centroid* of all 21 hand landmarks ---
              // The wrist landmark is anchored to the forearm and barely moves
              // when the hand pivots — the centroid translates with the whole
              // hand, which is what a swipe actually does.
              const lm = res.landmarks?.[0];
              let travel = 0;      // peak-to-peak x travel in the window (for threshold)
              let recent = 0;      // signed last-vs-first travel (for the still check)
              if (lm && lm.length) {
                let cx = 0;
                for (const p of lm) cx += p.x;
                cx /= lm.length;

                rawXs.push(cx);
                if (rawXs.length > SMOOTH_N) rawXs.shift();
                const sx = rawXs.reduce((a, b) => a + b, 0) / rawXs.length;
                smoothed.push({ t: now, x: sx });
                smoothed = smoothed.filter((p) => now - p.t < SWIPE_WINDOW_MS);
              } else if (smoothed.length && now - smoothed[smoothed.length - 1].t > MISSING_GRACE_MS) {
                // Hand has been missing for too long — drop the buffer.
                resetMotion();
              }
              // (Single dropped frames within the grace period: leave the buffer
              // alone so a brief tracking glitch doesn't kill the swipe.)

              if (smoothed.length >= 2) {
                let maxX = smoothed[0].x, minX = smoothed[0].x;
                let maxIdx = 0, minIdx = 0;
                for (let i = 1; i < smoothed.length; i++) {
                  if (smoothed[i].x > maxX) { maxX = smoothed[i].x; maxIdx = i; }
                  if (smoothed[i].x < minX) { minX = smoothed[i].x; minIdx = i; }
                }
                travel = maxX - minX;
                recent = smoothed[smoothed.length - 1].x - smoothed[0].x;

                if (
                  swipe === 'idle' &&
                  rawXs.length === SMOOTH_N &&
                  smoothed.length >= MIN_SAMPLES &&
                  travel > SWIPE_DX
                ) {
                  // Direction = whichever extremum came *later* in time.
                  // sign = +1: x increased over time (image right).
                  // sign = -1: x decreased over time (image left).
                  const sign = maxIdx > minIdx ? +1 : -1;
                  const startIdx = Math.min(minIdx, maxIdx);
                  const endIdx = Math.max(minIdx, maxIdx);
                  let monotonic = true;
                  for (let i = startIdx + 1; i <= endIdx; i++) {
                    const step = smoothed[i].x - smoothed[i - 1].x;
                    if (step * sign < -MONOTONIC_TOL) { monotonic = false; break; }
                  }
                  if (monotonic) {
                    // Front-facing webcam streams are mirrored: moving the
                    // hand to the user's right *decreases* image-space x.
                    onGestureRef.current(sign < 0 ? 'swipeRight' : 'swipeLeft');
                    lastFire = now;
                    swipe = 'cooldown';
                    resetMotion();
                    stableName = ''; stableCount = 0;
                  }
                }
              }

              // --- Static poses: require a stable, confident hold AND a still hand ---
              // If the hand is moving (e.g. mid-swipe with an open palm), suppress
              // static-pose firing — otherwise the palm "stable hold" trips on the
              // very frames the swipe detector is still collecting and steals it.
              const handStill = travel < STILL_MAX;
              if (handStill && score > STATIC_CONFIDENCE && (name === 'Thumb_Up' || name === 'Open_Palm')) {
                if (name === stableName) stableCount++;
                else { stableName = name; stableCount = 1; }
                if (stableCount >= STATIC_STABLE_FRAMES && swipe === 'idle' && now - lastFire > COOLDOWN_MS) {
                  onGestureRef.current(name === 'Thumb_Up' ? 'thumbsUp' : 'palm');
                  lastFire = now; stableCount = 0;
                  swipe = 'cooldown';
                  resetMotion();
                }
              } else {
                stableName = ''; stableCount = 0;
              }

              // Live overlay: show hand state + current motion so it's obvious why
              // the detector is or isn't firing. `travel` = peak-to-peak in window,
              // `recent` = signed last-vs-first (direction hint).
              const travelTxt = travel.toFixed(2);
              const dirTxt = (recent >= 0 ? '+' : '') + recent.toFixed(2);
              if (!handDetected) setLive('no hand');
              else if (swipe === 'cooldown') setLive(`cooldown · travel ${travelTxt}`);
              else if (travel > STILL_MAX) setLive(`moving · travel ${travelTxt} (${dirTxt})`);
              else if (name && name !== 'None') setLive(`${name} ${(score * 100) | 0}% · travel ${travelTxt}`);
              else setLive(`hand · travel ${travelTxt}`);
            } catch { /* transient frame error — skip */ }
          }
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Gesture model failed to load');
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      try { recognizer?.close?.(); } catch { /* ignore */ }
      setReady(false);
      setLive('—');
    };
  }, [active, videoRef]);

  return { ready, live, error };
}
