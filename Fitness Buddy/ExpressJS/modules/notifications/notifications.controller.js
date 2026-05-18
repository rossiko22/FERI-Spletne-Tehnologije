// Web Push notifications — skeleton. OWNER: Ana.
//
// Setup:
//   1. Run `npx web-push generate-vapid-keys` once and paste into .env.
//   2. The client fetches GET /public-key, subscribes via the PushManager
//      using that key, then POSTs the resulting subscription to /subscribe.
//   3. To deliver a reminder, load matching subscriptions and call
//      webpush.sendNotification(sub, JSON.stringify(payload)).

const { v4: uuid } = require('uuid');
const webpush = require('web-push');

const PushSubscription = require('../../models/PushSubscription');

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:team@fitnessbuddy.local',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
}

exports.publicKey = (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || null });
};

exports.subscribe = async (req, res, next) => {
  try {
    const { endpoint, keys } = req.body;
    const existing = await PushSubscription.query().findOne({ user_id: req.user.id, endpoint });
    if (existing) {
      const updated = await PushSubscription.query().patchAndFetchById(existing.id, {
        p256dh: keys.p256dh,
        auth_key: keys.auth,
      });
      return res.json({ ok: true, updated: true, subscription: updated });
    }
    await PushSubscription.query().insert({
      id: uuid(),
      user_id: req.user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth_key: keys.auth,
    });
    res.status(201).json({ ok: true, created: true });
  } catch (err) { next(err); }
};

async function sendToUser(userId, payload) {
  const subs = await PushSubscription.query().where({ user_id: userId });
  await Promise.all(
    subs.map((s) =>
      webpush
        .sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth_key } },
          JSON.stringify(payload),
        )
        .catch((err) => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            // subscription expired — clean up
            return PushSubscription.query().deleteById(s.id);
          }
          console.error('[push] send failed', err.statusCode, err.body);
        }),
    ),
  );
}

exports.testPush = async (req, res, next) => {
  try {
    await sendToUser(req.user.id, { title: 'FitnessBuddy', body: 'Test reminder — drink water 💧', url: '/' });
    res.json({ ok: true });
  } catch (err) { next(err); }
};

exports.send = async (req, res, next) => {
  try {
    const target = req.body.userId || req.user.id;
    await sendToUser(target, {
      title: req.body.title,
      body: req.body.body,
      url: req.body.url || '/',
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
};

exports._sendToUser = sendToUser; // exported for cron jobs / internal callers
