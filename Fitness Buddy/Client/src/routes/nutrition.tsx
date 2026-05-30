// Nutrition page — OWNER: Sladjana (UI).
import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { Trash2, Plus, Droplet, Calendar, X, Utensils } from 'lucide-react';
import { useStore } from '@/lib/useStore';
import { PageHeader, Card, Empty, Stat } from '@/components/ui-bits';
import { enqueue } from '@/lib/useSync';
import { useSync, withSync } from '@/lib/useSync';
import { nutrition as nutritionApi } from '@/lib/api';

export const Route = createFileRoute('/nutrition')({ component: NutritionPage });

type Kind = 'food' | 'drink';
type Unit = 'kcal' | 'g' | 'kg' | 'ml' | 'l';
type Meal = {
  id: string; name: string; kind: Kind; amount: number; unit: Unit;
  calories: number; water: number; date: string;
};

const today = () => new Date().toISOString().slice(0, 10);

const FOOD_UNITS: Unit[] = ['kcal', 'g', 'kg'];
const DRINK_UNITS: Unit[] = ['ml', 'l'];

function toCanonical(kind: Kind, amount: number, unit: Unit) {
  if (kind === 'food') {
    if (unit === 'kcal') return { calories: amount, water: 0 };
    if (unit === 'g') return { calories: Math.round(amount * 1), water: 0 };
    if (unit === 'kg') return { calories: Math.round(amount * 1000), water: 0 };
  }
  if (kind === 'drink') {
    if (unit === 'ml') return { calories: 0, water: amount };
    if (unit === 'l') return { calories: 0, water: Math.round(amount * 1000) };
  }
  return { calories: 0, water: 0 };
}

function NutritionPage() {
  const { items, add, del } = useStore<Meal>('nutrition');
  const [name, setName] = useState('');
  const [kind, setKind] = useState<Kind>('food');
  const [unit, setUnit] = useState<Unit>('kcal');
  const [amount, setAmount] = useState(400);
  const [filterDate, setFilterDate] = useState<string>('');
  const { state, pending } = useSync();

  const isQueued = (id: string) =>
    pending.some((q) => q.payload && (q.payload as { id: string }).id === id);

  const visible = useMemo(
    () => (filterDate ? items.filter((x) => x.date === filterDate) : items),
    [items, filterDate],
  );

  const kcal = visible.reduce((s, x) => s + (x.calories ?? 0), 0);
  const ml = visible.reduce((s, x) => s + (x.water ?? 0), 0);

  const onKind = (k: Kind) => {
    setKind(k);
    setUnit(k === 'food' ? 'kcal' : 'ml');
    setAmount(k === 'food' ? 400 : 250);
  };

  return (
    <div>
      <PageHeader title="Nutrition" sub="Meals, calories, hydration. New entries are always logged to today." />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <Stat label={filterDate ? 'Calories (filtered)' : 'Calories total'} value={kcal} unit="kcal" />
        <Stat label={filterDate ? 'Water (filtered)' : 'Water total'} value={ml} unit="ml" />
        <Stat label="Entries" value={visible.length} />
      </div>

      <Card className="mb-6">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!name.trim()) return;
            const c = toCanonical(kind, amount, unit);
            const item = await add({ name: name.trim(), kind, amount, unit, ...c, date: today() });
            await withSync(
              () => nutritionApi.create(item),
              { kind: 'create', entity: 'meal', payload: item }
            );
            setName('');
          }}
          className="grid md:grid-cols-6 gap-3"
        >
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={kind === 'food' ? 'Meal (e.g. Oats & berries)' : 'Drink (e.g. Water, coffee)'} className="md:col-span-3 bg-input border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary" />
          <Select label="Type" value={kind} onChange={(v) => onKind(v as Kind)} options={[{ v: 'food', l: '🍽 Food' }, { v: 'drink', l: '💧 Drink' }]} />
          <NumIn label="Amount" value={amount} onChange={setAmount} />
          <Select label="Unit" value={unit} onChange={(v) => setUnit(v as Unit)} options={(kind === 'food' ? FOOD_UNITS : DRINK_UNITS).map((u) => ({ v: u, l: u }))} />
          <button type="submit" className="md:col-span-6 inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-md py-2 text-sm font-medium hover:opacity-90">
            <Plus className="size-4" strokeWidth={2} /> Log {kind} for today ({today()})
          </button>
        </form>
      </Card>

      <FilterBar value={filterDate} onChange={setFilterDate} />

      {visible.length === 0 ? (
        <Empty>{filterDate ? `No entries on ${filterDate}.` : 'No meals logged yet.'}</Empty>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {visible.slice().reverse().map((m) => {
            const isDrink = (m.kind ?? (m.water > 0 ? 'drink' : 'food')) === 'drink';
            return (
              <li key={m.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`size-8 grid place-items-center rounded-md ${isDrink ? 'bg-[var(--info-bg)] text-[var(--info)]' : 'bg-secondary text-primary'}`}>
                    {isDrink ? <Droplet className="size-4" strokeWidth={1.5} /> : <Utensils className="size-4" strokeWidth={1.5} />}
                  </span>
                  <div className="min-w-0">
                    <div className="font-medium truncate flex items-center gap-2">
                      {m.name}
                      {isQueued(m.id) && (
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                          state === 'syncing'
                            ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                            : 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                        }`}>
                          {state === 'syncing' ? 'syncing…' : 'queued'}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono mt-1 flex items-center gap-3 flex-wrap">
                      {m.amount != null && m.unit ? <span>{m.amount} {m.unit}</span> : null}
                      {m.calories > 0 && <span>{m.calories} kcal</span>}
                      {m.water > 0 && <span className="inline-flex items-center gap-1"><Droplet className="size-3" strokeWidth={1.5} />{m.water}ml</span>}
                      <span>{m.date}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    await del(m.id);
                    await withSync(
                      () => nutritionApi.remove(m.id),
                      { kind: 'delete', entity: 'meal', payload: { id: m.id } }
                    );
                  }}
                  className="text-muted-foreground hover:text-destructive p-2"
                >
                  <Trash2 className="size-4" strokeWidth={1.5} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <label className="flex items-center gap-2 bg-input border border-border rounded-md px-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="bg-transparent w-full outline-none text-sm">
        {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </label>
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
