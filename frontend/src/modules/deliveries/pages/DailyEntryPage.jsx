import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../../shared/api/client';
import toast from 'react-hot-toast';
import {
  ChevronDown, ChevronUp, Search, Check, X,
  Minus, Plus, Droplets, Snowflake, RefreshCw,
  ChevronRight, Users, Loader2, AlertCircle
} from 'lucide-react';

// ── Quick quantity buttons ──────────────────────────────────
const QTY_PRESETS = [0, 0.5, 1, 1.5, 2, 3, 4, 5];

function QtySelector({ value, onChange, label, color = 'primary' }) {
  const colorMap = {
    primary: 'bg-primary text-white',
    muted: 'bg-muted text-foreground',
  };
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-7 shrink-0">{label}</span>
      <div className="flex gap-1.5 flex-wrap">
        {QTY_PRESETS.map(q => (
          <button
            key={q}
            type="button"
            onClick={() => onChange(q)}
            className={`w-9 h-9 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
              value === q
                ? 'bg-primary text-white shadow-sm'
                : 'bg-muted text-foreground hover:bg-primary/10'
            }`}
          >
            {q}
          </button>
        ))}
        <input
          type="number"
          min="0"
          step="0.5"
          value={value}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className="w-14 h-9 rounded-xl border border-input text-center text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
    </div>
  );
}

