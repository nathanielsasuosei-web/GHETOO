#!/usr/bin/env node
/**
 * Send a test email via Resend — uses RESEND_API_KEY from env, never hardcoded.
 * Usage:
 *   RESEND_API_KEY=re_... EMAIL_FROM=hello@youngsilence.gh node scripts/send-test-email.mjs you@example.com
 * Or set them in .env and run with --env-file:
 *   node --env-file=.env scripts/send-test-email.mjs you@example.com
 *
 * If RESEND_API_KEY is missing, it exits with a clear message.
 * Do NOT paste the key into code or chat — revoke leaked keys at https://resend.com/api-keys
 */
import { Resend } from 'resend';

const to = process.argv[2];
if (!to || !to.includes('@')) {
  console.error('Usage: node scripts/send-test-email.mjs <recipient@example.com>');
  process.exit(1);
}

const key = process.env.RESEND_API_KEY?.trim();
if (!key) {
  console.error('RESEND_API_KEY not set. Set it in .env or env dashboard — never hardcode it.');
  process.exit(2);
}
if (!key.startsWith('re_')) {
  console.error('RESEND_API_KEY looks invalid (should start with re_)');
  process.exit(2);
}

const resend = new Resend(key);
const from = process.env.EMAIL_FROM || 'onboarding@resend.dev';

console.log(`Sending from ${from} to ${to}...`);
const result = await resend.emails.send({
  from,
  to,
  subject: 'Hello World',
  html: '<p>Congrats on sending your <strong>first email</strong>!</p>',
});

if (result.error) {
  console.error('Resend error:', result.error);
  process.exit(3);
}
console.log('Sent:', result.data?.id || result);
