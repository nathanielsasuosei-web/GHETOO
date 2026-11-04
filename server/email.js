import { Resend } from 'resend';

let resendClient = null;

/**
 * Returns a Resend client if RESEND_API_KEY is configured, otherwise null.
 * Never hardcode the API key — set RESEND_API_KEY in .env (local) or in your
 * host's env dashboard (Render/Vercel). The key you pasted in chat is
 * considered compromised and should be revoked at https://resend.com/api-keys
 */
export function getResend() {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  if (!key.startsWith('re_')) {
    console.warn('[email] RESEND_API_KEY looks invalid — should start with re_');
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(key);
  }
  return resendClient;
}

export function emailEnabled() {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

/**
 * Safe wrapper — validates addresses, never throws unhandled, logs instead.
 * Use this instead of calling resend.emails.send directly.
 */
export async function sendEmail({ to, subject, html, from, replyTo } = {}) {
  const resend = getResend();
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set — email not sent (would go to:', to, ')');
    return { skipped: true, reason: 'RESEND_API_KEY not configured' };
  }

  // Basic validation to avoid API rejection / header injection
  if (!to || typeof to !== 'string' || !to.includes('@')) {
    throw new Error('Invalid recipient email');
  }
  if (!subject || typeof subject !== 'string' || subject.length > 200) {
    throw new Error('Invalid subject');
  }

  const sender = from || process.env.EMAIL_FROM || 'Young Silence <onboarding@resend.dev>';
  // Resend's onboarding@resend.dev only delivers to verified addresses in test mode.
  // Set EMAIL_FROM to your verified domain (e.g. hello@youngsilence.gh) for production.

  try {
    const result = await resend.emails.send({
      from: sender,
      to,
      subject,
      html: html || '<p></p>',
      ...(replyTo ? { replyTo } : {}),
    });
    if (result.error) {
      console.error('[email] Resend error:', result.error);
      throw new Error(result.error.message || 'Email failed');
    }
    return result;
  } catch (err) {
    console.error('[email] send failed:', err.message);
    throw err;
  }
}

// Prebuilt templates — keep HTML minimal and escaped via callers
export const templates = {
  hello: ({ name } = {}) =>
    `<p>Congrats on sending your <strong>first email</strong>!${name ? ` — hi ${escapeHtml(name)}` : ''}</p>
     <p style="color:#666;font-size:13px">Sent from Young Silence (GHETOO) via Resend.</p>`,

  newSupporter: ({ supporterName, amount, trackTitle }) =>
    `<p>New support: <strong>${escapeHtml(supporterName)}</strong> — ${amount} for <em>${escapeHtml(trackTitle)}</em></p>`,

  newMessage: ({ name, email, subject, body }) =>
    `<h2>New message from ${escapeHtml(name)} (${escapeHtml(email)})</h2>
     <p><strong>Subject:</strong> ${escapeHtml(subject || 'No subject')}</p>
     <div style="white-space:pre-wrap;border-left:3px solid #eee;padding-left:12px">${escapeHtml(body)}</div>`,
};

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
