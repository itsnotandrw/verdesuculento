'use client';

export default function NewsletterForm() {
  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      style={{ display: 'flex', maxWidth: 480, margin: '0 auto', border: '1px solid var(--border)', borderRadius: 999, padding: 6 }}
    >
      <input
        type="email"
        placeholder="tu@email.com"
        style={{ flex: 1, background: 'transparent', border: 'none', padding: '12px 20px', outline: 'none', color: 'var(--fg)' }}
      />
      <button className="btn btn-primary btn-sm" type="submit">Suscribirme</button>
    </form>
  );
}
