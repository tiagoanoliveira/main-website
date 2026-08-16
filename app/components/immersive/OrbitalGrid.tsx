import type { CSSProperties } from 'react';

export function OrbitalGrid({ className = '' }: { className?: string }) {
  const lines = Array.from({ length: 9 });
  return <div className={`orbital-grid ${className}`} aria-hidden="true"><div className="grid-plane">{lines.map((_, i) => <i key={`h-${i}`} style={{ '--i': i } as CSSProperties} />)}{lines.map((_, i) => <b key={`v-${i}`} style={{ '--i': i } as CSSProperties} />)}</div><div className="grid-glow" /></div>;
}
