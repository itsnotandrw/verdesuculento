'use client';

import { useSpotlight } from '@/hooks/useSpotlight';
import type { Testimonial } from '@/types';

export default function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  const spotlight = useSpotlight<HTMLDivElement>();

  return (
    <div ref={spotlight.ref} onMouseMove={spotlight.onMouseMove} className="testimonial-card">
      <p className="testimonial-text">{testimonial.text}</p>
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{testimonial.name}</div>
        <div className="mono" style={{ fontSize: 11, color: 'var(--fg-dim)', marginTop: 2, letterSpacing: '0.05em' }}>{testimonial.role}</div>
      </div>
    </div>
  );
}
