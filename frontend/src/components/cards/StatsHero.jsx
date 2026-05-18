import { MONTH_FULL } from '../../utils/constants.js';

// Cover slide (story) + magazine stats hero. The same DOM is used for both:
// CSS picks .stats-magazine in magazine mode and .stats-cover in story mode.
export default function StatsHero({ data }) {
  if (!data) return null;
  const seen = new Set();
  const coverImgs = [];
  for (const s of [...(data.top_5_views || []), ...(data.top_5_seen || []), ...(data.top_5_saved || [])]) {
    if (coverImgs.length >= 7) break;
    if (s.featured_image && !seen.has(s.featured_image)) {
      seen.add(s.featured_image);
      coverImgs.push(s.featured_image);
    }
  }

  const [yr, mo] = data.month.split('-');
  const coverTitle = `${MONTH_FULL[mo]} ${yr} Roundup`;
  const statLine = `${data.total_checkins.toLocaleString()} visits across NYC`;

  return (
    <div className="card stats-hero">
      <div className="stats-magazine">
        <div className="month-title">{data.label}</div>
        <div className="stats-row">
          <div className="stat-num">{statLine}</div>
        </div>
      </div>
      <div className="stats-cover">
        <div className="cover-content">
          <img className="cover-logo" src="/logo.PNG" alt="Showrunner" loading="lazy" />
          <div className="cover-title">{coverTitle}</div>
          <div className="cover-stat">{statLine}</div>
        </div>
        <div className="cover-img-row">
          {coverImgs.map((url, i) => (
            <img key={`${url}-${i}`} src={url} alt="" loading="lazy" />
          ))}
        </div>
      </div>
    </div>
  );
}
