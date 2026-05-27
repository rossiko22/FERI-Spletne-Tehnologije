// Goals page — OWNER: Sladjana.
import { createFileRoute, Link } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { Plus, Trash2, Flag, Calendar, Check, RotateCcw, Bell } from 'lucide-react';
import { useStore } from '@/lib/useStore';
import { enqueue } from '@/lib/useSync';
import { notifications } from '@/lib/api';
import { PageHeader, Card, Empty, Stat } from '@/components/ui-bits';

export const Route = createFileRoute('/goals')({ component: GoalsPage });

type Goal = {
  id: string;
  title: string;
  progress: number;
  startDate: string;
  deadline: string;
};

const today = () => new Date().toISOString().slice(0, 10);

// Sends a push nudge for every overdue goal (progress < 100, deadline passed)
async function nudgeOverdueGoals(items: Goal[]) {
  if (Notification.permission !== 'granted') return;
  const overdue = items.filter((g) => {
    if ((g.progress ?? 0) >= 100) return false;
    return g.deadline < today();
  });
  for (const g of overdue) {
    await notifications.send({
      title: '⚠️ Goal overdue',
      body: `"${g.title}" is past its deadline. Update your progress!`,
    }).catch(() => {});
  }
}

function GoalsPage() {
  const { items, add, del, update } = useStore<Goal>('goals');
  const [title, setTitle] = useState('');
  const [start, setStart] = useState(today());
  const [nudgeSent, setNudgeSent] = useState(false);
  const [deadline, setDeadline] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 10);
  });

  const completed = items.filter((g) => g.progress >= 100).length;
  const active = items.length - completed;
  const overdue = items.filter((g) => (g.progress ?? 0) < 100 && g.deadline < today()).length;

  // Nudge on page load — once per session
  useEffect(() => {
    if (!nudgeSent && items.length > 0) {
      nudgeOverdueGoals(items);
      setNudgeSent(true);
    }
  }, [items, nudgeSent]);

  const setProgress = async (g: Goal, value: number) => {
    const p = Math.max(0, Math.min(100, Math.round(value)));
    await update(g.id, { progress: p });
    await enqueue({ kind: 'update', entity: 'goal', payload: { id: g.id, progress: p } });
  };

  return (
    <div>
      <PageHeader eyebrow="Module · Sladjana" title="Goals" sub="One title, two dates, a progress bar from 0% to 100%. Slipping goals trigger a push reminder." />

      <div className="mb-6 flex gap-2">
        <Link to="/habits" className="px-3 py-1.5 rounded-md text-sm border border-border hover:border-primary">Habits</Link>
        <Link to="/goals" className="px-3 py-1.5 rounded-md text-sm bg-primary text-primary-foreground inline-flex items-center gap-2"><Flag className="size-3.5" strokeWidth={1.5} />Goals</Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Stat label="Active" value={active} />
        <Stat label="Completed" value={completed} />
        <Stat label="Overdue" value={overdue} />
        <Stat label="Total" value={items.length} />
      </div>

      {overdue > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-[var(--warning)] bg-[var(--warning-bg)] px-4 py-3 text-sm">
          <Bell className="size-4 text-[var(--warning)]" strokeWidth={1.5} />
          <span>{overdue} goal{overdue > 1 ? 's are' : ' is'} overdue — a push reminder was sent.</span>
        </div>
      )}

      <Card className="mb-6">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!title.trim()) return;
            if (deadline < start) { alert('Deadline must be on or after start date.'); return; }
            const g = await add({ title: title.trim(), progress: 0, startDate: start, deadline });
            await enqueue({ kind: 'create', entity: 'goal', payload: g });
            setTitle('');
          }}
          className="grid md:grid-cols-4 gap-3"
        >
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Goal (e.g. Run a half marathon)" className="md:col-span-2 bg-input border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary" />
          <DateIn label="Start" value={start} onChange={setStart} />
          <DateIn label="Deadline" value={deadline} onChange={setDeadline} />
          <button type="submit" className="md:col-span-4 inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-md py-2 text-sm font-medium hover:opacity-90">
            <Plus className="size-4" strokeWidth={2} /> Add goal
          </button>
        </form>
      </Card>

      {items.length === 0 ? (
        <Empty>No goals yet. Set your first one above.</Empty>
      ) : (
        <ul className="grid md:grid-cols-2 gap-3">
          {items.map((g) => {
            const pct = Math.min(100, Math.max(0, g.progress ?? 0));
            const done = pct >= 100;
            const daysLeft = Math.ceil((new Date(g.deadline).getTime() - Date.now()) / 86400000);
            const totalDays = Math.max(1, Math.ceil((new Date(g.deadline).getTime() - new Date(g.startDate ?? g.deadline).getTime()) / 86400000));
            const elapsed = Math.max(0, totalDays - Math.max(0, daysLeft));
            const timePct = Math.min(100, Math.round((elapsed / totalDays) * 100));
            const onTrack = pct >= timePct;
            const isOverdue = !done && g.deadline < today();
            return (
              <li key={g.id} className={`rounded-lg border bg-card p-4 ${done ? 'border-[var(--success)]' : isOverdue ? 'border-[var(--warning)]' : 'border-border'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      <Flag className={`size-4 ${done ? 'text-[var(--success)]' : isOverdue ? 'text-[var(--warning)]' : 'text-primary'}`} strokeWidth={1.5} />
                      <span className={done ? 'line-through text-muted-foreground' : ''}>{g.title}</span>
                      {done && <span className="text-[10px] font-mono bg-[var(--success-bg)] text-[var(--success)] px-1.5 py-0.5 rounded">DONE</span>}
                      {isOverdue && <span className="text-[10px] font-mono bg-[var(--warning-bg)] text-[var(--warning)] px-1.5 py-0.5 rounded">OVERDUE</span>}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono mt-1 inline-flex items-center gap-1">
                      <Calendar className="size-3" strokeWidth={1.5} />
                      {g.startDate ?? '—'} → {g.deadline} · {daysLeft > 0 ? `${daysLeft}d left` : done ? 'complete' : 'overdue'}
                    </div>
                  </div>
                  <button onClick={() => del(g.id)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="size-4" strokeWidth={1.5} /></button>
                </div>

                <div className="mt-3 h-2 rounded-full bg-secondary overflow-hidden relative">
                  <div className={`h-full transition-all ${done ? 'bg-[var(--success)]' : isOverdue ? 'bg-[var(--warning)]' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
                  <div className="absolute top-0 h-full w-px bg-foreground/40" style={{ left: `${timePct}%` }} />
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-muted-foreground">progress {pct}% · time {timePct}%</span>
                  {!done && <span className={onTrack ? 'text-[var(--success)]' : 'text-[var(--warning)]'}>{onTrack ? 'on track' : 'behind'}</span>}
                </div>

                <input type="range" min={0} max={100} step={5} value={pct} onChange={(e) => setProgress(g, Number(e.target.value))} className="mt-3 w-full accent-primary" />

                <div className="mt-3 flex items-center gap-2">
                  {done ? (
                    <button onClick={() => setProgress(g, 0)} className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md border border-border hover:border-primary text-xs"><RotateCcw className="size-3" strokeWidth={1.5} /> Reopen</button>
                  ) : (
                    <button onClick={() => setProgress(g, 100)} className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md bg-[var(--success)] text-white hover:opacity-90 text-xs font-medium"><Check className="size-3" strokeWidth={2} /> Complete goal</button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function DateIn({ label, value, onChange }: { label: string; value: string; onChange: (s: string) => void }) {
  return (
    <label className="flex items-center gap-2 bg-input border border-border rounded-md px-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input type="date" value={value} onChange={(e) => onChange(e.target.value)} className="bg-transparent w-full outline-none text-sm" />
    </label>
  );
}
