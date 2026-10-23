import Icon from './Icon';
import { cedis, initials, relativeTime } from '../lib/format';

export default function Wall({ items = [], limit }) {
  const list = limit ? items.slice(0, limit) : items;
  if (!list.length) {
    return (
      <div className="empty">
        No messages yet — be the first to leave one when you support a release.
      </div>
    );
  }
  return (
    <div className="wall">
      {list.map((item) => (
        <article className="wall-card reveal" key={item.id}>
          <div className="wall-card__top">
            <span className="avatar">{initials(item.name) || <Icon name="heart" size={15} />}</span>
            <div>
              <div className="wall-card__name">{item.name}</div>
              <div className="wall-card__meta">{relativeTime(item.createdAt)}</div>
            </div>
          </div>
          <p className="wall-card__msg">“{item.message}”</p>
          <div className="wall-card__amount">
            <span>{item.trackTitle}</span>
            {item.amount ? <strong>{cedis(item.amount)}</strong> : <span>Private</span>}
          </div>
        </article>
      ))}
    </div>
  );
}
