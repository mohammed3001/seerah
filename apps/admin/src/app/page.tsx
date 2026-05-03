/**
 * Placeholder landing page.  The real login flow + sidebar shell lands in
 * PR-Admin-A2 and PR-Admin-A3 respectively.  This page exists so `next build`
 * has at least one route to compile, and so a developer hitting localhost:3001
 * before A2 lands sees a clear next step instead of a 404.
 */
export default function AdminHomePage() {
  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1>Seerah Admin</h1>
      <p>
        Foundation schema is live (PR-Admin-A1). The login UI and dashboard ship in follow-up PRs{" "}
        <code>A2</code> and <code>A3</code>.
      </p>
      <p>
        First-run bootstrap: run <code>pnpm --filter @seerah/admin bootstrap</code> with the env
        vars documented in <code>apps/admin/README.md</code>.
      </p>
    </main>
  );
}
