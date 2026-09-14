export default function Loading() {
  return (
    <div className="page-section" style={{ paddingTop: 160, textAlign: 'center' }}>
      <div className="container">
        <svg className="grow-loader" width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true">
          <ellipse className="grow-soil" cx="28" cy="49" rx="14" ry="3" fill="var(--border)" />
          <path className="grow-stem" d="M28 48 V24" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
          <path className="grow-leaf grow-leaf-l" d="M28 32c-8-2-12-10-10-18 8 2 12 10 10 18z" fill="var(--accent)" />
          <path className="grow-leaf grow-leaf-r" d="M28 26c8-2 12-10 10-18-8 2-12 10-10 18z" fill="var(--accent)" />
        </svg>
        <style>{`
          .grow-loader { display: block; margin: 0 auto 24px; }
          .grow-soil { opacity: 0.5; }
          .grow-stem {
            stroke-dasharray: 24;
            stroke-dashoffset: 24;
            animation: growStem 2.6s ease-in-out infinite;
          }
          .grow-leaf {
            transform-box: fill-box;
            transform-origin: bottom center;
            opacity: 0;
            transform: scale(0.2);
          }
          .grow-leaf-l { animation: growLeafL 2.6s ease-in-out infinite; }
          .grow-leaf-r { animation: growLeafR 2.6s ease-in-out infinite; }

          @keyframes growStem {
            0% { stroke-dashoffset: 24; opacity: 0; }
            8% { opacity: 1; }
            38% { stroke-dashoffset: 0; opacity: 1; }
            88% { opacity: 1; }
            100% { stroke-dashoffset: 0; opacity: 0; }
          }
          @keyframes growLeafL {
            0%, 32% { opacity: 0; transform: scale(0.2); }
            50% { opacity: 1; transform: scale(1); }
            88% { opacity: 1; transform: scale(1); }
            100% { opacity: 0; transform: scale(1); }
          }
          @keyframes growLeafR {
            0%, 48% { opacity: 0; transform: scale(0.2); }
            66% { opacity: 1; transform: scale(1); }
            88% { opacity: 1; transform: scale(1); }
            100% { opacity: 0; transform: scale(1); }
          }
          @media (prefers-reduced-motion: reduce) {
            .grow-stem, .grow-leaf-l, .grow-leaf-r { animation: none; opacity: 1; transform: scale(1); stroke-dashoffset: 0; }
          }
        `}</style>
        <p className="mono" style={{ fontSize: 12, color: 'var(--fg-dim)', letterSpacing: '0.1em' }}>CARGANDO...</p>
      </div>
    </div>
  );
}
