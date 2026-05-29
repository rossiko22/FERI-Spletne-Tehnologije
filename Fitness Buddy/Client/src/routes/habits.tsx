// Habits page — OWNER: Sladjana (UI), with goals on the same tab (your design note).
import { createFileRoute, Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { Trash2, Plus, Check, Calendar, X, Flag } from 'lucide-react';
import { useStore } from '@/lib/useStore';
import { PageHeader, Empty } from '@/components/ui-bits';
import { enqueue } from '@/lib/useSync';

export const Route = createFileRoute('/habits')({ component: HabitsPage });

type Habit = { id: string; name: string };
type Log = { id: string; habitId: string; date: string };
const today = () => new Date().toISOString().slice(0, 10);

function HabitsPage() {
  const habits = useStore<Habit>('habits');
  const logs = useStore<Log>('habitLogs');
  const [name, setName] = useState('');
  const [filterDate, setFilterDate] = useState<string>('');

  const todaySet = useMemo(
    () => new Set(logs.items.filter((l) => l.date === today()).map((l) => l.habitId)),
    [logs.items],
  );
  const filterSet = useMemo(
    () => (filterDate ? new Set(logs.items.filter((l) => l.date === filterDate).map((l) => l.habitId)) : null),
    [logs.items, filterDate],
  );

  const streak = (habitId: string) => {
    const dates = new Set(logs.items.filter((l) => l.habitId === habitId).map((l) => l.date));
    let s = 0;
    const d = new Date();
    while (dates.has(d.toISOString().slice(0, 10))) { s++; d.setDate(d.getDate() - 1); }
    return s;
  };

  const toggleToday = async (habitId: string) => {
    const t = today();
    const existing = logs.items.find((l) => l.habitId === habitId && l.date === t);
    if (existing) {
      await logs.del(existing.id);
      await enqueue({ kind: 'delete', entity: 'habitLog', payload: { id: existing.id } });
    } else {
      const item = await logs.add({ habitId, date: t });
      await enqueue({ kind: 'create', entity: 'habitLog', payload: item });
    }
  };

  return (
    <div>
      <PageHeader eyebrow="Module · Sladjana" title="Habits & Goals" sub="Build streaks. Check-ins always count for today — use the filter to inspect past days. Tap 'Goals' below to switch to long-term targets." />

      <div className="mb-6 flex gap-2">
        <Link to="/habits" className="px-3 py-1.5 rounded-md text-sm bg-primary text-primary-foreground">Habits</Link>
        <Link to="/goals" className="px-3 py-1.5 rounded-md text-sm border border-border hover:border-primary inline-flex items-center gap-2"><Flag className="size-3.5" strokeWidth={1.5} />Goals</Link>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 mb-6">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!name.trim()) return;
            const item = await habits.add({ name: name.trim() });
            await enqueue({ kind: 'create', entity: 'habit', payload: item });
            setName('');
          }}
          className="flex gap-3"
        >
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New habit (e.g. 8h sleep)" className="flex-1 bg-input border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary" />
          <button type="submit" className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90">
            <Plus className="size-4" strokeWidth={2} /> Add habit
          </button>
        </form>
      </div>

      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div className="text-sm font-medium">{filterDate ? `Viewing ${filterDate}` : "Today's check-ins"}</div>
        <div className="flex items-center gap-2">
          <button onClick={() => setFilterDate('')} className={`px-2.5 h-8 rounded-md border text-xs ${filterDate === '' ? 'bg-primary text-primary-foreground border-primary' : 'border-border bg-card hover:border-primary'}`}>Today</button>
          <label className="flex items-center gap-1.5 bg-card border border-border rounded-md px-2 h-8 text-xs hover:border-primary">
            <Calendar className="size-3 text-muted-foreground" strokeWidth={1.5} />
            <input type="date" max={today()} value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="bg-transparent outline-none" />
          </label>
          {filterDate && <button onClick={() => setFilterDate('')} className="size-8 grid place-items-center rounded-md border border-border hover:border-destructive hover:text-destructive"><X className="size-3" strokeWidth={1.5} /></button>}
        </div>
      </div>

      {habits.items.length === 0 ? (
        <Empty>No habits yet. Add one to start a streak.</Empty>
      ) : (
        <ul className="grid md:grid-cols-2 gap-3">
          {habits.items.map((h) => {
            const isReadOnly = !!filterDate;
            const done = isReadOnly ? filterSet!.has(h.id) : todaySet.has(h.id);
            const s = streak(h.id);
            return (
              <li key={h.id} className="rounded-lg border border-border bg-card p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium">{h.name}</div>
                  <div className="text-xs text-muted-foreground font-mono mt-1">streak · {s} day{s === 1 ? '' : 's'} {isReadOnly ? `· ${filterDate} ${done ? '✓' : '—'}` : ''}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => !isReadOnly && toggleToday(h.id)} disabled={isReadOnly} className={`size-9 rounded-md grid place-items-center border transition-all ${done ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary hover:text-foreground'} ${isReadOnly ? 'opacity-60 cursor-not-allowed' : ''}`}>
                    <Check className="size-4" strokeWidth={2} />
                  </button>
                  <button
                    onClick={async () => {
                      await habits.del(h.id);
                      await enqueue({ kind: 'delete', entity: 'habit', payload: { id: h.id } });
                    }}
                    className="text-muted-foreground hover:text-destructive p-2"
                  >
                    <Trash2 className="size-4" strokeWidth={1.5} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
