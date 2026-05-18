// Web Speech API wrapper. OWNER: Marko.
import { useCallback, useEffect, useRef, useState } from 'react';

type Handler = (transcript: string) => void;

export function useVoice(onResult: Handler) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recRef = useRef<any>(null);
  const handlerRef = useRef(onResult);
  handlerRef.current = onResult;

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    setSupported(true);
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';
    rec.onresult = (e: any) => {
      const t = e.results[0][0].transcript.toLowerCase().trim();
      handlerRef.current(t);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
  }, []);

  const toggle = useCallback(() => {
    const rec = recRef.current;
    if (!rec) return;
    if (listening) { rec.stop(); setListening(false); }
    else { try { rec.start(); setListening(true); } catch { /* already running */ } }
  }, [listening]);

  return { listening, supported, toggle };
}
