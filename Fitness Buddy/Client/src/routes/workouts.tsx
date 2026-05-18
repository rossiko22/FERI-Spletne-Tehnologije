// Workouts page — OWNER: Sladjana (UI).
import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { Trash2, Plus, Calendar, X } from 'lucide-react';
import { useStore } from '@/lib/useStore';
import { PageHeader, Card, Empty, Stat } from '@/components/ui-bits';

export const Route = createFileRoute('/workouts')({ component: WorkoutsPage });

type Workout = { id: string; name: string; sets: number; reps: number; duration: number; date: string };
const today = () => new Date().toISOString().slice(0, 10);

function WorkoutsPage() {
  const { items, add, del } = useStore<Workout>('workouts');
  const [name, setName] = useState('');
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [duration, setDuration] = useState(30);
  const [filterDate, setFilterDate] = useState<string>('');

  const visible = useMemo(
    () => (filterDate ? items.filter((x) => x.date === filterDate) : items),
    [items, filterDate],
  );

  const totalMin = visible.reduce((s, x) => s + x.duration, 0);
  const sessions = visible.length;

  return (
    <div>
      <PageHeader eyebrow="Module · Sladjana" title="Workouts" sub="Strength, cardio, mobility. New entries are always logged to today." />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <Stat label={filterDate ? 'Sessions (filtered)' : 'Sessions'} value={sessions} />
        <Stat label="Total minutes" value={totalMin} unit="min" />
        <Stat label="Avg duration" value={sessions ? Math.round(totalMin / sessions) : 0} unit="min" />
      </div>

      <Card className="mb-6">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!name.trim()) return;
            await add({ name: name.trim(), sets, reps, duration, date: today() });
            setName('');
          }}
          className="grid md:grid-cols-5 gap-3"
        >
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Exercise (e.g. Bench press)" className="md:col-span-2 bg-input border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary" />
          <NumIn label="Sets" value={sets} onChange={setSets} />
          <NumIn label="Reps" value={reps} onChange={setReps} />
          <NumIn label="Min" value={duration} onChange={setDuration} />
          <button type="submit" className="md:col-span-5 inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-md py-2 text-sm font-medium hover:opacity-90">
            <Plus className="size-4" strokeWidth={2} /> Log workout for today ({today()})
          </button>
        </form>
      </Card>

      <FilterBar value={filterDate} onChange={setFilterDate} />

      {visible.length === 0 ? (
        <Empty>{filterDate ? `No workouts on ${filterDate}.` : 'No workouts yet. Log your first session above.'}</Empty>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {visible.slice().reverse().map((w) => (
            <li key={w.id} className="flex items-center justify-between p-4">
              <div>
                <div className="font-medium">{w.name}</div>
                <div className="text-xs text-muted-foreground font-mono mt-1">{w.sets}×{w.reps} · {w.duration}min · {w.date}</div>
              </div>
              <button onClick={() => del(w.id)} className="text-muted-foreground hover:text-destructive transition-colors p-2"><Trash2 className="size-4" strokeWidth={1.5} /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterBar({ value, onChange }: { value: string; onChange: (s: string) => void }) {
  return (
    <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
      <div className="text-sm font-medium">History</div>
      <div className="flex items-center gap-2">
        <button onClick={() => onChange('')} className={`px-2.5 h-8 rounded-md border text-xs ${value === '' ? 'bg-primary text-primary-foreground border-primary' : 'border-border bg-card hover:border-primary'}`}>All</button>
        <button onClick={() => onChange(today())} className={`px-2.5 h-8 rounded-md border text-xs ${value === today() ? 'bg-primary text-primary-foreground border-primary' : 'border-border bg-card hover:border-primary'}`}>Today</button>
        <label className="flex items-center gap-1.5 bg-card border border-border rounded-md px-2 h-8 text-xs hover:border-primary">
          <Calendar className="size-3 text-muted-foreground" strokeWidth={1.5} />
          <input type="date" max={today()} value={value || ''} onChange={(e) => onChange(e.target.value)} className="bg-transparent outline-none" />
        </label>
        {value && <button onClick={() => onChange('')} className="size-8 grid place-items-center rounded-md border border-border hover:border-destructive hover:text-destructive"><X className="size-3" strokeWidth={1.5} /></button>}
      </div>
    </div>
  );
}

function NumIn({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <label className="flex items-center gap-2 bg-input border border-border rounded-md px-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input type="number" min={0} value={value} onChange={(e) => onChange(Number(e.target.value))} className="stat-num bg-transparent w-full outline-none text-sm" />
    </label>
  );
}
