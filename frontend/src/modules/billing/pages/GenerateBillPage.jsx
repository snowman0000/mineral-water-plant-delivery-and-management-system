import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../../../shared/api/client';
import toast from 'react-hot-toast';
import { ArrowLeft, Loader2, Zap, Users } from 'lucide-react';

export default function GenerateBillPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const qc = useQueryClient();

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const today = now.toISOString().split('T')[0];

  const [mode, setMode] = useState(params.get('customer_id') ? 'single' : 'all');
  const [customerId, setCustomerId] = useState(params.get('customer_id') || '');
  const [periodStart, setPeriodStart] = useState(firstOfMonth);
  const [periodEnd, setPeriodEnd] = useState(today);
  const [notes, setNotes] = useState('');

  const { data: customers = [] } = useQuery({
    queryKey: ['customers-active'],
    queryFn: () => apiFetch('/customers?status=active'),
  });

  const generateSingle = useMutation({
    mutationFn: () => apiFetch('/billing/generate', {
      method: 'POST',
      body: JSON.stringify({ customer_id: customerId, period_start: periodStart, period_end: periodEnd, notes }),
    }),
    onSuccess: data => {
      toast.success(`Invoice generated: ₹${Number(data.total_amount).toLocaleString('en-IN')}`);
      qc.invalidateQueries({ queryKey: ['invoices'] });
      navigate('/billing');
    },
    onError: err => toast.error(err.message),
  });

  const generateAll = useMutation({
    mutationFn: () => apiFetch('/billing/generate-all', {
      method: 'POST',
      body: JSON.stringify({ period_start: periodStart, period_end: periodEnd }),
    }),
    onSuccess: data => {
      toast.success(`${data.generated.length} invoices generated`);
      qc.invalidateQueries({ queryKey: ['invoices'] });
      navigate('/billing');
    },
    onError: err => toast.error(err.message),
  });

  const isPending = generateSingle.isPending || generateAll.isPending;

  return (
    <div className="p-4 lg:p-8 max-w-xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-muted-foreground text-sm mb-6 hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <h1 className="text-2xl font-bold text-foreground mb-6">Generate Invoice</h1>

      {/* Mode toggle */}
      <div className="flex gap-2 mb-6 p-1 bg-muted rounded-xl">
        <button
          onClick={() => setMode('all')}
          className={`flex-1 h-10 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${mode === 'all' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground'}`}
        >
          <Users className="w-4 h-4" /> All Customers
        </button>
        <button
          onClick={() => setMode('single')}
          className={`flex-1 h-10 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${mode === 'single' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground'}`}
        >
          <Zap className="w-4 h-4" /> Single Customer
        </button>
      </div>

      <div className="space-y-4">
        {mode === 'single' && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Customer *</label>
            <select
              value={customerId}
              onChange={e => setCustomerId(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select customer…</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name} — {c.area || 'No area'}</option>)}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Period Start *</label>
            <input
              type="date"
              value={periodStart}
              onChange={e => setPeriodStart(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Period End *</label>
            <input
              type="date"
              value={periodEnd}
              onChange={e => setPeriodEnd(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {mode === 'single' && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Optional notes for invoice…"
            />
          </div>
        )}

        {/* Info box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
          <p className="font-semibold mb-1">How billing works</p>
          <ul className="space-y-1 text-xs list-disc ml-4">
            <li>Only <strong>delivered</strong> entries are counted</li>
            <li>Declined deliveries are excluded</li>
            <li>Paused days are automatically excluded</li>
            <li>Formula: BT × BT Price + JUG × JUG Price</li>
          </ul>
        </div>

        <button
          id="generate-invoice-btn"
          onClick={() => mode === 'all' ? generateAll.mutate() : generateSingle.mutate()}
          disabled={isPending || (mode === 'single' && !customerId)}
          className="w-full h-12 bg-primary text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition disabled:opacity-60"
        >
          {isPending
            ? <><Loader2 className="w-5 h-5 animate-spin" /> Generating…</>
            : mode === 'all' ? 'Generate All Invoices' : 'Generate Invoice'
          }
        </button>
      </div>
    </div>
  );
}
