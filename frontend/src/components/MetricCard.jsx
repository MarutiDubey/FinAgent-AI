export default function MetricCard({ label, value, sub, accent, icon }) {
  return (
    <div className="metric-card">
      <div className="metric-top">
        {icon && <span className="metric-icon">{icon}</span>}
        <span className="metric-label">{label}</span>
      </div>
      <div className="metric-value" style={accent ? { color: accent } : {}}>
        {value ?? 'N/A'}
      </div>
      {sub && <div className="metric-sub">{sub}</div>}
    </div>
  );
}
