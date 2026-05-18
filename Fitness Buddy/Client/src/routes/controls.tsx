// Controls guide page. Documents voice phrases and gestures.
import { createFileRoute } from '@tanstack/react-router';
import { Mic, Hand, Bell, Keyboard, Sparkles, Volume2, Command, MousePointerClick } from 'lucide-react';
import { PageHeader, Card } from '@/components/ui-bits';

export const Route = createFileRoute('/controls')({ component: ControlsPage });

const VOICE_COMMANDS = [
  { en: 'Open workouts',   sl: 'Pojdi na treninge',  does: 'Navigates to the Workouts page' },
  { en: 'New workout',     sl: 'Nov trening',         does: 'Starts a new workout entry' },
  { en: 'Log water',       sl: 'Zabeleži vodo',       does: "Adds 250 ml to today's hydration" },
  { en: 'Mark habit done', sl: 'Označi navado',       does: 'Opens Habits to tick today off' },
  { en: 'Show today',      sl: 'Prikaži danes',       does: 'Returns to the dashboard' },
  { en: 'Search',          sl: 'Iskanje',             does: 'Focuses the nearest search input' },
  { en: 'Delete last',     sl: 'Izbriši zadnje',      does: 'Removes the most recent entry' },
];

const GESTURES = [
  { name: 'Open palm',          does: 'Pause or resume the rest timer', when: 'Mid-set, hands too sweaty for the screen' },
  { name: 'Closed fist',        does: 'Mark current set complete',      when: 'Finishing a set without touching the phone' },
  { name: 'Thumbs up',          does: 'Confirm a dialog (yes)',         when: 'Accepting a suggestion hands-free' },
  { name: 'Two hands',          does: 'Next page in the current view',  when: 'Flipping through workout history' },
  { name: 'Point left / right', does: 'Switch primary tab',             when: 'Jumping between Workouts and Nutrition' },
];

