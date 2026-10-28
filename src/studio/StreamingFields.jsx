import { MUSIC_PLATFORMS } from '../lib/streaming';

export default function StreamingFields({ values, onChange, prefix }) {
  return (
    <div className="streaming-fields">
      <strong>Streaming platform links</strong>
      <p className="field__hint">
        Add links to this released song or album. Listeners will be sent to the platform instead of playing the
        uploaded file on this site. Royalties depend on your distributor, rights and each platform’s rules.
      </p>
      {MUSIC_PLATFORMS.map((platform) => (
        <div className="field" key={platform.key}>
          <label htmlFor={`${prefix}-${platform.key}`}>{platform.label} link</label>
          <input
            id={`${prefix}-${platform.key}`}
            type="url"
            maxLength={2048}
            value={values[platform.key] || ''}
            onChange={(event) => onChange(platform.key, event.target.value)}
            placeholder={platform.placeholder}
          />
        </div>
      ))}
    </div>
  );
}
