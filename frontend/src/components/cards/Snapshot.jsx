// "By the numbers" stats grid — story-mode only (hidden in magazine via CSS).
const STATS = [
  { key: 'total_seen',       label: 'show visits by Showrunner users' },
  { key: 'shows_opened',     label: 'Shows opened this month' },
  { key: 'museum_openings',  label: 'Museum openings' },
  { key: 'gallery_openings', label: 'Gallery openings' },
  { key: 'solo_shows',       label: 'Solo shows' },
  { key: 'group_shows',      label: 'Group shows' },
];

export default function Snapshot({ snapshot, label }) {
  if (!snapshot) return null;
  return (
    <div className="card card-full card-snapshot">
      <img className="story-logo" src="/logo.PNG" alt="Showrunner" />
      <div className="card-label">{label} — by the numbers</div>
      <div className="snapshot-grid">
        {STATS.map(({ key, label: lbl }) => (
          <div className="snapshot-stat" key={key}>
            <div className="snapshot-num">{Number(snapshot[key]).toLocaleString('en-US')}</div>
            <div className="snapshot-label">{lbl}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
