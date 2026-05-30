// Voice command panel. OWNER: Marko.
// Speech-to-text uses the Azure Cognitive Services Speech SDK over a websocket
// (works in Firefox too). The subscription key stays on the server; the client
// gets a short-lived auth token via /api/ai/speech-token. Typed phrases / Run
// buttons remain as a no-mic fallback.
import { useEffect, useState } from 'react';
import { Mic, Loader2, Sparkles, ChevronDown, Play } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { useAzureSpeech } from '@/lib/useAzureSpeech';
import { runCommand } from '@/lib/commandBus';
import { aiLog, aiSummary } from '@/lib/aiVoice';
import { ai } from '@/lib/api';

type AiKind = 'workout' | 'food' | 'drink' | 'summary';

type Phrase = {
  phrase: string;
  sl: string;
  match: RegExp;
  ai?: AiKind; // AI-backed (Azure) command — needs network, handled specially
  run?: (nav: ReturnType<typeof useNavigate>, transcript: string) => void | Promise<void>;
  silent?: boolean; // skip the spoken confirmation (e.g. logout — session is gone)
};

const COMMANDS: Phrase[] = [
  // --- Azure-powered natural-language commands (online only) ---
  { phrase: 'Log workout…',   sl: 'Zabeleži trening',   match: /log workout|add workout|log exercise|add exercise/,    ai: 'workout' },
  { phrase: 'Log food…',      sl: 'Zabeleži hrano',     match: /log food|log meal|i ate|^ate /,                        ai: 'food' },
  { phrase: 'Log drink…',     sl: 'Zabeleži pijačo',    match: /log drink|drank/,                                      ai: 'drink' },
  { phrase: 'Daily summary',  sl: 'Dnevni povzetek',    match: /summary|daily recap|how am i doing|povzetek/,          ai: 'summary' },
  // --- Quick fixed commands (work offline) ---
  { phrase: 'Log water',      sl: 'Zabeleži vodo',      match: /water|vodo/,                                                run: (_, t) => runCommand('log-water', { source: 'voice', transcript: t }) },
  { phrase: 'Show today',     sl: 'Prikaži danes',      match: /show today|today|dashboard|danes|home/,                     run: (nav) => nav({ to: '/' }) },
  { phrase: 'Show workouts',  sl: 'Prikaži treninge',   match: /show workout|open workout|go to workout|treninge/,          run: (nav) => nav({ to: '/workouts' }) },
  { phrase: 'Show nutrition', sl: 'Prikaži prehrano',   match: /show nutrition|open nutrition|nutrition|food log|prehran/,  run: (nav) => nav({ to: '/nutrition' }) },
  { phrase: 'Show habits',    sl: 'Prikaži navade',     match: /show habit|open habit|habits|navad/,                        run: (nav) => nav({ to: '/habits' }) },
  { phrase: 'Show goals',     sl: 'Prikaži cilje',      match: /show goal|open goal|goals|cilj/,                            run: (nav) => nav({ to: '/goals' }) },
  { phrase: 'Show controls',  sl: 'Prikaži kontrole',   match: /show control|open control|controls|nastavit/,               run: (nav) => nav({ to: '/controls' }) },
  { phrase: 'Show profile',   sl: 'Prikaži profil',     match: /show profile|open profile|profile|profil/,                  run: (nav) => nav({ to: '/profile' }) },
  { phrase: 'Logout',         sl: 'Odjava',             match: /log out|logout|sign out|odjav/,                             run: (_, t) => runCommand('logout', { source: 'voice', transcript: t }), silent: true },
];

// Fuzzy fallback for matching transcripts to commands. When the strict regex
// in COMMANDS doesn't fire (because tiny.en mishears, e.g. "show today" →
// "so today", "show workouts" → "show worked outs"), we still try to find
// the *closest* command phrase by token-overlap distance. Only kicks in when
// the regex fails; never overrules an exact match.
//
// We do this with a cheap word-set Jaccard score rather than full Levenshtein —
// short commands, small vocabulary, and word-order changes (e.g. "today show")
// would defeat a pure prefix match. Threshold of 0.4 is empirically lenient
// enough to catch most accent mishears but strict enough that random sentences
// don't accidentally fire a destructive command (logout).
function tokens(s: string): Set<string> {
  return new Set(s.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean));
}
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}
function fuzzyFindCommand(transcript: string, commands: Phrase[]): Phrase | null {
  const ts = tokens(transcript);
  let bestScore = 0;
  let best: Phrase | null = null;
  for (const c of commands) {
    // Skip AI commands in fuzzy match — they're online-only anyway and a
    // mishear shouldn't accidentally trigger an Azure call.
    if (c.ai) continue;
    const score = jaccard(ts, tokens(c.phrase));
    if (score > bestScore) { bestScore = score; best = c; }
  }
  return bestScore >= 0.4 ? best : null;
}

