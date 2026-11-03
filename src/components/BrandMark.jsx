import { useSite } from '../context/SiteContext';
import { initials } from '../lib/format';

/**
 * The artist's logo everywhere it appears. When no logo is uploaded we draw the
 * monogram from the artist name; the artist can swap in any image at any time
 * from Studio → Website or Studio → Media.
 */
export default function BrandMark({ className = '', style, alt = '' }) {
  const { site } = useSite();
  const name = site?.settings?.artistName || 'Young Silence';
  const logo = site?.settings?.logoImage;

  if (logo) {
    return (
      <span className={`brand__mark brand__mark--image ${className}`} style={style}>
        <img src={logo} alt={alt || `${name} logo`} />
      </span>
    );
  }
  return (
    <span className={`brand__mark ${className}`} style={style} aria-hidden="true">
      {initials(name) || 'YS'}
    </span>
  );
}
