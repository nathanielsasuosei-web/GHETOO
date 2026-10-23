const cedisFormatter = new Intl.NumberFormat('en-GH', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** pesewas -> "GH₵ 120" */
export function cedis(pesewas, { withSymbol = true } = {}) {
  const value = (Number(pesewas) || 0) / 100;
  return `${withSymbol ? 'GH₵ ' : ''}${cedisFormatter.format(value)}`;
}

export function amountValue(pesewas) {
  return (Number(pesewas) || 0) / 100;
}

export function compact(n) {
  const num = Number(n) || 0;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(num >= 10_000_000 ? 0 : 1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(num >= 10_000 ? 0 : 1)}K`;
  return String(num);
}

export function duration(seconds) {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function relativeTime(iso) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;
  return new Date(iso).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

export function longDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('');
}

export function waveBars(seed = 1, count = 48) {
  let x = seed * 9301 + 49297;
  const bars = [];
  for (let i = 0; i < count; i++) {
    x = (x * 9301 + 49297) % 233280;
    const base = 0.25 + (x / 233280) * 0.75;
    const envelope = Math.sin((i / count) * Math.PI) * 0.6 + 0.4;
    bars.push(Math.max(0.12, base * envelope));
  }
  return bars;
}