// Picks the best American English voice the browser has. Default Linux
// speechSynthesis tends to use eSpeak / Festival voices that sound heavily
// accented; on Chromium / Edge / macOS there are far better neural voices
// already installed — we just have to *select* one explicitly. Ranking favors
// Microsoft "Natural" (studio neural) → Google US English → macOS Samantha →
// generic en-US fallbacks. Voices load async on some browsers, so the cache
// resets to undefined and is re-resolved on first use.
let cachedVoice: SpeechSynthesisVoice | null | undefined = undefined;

function scoreVoice(v: SpeechSynthesisVoice): number {
  const n = v.name;
  // Microsoft Edge neural voices (Windows / Edge on any OS via cloud)
  if (/Aria Online \(Natural\)/i.test(n))   return 100;
  if (/Jenny Online \(Natural\)/i.test(n))  return 99;
  if (/Guy Online \(Natural\)/i.test(n))    return 98;
  if (/Online \(Natural\).*United States/i.test(n)) return 95;
  // Chrome / Chromium ships this one — high-quality female American.
  if (/Google US English/i.test(n))         return 90;
  // macOS premium voices
  if (n === 'Samantha')                     return 85;
  if (n === 'Alex')                         return 84;
  if (n === 'Ava' || n === 'Allison')       return 80;
  // Standard Windows voices
  if (/Zira/i.test(n) && /en-US/i.test(v.lang)) return 60;
  if (/David/i.test(n) && /en-US/i.test(v.lang)) return 59;
  // Generic en-US fallback (anything is better than a Slavic/Indian default)
  if (v.lang === 'en-US')                   return 30;
  if (v.lang.startsWith('en-US'))           return 25;
  if (v.lang.startsWith('en'))              return 10;
  return 0;
}

function pickVoice(): SpeechSynthesisVoice | null {
  const list = window.speechSynthesis.getVoices();
  if (!list.length) return null;
  let best: SpeechSynthesisVoice | null = null;
  let bestScore = 0;
  for (const v of list) {
    const s = scoreVoice(v);
    if (s > bestScore) { best = v; bestScore = s; }
  }
  return best;
}

// Shared <audio> element for Azure TTS playback. Reusing one element prevents
// overlapping confirmations from piling up — a new utterance cleanly replaces
// the previous one (mirroring speechSynthesis.cancel() + .speak() behavior).
let ttsAudio: HTMLAudioElement | null = null;
let lastBlobUrl: string | null = null;

function browserSpeak(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const fire = () => {
    if (cachedVoice === undefined) cachedVoice = pickVoice();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    if (cachedVoice) u.voice = cachedVoice;
    u.rate = 1.0; u.pitch = 1.0; u.volume = 1.0;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };
  if (window.speechSynthesis.getVoices().length) fire();
  else window.speechSynthesis.addEventListener('voiceschanged', fire, { once: true });
}

function speak(text: string) {
  if (typeof window === 'undefined') return;
  // Total silence when offline — Azure TTS is unreachable and the OS fallback
  // voice (eSpeak / Festival on Linux) sounds heavily accented and unpleasant.
  // The user can still see what happened in the panel's history list.
  if (navigator.onLine === false) return;

  ai.speak(text)
    .then((blob) => {
      if (lastBlobUrl) URL.revokeObjectURL(lastBlobUrl);
      lastBlobUrl = URL.createObjectURL(blob);
      if (!ttsAudio) ttsAudio = new Audio();
      ttsAudio.pause();
      ttsAudio.src = lastBlobUrl;
      ttsAudio.play().catch(() => {
        // Autoplay blocked (rare after a user click); fall back to browser.
        browserSpeak(text);
      });
    })
    .catch(() => {
      // Azure unreachable (server down etc.). Stay silent rather than
      // dropping to the OS voice — same reason as the offline branch above.
    });
}

