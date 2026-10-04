import { useEffect, useState } from 'react';
import { fetchErrorReports, setErrorReportResolved } from '../../services/admin';
import { useToast } from '../../context/ToastContext';
import PageLoader from '../../components/PageLoader';
import LoadError from '../components/LoadError';

// Reads error_reports, the shop's own table of uncaught storefront errors.
//
// Unlike the analytics feed this is not gated on cookie consent, so it shows what
// is actually happening for every customer, not only those who accepted
// analytics. Reports carry no cookie or device identifier; `user_id` is set only
// when the visitor was signed in.
export default function AdminErrors() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [includeResolved, setIncludeResolved] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const { showToast } = useToast();

  function load() {
    setLoadError(false);
    fetchErrorReports({ includeResolved })
      .then(setReports)
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }

  useEffect(load, [includeResolved]);

  async function handleResolve(report) {
    try {
      await setErrorReportResolved(report.id, !report.resolved_at);
      showToast(report.resolved_at ? 'Report reopened.' : 'Report marked resolved.');
      load();
    } catch {
      showToast('Could not update the report.', 'error');
    }
  }

  if (loading) return <PageLoader />;

  const open = reports.filter((r) => !r.resolved_at);

  return (
    <div>
      <div className="admin-header">
        <h1>Error Reports</h1>
      </div>

      <p className="admin-page-hint">
        Uncaught errors from the storefront, most recent first. One row per
        distinct bug, counting how many times it happened. Resolving a report keeps
        the record; if the bug returns it reopens on its own.
      </p>

      {loadError && <LoadError what="error reports" onRetry={load} />}

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={includeResolved}
          onChange={(e) => setIncludeResolved(e.target.checked)}
        />
        Show resolved reports ({reports.length - open.length} hidden)
      </label>

      {reports.length === 0 ? (
        <p className="empty-state">
          {loadError
            ? 'Could not load reports.'
            : 'No error reports. Nothing has gone uncaught on the storefront.'}
        </p>
      ) : (
        <div className="error-report-list">
          {reports.map((report) => (
            <article
              key={report.id}
              className={report.resolved_at ? 'error-report is-resolved' : 'error-report'}
            >
              <div className="error-report-head">
                <strong className="error-report-message">{report.message}</strong>
                <span className="admin-pill is-bad">{report.occurrences}×</span>
                {report.resolved_at && <span className="admin-pill is-good">Resolved</span>}
              </div>

              <dl className="error-report-meta">
                <div><dt>Last seen</dt><dd>{new Date(report.last_seen).toLocaleString()}</dd></div>
                <div><dt>First seen</dt><dd>{new Date(report.first_seen).toLocaleString()}</dd></div>
                <div><dt>Page</dt><dd>{report.url || '—'}</dd></div>
                <div><dt>Customer</dt><dd>{report.user_id ? 'Signed in' : 'Anonymous'}</dd></div>
                <div><dt>From</dt><dd>{report.source === 'edge' ? 'Server function' : 'Browser'}</dd></div>
              </dl>

              <div className="error-report-actions">
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={() => setExpanded(expanded === report.id ? null : report.id)}
                  aria-expanded={expanded === report.id}
                >
                  {expanded === report.id ? 'Hide details' : 'Show details'}
                </button>
                <button type="button" className="btn btn-sm btn-outline" onClick={() => handleResolve(report)}>
                  {report.resolved_at ? 'Reopen' : 'Mark resolved'}
                </button>
              </div>

              {expanded === report.id && (
                <div className="error-report-detail">
                  <h4>Stack trace</h4>
                  <pre>{report.stack || 'No stack trace was captured.'}</pre>
                  {report.context && (
                    <>
                      <h4>Context</h4>
                      <pre>{JSON.stringify(report.context, null, 2)}</pre>
                    </>
                  )}
                  <p className="form-hint">
                    Fingerprint <code>{report.fingerprint}</code> — this is how the
                    same bug is told apart from a different one.
                  </p>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}