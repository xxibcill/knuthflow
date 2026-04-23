export function SecuritySettings() {
  return (
    <div className="stack-lg">
      <section className="surface-panel-muted p-5">
        <p className="metric-label">Secure Storage</p>
        <div className="metrics-grid">
          <div className="metric-card">
            <p className="metric-label">Backend</p>
            <p className="metric-value">
              {navigator.platform === 'darwin' ? 'macOS Keychain' : 'Encrypted File'}
            </p>
            <p className="mt-2 text-sm text-muted">
              Sensitive values stay outside the session database and are protected by the host OS.
            </p>
          </div>
          <div className="metric-card">
            <p className="metric-label">Scope</p>
            <p className="metric-value">Tokens, keys, secrets</p>
            <p className="mt-2 text-sm text-muted">
              Credentials remain encrypted at rest and are not written as plaintext configuration.
            </p>
          </div>
        </div>
      </section>

      <section className="surface-panel-muted p-5">
        <p className="metric-label">Operational Notes</p>
        <div className="stack-sm">
          <div className="toggle-row">
            <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <div>
              <p className="m-0 text-sm font-semibold">Secrets stay out of session history</p>
              <p className="mt-1 text-sm text-muted">
                Session logs and run metadata are stored separately from encrypted credentials.
              </p>
            </div>
          </div>

          <div className="toggle-row">
            <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <div>
              <p className="m-0 text-sm font-semibold">No extra action required</p>
              <p className="mt-1 text-sm text-muted">
                The storage backend is selected automatically based on the platform Ralph is running on.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
