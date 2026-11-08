export default function TableState({ loading, error, empty, colSpan, emptyText = 'No records found.', onRetry }) {
  if (loading) return <tr><td colSpan={colSpan} className="empty"><span className="spinner" /> Loading…</td></tr>;
  if (error) return <tr><td colSpan={colSpan} className="empty err">{error}{onRetry && <> · <button className="link-btn" onClick={onRetry}>Retry</button></>}</td></tr>;
  if (empty) return <tr><td colSpan={colSpan} className="empty">{emptyText}</td></tr>;
  return null;
}
