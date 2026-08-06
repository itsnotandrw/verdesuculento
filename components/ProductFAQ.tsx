'use client';

import { useState } from 'react';
import type { ProductQna } from '@/types';

export default function ProductFAQ({ items }: { items: ProductQna[] }) {
  const [open, setOpen] = useState<number | null>(0);

  if (items.length === 0) return null;

  return (
    <section style={{ paddingTop: 64, borderTop: '1px solid var(--border)' }}>
      <div className="eyebrow" style={{ marginBottom: 16 }}>PREGUNTAS FRECUENTES</div>
      <h2 className="display" style={{ fontSize: 'clamp(32px, 4vw, 56px)', marginBottom: 32 }}>
        Dudas de otros <em style={{ color: 'var(--accent)' }}>compradores.</em>
      </h2>
      <div className="faq-list">
        {items.map((q, i) => (
          <div key={i} className="faq-item">
            <button
              className="faq-question"
              onClick={() => setOpen(open === i ? null : i)}
              aria-expanded={open === i}
            >
              <span>{q.pregunta}</span>
              <svg className="faq-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            <div className={`faq-answer ${open === i ? 'open' : ''}`}>
              <div className="faq-answer-inner">
                <p>{q.respuesta}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
