import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../../shared/api/client';
import toast from 'react-hot-toast';
import { Package, Loader2, Save } from 'lucide-react';
import { formatDateWithWeekday } from '../../../shared/utils/date';

export default function InventoryPage() {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const qc = useQueryClient();

  const [form, setForm] = useState({ full_bt: 0, full_jug: 0, empty_bt: 0, empty_jug: 0, damaged_bt: 0, damaged_jug: 0, notes: '' });

  const { data: latest } = useQuery({
    queryKey: ['inventory-latest'],
    queryFn: () => apiFetch('/inventory/latest'),
    onSuccess: data => { if (data) setForm(prev => ({ ...prev, ...data })); },
  });

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => apiFetch('/inventory'),
  });

  const saveMutation = useMutation({
    mutationFn: () => apiFetch('/inventory', {
      method: 'POST',
      body: JSON.stringify({ ...form, log_date: date }),
    }),
    onSuccess: () => {
      toast.success('Inventory saved');
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['inventory-latest'] });
    },
    onError: err => toast.error(err.message),
  });

  function Field({ label, field, color = '' }) {
    return (
      <div className={`bg-card border border-border rounded-2xl p-4 ${color}`}>
        <label className="block text-xs text-muted-foreground mb-2">{label}</label>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setForm(f => ({ ...f, [field]: Math.max(0, f[field] - 1) }))}
            className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-foreground font-bold hover:bg-muted/80 active:scale-95 transition"
          >−</button>
          <input type="number" min="0" value={form[field]}
            onChange={e => setForm(f => ({ ...f, [field]: parseInt(e.target.value) || 0 }))}
            className="flex-1 text-center font-bold text-lg bg-transparent text-foreground focus:outline-none"
          />
          <button type="button" onClick={() => setForm(f => ({ ...f, [field]: f[field] + 1 }))}
            className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center font-bold hover:opacity-90 active:scale-95 transition"
          >+</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
          <p className="text-muted-foreground text-sm">Stock tracking</p>
        </div>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="h-10 px-3 rounded-xl border border-input text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-4 mb-6">
        <p className="text-sm font-semibold text-foreground text-blue-700">🔵 Full Stock</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Full BT" field="full_bt" />
          <Field label="Full JUG" field="full_jug" />
        </div>
        <p className="text-sm font-semibold text-foreground text-gray-600">⚪ Empty Returns</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Empty BT" field="empty_bt" />
          <Field label="Empty JUG" field="empty_jug" />
        </div>
        <p className="text-sm font-semibold text-foreground text-red-600">🔴 Damaged</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Damaged BT" field="damaged_bt" />
          <Field label="Damaged JUG" field="damaged_jug" />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Notes</label>
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
            className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Optional notes…"
          />
        </div>
      </div>

      <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
        className="w-full h-12 bg-primary text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition disabled:opacity-60 mb-8"
      >
        {saveMutation.isPending ? <><Loader2 className="w-5 h-5 animate-spin" /> Saving…</> : <><Save className="w-5 h-5" /> Save Inventory</>}
      </button>

      {/* History */}
      <div>
        <h2 className="font-semibold text-foreground mb-3">Recent Logs</h2>
        {isLoading ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div> : (
          <div className="space-y-2">
            {history.map(h => (
              <div key={h.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-foreground text-sm">{formatDateWithWeekday(h.log_date)}</p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                  <span>Full BT: <strong className="text-foreground">{h.full_bt}</strong></span>
                  <span>Full JUG: <strong className="text-foreground">{h.full_jug}</strong></span>
                  <span>Empty BT: <strong className="text-foreground">{h.empty_bt}</strong></span>
                  <span>Empty JUG: <strong className="text-foreground">{h.empty_jug}</strong></span>
                  <span>Dmg BT: <strong className="text-red-500">{h.damaged_bt}</strong></span>
                  <span>Dmg JUG: <strong className="text-red-500">{h.damaged_jug}</strong></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