export function VoicePanel() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [transcript, setTranscript] = useState<string>('—');
  const [list, setList] = useState(true);
  const [history, setHistory] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const dispatch = async (t: string, opts: { silent?: boolean } = {}) => {
    setTranscript(t);
    let hit = COMMANDS.find((c) => c.match.test(t.toLowerCase()));
    // Regex miss → fuzzy fallback against the offline-safe command set so a
    // misheard "show today" → "so today" still navigates correctly. Limited
    // to non-AI commands so a hallucination can't fire an Azure call.
    if (!hit) hit = fuzzyFindCommand(t, COMMANDS) ?? undefined;
    const sayBack = (msg: string) => { if (!opts.silent) speak(msg); };
    if (!hit) {
      // Speak back what we actually heard so the user can tell whether STT
      // misheard (e.g. "show today" → "so today") vs. genuinely unknown phrase.
      sayBack(`I heard ${t}, but that's not a command I know`);
      setHistory((h) => [`✗ "${t}" — unknown`, ...h].slice(0, 6));
      return;
    }

    // Azure-backed commands: require a connection, then speak the AI response.
    if (hit.ai) {
      if (!online) {
        // No spoken alert — speak() is silent offline anyway and the
        // history line below conveys the same info visually.
        setHistory((h) => [`✗ ${hit.phrase} — offline`, ...h].slice(0, 6));
        return;
      }
      setBusy(true);
      try {
        const text = hit.ai === 'summary' ? await aiSummary() : await aiLog(t);
        setHistory((h) => [`✓ ${text}`, ...h].slice(0, 6));
        sayBack(text);
      } catch {
        sayBack('Sorry, I could not do that');
        setHistory((h) => [`✗ ${hit.phrase} — error`, ...h].slice(0, 6));
      } finally {
        setBusy(false);
      }
      return;
    }

    await hit.run?.(navigate, t);
    setHistory((h) => [`✓ ${hit.phrase}`, ...h].slice(0, 6));
    // Logout (and other `silent` commands) skip the spoken confirmation —
    // for logout specifically, the access token is already gone, so calling
    // /api/ai/speak would 401 and the panel would fall back to the OS voice.
    if (!hit.silent) sayBack(hit.phrase);
  };

  const speech = useAzureSpeech();
  const recording = speech.status === 'recording';

  // Push-to-talk: click to start, click again to stop. Online tries Azure
  // STT first; on failure (or actual offline) the hook falls back to local
  // Whisper. When local was used, suppress the spoken confirmation entirely.
  const handleMic = async () => {
    setOpen(true);
    if (recording) { speech.stop(); return; }
    if (speech.status === 'loading') return; // mid token / SDK fetch
    try {
      const { text, engine: usedEngine } = await speech.start();
      const silent = usedEngine === 'local';
      if (text) dispatch(text, { silent });
      else if (!silent) speak('I did not catch that');
    } catch { /* error surfaced via speech.error */ }
  };

  useEffect(() => {
    const o = () => setOpen(true);
    window.addEventListener('fb_open_voice', o);
    return () => window.removeEventListener('fb_open_voice', o);
  }, []);

  // Warm up the local Whisper model in the background so offline use works
  // without forcing a ~75 MB download right after the network drops. Only
  // depends on `open` — `speech` is a new object every render, so we'd
  // otherwise re-call preload constantly. The hook itself guards against
  // re-entry, but adding `speech` to deps still caused noisy retries on
  // failure (each retry re-rendered, re-triggered the effect).
  useEffect(() => {
    if (open) speech.preload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Badge: prefer the engine that actually handled the last command (so a
  // browser that still reports onLine:true but is hitting a dead backend
  // correctly flips to "Local" after the first auto-fallback). Fall back to
  // the proactive online/offline indicator before the first command.
  const transcribingLabel = !online || speech.engine === 'local'
    ? 'Transcribing (slow)…' // CPU inference — set expectations
    : 'Transcribing…';
  const micStatus = speech.error
    ? `Err: ${speech.error.length > 22 ? speech.error.slice(0, 22) + '…' : speech.error}`
    : recording ? 'Recording…'
    : speech.status === 'transcribing' ? transcribingLabel
    : speech.status === 'loading' ? 'Preparing mic…'
    : speech.engine === 'local' ? 'Local'
    : speech.engine === 'azure' ? 'Azure'
    : !online ? 'Local'
    : 'Azure';

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      {open && (
        <div className="w-80 rounded-xl border border-border bg-card shadow-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mic className="size-4 text-primary" strokeWidth={1.5} />
              <span className="text-sm font-semibold">Voice</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${recording ? 'bg-[var(--success-bg)] text-[var(--success)]' : 'bg-secondary text-muted-foreground'}`}>
                {micStatus}
              </span>
            </div>
            <button onClick={() => setOpen(false)} className="text-xs text-muted-foreground hover:text-foreground">close</button>
          </div>

          <div className="px-4 py-3 border-b border-border">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Last heard</div>
            <div className="mt-1 font-mono text-xs truncate">{busy ? 'thinking…' : transcript}</div>
          </div>

          {/* Offline-voice control: lets the user explicitly download the local
              Whisper model so the quick commands keep working when the backend
              or network goes away. ~40 MB, IndexedDB-cached after download. */}
          <div className="px-4 py-2 border-b border-border flex items-center justify-between gap-2 text-[10px]">
            <span className="text-muted-foreground">
              Offline voice:{' '}
              <span className={
                speech.localReady ? 'text-[var(--success)]'
                : speech.localFailed ? 'text-destructive'
                : 'text-muted-foreground'
              }>
                {speech.localLoading ? 'downloading…'
                  : speech.localReady ? 'ready ✓'
                  : speech.localFailed ? 'failed — retry?'
                  : 'not downloaded'}
              </span>
            </span>
            {!speech.localReady && (
              <button
                onClick={() => speech.preload(true)}
                disabled={speech.localLoading}
                className="font-mono px-2 py-0.5 rounded border border-border hover:border-primary hover:text-primary disabled:opacity-50"
              >
                {speech.localLoading ? '…' : speech.localFailed ? 'Retry' : 'Download (~100 MB)'}
              </button>
            )}
          </div>

          <button onClick={() => setList((v) => !v)} className="w-full px-4 py-2 text-xs text-muted-foreground flex items-center justify-between hover:bg-secondary border-b border-border">
            Run a command ({COMMANDS.length}) <ChevronDown className={`size-3 transition-transform ${list ? 'rotate-180' : ''}`} />
          </button>
          {list && (
            <ul className="max-h-64 overflow-y-auto divide-y divide-border">
              {COMMANDS.map((c) => (
                <li key={c.phrase} className="px-4 py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-mono text-xs truncate flex items-center gap-1.5">
                      "{c.phrase}"
                      {c.ai && <span className="text-[9px] font-sans px-1 py-0.5 rounded bg-primary/15 text-primary">AI</span>}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">/ {c.sl}</div>
                  </div>
                  <button
                    onClick={() => {
                      const silent = !online || speech.engine === 'local';
                      if (!c.ai) { dispatch(c.phrase.toLowerCase(), { silent }); return; }
                      if (c.ai === 'summary') { dispatch('daily summary', { silent }); return; }
                      const ex = c.ai === 'workout' ? 'log workout bench press 4 sets 20 reps 30 minutes'
                        : c.ai === 'food' ? 'log food oatmeal 400 grams 250 calories'
                        : 'log drink water 300 ml';
                      const t = window.prompt('Speak / type the phrase:', ex);
                      if (t) dispatch(t, { silent });
                    }}
                    disabled={busy || (!!c.ai && !online)}
                    className="flex-none inline-flex items-center gap-1 text-[10px] border border-border rounded-md px-2 py-1 hover:border-primary hover:text-primary disabled:opacity-40"
                  >
                    <Play className="size-3" strokeWidth={1.5} /> Run
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="px-4 py-3 border-t border-border">
            <button
              onClick={() => {
                const t = window.prompt('Simulate spoken phrase:', 'log water');
                if (t) dispatch(t, { silent: !online || speech.engine === 'local' });
              }}
              className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-border py-1.5 text-xs hover:border-primary"
            >
              <Sparkles className="size-3" strokeWidth={1.5} /> Type a phrase
            </button>
            {history.length > 0 && (
              <ul className="mt-3 space-y-0.5 max-h-24 overflow-y-auto">
                {history.map((h, i) => (
                  <li key={i} className="text-[10px] font-mono text-muted-foreground truncate">{h}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={() => setOpen((v) => !v)} className="h-11 px-3 rounded-full border border-border bg-card text-xs hover:border-primary shadow-sm">
          {open ? 'Hide voice' : 'Voice panel'}
        </button>
        <button
          onClick={handleMic}
          disabled={speech.status === 'loading' || speech.status === 'transcribing'}
          aria-label={recording ? 'Stop and transcribe' : 'Speak a command'}
          title={recording ? 'Click to stop and run' : !online ? 'Click, speak, click again (offline → local Whisper)' : 'Click, speak, click again'}
          className={`size-11 rounded-full grid place-items-center border transition-all shadow-sm disabled:opacity-60 ${
            recording ? 'bg-primary text-primary-foreground border-primary scale-105 animate-pulse' : 'bg-card text-foreground border-border hover:border-primary'
          }`}
        >
          {speech.status === 'loading' || speech.status === 'transcribing'
            ? <Loader2 className="size-4 animate-spin" strokeWidth={1.5} />
            : <Mic className="size-4" strokeWidth={1.5} />}
        </button>
      </div>
    </div>
  );
}
