import crypto from 'node:crypto';
import { sessionSecret } from './db.js';

export const COOKIE_NAME = 'ys_studio';
const MAX_AGE_MS = 7 * 24 * 3600 * 1000;

const b64 = (buf) => Buffer.from(buf).toString('base64url');

function sign(payload) {
  return crypto.createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
}

export function createSession() {
  const payload = b64(JSON.stringify({ role: 'artist', exp: Date.now() + MAX_AGE_MS }));
  return `${payload}.${sign(payload)}`;
}

export function verifySession(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [payload, signature] = token.split('.');
  const expected = sign(payload);
  if (signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.exp || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

export function parseCookies(header = '') {
  return header.split(';').reduce((acc, part) => {
    const idx = part.indexOf('=');
    if (idx > -1) acc[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
    return acc;
  }, {});
}

export function readSession(req) {
  return verifySession(parseCookies(req.headers.cookie || '')[COOKIE_NAME]);
}

export function setSessionCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_MS,
  });
}

export function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

export function requireAdmin(req, res, next) {
  if (readSession(req)) return next();
  return res.status(401).json({ error: 'Not signed in' });
}

export function artistPassword() {
  return process.env.ARTIST_PASSWORD || 'youngsilence';
}

// Cheap in-memory throttle for the studio login.
const attempts = new Map();
export function throttleLogin(ip) {
  const now = Date.now();
  const entry = attempts.get(ip) || { count: 0, first: now };
  if (now - entry.first > 15 * 60 * 1000) {
    entry.count = 0;
    entry.first = now;
  }
  entry.count += 1;
  attempts.set(ip, entry);
  return entry.count <= 20;
}
export function resetLoginThrottle(ip) {
  attempts.delete(ip);
}
