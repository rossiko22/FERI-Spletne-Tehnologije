// Vision (gesture) panel. OWNER: Marko.
// Currently uses simulate buttons; real gesture detection (MediaPipe Hands,
// Handtrack.js or TF.js HandPose) plugs into useCamera()'s videoRef — see
// doc/MARKO.md for the recommended library and where to wire it.
import { useEffect, useState } from 'react';
import { Camera, CameraOff, Hand, Play } from 'lucide-react';
import { runCommand } from '@/lib/commandBus';
import { useCamera } from '@/lib/useCamera';
import { useGestures, type DetectedGesture } from '@/lib/useGestures';

type Gesture = { id: string; label: string; does: string; run: () => void | Promise<void> };

const GESTURES: Gesture[] = [
  { id: 'thumbsUp', label: '👍 Thumbs up',  does: 'Log quick workout', run: () => runCommand('log-workout-quick', { source: 'gesture', transcript: 'thumbsUp' }) },
  { id: 'swipe',    label: '👉 Swipe right', does: 'Next tab',          run: () => runCommand('next-tab',          { source: 'gesture', transcript: 'swipe' }) },
  { id: 'swipeL',   label: '👈 Swipe left',  does: 'Previous tab',      run: () => runCommand('prev-tab',          { source: 'gesture', transcript: 'swipeL' }) },
  { id: 'palm',     label: '✋ Open palm',    does: 'Logout',            run: () => runCommand('logout',            { source: 'gesture', transcript: 'palm' }) },
];

// Maps a recognized gesture to the matching simulate-button id above, so live
// detection and the manual buttons trigger identical behavior.
const GESTURE_ID: Record<DetectedGesture, string> = {
  thumbsUp: 'thumbsUp',
  palm: 'palm',
  swipeRight: 'swipe',
  swipeLeft: 'swipeL',
};

export function VisionPanel() {
  const cam = useCamera();
  const [open, setOpen] = useState(false);
  const [last, setLast] = useState<{ id: string; at: number } | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    const o = () => setOpen(true);
    window.addEventListener('fb_open_vision', o);
    return () => window.removeEventListener('fb_open_vision', o);
  }, []);

  const fire = async (g: Gesture) => {
    setLast({ id: g.id, at: Date.now() });
    await g.run();
    setHistory((h) => [`✓ ${g.label} — ${g.does}`, ...h].slice(0, 6));
  };

  // Real recognition: drive the same handlers as the simulate buttons.
  const vision = useGestures(cam.videoRef, cam.active, (detected: DetectedGesture) => {
    const g = GESTURES.find((x) => x.id === GESTURE_ID[detected]);
    if (g) fire(g);
  });

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 left-6 z-40 h-11 px-3 rounded-full border border-border bg-card text-xs hover:border-primary shadow-sm inline-flex items-center gap-2"
      >
        <Hand className="size-4" strokeWidth={1.5} /> Vision panel
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 left-6 z-40 w-80 rounded-xl border border-border bg-card shadow-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Hand className="size-4 text-primary" strokeWidth={1.5} />
          <span className="text-sm font-semibold">Vision</span>
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${cam.active ? 'bg-[var(--success-bg)] text-[var(--success)]' : 'bg-secondary text-muted-foreground'}`}>
            {cam.active ? 'Live' : 'Idle'}
          </span>
        </div>
        <button onClick={() => setOpen(false)} className="text-xs text-muted-foreground hover:text-foreground">close</button>
      </div>

      <div className="aspect-video bg-secondary relative">
        <video ref={cam.videoRef} className="w-full h-full object-cover -scale-x-100" muted playsInline />
        {!cam.active && (
          <div className="absolute inset-0 grid place-items-center text-[10px] text-muted-foreground text-center px-3">
            Camera idle · use the gesture buttons below
          </div>
        )}
        {cam.active && (
          <div className="absolute top-1 left-1 text-[10px] font-mono bg-card/90 border border-border rounded px-1.5 py-0.5">
            {vision.error ? '⚠ model failed' : vision.ready ? `✋ ${vision.live}` : 'loading model…'}
          </div>
        )}
        {last && (
          <div className="absolute bottom-1 left-1 text-[10px] font-mono bg-card/90 border border-border rounded px-1.5 py-0.5">
            {last.id} · {Math.round((Date.now() - last.at) / 100) / 10}s ago
          </div>
        )}
      </div>

      <div className="p-3 border-b border-border">
        <button
          onClick={cam.active ? cam.stop : cam.start}
          className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-border py-1.5 text-xs hover:border-primary"
        >
          {cam.active ? <CameraOff className="size-3" strokeWidth={1.5} /> : <Camera className="size-3" strokeWidth={1.5} />}
          {cam.active ? 'Stop camera' : 'Start camera'}
        </button>
        {cam.active && (
          <div className="mt-2 text-[10px] text-muted-foreground text-center">
            {vision.error
              ? 'Gesture model unavailable — use the buttons below.'
              : vision.ready
                ? 'Live: 👍 thumbs=log workout · 👉/👈 swipe=tabs · ✋ palm=logout'
                : 'Loading gesture model…'}
          </div>
        )}
        {cam.error && <div className="mt-2 text-[10px] text-destructive text-center">{cam.error}</div>}
      </div>

      <div className="p-3 border-b border-border">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Simulate gesture</div>
        <ul className="space-y-1">
          {GESTURES.map((g) => (
            <li key={g.id}>
              <button
                onClick={() => fire(g)}
                className="w-full flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1.5 text-[11px] hover:border-primary hover:text-primary"
              >
                <span className="truncate text-left">{g.label}</span>
                <span className="text-[10px] text-muted-foreground truncate">{g.does}</span>
                <Play className="size-3 flex-none" strokeWidth={1.5} />
              </button>
            </li>
          ))}
        </ul>
      </div>

      {history.length > 0 && (
        <ul className="p-3 space-y-0.5 max-h-24 overflow-y-auto">
          {history.map((h, i) => (
            <li key={i} className="text-[10px] font-mono text-muted-foreground truncate">{h}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
