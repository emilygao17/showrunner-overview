export default function GalleryCrawl({ crawls }) {
  if (!crawls || !crawls.length) {
    return (
      <div className="card card-half">
        <div className="card-label">The Gallery Crawl</div>
        <div className="empty-state">Not enough list data.</div>
      </div>
    );
  }
  return (
    <div className="card card-half">
      <img className="story-logo" src="/logo.PNG" alt="Showrunner" />
      <div className="card-label">The Gallery Crawl</div>
      <div className="crawl-intro">Shows people keep planning together.</div>
      <div className="crawl-pairs">
        {crawls.map((c, gi) => (
          <div className="crawl-group" key={gi}>
            <div className="crawl-based-on">Based on {c.list_count} lists</div>
            {c.shows.map((s, si) => (
              <div className="crawl-show-row" key={s.show_id ?? si}>
                {s.featured_image
                  ? <img className="crawl-thumb" src={s.featured_image} alt="" loading="lazy" />
                  : <div className="crawl-thumb" />}
                <div className="crawl-show-info">
                  <div className="crawl-show-title">{s.title}</div>
                  <div className="crawl-show-meta">{s.venue_name} · {s.neighborhood}</div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
