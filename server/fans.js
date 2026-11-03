import crypto from 'node:crypto';
import { sessionSecret } from './db.js';
import { parseCookies } from './auth.js';

/* ==========================================================================
   Fan accounts — separate from the artist studio session on purpose.

   Fans get their own signed cookie (`ys_fan`) with a `fan` role. Passwords are
   hashed with scrypt; nothing password-shaped ever leaves this module. A fan
   cookie can never unlock /api/admin, and an artist cookie can never read a
   fan account.
   ========================================================================== */

export const FAN_COOKIE = 'ys_fan';
const MAX_AGE_MS = 30 * 24 * 3600 * 1000;
const SCRYPT_KEYLEN = 64;
const b64 = (buf) => Buffer.from(buf).toString('base64url');

function sign(payload) {
  // A distinct HMAC derivation keeps artist and fan tokens from ever crossing over.
  return crypto
    .createHmac('sha256', sessionSecret())
    .update('fan-session:')
    .update(payload)
    .digest('base64url');
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(password), salt, SCRYPT_KEYLEN);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPassword(password, stored) {
  if (typeof stored !== 'string' || typeof password !== 'string') return false;
  const [scheme, saltHex, hashHex] = stored.split('$');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  try {
    const expected = Buffer.from(hashHex, 'hex');
    const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length || SCRYPT_KEYLEN);
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

/** The shape that is safe to send to a browser. */
export function publicFan(fan) {
  return {
    id: fan.id,
    name: fan.name,
    email: fan.email,
    phone: fan.phone || '',
    createdAt: fan.createdAt,
    lastLoginAt: fan.lastLoginAt || null,
  };
}

export function createFanSession(fan) {
  const payload = b64(
    JSON.stringify({ role: 'fan', sub: fan.id, v: fan.sessionVersion || 0, exp: Date.now() + MAX_AGE_MS })
  );
  return `${payload}.${sign(payload)}`;
}

export function verifyFanSession(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [payload, signature] = token.split('.');
  const expected = sign(payload);
  if (signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (data.role !== 'fan' || !data.exp || data.exp < Date.now() || !data.sub) return null;
    return data;
  } catch {
    return null;
  }
}

export function readFanSession(req) {
  return verifyFanSession(parseCookies(req.headers.cookie || '')[FAN_COOKIE]);
}

export function setFanCookie(res, token) {
  res.cookie(FAN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_MS,
  });
}

export function clearFanCookie(res) {
  res.clearCookie(FAN_COOKIE, { path: '/' });
}

/** Resolves the signed-in fan from the current state, if the token is current. */
export function currentFan(req, state) {
  const session = readFanSession(req);
  if (!session) return null;
  const fan = (state.fans || []).find((item) => item.id === session.sub);
  if (!fan) return null;
  // Logging out or changing a password bumps the version and kills old cookies.
  if (session.v !== (fan.sessionVersion || 0)) return null;
  return fan;
}

export function requireFan(req, res, next) {
  const session = readFanSession(req);
  if (!session) return res.status(401).json({ error: 'Sign in to your fan account first.' });
  req.fanId = session.sub;
  return next();
}
