export default function Loading() {
  return (
    <div className="page-section" style={{ paddingTop: 160, textAlign: 'center' }}>
      <div className="container">
        <div className="loading-spinner" />
        <style>{`
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid var(--border);
            border-top-color: var(--accent);
            border-radius: 50%;
            margin: 0 auto 24px;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
        <p className="mono" style={{ fontSize: 12, color: 'var(--fg-dim)', letterSpacing: '0.1em' }}>CARGANDO...</p>
      </div>
    </div>
  );
}
