import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { sessionSecret } from './db.js';
import { parseCookies } from './auth.js';

export const FAN_COOKIE_NAME = 'ys_fan';
const MAX_AGE_MS = 30 * 24 * 3600 * 1000;
const scrypt = promisify(crypto.scrypt);
const b64 = (value) => Buffer.from(value).toString('base64url');

// A valid scrypt hash for an unknown password. Login verifies against this when
// the email is not registered, keeping response times similar.
export const FAN_DUMMY_PASSWORD_HASH =
  'scrypt$04a1e376ea34fdf7b42f260f87036300$73421c5439036b0bcbd4e8a41ec46d7f10e473c2c7ccae7fb494292f25783f8a277fb74127ca2e6b52f885e229333f0b0a7e5771ee37598f60afe88d7d0b067a';

/**
 * Fan sessions use their own HMAC key and a role check. An admin cookie can
 * never be replayed as a fan session (and vice versa).
 */
function fanSigningKey() {
  return crypto.createHmac('sha256', sessionSecret()).update('young-silence-fan-session-v1').digest();
}

function sign(payload) {
  return crypto.createHmac('sha256', fanSigningKey()).update(payload).digest('base64url');
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export async function hashFanPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = await scrypt(String(password), salt, 64);
  return `scrypt$${salt}$${derived.toString('hex')}`;
}

export async function verifyFanPassword(password, stored) {
  const parts = typeof stored === 'string' ? stored.split('$') : [];
  if (parts.length !== 3 || parts[0] !== 'scrypt' || !/^[a-f0-9]{32}$/.test(parts[1])) return false;
  const expected = Buffer.from(parts[2], 'hex');
  if (expected.length !== 64) return false;
  const derived = await scrypt(String(password), parts[1], 64);
  return safeEqual(derived.toString('hex'), expected.toString('hex'));
}

export function createFanSession(fanId, sessionVersion = 0) {
  const payload = b64(
    JSON.stringify({
      role: 'fan',
      sub: fanId,
      ver: Number(sessionVersion) || 0,
      exp: Date.now() + MAX_AGE_MS,
    })
  );
  return `${payload}.${sign(payload)}`;
}

export function verifyFanSession(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [payload, signature] = token.split('.');
  if (!safeEqual(signature, sign(payload))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (data.role !== 'fan' || typeof data.sub !== 'string' || !data.sub) return null;
    if (!data.exp || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

export function readFanSession(req) {
  return verifyFanSession(parseCookies(req.headers.cookie || '')[FAN_COOKIE_NAME]);
}

export function setFanCookie(res, token) {
  res.cookie(FAN_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_MS,
  });
}

export function clearFanCookie(res) {
  res.clearCookie(FAN_COOKIE_NAME, { path: '/', sameSite: 'lax' });
}

/** Never send a password hash — even to the signed-in fan or the artist studio. */
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
