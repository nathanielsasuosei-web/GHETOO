import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { seedState } from './seed.js';

const ROOT = process.cwd();
export const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data');
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const SECRET_FILE = path.join(DATA_DIR, '.secret');

for (const dir of [
  DATA_DIR,
  UPLOAD_DIR,
  path.join(UPLOAD_DIR, 'audio'),
  path.join(UPLOAD_DIR, 'covers'),
  path.join(UPLOAD_DIR, 'videos'),
  path.join(UPLOAD_DIR, 'thumbs'),
  path.join(UPLOAD_DIR, 'site'),
  path.join(UPLOAD_DIR, 'products'),
]) {
  fs.mkdirSync(dir, { recursive: true });
}

let state = null;
let saveTimer = null;

export function getState() {
  if (state) return state;
  if (fs.existsSync(DB_FILE)) {
    try {
      state = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch (err) {
      console.error('Could not read db.json, starting fresh:', err.message);
      state = seedState();
      persist();
    }
  } else {
    state = seedState();
    persist();
  }
  // forward-compatible defaults
  state.settings = { ...seedState().settings, ...state.settings };
  state.tracks ||= [];
  state.videos ||= [];
  state.orders ||= [];
  state.messages ||= [];
  state.events ||= [];
  state.products ||= [];
  state.merchOrders ||= [];
  state.subscribers ||= [];
  return state;
}

function persist() {
  const tmp = `${DB_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

/** Debounced write so play counters don't hammer the disk. */
export function save() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      persist();
    } catch (err) {
      console.error('db save failed:', err);
    }
  }, 250);
}

export function saveNow() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = null;
  persist();
}

export function sessionSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (!fs.existsSync(SECRET_FILE)) {
    fs.writeFileSync(SECRET_FILE, crypto.randomBytes(48).toString('hex'), { mode: 0o600 });
  }
  return fs.readFileSync(SECRET_FILE, 'utf8').trim();
}

export function id(prefix = '') {
  return prefix + crypto.randomBytes(9).toString('hex');
}

export function reference() {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let out = '';
  for (let i = 0; i < 6; i++) out += alphabet[crypto.randomInt(0, alphabet.length - 1)];
  return `YS-${out}`;
}
