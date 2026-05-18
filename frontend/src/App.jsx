import { useEffect, useState } from 'react';
import NavBar from './components/NavBar.jsx';
import Dashboard from './components/Dashboard.jsx';
import { useAvailableMonths } from './hooks/useAvailableMonths.js';
import { useMonthlyData } from './hooks/useMonthlyData.js';

// Owns:
//   selectedMonth → drives /api/monthly/:ym
//   view ('magazine'|'story') → toggles body.story-mode, persisted in localStorage
//
// view is a prop, not a component-level switch. Rendering <Dashboard> once and
// passing view down preserves the old behavior where the map (and any chart
// instances) survives a view toggle — switching between two separate component
// subtrees would unmount the map and force a re-init.
export default function App() {
  const { months, error: monthsError } = useAvailableMonths();

  const [selectedMonth, setSelectedMonth] = useState(null);
  const [view, setView] = useState(() =>
    localStorage.getItem('showrunner-view') === 'magazine' ? 'magazine' : 'story',
  );

  // Default to latest available month once the list arrives.
  useEffect(() => {
    if (!selectedMonth && months && months.length) {
      setSelectedMonth(months[months.length - 1]);
    }
  }, [months, selectedMonth]);

  // body class + localStorage for the view toggle.
  useEffect(() => {
    document.body.classList.toggle('story-mode', view === 'story');
    localStorage.setItem('showrunner-view', view);
  }, [view]);

  const { data, error: dataError } = useMonthlyData(selectedMonth);

  // --story-month-label drives body.story-mode .card:not(.stats-hero)::before
  // in the global stylesheet — preserves the corner "NYC — Month YYYY" label.
  useEffect(() => {
    if (data?.label) {
      document.documentElement.style.setProperty('--story-month-label', `"NYC — ${data.label}"`);
    }
  }, [data?.label]);

  return (
    <>
      <NavBar
        months={months}
        selectedMonth={selectedMonth}
        onSelectMonth={setSelectedMonth}
        view={view}
        onToggleView={() => setView(v => v === 'story' ? 'magazine' : 'story')}
      />
      {renderBody({ monthsError, dataError, data, view })}
    </>
  );
}

function renderBody({ monthsError, dataError, data, view }) {
  if (monthsError) {
    return <main id="main"><div id="loading" style={{ color: '#c0392b' }}>Failed to load months: {monthsError}</div></main>;
  }
  if (dataError) {
    return <main id="main"><div id="loading" style={{ color: '#c0392b' }}>Failed to load: {dataError}</div></main>;
  }
  if (!data) {
    return <main id="main"><div id="loading">Loading…</div></main>;
  }
  return <Dashboard data={data} view={view} />;
}
