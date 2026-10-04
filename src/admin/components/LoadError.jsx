// Shown when an admin list fails to load. Without this the pages that set an
// empty list on error tell the owner their catalogue, reviews or orders are
// empty, which is a very different problem from the request having failed.
export default function LoadError({ onRetry, what }) {
  return (
    <div className="admin-load-error" role="alert">
      <div>
        <strong>Could not load {what}.</strong>
        <span>This is usually a dropped connection, not empty data. Try again.</span>
      </div>
      {onRetry && <button type="button" className="btn btn-outline btn-sm" onClick={onRetry}>Retry</button>}
    </div>
  );
}