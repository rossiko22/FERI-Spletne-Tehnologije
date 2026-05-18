import { type ReactNode } from 'react';

export function PageHeader({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <header className="mb-10">
      <div className="text-xs font-mono uppercase tracking-widest text-primary">{eyebrow}</div>
      <h1 className="mt-2 text-4xl md:text-5xl font-semibold">{title}</h1>
      {sub && <p className="mt-3 text-sm text-muted-foreground max-w-xl">{sub}</p>}
    </header>
  );
}

export function Stat({ label, value, unit }: { label: string; value: ReactNode; unit?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="stat-num text-3xl md:text-4xl">{value}</span>
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-border bg-card p-5 ${className}`}>{children}</div>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">{children}</div>;
}