// ── Single customer entry card ─────────────────────────────
function CustomerEntryCard({ customer, entry, onChange, onSave, saving }) {
  const [expanded, setExpanded] = useState(false);
  const isDeclined = entry.status === 'declined';

  function toggle() { setExpanded(e => !e); }

  const hasQty = entry.bt_qty > 0 || entry.jug_qty > 0;
  const isDone = entry._saved;

  return (
    <div className={`rounded-2xl border transition-all ${isDone ? 'border-green-300 bg-green-50/50' : 'border-border bg-card'} shadow-card`}>
      {/* Header row — always visible */}
      <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={toggle}>
        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-bold text-sm ${isDone ? 'bg-green-500 text-white' : 'bg-primary/10 text-primary'}`}>
          {isDone ? <Check className="w-4 h-4" /> : customer.name[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-semibold text-foreground text-sm truncate">{customer.name}</p>
            {Boolean(customer.is_paused) && (
              <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.2 rounded-full font-medium shrink-0">
                Paused
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{customer.area || 'No area'}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!isDeclined && (
            <>
              {customer.bt_enabled && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                  {entry.bt_qty} BT
                </span>
              )}
              {customer.jug_enabled && (
                <span className="text-xs bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full font-medium">
                  {entry.jug_qty} JUG
                </span>
              )}
            </>
          )}
          {isDeclined && (
            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">Declined</span>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>

      {/* Expanded controls */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border pt-4 animate-fade-in">
          {/* Water type */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onChange({ ...entry, water_type: 'normal' })}
              className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-medium transition-all ${entry.water_type === 'normal' ? 'bg-primary text-white' : 'bg-muted text-foreground hover:bg-muted/80'}`}
            >
              <Droplets className="w-4 h-4" /> Normal
            </button>
            <button
              type="button"
              onClick={() => onChange({ ...entry, water_type: 'chilled' })}
              className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-medium transition-all ${entry.water_type === 'chilled' ? 'bg-cyan-500 text-white' : 'bg-muted text-foreground hover:bg-muted/80'}`}
            >
              <Snowflake className="w-4 h-4" /> Chilled
            </button>
          </div>

          {/* BT quantity */}
          {customer.bt_enabled && (
            <QtySelector
              label="BT"
              value={entry.bt_qty}
              onChange={v => onChange({ ...entry, bt_qty: v })}
            />
          )}

          {/* JUG quantity */}
          {customer.jug_enabled && (
            <QtySelector
              label="JUG"
              value={entry.jug_qty}
              onChange={v => onChange({ ...entry, jug_qty: v })}
            />
          )}

          {/* Save as default checkbox */}
          <label className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground pb-1">
            <input
              type="checkbox"
              checked={!!entry.save_as_default}
              onChange={e => onChange({ ...entry, save_as_default: e.target.checked })}
              className="w-3.5 h-3.5 accent-primary rounded"
            />
            Save quantities as customer's default count
          </label>

          {/* Status: decline toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onChange({ ...entry, status: isDeclined ? 'delivered' : 'declined' })}
              className={`flex-1 h-10 rounded-xl text-sm font-medium transition-all ${isDeclined ? 'bg-red-500 text-white' : 'bg-muted text-foreground'}`}
            >
              {isDeclined ? '✗ Declined' : 'Mark as Declined'}
            </button>

            {/* Save button */}
            <button
              type="button"
              onClick={() => { onSave(); setExpanded(false); }}
              disabled={saving}
              className="flex-1 h-10 bg-primary text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Daily Entry Page ──────────────────────────────────
export default function DailyEntryPage() {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [search, setSearch] = useState('');
  const [areaFilter, setAreaFilter] = useState('all');
  const [entries, setEntries] = useState({});
  const [savingId, setSavingId] = useState(null);
  const qc = useQueryClient();

  // Load customers (with dynamic date to capture pauses)
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers-active', date],
    queryFn: () => apiFetch(`/customers?status=active&date=${date}`),
  });

  // Load existing deliveries for selected date
  const { data: existingDeliveries = [] } = useQuery({
    queryKey: ['deliveries', date],
    queryFn: () => apiFetch(`/deliveries?date=${date}`),
    enabled: !!date,
  });

  // Load areas for filter
  const { data: areas = [] } = useQuery({
    queryKey: ['areas'],
    queryFn: () => apiFetch('/customers/areas'),
  });

  // Init entries from customers + existing deliveries + defaults
  useEffect(() => {
    if (!customers.length) return;
    const existingMap = {};
    existingDeliveries.forEach(d => { existingMap[d.customer_id] = d; });

    const initial = {};
    customers.forEach(c => {
      const ex = existingMap[c.id];
      const isPaused = Boolean(c.is_paused);
      initial[c.id] = {
        bt_qty: ex ? Number(ex.bt_qty) : (isPaused ? 0 : Number(c.default_bt_qty || 0)),
        jug_qty: ex ? Number(ex.jug_qty) : (isPaused ? 0 : Number(c.default_jug_qty || 0)),
        water_type: ex?.water_type || 'normal',
        status: ex?.status || (isPaused ? 'declined' : 'delivered'),
        save_as_default: false,
        _saved: !!ex,
      };
    });
    setEntries(initial);
  }, [customers, existingDeliveries]);

  // Apply Defaults manually
  const handleApplyDefaults = () => {
    setEntries(prev => {
      const updated = { ...prev };
      customers.forEach(c => {
        if (!updated[c.id]?._saved) {
          const isPaused = Boolean(c.is_paused);
          updated[c.id] = {
            ...updated[c.id],
            bt_qty: isPaused ? 0 : Number(c.default_bt_qty || 0),
            jug_qty: isPaused ? 0 : Number(c.default_jug_qty || 0),
            water_type: updated[c.id]?.water_type || 'normal',
            status: isPaused ? 'declined' : 'delivered',
            save_as_default: false,
          };
        }
      });
      toast.success('Applied defaults to unsaved list!');
      return updated;
    });
  };

  // Save single entry
  const saveMutation = useMutation({
    mutationFn: ({ customerId, entry }) =>
      apiFetch('/deliveries', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: customerId,
          delivery_date: date,
          bt_qty: entry.bt_qty,
          jug_qty: entry.jug_qty,
          water_type: entry.water_type,
          status: entry.status,
          save_as_default: entry.save_as_default,
        }),
      }),
    onSuccess: (_, { customerId }) => {
      setEntries(prev => ({ ...prev, [customerId]: { ...prev[customerId], _saved: true, save_as_default: false } }));
      qc.invalidateQueries({ queryKey: ['deliveries', date] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['customers-active', date] });
      toast.success('Saved!');
    },
    onError: err => toast.error(err.message),
    onSettled: () => setSavingId(null)
  });

  // Save all (bulk)
  const bulkSaveMutation = useMutation({
    mutationFn: () => {
      const entriesToSave = filteredCustomers.map(c => ({
        customer_id: c.id,
        ...entries[c.id],
      }));
      return apiFetch('/deliveries/bulk', {
        method: 'POST',
        body: JSON.stringify({ entries: entriesToSave, delivery_date: date }),
      });
    },
    onSuccess: () => {
      setEntries(prev => {
        const updated = { ...prev };
        filteredCustomers.forEach(c => { updated[c.id] = { ...updated[c.id], _saved: true }; });
        return updated;
      });
      qc.invalidateQueries({ queryKey: ['deliveries', date] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['customers-active', date] });
      toast.success('All deliveries saved!');
    },
    onError: err => toast.error(err.message),
  });

  // Filter customers
  const filteredCustomers = customers.filter(c => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.mobile.includes(search);
    const matchArea = areaFilter === 'all' || c.area === areaFilter;
    return matchSearch && matchArea;
  });

  // Group by area
  const grouped = filteredCustomers.reduce((acc, c) => {
    const area = c.area || 'No Area';
    if (!acc[area]) acc[area] = [];
    acc[area].push(c);
    return acc;
  }, {});

  const savedCount = Object.values(entries).filter(e => e._saved).length;
  const totalCount = customers.length;

  return (
    <div className="max-w-2xl mx-auto pb-24">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold text-foreground">Daily Entry</h1>
              <p className="text-xs text-muted-foreground">{savedCount}/{totalCount} saved</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleApplyDefaults}
                className="h-9 px-3 rounded-xl border border-primary text-primary text-xs font-semibold hover:bg-primary/5 active:scale-95 transition-all shrink-0"
              >
                Apply Profile Defaults
              </button>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="h-9 px-3 rounded-xl border border-input text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 bg-muted rounded-full mb-3 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${totalCount ? (savedCount / totalCount) * 100 : 0}%` }}
            />
          </div>

          {/* Search + Area filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search customers…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full h-10 pl-9 pr-4 rounded-xl border border-input text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <select
              value={areaFilter}
              onChange={e => setAreaFilter(e.target.value)}
              className="h-10 px-3 rounded-xl border border-input text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All Areas</option>
              {areas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Customer list */}
      <div className="px-4 py-4 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading customers…
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No customers found</p>
          </div>
        ) : (
          Object.entries(grouped).map(([area, areaCustomers]) => (
            <div key={area}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{area}</span>
                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{areaCustomers.length}</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="space-y-2">
                {areaCustomers.map(c => (
                  <CustomerEntryCard
                    key={c.id}
                    customer={c}
                    entry={entries[c.id] || { bt_qty: 0, jug_qty: 0, water_type: 'normal', status: 'delivered', save_as_default: false }}
                    onChange={updated => setEntries(prev => ({ ...prev, [c.id]: { ...updated, _saved: false } }))}
                    onSave={() => {
                      setSavingId(c.id);
                      saveMutation.mutate({ customerId: c.id, entry: entries[c.id] });
                    }}
                    saving={saveMutation.isPending && savingId === c.id}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Floating Save All button */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 w-full max-w-sm px-4">
        <button
          id="save-all-btn"
          onClick={() => bulkSaveMutation.mutate()}
          disabled={bulkSaveMutation.isPending}
          className="w-full h-14 bg-primary text-white rounded-2xl font-bold text-base shadow-elevated flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-70"
        >
          {bulkSaveMutation.isPending
            ? <><Loader2 className="w-5 h-5 animate-spin" /> Saving…</>
            : <><Check className="w-5 h-5" /> Save All ({filteredCustomers.length})</>
          }
        </button>
      </div>
    </div>
  );
}
