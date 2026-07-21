export default function SetupRequiredPage() {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h1>Setup required</h1>
        <p className="subtitle">Dashboard login isn&apos;t configured yet.</p>
        <p>
          Set <code>ROUTE_AUTH_USERNAME</code> and <code>ROUTE_AUTH_PASSWORD</code> in{" "}
          <code>.env.local</code>, then restart the dev server. This is the same credential the
          eve HTTP channel uses for <code>httpBasic()</code> auth — one login for both.
        </p>
        <p className="subtitle">
          Optionally also set <code>SESSION_SECRET</code> for a dashboard session secret
          independent of the login password.
        </p>
      </div>
    </div>
  );
}
