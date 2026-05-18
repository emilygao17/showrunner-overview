import Top5List from './Top5List.jsx';

// renderTop5 in the old code never short-circuits on empty data — but to keep
// rendering consistent we pass the same empty-state text the other two use.
export default function TopVisited({ shows }) {
  return (
    <Top5List
      shows={shows}
      title="Top 5 Most Visited"
      subtitle="Ranked by Showrunner user's seen shows"
      subtitleClass="top5-seen-subtitle"
      cardSize="card-half"
      emptyText="No check-in data this month."
    />
  );
}
