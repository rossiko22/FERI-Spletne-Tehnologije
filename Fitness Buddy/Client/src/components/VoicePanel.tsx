// Voice command panel. OWNER: Marko.
// Uses Web Speech API; falls back to typed phrases when SpeechRecognition is
// unavailable (Firefox, Safari < 17, server render).
import { useEffect, useState } from 'react';
import { Mic, MicOff, Sparkles, ChevronDown, Play } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { useVoice } from '@/lib/useVoice';
import { runCommand } from '@/lib/commandBus';

type Phrase = {
  phrase: string;
  sl: string;
  match: RegExp;
  run: (nav: ReturnType<typeof useNavigate>, transcript: string) => void | Promise<void>;
};

const COMMANDS: Phrase[] = [
  { phrase: 'Log water',      sl: 'Zabeleži vodo',     match: /water|vodo/,                            run: (_, t) => runCommand('log-water',        { source: 'voice', transcript: t }) },
  { phrase: 'Quick workout',  sl: 'Hiter trening',      match: /quick workout|workout set|hiter trening/, run: (_, t) => runCommand('log-workout-quick', { source: 'voice', transcript: t }) },
  { phrase: 'Tick habit',     sl: 'Označi navado',      match: /tick|habit done|mark habit|označi|navad/,  run: (_, t) => runCommand('tick-first-habit',  { source: 'voice', transcript: t }) },
  { phrase: 'Bump goal',      sl: 'Napreduj cilj',      match: /bump|goal|cilj/,                          run: (_, t) => runCommand('bump-first-goal',   { source: 'voice', transcript: t }) },
  { phrase: 'Delete last',    sl: 'Izbriši zadnje',     match: /delete last|undo|izbriši/,                run: (_, t) => runCommand('delete-last-meal',  { source: 'voice', transcript: t }) },
  { phrase: 'Open workouts',  sl: 'Pojdi na treninge',  match: /open workout|go to workout|treninge/,     run: (nav) => nav({ to: '/workouts' }) },
  { phrase: 'Show today',     sl: 'Prikaži danes',      match: /today|dashboard|danes|home/,              run: (nav) => nav({ to: '/' }) },
];

function speak(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  window.speechSynthesis.speak(u);
}

export function VoicePanel() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [transcript, setTranscript] = useState<string>('—');
  const [list, setList] = useState(true);
  const [history, setHistory] = useState<string[]>([]);

  const dispatch = async (t: string) => {
    setTranscript(t);
    const hit = COMMANDS.find((c) => c.match.test(t.toLowerCase()));
    if (!hit) { speak('Command not recognised'); setHistory((h) => [`✗ "${t}" — unknown`, ...h].slice(0, 6)); return; }
    await hit.run(navigate, t);
    setHistory((h) => [`✓ ${hit.phrase}`, ...h].slice(0, 6));
    speak(hit.phrase);
  };

  const { listening, supported, toggle } = useVoice(dispatch);

  useEffect(() => {
    const o = () => setOpen(true);
    window.addEventListener('fb_open_voice', o);
    return () => window.removeEventListener('fb_open_voice', o);
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      {open && (
        <div className="w-80 rounded-xl border border-border bg-card shadow-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mic className="size-4 text-primary" strokeWidth={1.5} />
              <span className="text-sm font-semibold">Voice</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${listening ? 'bg-[var(--success-bg)] text-[var(--success)]' : 'bg-secondary text-muted-foreground'}`}>
                {listening ? 'Listening' : supported ? 'Idle' : 'Sim only'}
              </span>
            </div>
            <button onClick={() => setOpen(false)} className="text-xs text-muted-foreground hover:text-foreground">close</button>
          </div>

          <div className="px-4 py-3 border-b border-border">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Last heard</div>
            <div className="mt-1 font-mono text-xs truncate">{transcript}</div>
          </div>

          <button onClick={() => setList((v) => !v)} className="w-full px-4 py-2 text-xs text-muted-foreground flex items-center justify-between hover:bg-secondary border-b border-border">
            Run a command ({COMMANDS.length}) <ChevronDown className={`size-3 transition-transform ${list ? 'rotate-180' : ''}`} />
          </button>
          {list && (
            <ul className="max-h-64 overflow-y-auto divide-y divide-border">
              {COMMANDS.map((c) => (
                <li key={c.phrase} className="px-4 py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-mono text-xs truncate">"{c.phrase}"</div>
                    <div className="text-[10px] text-muted-foreground truncate">/ {c.sl}</div>
                  </div>
                  <button
                    onClick={() => dispatch(c.phrase.toLowerCase())}
                    className="flex-none inline-flex items-center gap-1 text-[10px] border border-border rounded-md px-2 py-1 hover:border-primary hover:text-primary"
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
                if (t) dispatch(t);
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
          onClick={() => { if (supported) toggle(); else setOpen(true); }}
          aria-label={listening ? 'Stop voice' : 'Start voice'}
          className={`size-11 rounded-full grid place-items-center border transition-all shadow-sm ${
            listening ? 'bg-primary text-primary-foreground border-primary scale-105' : 'bg-card text-foreground border-border hover:border-primary'
          }`}
        >
          {listening ? <Mic className="size-4" strokeWidth={1.5} /> : <MicOff className="size-4" strokeWidth={1.5} />}
        </button>
      </div>
    </div>
  );
}
