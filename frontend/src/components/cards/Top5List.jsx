import { ImageOrPlaceholder } from '../../utils/format.jsx';

// Shared row layout for the three Top-5 cards:
//   MostPopularShows  (top_5_views)  — card-full, "Most Popular Shows This Month"
//   TopVisited        (top_5_seen)   — card-half, "Top 5 Most Visited"
//   TopWantToSee      (top_5_saved)  — card-half, "Top 5 Want to See"
//
// Each card has the same row format but a different title/subtitle/empty state.
// Magazine-vs-story styling is fully CSS-driven via body.story-mode.
export default function Top5List({
  shows,
  title,
  subtitle,
  subtitleClass,
  cardSize,         // 'card-full' | 'card-half'
  emptyText,
}) {
  const empty = !shows || !shows.length;

  return (
    <div className={`card ${cardSize}`}>
      {!empty && <img className="story-logo" src="/logo.PNG" alt="Showrunner" />}
      <div className="card-label">{title}</div>
      {empty
        ? <div className="empty-state">{emptyText}</div>
        : (
          <>
            <div className={subtitleClass}>{subtitle}</div>
            <div className="show-list">
              {shows.map((s, i) => (
                <div className="show-row" key={s.show_id ?? i}>
                  <div className="show-rank">{i + 1}</div>
                  <ImageOrPlaceholder url={s.featured_image} className="show-thumb" alt={s.title} />
                  <div className="show-info">
                    <div className="show-title">{s.title}</div>
                    <div className="show-venue">{s.venue_name} · {s.neighborhood}</div>
                    {s.mediums && s.mediums.length > 0 && (
                      <div className="show-medium">{s.mediums.join(', ')}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
    </div>
  );
}
