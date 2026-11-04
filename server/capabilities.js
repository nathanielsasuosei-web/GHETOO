/* ==========================================================================
   What this backend can do, and whether its data directory can keep it.

   The studio talks to the API through the Vercel front door. When a deploy is
   stale (an older API build) or the API is running on an ephemeral disk, a
   colour save can look successful while every other visitor still sees the
   default palette. These fields let the studio tell those cases apart and let
   the artist verify a deploy without opening a hosting dashboard.
   ========================================================================== */

import fs from 'node:fs';
import { DATA_DIR, DATA_DIR_CONFIGURED, BOOT_COUNT } from './db.js';

/** Bump whenever the settings API changes shape (used for stale-deploy checks). */
export const API_VERSION = '2026-11-04';

export function capabilities() {
  let writable = false;
  try {
    fs.accessSync(DATA_DIR, fs.constants.W_OK);
    writable = true;
  } catch {
    /* A read-only or vanished volume — say so instead of claiming success. */
  }
  return {
    version: API_VERSION,
    // This build stores palettes in settings, stamps themeUpdatedAt and serves
    // them anonymously from /api/site. Older builds do not advertise this.
    themeStorage: true,
    // DATA_DIR is only durable when the host mounts a persistent volume there.
    dataDirConfigured: DATA_DIR_CONFIGURED,
    dataDirWritable: writable,
    // How many times this process tree has started against the same DATA_DIR.
    // On an ephemeral disk it starts at 1 again after every restart/redeploy.
    dataBoots: BOOT_COUNT,
    dataSurvivedRestart: BOOT_COUNT > 1,
  };
}
