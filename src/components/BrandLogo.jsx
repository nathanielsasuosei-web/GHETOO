import { useEffect, useState } from 'react';

function initialsFor(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'YS';
}

export default function BrandLogo({ settings, className = '' }) {
  const source = typeof settings?.logoImage === 'string' ? settings.logoImage : '';
  const safeSource = /^(\/(?:media|uploads)\/|https?:\/\/)/.test(source) ? source : '';
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [safeSource]);

  return (
    <span className={`brand__mark brand__mark--logo ${className}`} aria-hidden="true">
      {safeSource && !failed ? (
        <img src={safeSource} alt="" onError={() => setFailed(true)} />
      ) : (
        <span>{initialsFor(settings?.artistName)}</span>
      )}
    </span>
  );
}
