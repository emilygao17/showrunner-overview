// Mirrors renderTableCard: sorts by views_per_show desc, top row gets the
// "← highest interest" label + bold red score. The label arrives styled by
// .table-top-label / .table-top-score CSS classes from the global stylesheet.
export default function TableCard({ stats, label, firstColHeader }) {
  if (!stats || !stats.length) return null;
  const sorted = [...stats].sort((a, b) => b.views_per_show - a.views_per_show);
  return (
    <div className="card card-full card-table-view">
      <img className="story-logo" src="/logo.PNG" alt="Showrunner" />
      <div className="card-label">{label}</div>
      <table className="table-view">
        <thead>
          <tr>
            <th>{firstColHeader}</th>
            <th>User Interest Score</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((item, i) => (
            <tr key={`${item.label}-${i}`}>
              <td>{item.label}</td>
              <td>
                {i === 0
                  ? (
                    <>
                      <span className="table-top-label">← highest interest</span>
                      <span className="table-top-score">{item.views_per_show}</span>
                    </>
                  )
                  : item.views_per_show}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="table-footnote">
        User interest score reflects how engaged viewers are per show — calculated as average impressions per show in this category. A higher score means each show in this category captured more attention on average.
      </p>
    </div>
  );
}
