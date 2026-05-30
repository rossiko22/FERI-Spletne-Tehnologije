// Webcam stream hook. OWNER: Marko.
// Real gesture detection (e.g. MediaPipe Hands, Handtrack.js, TF.js) plugs into
// the same videoRef in a follow-up — see doc/MARKO.md.

import { useCallback, useEffect, useRef, useState } from 'react';

function cameraErrorMessage(e: any): string {
  switch (e?.name) {
    case 'NotAllowedError':
    case 'SecurityError':     return 'Camera permission denied — allow access and try again.';
    case 'NotFoundError':
    case 'OverconstrainedError': return 'No camera found on this device.';
    case 'NotReadableError':  return 'Camera is in use by another app.';
    default:                  return e?.message || 'Could not access camera.';
  }
}

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
      let stream: MediaStream;
      try {
        // Prefer the front camera, but only as a hint…
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'user' } }, audio: false });
      } catch {
        // …a desktop webcam can't satisfy facingMode — fall back to any camera.
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setActive(true);
    } catch (e: any) {
      setError(cameraErrorMessage(e));
      setActive(false);
    }
  }, [supported]);

  useEffect(() => () => stop(), [stop]);

  return { videoRef, active, error, supported, start, stop };
}
