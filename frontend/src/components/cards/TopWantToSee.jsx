import Top5List from './Top5List.jsx';

export default function TopWantToSee({ shows }) {
  return (
    <Top5List
      shows={shows}
      title="Top 5 Want to See"
      subtitle="Ranked by Showrunner user's lists"
      subtitleClass="top5-saved-subtitle"
      cardSize="card-half"
      emptyText="No saves recorded this month."
    />
  );
}
