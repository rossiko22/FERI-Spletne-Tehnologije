// Browser speech-to-text via Azure OpenAI Whisper (audio upload).
// OWNER: Marko. Whisper is the gold standard for accented English — far more
// tolerant than the Speech Services base model — so it's the primary engine
// for our voice commands. The browser records audio with MediaRecorder; the
// recording is uploaded to /api/ai/transcribe; the server forwards it to the
// Azure OpenAI deployment (AZURE_OPENAI_WHISPER_DEPLOYMENT) and returns the
// transcript. The Azure key never reaches the browser.
//
// UX: push-to-talk. Click mic → status "Recording…". Click again → status
// "Transcribing…" while the audio uploads. Result is dispatched to the command
// bus. There's no auto-stop, no model download, no websocket auth dance — just
// record, upload, transcribe.

import { useCallback, useEffect, useRef, useState } from 'react';
import { ai } from './api';
import { preloadLocalWhisper, transcribeLocally } from './localWhisper';

export type AzureSpeechStatus = 'idle' | 'loading' | 'recording' | 'transcribing';
export type SpeechEngine = 'azure' | 'local' | null;
export type SpeechResult = { text: string; engine: 'azure' | 'local' };

// MediaRecorder MIME-type negotiation. We *prefer* webm/opus (small files,
// supported by Whisper and produced by Chromium + Firefox). Safari only does
// mp4/aac, which Whisper also accepts.
function pickMime(): string {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ];
  for (const m of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) return m;
  }
  return ''; // let the browser choose
}

// Decode a recorded blob (webm/opus or whatever) into a Float32 mono 16 kHz
// sample buffer. Shared by the cloud path (Azure wants PCM samples in a WAV
// wrapper) and the offline path (local Whisper takes the Float32 directly).
async function blobToMono16k(blob: Blob): Promise<Float32Array> {
  const arr = await blob.arrayBuffer();
  const AudioCtx: typeof AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
  const ctx = new AudioCtx();
  const decoded = await ctx.decodeAudioData(arr);

  // Mix to mono.
  let mono: Float32Array;
  if (decoded.numberOfChannels > 1) {
    const a = decoded.getChannelData(0);
    const b = decoded.getChannelData(1);
    mono = new Float32Array(a.length);
    for (let i = 0; i < a.length; i++) mono[i] = (a[i] + b[i]) / 2;
  } else {
    mono = new Float32Array(decoded.getChannelData(0));
  }

  const TARGET = 16000;
  let samples: Float32Array;
  if (decoded.sampleRate === TARGET) {
    samples = mono;
  } else {
    // Resample via OfflineAudioContext.
    const len = Math.ceil((mono.length * TARGET) / decoded.sampleRate);
    const offline = new OfflineAudioContext(1, len, TARGET);
    const tmp = offline.createBuffer(1, mono.length, decoded.sampleRate);
    tmp.getChannelData(0).set(mono);
    const src = offline.createBufferSource();
    src.buffer = tmp;
    src.connect(offline.destination);
    src.start();
    const rendered = await offline.startRendering();
    samples = rendered.getChannelData(0);
  }
  await ctx.close();
  return samples;
}

// Minimal RIFF/WAVE encoder: 44-byte header + Int16 little-endian samples.
function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const dataLen = samples.length * 2;
  const buf = new ArrayBuffer(44 + dataLen);
  const v = new DataView(buf);
  // "RIFF" <size> "WAVE"
  v.setUint8(0, 0x52); v.setUint8(1, 0x49); v.setUint8(2, 0x46); v.setUint8(3, 0x46);
  v.setUint32(4, 36 + dataLen, true);
  v.setUint8(8, 0x57); v.setUint8(9, 0x41); v.setUint8(10, 0x56); v.setUint8(11, 0x45);
  // "fmt " chunk
  v.setUint8(12, 0x66); v.setUint8(13, 0x6d); v.setUint8(14, 0x74); v.setUint8(15, 0x20);
  v.setUint32(16, 16, true);          // fmt chunk size
  v.setUint16(20, 1, true);           // PCM format
  v.setUint16(22, 1, true);           // 1 channel (mono)
  v.setUint32(24, sampleRate, true);  // sample rate
  v.setUint32(28, sampleRate * 2, true); // byte rate (sampleRate * blockAlign)
  v.setUint16(32, 2, true);           // block align (channels * bitsPerSample/8)
  v.setUint16(34, 16, true);          // bits per sample
  // "data" chunk
  v.setUint8(36, 0x64); v.setUint8(37, 0x61); v.setUint8(38, 0x74); v.setUint8(39, 0x61);
  v.setUint32(40, dataLen, true);
  // Float32 [-1,1] → Int16 little-endian.
  let off = 44;
  for (let i = 0; i < samples.length; i++, off += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buf], { type: 'audio/wav' });
}

