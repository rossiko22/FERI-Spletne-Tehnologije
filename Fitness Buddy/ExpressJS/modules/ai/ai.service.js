// Azure AI clients. OWNER: Marko.
//   * AZURE_OPENAI_*       → chat/completions (o4-mini) for parse + summary
//   * AZURE_SPEECH_TTS_*   → text-to-speech + speech-to-text via the
//                            AllInOneCreate multi-service Cognitive Services
//                            account. STT reuses the TTS key/region (same
//                            resource) unless overridden with AZURE_SPEECH_STT_*.
// All read from the root .env.

// --- Chat completions (parse + summary) ----------------------------------
const cfg = {
  endpoint:    (process.env.AZURE_OPENAI_ENDPOINT || '').replace(/\/+$/, ''),
  apiKey:      process.env.AZURE_OPENAI_API_KEY || '',
  deployment:  process.env.AZURE_OPENAI_DEPLOYMENT || 'o4-mini',
  apiVersion:  process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview',
  // env value may carry a stray comma ("600,") — parseInt handles it.
  maxTokens:   parseInt(process.env.AZURE_OPENAI_MAX_TOKENS || '600', 10) || 600,
};

function isConfigured() {
  return Boolean(cfg.endpoint && cfg.apiKey);
}

// Calls chat/completions and returns the assistant message content (expected JSON).
// o4-mini is a reasoning model: `temperature` must stay at its default (so we omit
// it) and the budget uses `max_completion_tokens`, which ALSO covers reasoning
// tokens — so we keep generous headroom or the JSON output can come back empty.
async function chatJSON(messages) {
  if (!isConfigured()) throw new Error('azure_not_configured');

  const url = `${cfg.endpoint}/openai/deployments/${cfg.deployment}/chat/completions?api-version=${cfg.apiVersion}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': cfg.apiKey },
    body: JSON.stringify({
      messages,
      max_completion_tokens: Math.max(cfg.maxTokens, 2000),
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`azure_${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// --- STT (speech-to-text, Azure AI Speech via multi-service account) -----
// Browser records audio → server forwards to Speech REST "short audio"
// endpoint → recognized text comes back. Reuses the multi-service key + region
// that TTS already uses (same AllInOneCreate resource), so usually no extra
// env vars needed. The universal model handles English with reasonable
// accent tolerance and is free under the F0 tier (5 audio hours/month).
const sttCfg = {
  key:    process.env.AZURE_SPEECH_STT_KEY    || process.env.AZURE_SPEECH_TTS_KEY    || '',
  region: process.env.AZURE_SPEECH_STT_REGION || process.env.AZURE_SPEECH_TTS_REGION || '',
  language: process.env.AZURE_SPEECH_STT_LANGUAGE || 'en-US',
};

function isSttConfigured() {
  return Boolean(sttCfg.key && sttCfg.region);
}

// Returns { text, status } — `text` is the best transcript, `status` is the
// Azure RecognitionStatus so the client can show "I heard X" vs. genuine silence.
async function recognizeSpeech(buffer, mime = 'audio/webm') {
  if (!isSttConfigured()) throw new Error('stt_not_configured');

  // Azure Speech REST is picky about the Content-Type. Map the recorded MIME
  // to the exact codec descriptor it expects. mp4 (Safari) is NOT supported
  // by the short-audio endpoint — would need server-side transcoding.
  let contentType;
  if (mime.includes('webm'))      contentType = 'audio/webm; codecs=opus';
  else if (mime.includes('ogg'))  contentType = 'audio/ogg; codecs=opus';
  else if (mime.includes('wav'))  contentType = 'audio/wav; codecs=audio/pcm; samplerate=16000';
  else throw new Error(`stt_unsupported_format: ${mime}`);

  // `format=detailed` returns NBest alternatives even when confidence is low.
  // For very short commands ("show today", "log water"), the default simple
  // format often returns NoMatch when an NBest pick would have worked.
  const url = `https://${sttCfg.region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1`
    + `?language=${encodeURIComponent(sttCfg.language)}&format=detailed&profanity=raw`;

  console.log(`[stt] -> ${buffer.length} B ${contentType} ${sttCfg.region}/${sttCfg.language}`);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': sttCfg.key,
      'Content-Type': contentType,
      'Accept': 'application/json',
      'User-Agent': 'FitnessBuddy/1.0',
    },
    body: buffer,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error(`[stt] HTTP ${res.status}: ${body.slice(0, 300)}`);
    throw new Error(`stt_${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  console.log(`[stt] <- ${JSON.stringify(data).slice(0, 400)}`);

  const status = data.RecognitionStatus || 'Unknown';
  // Prefer the top NBest display variant; fall back to DisplayText.
  const nbestText = data.NBest?.[0]?.Display || data.NBest?.[0]?.Lexical || '';
  const text = String(data.DisplayText || nbestText || '').trim();

  // Even on NoMatch, surface anything Azure heard — its lexical guess often
  // contains the right command even when the LM thinks confidence is too low.
  return { text, status };
}

// --- TTS (text-to-speech, Azure AI Speech via multi-service account) -----
// Studio-quality American neural voices via Azure Speech Services' REST API.
// Used by the spoken summary + command confirmations so we don't depend on
// whatever default voice the user's OS happens to have installed (which on
// Linux is often a robotic eSpeak voice). Voices are *neural*: AriaNeural,
// JennyNeural, GuyNeural, DavisNeural, etc. — set via AZURE_SPEECH_TTS_VOICE.
//
// We hit the regional TTS endpoint directly with the multi-service key (no
// token issuance needed for server-to-server calls). Body is SSML so we can
// later add per-utterance style/prosody if we want.
const ttsCfg = {
  key:    process.env.AZURE_SPEECH_TTS_KEY || '',
  region: process.env.AZURE_SPEECH_TTS_REGION || '',
  voice:  process.env.AZURE_SPEECH_TTS_VOICE || 'en-US-AriaNeural',
  // 24 kHz / 48 kbps mono mp3 is the sweet spot — clean voice, ~30 KB for a
  // typical confirmation. Override via env if you want HD (48 kHz/96 kbps).
  format: process.env.AZURE_SPEECH_TTS_FORMAT || 'audio-24khz-48kbitrate-mono-mp3',
};

function isTtsConfigured() {
  return Boolean(ttsCfg.key && ttsCfg.region);
}

// Escape so user-typed text can't break out of the SSML and inject markup.
function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Returns { buffer, format } of synthesized audio (mp3 by default). Caller
// is responsible for setting the right Content-Type when sending it on.
async function synthesizeSpeech(text) {
  if (!isTtsConfigured()) throw new Error('tts_not_configured');
  const url = `https://${ttsCfg.region}.tts.speech.microsoft.com/cognitiveservices/v1`;
  const ssml =
    `<speak version="1.0" xml:lang="en-US">` +
    `<voice name="${ttsCfg.voice}">${escapeXml(text)}</voice>` +
    `</speak>`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': ttsCfg.key,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': ttsCfg.format,
      // Speech REST requires a User-Agent header; rejected without one.
      'User-Agent': 'FitnessBuddy/1.0',
    },
    body: ssml,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`tts_${res.status}: ${body.slice(0, 300)}`);
  }
  return { buffer: Buffer.from(await res.arrayBuffer()), format: 'mp3' };
}

module.exports = {
  cfg, isConfigured, chatJSON,
  sttCfg, isSttConfigured, recognizeSpeech,
  ttsCfg, isTtsConfigured, synthesizeSpeech,
};
