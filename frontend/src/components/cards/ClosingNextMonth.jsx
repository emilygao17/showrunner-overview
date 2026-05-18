import { fmtDate } from '../../utils/format.jsx';

export default function ClosingNextMonth({ closing }) {
  if (!closing || !closing.length) return null;
  return (
    <div className="card card-full card-closing-next">
      <img className="story-logo" src="/logo.PNG" alt="Showrunner" />
      <div className="card-label">Closing Next Month</div>
      <div className="closing-list">
        {closing.map((c, i) => (
          <div className="closing-row" key={c.show_id ?? i}>
            <div className="closing-date">{fmtDate(c.end_date)}</div>
            <div className="closing-info">
              <div className="closing-title">{c.title}</div>
              <div className="closing-venue">{c.venue_name} · {c.neighborhood}</div>
            </div>
            <div className="closing-seen">{c.view_count.toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