export function useAzureSpeech() {
  const [status, setStatus] = useState<AzureSpeechStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  // Which engine handled the *last* command, so the panel can label the badge
  // and skip TTS confirmations when local Whisper was used (cloud TTS is
  // unreachable in that case and the OS fallback voice sounds awful).
  const [engine, setEngine] = useState<SpeechEngine>(null);
  // Local Whisper download state — surfaced so the panel can show an
  // "Offline ready / downloading / not cached" indicator.
  const [localReady, setLocalReady] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  // Set when a preload attempt errored — prevents auto-retry on every render
  // (we'd otherwise spam the console with the same failure). The user can
  // click the "Download" button to retry explicitly.
  const [localFailed, setLocalFailed] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const resolveRef = useRef<((result: SpeechResult) => void) | null>(null);
  const rejectRef = useRef<((err: Error) => void) | null>(null);

  // Warm up the local Whisper model. Tries regardless of navigator.onLine —
  // a cached model loads from IndexedDB with no network. The first-time
  // download (~75 MB fp32) does need connectivity.
  //
  // `force` lets the explicit "Download" button retry after a prior failure.
  // Without it, an automatic call (e.g. from a useEffect) is suppressed if a
  // previous attempt already errored — otherwise React renders would spam
  // the failing download until something else changes.
  const preload = useCallback((force = false) => {
    if (localReady || localLoading) return;
    if (localFailed && !force) return;
    setLocalLoading(true);
    setLocalFailed(false);
    preloadLocalWhisper()
      .then(() => {
        setLocalReady(true);
        console.log('[voice] local Whisper ready');
      })
      .catch((err) => {
        console.warn('[voice] local Whisper preload failed:', err);
        setLocalFailed(true);
      })
      .finally(() => setLocalLoading(false));
  }, [localReady, localLoading, localFailed]);

  // Stop recording → flush a final chunk → upload → resolve with transcript.
  const stop = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state === 'recording') rec.stop();
  }, []);

  const start = useCallback((): Promise<SpeechResult> => {
    return new Promise<SpeechResult>((resolve, reject) => {
      (async () => {
        setError(null);
        setStatus('loading');

        let stream: MediaStream;
        try {
          // Minimal constraints: browser DSP (echoCancellation /
          // noiseSuppression / autoGainControl) was actively SUPPRESSING the
          // voice on Linux — Azure was getting clean silence and reporting
          // Success with Confidence:0. Turning them all off and letting the
          // mic stream raw audio gives Azure something to work with. We can
          // re-enable autoGainControl later if quiet voices need a boost.
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: true,
            },
          });
        } catch (e: any) {
          const name = e?.name || '';
          const msg = name === 'NotAllowedError' || name === 'SecurityError'
              ? 'Microphone permission denied.'
            : name === 'NotFoundError' || name === 'OverconstrainedError'
              ? 'No usable microphone found.'
            : name === 'NotReadableError'
              ? 'Microphone is in use by another app.'
            : e?.message || 'Microphone unavailable.';
          console.error('[voice] getUserMedia failed:', name, e);
          setStatus('idle');
          setError(msg);
          reject(new Error(name || 'mic_failed'));
          return;
        }
        streamRef.current = stream;
        chunksRef.current = [];
        resolveRef.current = resolve;
        rejectRef.current = reject;

        const mime = pickMime();
        // Don't pin bitrate — some browsers ignore it but still produce a
        // mis-described container that confuses Azure's parser. Let the
        // browser pick whatever it's happy producing.
        const opts: MediaRecorderOptions = mime ? { mimeType: mime } : {};
        const rec = new MediaRecorder(stream, opts);
        recorderRef.current = rec;
        console.log(`[voice] recording started: mime=${rec.mimeType || '(default)'}`);

        rec.ondataavailable = (e) => { if (e.data && e.data.size) chunksRef.current.push(e.data); };

        rec.onstop = async () => {
          streamRef.current?.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
          recorderRef.current = null;

          // No audio captured (user clicked stop immediately).
          if (!chunksRef.current.length) {
            setStatus('idle');
            resolveRef.current?.({ text: '', engine: engine ?? (navigator.onLine === false ? 'local' : 'azure') });
            resolveRef.current = rejectRef.current = null;
            return;
          }

          const blobType = rec.mimeType || mime || 'audio/webm';
          const raw = new Blob(chunksRef.current, { type: blobType });
          chunksRef.current = [];
          console.log(`[voice] recorded ${raw.size} B (${blobType})`);

          try {
            setStatus('transcribing');
            // Decode once, then either upload to Azure (online) or hand the
            // samples to the in-browser Whisper model (offline / Azure down).
            const samples = await blobToMono16k(raw);

            let text = '';
            let sttStatus: string | undefined;
            let usedEngine: 'azure' | 'local';

            // Try Azure first if the browser thinks we're online — but if
            // it fails (server down, network drop, 5xx), fall back to local
            // Whisper automatically. `navigator.onLine === false` short-
            // circuits straight to local so we don't waste time on a doomed
            // network call when WiFi is off / DevTools forced us offline.
            const tryLocal = async () => {
              console.log(`[voice] → local Whisper (${samples.length} samples)`);
              try {
                text = await transcribeLocally(samples);
                console.log(`[voice] local Whisper text: "${text}"`);
                usedEngine = 'local';
                setLocalReady(true);
              } catch (err: any) {
                console.error('[voice] local Whisper failed:', err);
                throw new Error('Offline voice model not downloaded. Use the "Download offline voice" button in the panel while you have internet.');
              }
            };

            if (navigator.onLine === false) {
              await tryLocal();
            } else {
              try {
                const wav = encodeWav(samples, 16000);
                console.log(`[voice] uploading ${wav.size} B (audio/wav PCM 16k)`);
                const result = await ai.transcribe(wav);
                text = result.text;
                sttStatus = result.status;
                usedEngine = 'azure';
              } catch (azureErr: any) {
                console.warn('[voice] Azure failed, falling back to local Whisper:', azureErr?.message || azureErr);
                await tryLocal();
              }
            }

            setEngine(usedEngine!);
            setStatus('idle');
            // Only show "NoMatch/Babble" as a UI error when Azure produced it.
            // Local Whisper has no equivalent — empty text just means silence.
            if (usedEngine! === 'azure' && sttStatus && sttStatus !== 'Success') {
              console.warn(`[voice] STT returned ${sttStatus}; text="${text}"`);
              setError(`STT: ${sttStatus}`);
            }
            resolveRef.current?.({ text: text || '', engine: usedEngine! });
          } catch (err: any) {
            // Build a useful error: ApiError has status + body, others have message.
            const status = err?.status;
            const body = err?.body;
            const apiCode = body && (body.error || body.message);
            const msg = status
              ? `HTTP ${status}${apiCode ? ` ${apiCode}` : ''}`
              : (err?.message || 'Transcription failed');
            console.error('[voice] transcribe failed:', { status, body, err });
            setStatus('idle');
            setError(msg);
            rejectRef.current?.(err);
          } finally {
            resolveRef.current = rejectRef.current = null;
          }
        };

        rec.start();
        setStatus('recording');
      })().catch((err) => {
        setStatus('idle');
        setError(err?.message || 'Microphone failed');
        reject(err);
      });
    });
  }, []);

  // Clean up if the component unmounts mid-recording.
  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    try { recorderRef.current?.stop(); } catch { /* ignore */ }
  }, []);

  return { status, modelReady: true, error, engine, localReady, localLoading, localFailed, preload, start, stop };
}
