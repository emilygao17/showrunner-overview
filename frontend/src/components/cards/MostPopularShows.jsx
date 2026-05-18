import Top5List from './Top5List.jsx';

// Mirrors renderTop5Views: card-full, no story-logo in the empty case (matches
// the old empty branch which omitted the <img>).
export default function MostPopularShows({ shows }) {
  return (
    <Top5List
      shows={shows}
      title="Most Popular Shows This Month"
      subtitle="Ranked by Showrunner App user impressions"
      subtitleClass="top5-views-subtitle"
      cardSize="card-full"
      emptyText="No view data this month."
    />
  );
}
