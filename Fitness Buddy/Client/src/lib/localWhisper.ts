// Offline speech-to-text via transformers.js (OpenAI Whisper-tiny.en).
// OWNER: Marko. Used only when navigator.onLine === false, so the quick
// navigation commands ("Show today", "Log water", "Logout"…) still work
// without the Azure backend. The first transcription needs a network
// connection to download the model (~40 MB) — after that, transformers.js
// caches it in IndexedDB and subsequent calls run fully on-device.
//
// The AI-backed commands (Log workout/food/drink, Daily summary) intentionally
// stay disabled offline since they need the chat completions endpoint.

// Model + precision pick. We want base.en (~6% WER, accent-tolerant) but it
// can't fit on consumer browsers in any precision that we've gotten to load:
//   * q8:  broken quant graph (missing scale tensors)
//   * fp16: broken SimplifiedLayerNormFusion graph
//   * fp32: loads, but ~400 MB runtime tensors crash Firefox.
//
// So we're stuck on tiny.en + fp32 — ~100 MB on disk, ~200 MB resident,
// loads reliably. Accuracy is ~8% WER on clean English (vs Azure's ~5-7%)
// and degrades faster on strong accents. The plan to recover quality without
// a bigger model is heavy fuzzy-matching the transcript against the known
// command list in VoicePanel — handled there, not here.
const MODEL = 'Xenova/whisper-tiny.en';
const DTYPE = 'fp32';

let pipelinePromise: Promise<any> | null = null;

export function preloadLocalWhisper(): Promise<any> {
  if (!pipelinePromise) {
    pipelinePromise = import('@huggingface/transformers')
      .then(({ pipeline }) => pipeline('automatic-speech-recognition', MODEL, {
        dtype: DTYPE,
      } as any))
      .catch((err) => { pipelinePromise = null; throw err; });
  }
  return pipelinePromise;
}

export async function transcribeLocally(audio: Float32Array): Promise<string> {
  const pipe = await preloadLocalWhisper();
  const t0 = performance.now();
  console.log(`[whisper] inference start: ${audio.length} samples (${(audio.length / 16000).toFixed(1)} s)`);
  // Generation kwargs tuned for short single-utterance commands. NOTE: don't
  // pass `language` or `task` — the .en model variants lock those internally
  // and reject the override with "Cannot specify task or language for an
  // English-only model".
  //  - temperature=0 + do_sample=false: deterministic greedy decoding,
  //    no creative hallucinations.
  //  - condition_on_previous_text=false: don't bias next phrase by the
  //    previous one (we transcribe one command at a time anyway).
  //  - no_speech_threshold=0.6: more aggressive silence rejection so a
  //    quiet recording returns "" instead of a hallucinated phrase.
  const out: any = await pipe(audio, {
    temperature: 0,
    do_sample: false,
    condition_on_previous_text: false,
    no_speech_threshold: 0.6,
    return_timestamps: false,
  } as any);
  const ms = Math.round(performance.now() - t0);
  console.log(`[whisper] inference done in ${ms}ms: "${out?.text || ''}"`);
  return String(out?.text || '').trim();
}

// Check whether the model is already loaded (so VoicePanel can avoid
// triggering a 40 MB download on a slow connection).
export function isLocalWhisperReady(): boolean {
  return !!pipelinePromise;
}
