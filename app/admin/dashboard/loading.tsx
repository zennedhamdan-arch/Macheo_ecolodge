/**
 * Navigation fallback for the dashboard.
 *
 * Every page here reads the database with the admin's own session (and the
 * middleware revalidates that session first), so moving between sections takes
 * a moment on a lodge connection. This says the page is coming instead of
 * leaving the previous one frozen on screen with no explanation.
 */
export default function DashboardLoading(): React.JSX.Element {
  return (
    <div className="admin-loading" role="status" aria-live="polite">
      <span className="admin-loading-spinner" aria-hidden="true" />
      <span>Loading…</span>
    </div>
  );
}
