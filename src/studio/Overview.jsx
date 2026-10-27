import Icon from '../components/Icon';
import { cedis, compact, relativeTime } from '../lib/format';

export default function Overview({ data }) {
  const { stats, series, byMethod, byTrack, orders, tracks } = data;
  const max = Math.max(...series.map((s) => s.amount), 1);
  const recent = orders.slice(0, 6);
  const topTracks = [...tracks].sort((a, b) => (b.plays || 0) - (a.plays || 0)).slice(0, 4);

  return (
    <>
      <div className="studio__top">
        <div>
          <h1>Overview</h1>
          <p>Everything happening with the music, in one place.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span className={`badge-status ${data.paymentMode === 'live' ? 'badge-status--paid' : 'badge-status--pending'}`}>
            {data.paymentMode === 'live' ? 'Live payments' : 'Sandbox payments'}
          </span>
          <a className="btn btn--ghost btn--sm" href="/" target="_blank" rel="noreferrer">
            <Icon name="external" size={14} /> View site
          </a>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card stat-card--gold">
          <span>
            <Icon name="wallet" size={12} /> Total raised
          </span>
          <strong>{cedis(stats.raised)}</strong>
          <em>last 30 days: {cedis(series.reduce((s, d) => s + d.amount, 0))}</em>
        </div>
        <div className="stat-card">
          <span>
            <Icon name="users" size={12} /> Supporters
          </span>
          <strong>{stats.supporters}</strong>
          <em>avg {cedis(stats.average)} per support</em>
        </div>
        <div className="stat-card">
          <span>
            <Icon name="clock" size={12} /> Awaiting MoMo
          </span>
          <strong style={{ color: stats.pending ? 'var(--gold)' : undefined }}>{stats.pending}</strong>
          <em>confirm these manually</em>
        </div>
        <div className="stat-card">
          <span>
            <Icon name="headphone" size={12} /> Streams
          </span>
          <strong>{compact(stats.plays)}</strong>
          <em>{compact(stats.downloads)} downloads</em>
        </div>
        <div className="stat-card">
          <span>
            <Icon name="bag" size={12} /> Merch revenue
          </span>
          <strong>{cedis(data.merchStats?.revenue || 0)}</strong>
          <em>{data.merchStats?.orders || 0} orders · {data.merchStats?.pending || 0} awaiting</em>
        </div>
        <div className="stat-card">
          <span>
            <Icon name="send" size={12} /> Newsletter
          </span>
          <strong>{data.merchStats?.subscribers || 0}</strong>
          <em>{data.merchStats?.events || 0} events listed</em>
        </div>
      </div>

      <div className="panel">
        <div className="panel__head">
          <div>
            <h3>Support, last 30 days</h3>
            <p>Confirmed payments per day.</p>
          </div>
          <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
            {cedis(series.reduce((s, d) => s + d.amount, 0))}
          </span>
        </div>
        <div className="chart">
          {series.map((day) => (
            <div
              key={day.date}
              className="chart__bar"
              style={{ height: `${Math.max(2, (day.amount / max) * 100)}%` }}
              title={`${day.date}: ${cedis(day.amount)}`}
            />
          ))}
        </div>
        <div className="chart__axis">
          <span>{series[0]?.date.slice(5)}</span>
          <span>{series[Math.floor(series.length / 2)]?.date.slice(5)}</span>
          <span>today</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
        <div className="panel">
          <div className="panel__head">
            <div>
              <h3>Where support came from</h3>
              <p>By payment method.</p>
            </div>
          </div>
          {Object.keys(byMethod).length ? (
            Object.entries(byMethod)
              .sort((a, b) => b[1] - a[1])
              .map(([label, amount]) => {
                const total = Object.values(byMethod).reduce((s, v) => s + v, 0) || 1;
                return (
                  <div key={label} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 6 }}>
                      <span>{label}</span>
                      <strong>{cedis(amount)}</strong>
                    </div>
                    <div className="goal__bar">
                      <i style={{ width: `${Math.round((amount / total) * 100)}%` }} />
                    </div>
                  </div>
                );
              })
          ) : (
            <p className="muted" style={{ fontSize: 13 }}>
              No confirmed support yet.
            </p>
          )}
        </div>

        <div className="panel">
          <div className="panel__head">
            <div>
              <h3>Best performing</h3>
              <p>By support received.</p>
            </div>
          </div>
          {byTrack.length ? (
            byTrack.slice(0, 4).map((t) => (
              <div className="toggle-row" key={t.title}>
                <div>
                  <strong style={{ fontSize: 12.5 }}>{t.title}</strong>
                  <small>{t.count} support{t.count === 1 ? '' : 's'}</small>
                </div>
                <strong style={{ color: 'var(--gold)', fontSize: 13 }}>{cedis(t.amount)}</strong>
              </div>
            ))
          ) : (
            <p className="muted" style={{ fontSize: 13 }}>
              Support a release to see it here.
            </p>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel__head">
          <div>
            <h3>Recent support</h3>
            <p>Newest first.</p>
          </div>
          <a className="link-arrow" href="/studio/supporters" style={{ fontSize: 11 }}>
            Manage all <Icon name="arrow" size={13} />
          </a>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Supporter</th>
                <th>Release</th>
                <th>Amount</th>
                <th>Status</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((o) => (
                <tr key={o.id}>
                  <td>
                    <strong>{o.supporterName}</strong>
                    <div className="sub mono">{o.reference}</div>
                  </td>
                  <td className="muted">{o.trackTitle}</td>
                  <td>{cedis(o.amount)}</td>
                  <td>
                    <span className={`badge-status badge-status--${o.status}`}>{o.status}</span>
                  </td>
                  <td className="muted">{relativeTime(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="panel__head">
          <div>
            <h3>Most played</h3>
            <p>Streams across all releases.</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
          {topTracks.map((t) => (
            <div key={t.id} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <img src={t.cover} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {t.title}
                </div>
                <div className="sub" style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {compact(t.plays)} plays · {compact(t.downloads)} downloads
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
