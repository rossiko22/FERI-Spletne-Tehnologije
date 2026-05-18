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
    res.status(201).json({
      user,                                 // password_hash stripped by $formatJson
      access: signAccess(user.id),
      refresh: signRefresh(user.id),
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
    res.json({
      user: row,                            // password_hash stripped by $formatJson
      access: signAccess(row.id),
      refresh: signRefresh(row.id),
    });
  } catch (err) {
    next(err);
  }
};

exports.refresh = async (req, res) => {
  try {
    const { refresh } = req.body;
    const payload = jwt.verify(refresh, process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret');
    if (payload.type !== 'refresh') return res.status(400).json({ error: 'wrong_token_type' });
    res.json({ access: signAccess(payload.sub) });
  } catch {
    res.status(401).json({ error: 'invalid_refresh' });
  }
};

exports.logout = async (req, res) => {
  // TODO (Marko): if we add a refresh-token denylist table, invalidate here.
  res.json({ ok: true });
};

exports.me = async (req, res) => {
  res.json({ user: req.user });
};

exports.googleCallback = async (req, res) => {
  // req.user populated by passport-google-oauth20 strategy
  const access = signAccess(req.user.id);
  const refresh = signRefresh(req.user.id);
  const url = `${process.env.CLIENT_URL || 'http://localhost:5173'}/login?access=${access}&refresh=${refresh}`;
  res.redirect(url);
};
