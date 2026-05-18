import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { Dumbbell, Apple, Target, ArrowUpRight, Flame, Droplet, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useStore } from '@/lib/useStore';
import { PageHeader, Stat, Card } from '@/components/ui-bits';
import { Heatmap } from '@/components/Heatmap';

export const Route = createFileRoute('/')({
  component: Today,
});

type Workout = { id: string; name: string; duration: number; date: string };
type Meal = { id: string; name: string; calories: number; water: number; date: string };
type HabitLog = { id: string; habitId: string; date: string };

const todayISO = () => new Date().toISOString().slice(0, 10);
const shift = (iso: string, delta: number) => {
  const d = new Date(iso); d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
};
const pretty = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
};

function Today() {
  const w = useStore<Workout>('workouts');
  const n = useStore<Meal>('nutrition');
  const l = useStore<HabitLog>('habitLogs');
  const h = useStore<{ id: string; name: string }>('habits');

  const [date, setDate] = useState(todayISO());
  const isToday = date === todayISO();

  const dayWorkouts = useMemo(() => w.items.filter((x) => x.date === date), [w.items, date]);
  const dayMeals = useMemo(() => n.items.filter((x) => x.date === date), [n.items, date]);
  const dayHabits = useMemo(() => l.items.filter((x) => x.date === date), [l.items, date]);

  const minutes = dayWorkouts.reduce((s, x) => s + x.duration, 0);
  const kcal = dayMeals.reduce((s, x) => s + x.calories, 0);
  const waterMl = dayMeals.reduce((s, x) => s + (x.water ?? 0), 0);
  const WATER_GOAL = 2500;

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const t = todayISO();
      if (detail === 'log-water') n.add({ name: 'Quick water', calories: 0, water: 250, date: t } as Meal);
      if (detail === 'delete-last' && n.items.length) n.del(n.items[n.items.length - 1].id);
    };
    window.addEventListener('fb_cmd', handler);
    return () => window.removeEventListener('fb_cmd', handler);
  }, [n]);

  const heat = new Map<string, number>();
  for (const x of w.items) heat.set(x.date, (heat.get(x.date) ?? 0) + x.duration);

  const dates = new Set([
    ...w.items.map((x) => x.date),
    ...l.items.map((x) => x.date),
    ...n.items.map((x) => x.date),
  ]);
  let streak = 0;
  const d = new Date();
  while (dates.has(d.toISOString().slice(0, 10))) { streak++; d.setDate(d.getDate() - 1); }

  const waterPct = Math.min(100, Math.round((waterMl / WATER_GOAL) * 100));

  return (
    <div>
      <PageHeader eyebrow={isToday ? 'Today' : 'Day view'} title="Train. Eat. Build the streak." sub="Offline-first PWA. Voice and gesture controls live in the floating panels." />

      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Viewing</div>
          <div className="text-sm font-medium mt-1">{pretty(date)}</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setDate(shift(date, -1))} className="size-9 grid place-items-center rounded-md border border-border bg-card hover:border-primary"><ChevronLeft className="size-4" strokeWidth={1.5} /></button>
          <label className="flex items-center gap-2 bg-card border border-border rounded-md px-3 py-2 text-sm">
            <Calendar className="size-3.5 text-muted-foreground" strokeWidth={1.5} />
            <input type="date" max={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} className="bg-transparent outline-none" />
          </label>
          <button onClick={() => setDate(shift(date, 1))} disabled={date >= todayISO()} className="size-9 grid place-items-center rounded-md border border-border bg-card hover:border-primary disabled:opacity-40"><ChevronRight className="size-4" strokeWidth={1.5} /></button>
          {!isToday && <button onClick={() => setDate(todayISO())} className="ml-1 px-3 h-9 rounded-md border border-border bg-card hover:border-primary text-xs">Jump to today</button>}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Calories burned" value={Math.round(minutes * 8)} unit="kcal" />
        <Stat label="Calories consumed" value={kcal} unit="kcal" />
        <Card>
          <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Droplet className="size-3" strokeWidth={1.5} />Water</div>
          <div className="mt-3 stat-num text-3xl md:text-4xl">{waterMl}<span className="text-xs text-muted-foreground ml-1">/{WATER_GOAL}ml</span></div>
          <div className="mt-3 h-1.5 rounded-full bg-secondary overflow-hidden"><div className="h-full bg-primary" style={{ width: `${waterPct}%` }} /></div>
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Flame className="size-3 text-[var(--warning)]" strokeWidth={1.5} />Streak</div>
          <div className="mt-3 stat-num text-3xl md:text-4xl">{streak}<span className="text-xs text-muted-foreground ml-1">days</span></div>
          <div className="mt-3 text-xs text-muted-foreground">Log anything today to extend it.</div>
        </Card>
      </div>

      <div className="mt-8 grid md:grid-cols-3 gap-4">
        <ModuleCard to="/workouts" icon={<Dumbbell className="size-5" strokeWidth={1.5} />} title="Workouts" desc={`${dayWorkouts.length} on ${isToday ? 'today' : date}`} />
        <ModuleCard to="/nutrition" icon={<Apple className="size-5" strokeWidth={1.5} />} title="Nutrition" desc={`${dayMeals.length} meals · ${kcal} kcal`} />
        <ModuleCard to="/habits" icon={<Target className="size-5" strokeWidth={1.5} />} title="Habits" desc={`${dayHabits.length}/${h.items.length} checked`} />
      </div>

      <Card className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm font-semibold">Activity heatmap</div>
            <div className="text-xs text-muted-foreground">Last 12 weeks of workout minutes.</div>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span>less</span>
            <span className="inline-block size-3 rounded-sm" style={{ background: 'var(--secondary)' }} />
            <span className="inline-block size-3 rounded-sm" style={{ background: '#bfdbfe' }} />
            <span className="inline-block size-3 rounded-sm" style={{ background: '#60a5fa' }} />
            <span className="inline-block size-3 rounded-sm" style={{ background: 'var(--primary)' }} />
            <span>more</span>
          </div>
        </div>
        <div className="overflow-x-auto"><Heatmap counts={heat} /></div>
      </Card>
    </div>
  );
}

function ModuleCard({ to, icon, title, desc }: { to: '/workouts' | '/nutrition' | '/habits'; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Link to={to} className="group">
      <Card className="h-full transition-colors group-hover:border-primary">
        <div className="flex items-start justify-between">
          <div className="size-9 grid place-items-center rounded-md bg-secondary text-primary">{icon}</div>
          <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" strokeWidth={1.5} />
        </div>
        <div className="mt-6 text-lg font-semibold">{title}</div>
        <div className="mt-1 text-sm text-muted-foreground">{desc}</div>
      </Card>
    </Link>
  );
}
