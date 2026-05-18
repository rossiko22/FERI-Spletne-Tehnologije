// 12-week activity heatmap. Pure SVG, no deps.
export function Heatmap({ counts }: { counts: Map<string, number> }) {
  const weeks = 12;
  const days = 7;
  const cells: { date: string; v: number }[][] = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = new Date(today); start.setDate(start.getDate() - (weeks * days - 1));
  for (let w = 0; w < weeks; w++) {
    const col: { date: string; v: number }[] = [];
    for (let d = 0; d < days; d++) {
      const date = new Date(start); date.setDate(start.getDate() + w * days + d);
      const iso = date.toISOString().slice(0, 10);
      col.push({ date: iso, v: counts.get(iso) ?? 0 });
    }
    cells.push(col);
  }
  const max = Math.max(1, ...Array.from(counts.values()));
  const color = (v: number) => {
    if (v === 0) return 'var(--secondary)';
    const t = v / max;
    if (t < 0.34) return '#bfdbfe';
    if (t < 0.67) return '#60a5fa';
    return 'var(--primary)';
  };

  const W = 14, G = 3;
  return (
    <svg width={weeks * (W + G)} height={days * (W + G)} className="block">
      {cells.map((col, w) =>
        col.map((c) => (
          <rect key={c.date} x={w * (W + G)} y={col.indexOf(c) * (W + G)} width={W} height={W} rx={3} fill={color(c.v)}>
            <title>{c.date}: {c.v}</title>
          </rect>
        )),
      )}
    </svg>
  );
}
