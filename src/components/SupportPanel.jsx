import Icon from './Icon';
import { useSite } from '../context/SiteContext';
import { useSupport } from '../context/SupportContext';
import { cedis } from '../lib/format';
import { supportMinimum, supportPresets } from '../lib/support';

export default function SupportPanel({ variant = 'home' }) {
  const { site } = useSite();
  const { openSupport } = useSupport();
  const settings = site.settings;
  const stats = site.stats;
  const goal = Number(settings.goalAmount) || 0;
  const pct = goal > 0 ? Math.min(100, Math.round((stats.raised / goal) * 100)) : 0;
  const minimum = supportMinimum(site.minSupport);
  const presets = supportPresets(minimum);

  return (
    <div className="support-panel reveal">
      <div className="support-panel__grid">
        <div>
          <span className="eyebrow">Direct support</span>
          <h2>
            Keep the music moving.
            <br />
            <em>Support the art.</em>
          </h2>
          <p className="support-panel__text">
            There is no label behind this. Your support helps pay for studio hours, mixing and videos. Give from{' '}
            {cedis(minimum)} and choose to give more if you can.
          </p>
          <div className="support-panel__note">
            <Icon name="wallet" size={16} />
            <span>{settings.supportNote}</span>
          </div>
        </div>

        <div className="support-panel__box">
          {settings.showRaised !== false && goal > 0 ? (
            <div className="goal">
              <div className="goal__top">
                <span>This season’s goal</span>
                <strong>{pct}%</strong>
              </div>
              <div className="goal__bar">
                <i style={{ width: `${Math.max(pct, 2)}%` }} />
              </div>
              <div className="goal__foot">
                <span>{cedis(stats.raised)} raised</span>
                <span>of {cedis(goal)}</span>
              </div>
            </div>
          ) : null}

          <div className="amounts" style={{ marginBottom: 12 }}>
            {presets.map((value) => (
              <button key={value} onClick={() => openSupport(null, { amount: value })}>
                {cedis(value, { withSymbol: false })}
              </button>
            ))}
          </div>
          <button className="btn btn--gold btn--block btn--lg" onClick={() => openSupport()}>
            <Icon name="heart" size={17} />
            Support from {cedis(minimum)}
          </button>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 16,
              paddingTop: 14,
              borderTop: '1px solid var(--line)',
              fontSize: 11,
              color: 'var(--muted)',
            }}
          >
            <span>{stats.supporters} supporters so far</span>
            <span>MoMo · Card</span>
          </div>
          {variant === 'page' ? (
            <p className="field__hint" style={{ marginTop: 12 }}>
              Mobile Money goes straight to the artist’s wallet. Card payments are handled by Paystack. Your support is
              confirmed manually for MoMo, so allow a little time.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
