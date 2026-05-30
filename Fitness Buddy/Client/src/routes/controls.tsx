// Controls guide page. Documents the voice phrases and hand gestures the app
// actually supports today. Voice runs through Azure AI Speech (cloud STT +
// neural TTS); vision runs fully on-device via MediaPipe Tasks.
import { createFileRoute } from '@tanstack/react-router';
import { Mic, Hand, Sparkles, Volume2, MousePointerClick, Cloud, Cpu, Wifi, WifiOff } from 'lucide-react';
import { PageHeader, Card } from '@/components/ui-bits';

export const Route = createFileRoute('/controls')({ component: ControlsPage });

type VoiceCmd = { en: string; sl: string; does: string; ai?: boolean };

const VOICE_AI: VoiceCmd[] = [
  { en: 'Log workout…',  sl: 'Zabeleži trening', does: 'Speak a workout — Azure parses sets, reps and minutes, then logs it.', ai: true },
  { en: 'Log food…',     sl: 'Zabeleži hrano',   does: 'Speak a meal — Azure extracts name, amount and calories.',             ai: true },
  { en: 'Log drink…',    sl: 'Zabeleži pijačo',  does: 'Speak a drink — Azure logs ml of water for today.',                    ai: true },
  { en: 'Daily summary', sl: 'Dnevni povzetek',  does: "Generates a spoken recap of today's calories, water, workouts.",       ai: true },
];

const VOICE_QUICK: VoiceCmd[] = [
  { en: 'Log water',      sl: 'Zabeleži vodo',     does: "Adds 250 ml to today's hydration." },
  { en: 'Show today',     sl: 'Prikaži danes',     does: 'Opens the dashboard.' },
  { en: 'Show workouts',  sl: 'Prikaži treninge',  does: 'Opens the Workouts page.' },
  { en: 'Show nutrition', sl: 'Prikaži prehrano',  does: 'Opens the Nutrition page.' },
  { en: 'Show habits',    sl: 'Prikaži navade',    does: 'Opens the Habits page.' },
  { en: 'Show goals',     sl: 'Prikaži cilje',     does: 'Opens the Goals page.' },
  { en: 'Show controls',  sl: 'Prikaži kontrole',  does: 'Opens this page.' },
  { en: 'Show profile',   sl: 'Prikaži profil',    does: 'Opens the Profile page.' },
  { en: 'Logout',         sl: 'Odjava',            does: 'Signs out and returns to the login screen.' },
];

type Gesture = { name: string; does: string; when: string };

const GESTURES: Gesture[] = [
  { name: '👍 Thumbs up',  does: 'Logs a quick workout set',  when: 'Finishing a set without touching the phone.' },
  { name: '👉 Swipe right', does: 'Switches to the next tab',  when: 'Jumping forward between Workouts → Nutrition → Habits…' },
  { name: '👈 Swipe left',  does: 'Switches to the previous tab', when: 'Going back to the previous page.' },
  { name: '✋ Open palm',    does: 'Logs you out',              when: 'Quickly ending the session, hands-free.' },
];

function ControlsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Guide"
        title="How voice & vision work"
        sub="Two hands-free input modes live in floating panels on every screen. Voice runs through Azure AI Speech in the cloud; gestures are recognized fully on-device with MediaPipe."
      />

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center gap-2">
            <Volume2 className="size-4 text-primary" strokeWidth={1.5} />
            <h2 className="text-base font-semibold">Voice panel</h2>
            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary">
              <Cloud className="size-3" strokeWidth={1.5} /> Azure
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Bottom-right of any page — round mic button + Voice panel pill.</p>

          <ol className="mt-4 space-y-3 text-sm">
            <Step n={1} title="Open the panel">Tap <span className="font-mono text-xs bg-secondary px-1.5 py-0.5 rounded">Voice panel</span> to expand the command list.</Step>
            <Step n={2} title="Push-to-talk">Tap the round <Mic className="inline size-3.5 -mt-0.5" strokeWidth={1.5} /> button. Status flips to <span className="font-mono text-xs">Recording…</span>.</Step>
            <Step n={3} title="Speak naturally">Say one of the phrases below. For the four AI commands, speak the whole sentence — e.g. <em>"log workout bench press 4 sets 20 reps."</em></Step>
            <Step n={4} title="Stop and run">Tap the mic again. The audio is encoded as PCM 16 kHz and sent to Azure STT. The transcript dispatches the command.</Step>
            <Step n={5} title="No mic? No problem">Hit <Sparkles className="inline size-3.5 -mt-0.5" strokeWidth={1.5} /> <span className="font-mono text-xs">Type a phrase</span>, or click Run next to any command.</Step>
          </ol>

          <div className="mt-5 rounded-md border border-border overflow-hidden">
            <div className="px-3 py-2 bg-secondary text-[10px] uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>AI-powered ({VOICE_AI.length})</span>
              <span className="inline-flex items-center gap-1"><Wifi className="size-3" strokeWidth={1.5} /> online only</span>
            </div>
            <ul className="divide-y divide-border">
              {VOICE_AI.map((c) => (
                <li key={c.en} className="px-3 py-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono">"{c.en}"</span>
                    <span className="text-muted-foreground">/ {c.sl}</span>
                  </div>
                  <div className="mt-0.5 text-muted-foreground">{c.does}</div>
                </li>
              ))}
            </ul>
            <div className="px-3 py-2 bg-secondary text-[10px] uppercase tracking-wider text-muted-foreground flex items-center justify-between border-t border-border">
              <span>Quick commands ({VOICE_QUICK.length})</span>
              <span className="inline-flex items-center gap-1"><WifiOff className="size-3" strokeWidth={1.5} /> work offline*</span>
            </div>
            <ul className="divide-y divide-border">
              {VOICE_QUICK.map((c) => (
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
          <p className="mt-2 text-[10px] text-muted-foreground">
            * Speech recognition itself needs the network; once a command is typed via the panel, the dispatched action runs offline.
          </p>
        </Card>

        <Card>
          <div className="flex items-center gap-2">
            <Hand className="size-4 text-primary" strokeWidth={1.5} />
            <h2 className="text-base font-semibold">Vision panel</h2>
            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
              <Cpu className="size-3" strokeWidth={1.5} /> On-device
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Bottom-left — Vision panel pill. Camera frames never leave your device.</p>

          <ol className="mt-4 space-y-3 text-sm">
            <Step n={1} title="Open the panel">Click the pill to expand the camera preview and gesture controls.</Step>
            <Step n={2} title="Start the camera">Tap <span className="font-mono text-xs bg-secondary px-1.5 py-0.5 rounded">Start camera</span> and grant permission.</Step>
            <Step n={3} title="Perform a gesture">Hold a pose for a moment, or sweep your whole hand across the frame for swipes. The live overlay shows <span className="font-mono text-xs">travel</span> (motion magnitude) so you can see when a swipe is about to fire.</Step>
            <Step n={4} title="Simulate without a camera">Use the buttons under <span className="font-mono text-xs">Simulate gesture</span> to fire any action manually.</Step>
          </ol>

          <div className="mt-5 rounded-md border border-border overflow-hidden">
            <div className="px-3 py-2 bg-secondary text-[10px] uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Gestures ({GESTURES.length})</span>
              <span>MediaPipe Tasks</span>
            </div>
            <ul className="divide-y divide-border">
              {GESTURES.map((g) => (
                <li key={g.name} className="px-3 py-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{g.name}</span>
                    <span className="text-muted-foreground">{g.does}</span>
                  </div>
                  <div className="mt-0.5 text-muted-foreground italic">{g.when}</div>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2"><Sparkles className="size-4 text-primary" strokeWidth={1.5} /><h2 className="text-base font-semibold">Tips for accuracy</h2></div>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2"><span className="text-primary">•</span> Speak in a normal volume, one phrase at a time.</li>
            <li className="flex gap-2"><span className="text-primary">•</span> The voice panel shows <span className="font-mono text-xs">Azure</span> when online, <span className="font-mono text-xs">Local</span> when offline (using in-browser Whisper), <span className="font-mono text-xs">Recording…</span> while listening, and <span className="font-mono text-xs">Transcribing…</span> while processing.</li>
            <li className="flex gap-2"><span className="text-primary">•</span> For gestures, sit roughly 50 cm from the camera; your hand should fill 15–20% of the frame.</li>
            <li className="flex gap-2"><span className="text-primary">•</span> Swipes need a full hand sweep — rotating your wrist in place won't trigger.</li>
            <li className="flex gap-2"><span className="text-primary">•</span> Both panels share the same dispatch logic as the on-screen buttons — anything the gesture can do, a click can too.</li>
          </ul>
        </Card>

        <Card>
          <div className="flex items-center gap-2"><MousePointerClick className="size-4 text-primary" strokeWidth={1.5} /><h2 className="text-base font-semibold">Privacy & networking</h2></div>
          <ul className="mt-3 space-y-2.5 text-sm">
            <li className="flex items-start gap-3"><Cloud className="size-3.5 text-primary mt-0.5" strokeWidth={1.5} /><span className="text-muted-foreground"><strong>Voice</strong> uploads recorded audio (PCM 16 kHz mono) to Azure AI Speech for transcription, and to Azure OpenAI for the four AI commands. The Azure keys stay on our server — your browser never sees them.</span></li>
            <li className="flex items-start gap-3"><Volume2 className="size-3.5 text-primary mt-0.5" strokeWidth={1.5} /><span className="text-muted-foreground"><strong>Speech reply</strong> uses an Azure neural voice (Aria, US English) so confirmations sound consistent across browsers and OSes.</span></li>
            <li className="flex items-start gap-3"><Cpu className="size-3.5 text-primary mt-0.5" strokeWidth={1.5} /><span className="text-muted-foreground"><strong>Vision</strong> runs entirely in your browser. The MediaPipe model is downloaded once from a CDN; after that, every camera frame is processed locally — nothing is uploaded.</span></li>
            <li className="flex items-start gap-3"><WifiOff className="size-3.5 text-muted-foreground mt-0.5" strokeWidth={1.5} /><span className="text-muted-foreground"><strong>Offline:</strong> the four AI commands need the network. The nine quick commands keep working — recognition falls back to an in-browser Whisper-tiny model (~40 MB, downloaded once while online and cached in IndexedDB). Status pill shows <span className="font-mono text-xs">Local</span> when this is in use.</span></li>
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
