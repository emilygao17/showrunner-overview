import { fmtDate } from '../../utils/format.jsx';

// Magazine-only (CSS sets display: none in story mode). Old code short-circuited
// to empty string when closing was empty — we return null for the same effect.
export default function ClosingThisMonth({ closing }) {
  if (!closing || !closing.length) return null;
  return (
    <div className="card card-full card-closing-this">
      <img className="story-logo" src="/logo.PNG" alt="Showrunner" />
      <div className="card-label">Closing This Month</div>
      <div className="closing-list">
        {closing.map((c, i) => (
          <div className="closing-row" key={c.show_id ?? i}>
            <div className="closing-date">{fmtDate(c.end_date)}</div>
            <div className="closing-info">
              <div className="closing-title">{c.title}</div>
              <div className="closing-venue">{c.venue_name} · {c.neighborhood}</div>
            </div>
            <div className="closing-seen">{c.seen_count}×</div>
          </div>
        ))}
      </div>
    </div>
  );
}
