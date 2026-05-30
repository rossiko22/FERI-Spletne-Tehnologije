// AI voice controllers. OWNER: Marko.
//   POST /api/ai/parse    { transcript }  -> { intent, fields }   (Azure o4-mini)
//   GET  /api/ai/summary                  -> { text, stats }       (Postgres + o4-mini)
const { BaseModel } = require('../../config/db');
const {
  chatJSON, isConfigured,
  isSttConfigured, recognizeSpeech,
  isTtsConfigured, synthesizeSpeech,
} = require('./ai.service');

const todayISO = () => new Date().toISOString().slice(0, 10);

const PARSE_SYS = `You convert ONE short spoken fitness log into JSON for a tracker.
Return ONLY JSON: {"intent":"workout"|"food"|"drink","fields":{...}}.
- workout fields: {"name":string,"sets":integer,"reps":integer,"duration":integer minutes}
- food fields:    {"name":string,"amount":number,"unit":"g"|"kg"|"kcal","calories":integer}
- drink fields:   {"name":string,"amount":number,"unit":"ml"|"l","water":integer milliliters}
Rules: infer sensible numbers; use 0 only if truly unknown. Food unit defaults to g, drink to ml.
Convert liters to milliliters for "water". Keep "name" short (e.g. "Bench press", "Oatmeal", "Water").`;

exports.parse = async (req, res, next) => {
  try {
    if (!isConfigured()) return res.status(503).json({ error: 'ai_unavailable' });
    const transcript = String(req.body?.transcript || '').slice(0, 500).trim();
    if (!transcript) return res.status(400).json({ error: 'empty_transcript' });

    const content = await chatJSON([
      { role: 'system', content: PARSE_SYS },
      { role: 'user', content: transcript },
    ]);

    let parsed;
    try { parsed = JSON.parse(content); }
    catch { return res.status(502).json({ error: 'ai_bad_json', raw: content }); }

    if (!parsed || !['workout', 'food', 'drink'].includes(parsed.intent)) {
      return res.status(502).json({ error: 'ai_bad_intent', raw: parsed });
    }
    res.json({ intent: parsed.intent, fields: parsed.fields || {} });
  } catch (err) { next(err); }
};

async function gatherStats(userId) {
  const knex = BaseModel.knex();
  const today = todayISO();

  const meals = await knex('meals').where({ user_id: userId, date: today })
    .select(knex.raw('COALESCE(SUM(calories),0)::int as kcal'))
    .select(knex.raw('COALESCE(SUM(water_ml),0)::int as water'))
    .first();

  const wo = await knex('workouts').where({ user_id: userId, date: today })
    .select(knex.raw('COUNT(*)::int as cnt'))
    .select(knex.raw('COALESCE(SUM(duration_min),0)::int as minutes'))
    .first();

  const habitsTotal = await knex('habits').where({ user_id: userId }).count('* as c').first();
  const habitsToday = await knex('habit_logs as hl')
    .join('habits as h', 'h.id', 'hl.habit_id')
    .where('h.user_id', userId).andWhere('hl.date', today)
    .count('* as c').first();

  // Distinct activity dates → consecutive-day streak ending today.
  const datesRes = await knex.raw(
    `select d from (
       select date::text d from workouts where user_id = :u
       union select date::text from meals where user_id = :u
       union select hl.date::text from habit_logs hl
         join habits h on h.id = hl.habit_id where h.user_id = :u
     ) t order by d desc`,
    { u: userId },
  );
  const have = new Set((datesRes.rows || []).map((r) => r.d));
  let streak = 0;
  const cursor = new Date(today);
  while (have.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    caloriesConsumed: meals.kcal,
    caloriesBurned: wo.minutes * 8,
    water: meals.water,
    waterGoal: 2500,
    workouts: wo.cnt,
    minutes: wo.minutes,
    streak,
    habitsDone: Number(habitsToday.c),
    habitsTotal: Number(habitsTotal.c),
  };
}

function fallbackText(s) {
  return `Today you consumed ${s.caloriesConsumed} calories and burned about ${s.caloriesBurned}. `
    + `You did ${s.workouts} workout${s.workouts === 1 ? '' : 's'} totaling ${s.minutes} minutes, `
    + `drank ${s.water} of ${s.waterGoal} milliliters of water, and you're on a ${s.streak}-day streak. `
    + `You completed ${s.habitsDone} of ${s.habitsTotal} habits today.`;
}

const SUMMARY_SYS = `You are a concise, upbeat fitness assistant. Given today's stats as JSON,
write ONE natural spoken-style summary of 2-3 sentences (plain text, no markdown, no lists),
ending with a short motivational nudge based on whether goals are being met.
Output ONLY JSON: {"text":"..."}.`;

// Audio transcription via Azure AI Speech STT (multi-service account).
// Body is the raw audio blob from the client's MediaRecorder; we forward it
// to the regional short-audio recognition endpoint and return the text.
exports.transcribe = async (req, res, next) => {
  try {
    if (!isSttConfigured()) return res.status(503).json({ error: 'stt_unavailable' });
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res.status(400).json({ error: 'empty_audio' });
    }
    const mime = req.headers['content-type'] || 'audio/webm';
    const { text, status } = await recognizeSpeech(req.body, mime);
    res.json({ text, status });
  } catch (err) { next(err); }
};

// Text-to-speech via Azure Speech Services neural voices. Body is { text };
// response is raw audio (mp3) the browser plays via an <audio> element. This
// replaces the OS-default speechSynthesis voice for consistent, studio-grade
// playback regardless of platform.
exports.speak = async (req, res, next) => {
  try {
    if (!isTtsConfigured()) return res.status(503).json({ error: 'tts_unavailable' });
    const text = String(req.body?.text || '').slice(0, 1000).trim();
    if (!text) return res.status(400).json({ error: 'empty_text' });
    const { buffer } = await synthesizeSpeech(text);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (err) { next(err); }
};

exports.summary = async (req, res, next) => {
  try {
    const stats = await gatherStats(req.user.id);
    let text;
    if (isConfigured()) {
      try {
        const content = await chatJSON([
          { role: 'system', content: SUMMARY_SYS },
          { role: 'user', content: JSON.stringify(stats) },
        ]);
        text = JSON.parse(content).text || fallbackText(stats);
      } catch {
        text = fallbackText(stats); // Azure failed — still give a useful spoken summary
      }
    } else {
      text = fallbackText(stats);
    }
    res.json({ text, stats });
  } catch (err) { next(err); }
};
