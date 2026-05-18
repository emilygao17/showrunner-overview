// NavBar = the full <header> (logo + month tabs + view toggle).
// Month list is supplied by the parent — sourced from /api/available-months.

const MONTH_SHORT = {
  '01':'Jan','02':'Feb','03':'Mar','04':'Apr','05':'May','06':'Jun',
  '07':'Jul','08':'Aug','09':'Sep','10':'Oct','11':'Nov','12':'Dec',
};

function shortLabel(ym) {
  const [y, m] = ym.split('-');
  return `${MONTH_SHORT[m]} ${y}`;
}

export default function NavBar({ months, selectedMonth, onSelectMonth, view, onToggleView }) {
  const isStory = view === 'story';
  return (
    <header>
      <img className="logo" src="/logo.PNG" alt="Showrunner" />
      <nav className="month-nav" id="month-nav">
        {(months ?? []).map(ym => (
          <button
            key={ym}
            type="button"
            className={`month-btn${ym === selectedMonth ? ' active' : ''}`}
            data-ym={ym}
            onClick={() => onSelectMonth(ym)}
          >
            {shortLabel(ym)}
          </button>
        ))}
      </nav>
      <button
        type="button"
        id="view-toggle"
        className={`view-toggle${isStory ? ' active' : ''}`}
        onClick={onToggleView}
      >
        {isStory ? 'Magazine view' : 'Story view'}
      </button>
    </header>
  );
}
