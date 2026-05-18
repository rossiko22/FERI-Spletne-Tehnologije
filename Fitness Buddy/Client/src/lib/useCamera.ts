// Webcam stream hook. OWNER: Marko.
// Real gesture detection (e.g. MediaPipe Hands, Handtrack.js, TF.js) plugs into
// the same videoRef in a follow-up — see doc/MARKO.md.

import { useCallback, useEffect, useRef, useState } from 'react';

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setActive(false);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    if (!supported) { setError('Camera not supported in this browser.'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setActive(true);
    } catch (e: any) {
      setError(e?.message ?? 'Could not access camera.');
      setActive(false);
    }
  }, [supported]);

  useEffect(() => () => stop(), [stop]);

  return { videoRef, active, error, supported, start, stop };
}
