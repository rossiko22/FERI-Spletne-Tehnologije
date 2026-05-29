// Auth controllers. Skeletons — Marko fills in real bcrypt + JWT logic.
// OWNER: Marko.

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { v4: uuid } = require('uuid');

const User = require('../../models/User');

const ACCESS_TTL = process.env.JWT_ACCESS_TTL || '15m';
const REFRESH_TTL = process.env.JWT_REFRESH_TTL || '7d';

function signAccess(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_ACCESS_SECRET || 'dev-access-secret', {
    expiresIn: ACCESS_TTL,
  });
}

function signRefresh(userId) {
  return jwt.sign({ sub: userId, type: 'refresh' }, process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret', {
    expiresIn: REFRESH_TTL,
  });
}

// --- Refresh token cookie ---
// httpOnly so JS (and thus XSS) can't read it; SameSite=Lax + path-scoped to
// /api/auth blocks CSRF and keeps it off every other request. Secure in prod.
const REFRESH_COOKIE = 'fb_refresh';

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days, matches REFRESH_TTL
  };
}

function setRefreshCookie(res, userId) {
  res.cookie(REFRESH_COOKIE, signRefresh(userId), refreshCookieOptions());
}

function clearRefreshCookie(res) {
  const { maxAge, ...opts } = refreshCookieOptions();
  res.clearCookie(REFRESH_COOKIE, opts);
}

exports.register = async (req, res, next) => {
  try {
    const { email, name, password } = req.body;
    const existing = await User.query().findOne({ email });
    if (existing) return res.status(409).json({ error: 'email_taken' });

    const hash = await bcrypt.hash(password, 12);
    const user = await User.query().insert({
      id: uuid(),
      email,
      name,
      password_hash: hash,
    });
    setRefreshCookie(res, user.id);
    res.status(201).json({
      user,                                 // password_hash stripped by $formatJson
      access: signAccess(user.id),          // refresh lives in the httpOnly cookie
    });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    // Need raw row (including password_hash) — fetch as plain object.
    const row = await User.query().findOne({ email });
    if (!row) return res.status(401).json({ error: 'invalid_credentials' });
    const ok = await bcrypt.compare(password, row.password_hash || '');
    if (!ok) return res.status(401).json({ error: 'invalid_credentials' });
    setRefreshCookie(res, row.id);
    res.json({
      user: row,                            // password_hash stripped by $formatJson
      access: signAccess(row.id),           // refresh lives in the httpOnly cookie
    });
  } catch (err) {
    next(err);
  }
};

exports.refresh = async (req, res) => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) return res.status(401).json({ error: 'no_refresh' });

    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret');
    if (payload.type !== 'refresh') return res.status(400).json({ error: 'wrong_token_type' });

    const user = await User.query().findById(payload.sub);
    if (!user) {
      clearRefreshCookie(res);
      return res.status(401).json({ error: 'invalid_refresh' });
    }

    // Sliding session + lets the client re-hydrate the user on a fresh page load.
    setRefreshCookie(res, user.id);
    res.json({ access: signAccess(user.id), user });
  } catch {
    clearRefreshCookie(res);
    res.status(401).json({ error: 'invalid_refresh' });
  }
};

exports.logout = async (req, res) => {
  // TODO (Marko): if we add a refresh-token denylist table, invalidate here.
  clearRefreshCookie(res);
  res.json({ ok: true });
};

exports.me = async (req, res) => {
  res.json({ user: req.user });
};

exports.googleCallback = async (req, res) => {
  // req.user populated by passport-google-oauth20 strategy.
  // Set the refresh cookie and bounce back with no tokens in the URL — the
  // client exchanges the cookie for an access token via /api/auth/refresh.
  setRefreshCookie(res, req.user.id);
  res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/login?oauth=1`);
};
