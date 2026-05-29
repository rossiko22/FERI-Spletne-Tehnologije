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

exports.getPublicKey = (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || null });
};

exports.subscribe = async (req, res, next) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: 'missing subscription' });
    }

    const existing = await PushSubscription.query().findOne({ user_id: req.user.id, endpoint });
    if (existing) {
      await PushSubscription.query().patchAndFetchById(existing.id, {
        p256dh: keys.p256dh,
        auth_key: keys.auth,
      });
      return res.json({ ok: true, updated: true });
    }

    await PushSubscription.query().insert({
      id: uuid(),
      user_id: req.user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth_key: keys.auth,
    });
    res.status(201).json({ ok: true, created: true });
  } catch (err) {
    next(err);
  }
};

exports.unsubscribe = async (req, res, next) => {
  try {
    await PushSubscription.query().where({ user_id: req.user.id }).delete();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
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
            return PushSubscription.query().deleteById(s.id);
          }
          throw err;
        }),
    ),
  );
}

exports.test = async (req, res, next) => {
  try {
    await sendToUser(req.user.id, {
      title: 'FitnessBuddy',
      body: 'Testno obvestilo deluje!',
      url: '/',
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

exports.sendToAll = async (req, res, next) => {
  try {
    const { title, body, url = '/' } = req.body;
    const subs = await PushSubscription.query();
    await Promise.all(
      subs.map((s) =>
        webpush
          .sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth_key } },
            JSON.stringify({ title, body, url }),
          )
          .catch((err) => {
            if (err.statusCode === 410 || err.statusCode === 404) {
              return PushSubscription.query().deleteById(s.id);
            }
            throw err;
          }),
      ),
    );
    res.json({ ok: true, sent: subs.length });
  } catch (err) {
    next(err);
  }
};

exports._sendToUser = sendToUser;