function ControlsPage() {
  return (
    <div>
      <PageHeader eyebrow="Guide" title="How voice & vision work" sub="Two hands-free input modes live in floating panels on every screen. Everything runs on-device — no audio or video leaves your phone." />

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center gap-2"><Volume2 className="size-4 text-primary" strokeWidth={1.5} /><h2 className="text-base font-semibold">Voice panel</h2></div>
          <p className="mt-1 text-sm text-muted-foreground">Look bottom-right of any page for the round mic button.</p>
          <ol className="mt-4 space-y-3 text-sm">
            <Step n={1} title="Open the panel">Tap <span className="font-mono text-xs bg-secondary px-1.5 py-0.5 rounded">Voice panel</span> next to the mic to expand the command list.</Step>
            <Step n={2} title="Start listening">Tap the round <Mic className="inline size-3.5 -mt-0.5" strokeWidth={1.5} /> button. The browser will ask for microphone permission once.</Step>
            <Step n={3} title="Say a command">Speak one of the phrases below. The last heard transcript shows in the panel so you can verify it parsed correctly.</Step>
            <Step n={4} title="No mic? No problem">Hit <Sparkles className="inline size-3.5 -mt-0.5" strokeWidth={1.5} /> <span className="font-mono text-xs">Type a phrase</span>. Useful for demos and desktops without a mic.</Step>
          </ol>

          <div className="mt-5 rounded-md border border-border overflow-hidden">
            <div className="px-3 py-2 bg-secondary text-[10px] uppercase tracking-wider text-muted-foreground">7 supported phrases</div>
            <ul className="divide-y divide-border">
              {VOICE_COMMANDS.map((c) => (
                <li key={c.en} className="px-3 py-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono">"{c.en}"</span>
                    <span className="text-muted-foreground">/ {c.sl}</span>
                  </div>
                  <div className="mt-0.5 text-muted-foreground">{c.does}</div>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2"><Hand className="size-4 text-primary" strokeWidth={1.5} /><h2 className="text-base font-semibold">Vision panel</h2></div>
          <p className="mt-1 text-sm text-muted-foreground">Look bottom-left of any page for the <span className="font-mono text-xs bg-secondary px-1.5 py-0.5 rounded">Vision panel</span> pill.</p>
          <ol className="mt-4 space-y-3 text-sm">
            <Step n={1} title="Open the panel">Click the pill to expand the camera preview and gesture controls.</Step>
            <Step n={2} title="Start the camera">Tap <span className="font-mono text-xs bg-secondary px-1.5 py-0.5 rounded">Start camera</span>. The browser asks for camera permission.</Step>
            <Step n={3} title="Perform a gesture">Hold a gesture (see list below) about 30 cm from the lens. The detected gesture appears as a tag in the bottom-left of the preview.</Step>
            <Step n={4} title="Simulate without a camera">Use the simulate buttons under <span className="font-mono text-xs">Simulate gesture</span> to fire any action.</Step>
          </ol>

          <div className="mt-5 rounded-md border border-border overflow-hidden">
            <div className="px-3 py-2 bg-secondary text-[10px] uppercase tracking-wider text-muted-foreground">5 recognised gestures</div>
            <ul className="divide-y divide-border">
              {GESTURES.map((g) => (
                <li key={g.name} className="px-3 py-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{g.name}</span>
                    <span className="text-muted-foreground">{g.does}</span>
                  </div>
                  <div className="mt-0.5 text-muted-foreground italic">When to use: {g.when}</div>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2"><Sparkles className="size-4 text-primary" strokeWidth={1.5} /><h2 className="text-base font-semibold">Tips for accuracy</h2></div>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2"><span className="text-primary">•</span> Speak in a normal volume, one phrase at a time.</li>
            <li className="flex gap-2"><span className="text-primary">•</span> For gestures, keep the hand inside the camera frame.</li>
            <li className="flex gap-2"><span className="text-primary">•</span> Both panels show a status pill — <span className="font-mono text-xs">Listening</span> / <span className="font-mono text-xs">Live</span> means the input is active.</li>
            <li className="flex gap-2"><span className="text-primary">•</span> Audio and video stay on-device. Nothing is uploaded.</li>
          </ul>
        </Card>

        <Card>
          <div className="flex items-center gap-2"><Keyboard className="size-4 text-primary" strokeWidth={1.5} /><h2 className="text-base font-semibold">Keyboard & alerts</h2></div>
          <ul className="mt-3 space-y-2.5 text-sm">
            <li className="flex items-start gap-3"><kbd className="font-mono text-[10px] bg-secondary border border-border rounded px-1.5 py-0.5 flex items-center gap-1"><Command className="size-3" strokeWidth={1.5} />K</kbd><span className="text-muted-foreground">Open the command palette.</span></li>
            <li className="flex items-start gap-3"><kbd className="font-mono text-[10px] bg-secondary border border-border rounded px-1.5 py-0.5">?</kbd><span className="text-muted-foreground">Show the full keyboard shortcut overlay.</span></li>
            <li className="flex items-start gap-3"><kbd className="font-mono text-[10px] bg-secondary border border-border rounded px-1.5 py-0.5">g</kbd><span className="text-muted-foreground">Press then <kbd className="font-mono text-[10px] bg-secondary border border-border rounded px-1 py-0.5">d</kbd> for Dashboard, <kbd className="font-mono text-[10px] bg-secondary border border-border rounded px-1 py-0.5">w</kbd> for Workouts, etc.</span></li>
            <li className="flex items-start gap-3"><Bell className="size-3.5 text-muted-foreground mt-0.5" strokeWidth={1.5} /><span className="text-muted-foreground">Enable browser notifications in <span className="font-mono text-xs">Profile</span> for hydration and habit nudges.</span></li>
            <li className="flex items-start gap-3"><MousePointerClick className="size-3.5 text-muted-foreground mt-0.5" strokeWidth={1.5} /><span className="text-muted-foreground">All voice and gesture actions also work as regular clicks.</span></li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex-none size-6 rounded-full bg-primary/10 text-primary text-xs font-semibold grid place-items-center">{n}</span>
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-muted-foreground text-[13px] mt-0.5">{children}</div>
      </div>
    </li>
  );
}
