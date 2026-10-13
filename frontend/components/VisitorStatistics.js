export default function VisitorStatistics({ analytics }) {
  if (!analytics) return <p className="admin-empty">Visitor statistics are unavailable.</p>;
  const days = analytics.days.slice(-14);
  const maximum = Math.max(1, ...days.map((day) => day.visits));
  return <div className="visitor-statistics">
    <div className="admin-analytics-cards">
      <article className="admin-project"><span>Visits (last 90 days)</span><strong>{analytics.totalVisits}</strong></article>
      <article className="admin-project"><span>Unique visitor-days</span><strong>{analytics.dailyUniqueVisitors}</strong></article>
    </div>
    <p className="admin-form-help">Visitors are deduplicated within each day and browser session. Counts are approximate; a person returning on another day counts again. Tracking is optional and respects Do Not Track and Global Privacy Control. No IP addresses or full referrer URLs are stored.</p>
    <article className="admin-project"><h3>Recent visits</h3>
      {!days.length ? <p>No visitor data yet. Enable analytics in both frontend and backend environments to start collecting aggregate counts.</p> : <div className="visitor-bars" aria-label="Daily visits">
        {days.map((day) => <div key={day.date}><span className="visitor-date">{day.date.slice(5)}</span><div className="visitor-bar-track"><div className="visitor-bar" style={{ width: `${day.visits / maximum * 100}%` }} /></div><span>{day.visits} visits · {day.uniqueVisitors} unique</span></div>)}
      </div>}
    </article>
    <div className="visitor-breakdowns">{[["pages", "Most visited pages"], ["devices", "Device types"], ["browsers", "Browsers"], ["referrers", "Referrers"]].map(([key, label]) => <article className="admin-project" key={key}>
      <h3>{label}</h3>{analytics[key].length ? <table><caption className="sr-only">{label}</caption><thead><tr><th scope="col">{label}</th><th scope="col">Visits</th></tr></thead><tbody>{analytics[key].map((item) => <tr key={item.label}><th scope="row">{item.label}</th><td>{item.count}</td></tr>)}</tbody></table> : <p>No data yet.</p>}
    </article>)}</div>
  </div>;
}
