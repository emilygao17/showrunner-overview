import { ImageOrPlaceholder } from '../../utils/format.jsx';

// Editorial treatment — no pills/badges/chips. Mediums (if present) are
// folded into the caption line e.g. "Paintings — Marianne Boesky Gallery, Chelsea".
// Story-mode styling lives in global.css under body.story-mode .sotm-* rules.
export default function ShowOfTheMonth({ show }) {
  if (!show) return null;

  const mediumText = show.mediums && show.mediums.length ? show.mediums.join(', ') : '';
  const placeText  = `${show.venue_name}, ${show.neighborhood}`;
  const caption    = mediumText ? `${mediumText} — ${placeText}` : placeText;

  return (
    <div className="card card-full sotm-card">
      <img className="sotm-logo" src="/logo.PNG" alt="Showrunner" />
      <div className="sotm-img-wrap">
        <ImageOrPlaceholder url={show.featured_image} className="sotm-image" alt={show.title} />
      </div>
      <div className="sotm-body">
        <div className="card-label">Show of the Month</div>
        <div className="sotm-title">{show.title}</div>
        <div className="sotm-venue">{caption}</div>
        {show.short_description && <div className="sotm-desc">{show.short_description}</div>}
        <div className="sotm-footnote">Show of the month determined by Showrunner user impressions.</div>
      </div>
    </div>
  );
}
