/**
 * Payments.
 *
 * Mobile Money is handled the way most independent Ghanaian artists actually get
 * paid: the fan sends the amount to the artist's MoMo number with the order
 * reference as the narration, then the artist confirms it in the Studio. Pending
 * orders are never marked paid automatically.
 *
 * Card payments go through Paystack when PAYSTACK_SECRET_KEY is set. Without a
 * key the app runs in sandbox/demo mode: card checkouts are simulated so the
 * whole flow can be tested, and the UI labels them as sandbox.
 */
const PAYSTACK = 'https://api.paystack.co';

export function paystackEnabled() {
  return Boolean(process.env.PAYSTACK_SECRET_KEY);
}

export function paymentMode() {
  return paystackEnabled() ? 'live' : 'sandbox';
}

async function paystack(path, init) {
  const res = await fetch(`${PAYSTACK}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.status === false) {
    const message = json?.message || `Paystack request failed (${res.status})`;
    throw new Error(message);
  }
  return json.data;
}

export async function initializeCard({ amountPesewas, email, reference, callbackUrl, metadata }) {
  if (!paystackEnabled()) return { demo: true };
  return paystack('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify({
      amount: amountPesewas,
      email,
      reference,
      currency: 'GHS',
      callback_url: callbackUrl,
      channels: ['card', 'mobile_money', 'bank_transfer'],
      metadata,
    }),
  });
}

export async function verifyCard(reference) {
  if (!paystackEnabled()) return null;
  return paystack(`/transaction/verify/${encodeURIComponent(reference)}`, { method: 'GET' });
}

export const MOMO_PROVIDERS = {
  mtn: { label: 'MTN MoMo', color: '#FFCC00' },
  telecel: { label: 'Telecel Cash', color: '#E60000' },
  at: { label: 'AirtelTigo Money', color: '#0066B3' },
};
