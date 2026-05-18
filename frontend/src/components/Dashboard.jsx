import StatsHero          from './cards/StatsHero.jsx';
import Snapshot           from './cards/Snapshot.jsx';
import ShowOfTheMonth     from './cards/ShowOfTheMonth.jsx';
import MostPopularShows   from './cards/MostPopularShows.jsx';
import TopVisited         from './cards/TopVisited.jsx';
import TopWantToSee       from './cards/TopWantToSee.jsx';
import Neighborhoods      from './cards/Neighborhoods.jsx';
import GalleryCrawl       from './cards/GalleryCrawl.jsx';
import CheckInMap         from './cards/CheckInMap.jsx';
import ClosingThisMonth   from './cards/ClosingThisMonth.jsx';
import ClosingNextMonth   from './cards/ClosingNextMonth.jsx';
import MediumsTable       from './cards/MediumsTable.jsx';
import SubjectMattersTable from './cards/SubjectMattersTable.jsx';
import SubjectMatterCloud from './cards/SubjectMatterCloud.jsx';
import ShowsByMedium      from './cards/ShowsByMedium.jsx';

// Single card grid rendered in both magazine and story views. View-specific
// behavior is CSS-driven (body.story-mode rules), and the few cards that need
// to react to the view in JS — currently just CheckInMap — receive it as a prop.
// Card order matches the old main.innerHTML array exactly.
export default function Dashboard({ data, view }) {
  return (
    <main id="main">
      <StatsHero          data={data} />
      <Snapshot           snapshot={data.snapshot} label={data.label} />
      <ShowOfTheMonth     show={data.show_of_the_month} />
      <MostPopularShows   shows={data.top_5_views} />
      <TopVisited         shows={data.top_5_seen} />
      <TopWantToSee       shows={data.top_5_saved} />
      <Neighborhoods      hoods={data.neighborhoods} />
      <GalleryCrawl       crawls={data.gallery_crawl} />
      <CheckInMap         checkins={data.map_checkins} ym={data.month} view={view} />
      <ClosingThisMonth   closing={data.closing_this_month} />
      <ClosingNextMonth   closing={data.closing_next_month} />
      <MediumsTable       stats={data.mediums_stats} />
      <SubjectMattersTable stats={data.subject_matters_stats} />
      <SubjectMatterCloud  onViewStats={data.on_view_stats} label={data.label} />
      <ShowsByMedium       onViewStats={data.on_view_stats} label={data.label} />
    </main>
  );
}
