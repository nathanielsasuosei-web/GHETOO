import Icon from '../components/Icon';
import { api } from '../lib/api';
import { longDate } from '../lib/format';

export default function Newsletter({ data, refresh, toast }) {
  const subscribers = data.subscribers || [];

  const remove = async (sub) => {
    if (!window.confirm(`Remove ${sub.email} from the list?`)) return;
    try {
      await api.deleteSubscriber(sub.id);
      toast('Subscriber removed');
      await refresh();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <>
      <div className="studio__top">
        <div>
          <h1>Newsletter</h1>
          <p>
            {subscribers.length} subscriber{subscribers.length === 1 ? '' : 's'} from the signup form in the site
            footer. Export to CSV and take the list to your email tool.
          </p>
        </div>
        {subscribers.length ? (
          <a className="btn btn--gold" href={api.exportSubscribers()} download>
            <Icon name="download" size={15} /> Export CSV
          </a>
        ) : null}
      </div>

      <div className="panel">
        <div className="panel__head">
          <div>
            <h3>The list</h3>
            <p>Newest first.</p>
          </div>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Joined</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {subscribers.map((sub) => (
                <tr key={sub.id}>
                  <td>
                    <strong>{sub.email}</strong>
                  </td>
                  <td className="muted">{longDate(sub.createdAt)}</td>
                  <td>
                    <div className="table__actions">
                      <a className="icon-btn icon-btn--sm" href={`mailto:${sub.email}`} title="Email">
                        <Icon name="mail" size={14} />
                      </a>
                      <button className="icon-btn icon-btn--sm" onClick={() => remove(sub)} title="Remove">
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!subscribers.length ? (
          <div className="empty">No subscribers yet. The signup form lives in the footer of every public page.</div>
        ) : null}
      </div>
    </>
  );
}
