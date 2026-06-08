import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiFetch } from '../../../shared/api/client';
import toast from 'react-hot-toast';
import { ArrowLeft, Phone, MapPin, Calendar, Edit, Pause, XCircle, FileText, Loader2, Trash2 } from 'lucide-react';

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-700',
  paused: 'bg-amber-100 text-amber-700',
  closed: 'bg-red-100 text-red-600',
};

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [isPauseOpen, setIsPauseOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [pauseReason, setPauseReason] = useState('');

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isDeliveryBoy = user.role === 'delivery_boy';

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => apiFetch(`/customers/${id}`),
  });

  const statusMutation = useMutation({
    mutationFn: ({ status }) =>
      apiFetch(`/customers/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
    onSuccess: (_, { status }) => {
      toast.success(`Customer ${status}`);
      qc.invalidateQueries({ queryKey: ['customer', id] });
      qc.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: err => toast.error(err.message),
  });

  const pauseMutation = useMutation({
    mutationFn: (payload) =>
      apiFetch(`/customers/${id}/pauses`, { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => {
      toast.success('Pause scheduled successfully');
      setIsPauseOpen(false);
      setStartDate('');
      setEndDate('');
      setPauseReason('');
      qc.invalidateQueries({ queryKey: ['customer', id] });
      qc.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: err => toast.error(err.message),
  });

  const deletePauseMutation = useMutation({
    mutationFn: (pauseId) =>
      apiFetch(`/customers/${id}/pauses/${pauseId}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Pause removed');
      qc.invalidateQueries({ queryKey: ['customer', id] });
      qc.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: err => toast.error(err.message),
  });

  const handlePauseSubmit = (e) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      toast.error('Start and end dates are required');
      return;
    }
    pauseMutation.mutate({ start_date: startDate, end_date: endDate, reason: pauseReason });
  };

  if (isLoading) return (
    <div className="flex items-center justify-center py-20 text-muted-foreground">
      <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
    </div>
  );

  if (!customer) return <div className="p-8 text-center text-muted-foreground">Customer not found</div>;

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-muted-foreground text-sm mb-6 hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Header card */}
      <div className="bg-card border border-border rounded-2xl p-5 mb-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl shrink-0">
            {customer.name[0].toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-foreground">{customer.name}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[customer.status]}`}>
                {customer.status}
              </span>
            </div>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" />{customer.mobile}</p>
              {customer.area && <p className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" />{customer.area}</p>}
              {customer.address && <p className="flex items-center gap-2 text-xs">{customer.address}</p>}
              <p className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5" />Joined {new Date(customer.join_date).toLocaleDateString('en-IN')}</p>
            </div>
          </div>
          {!isDeliveryBoy && (
            <Link
              to={`/customers/${id}/edit`}
              className="flex items-center gap-1 h-8 px-3 rounded-lg border border-border text-xs text-foreground hover:bg-muted transition"
            >
              <Edit className="w-3 h-3" /> Edit
            </Link>
          )}
        </div>
      </div>

      {/* Pricing & Defaults */}
      <div className="bg-card border border-border rounded-2xl p-5 mb-4">
        <h2 className="font-semibold text-foreground mb-3">Product Setup & Defaults</h2>
        <div className="grid grid-cols-2 gap-3">
          {customer.bt_enabled && (
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              {!isDeliveryBoy && <p className="text-2xl font-bold text-blue-700">₹{customer.bt_price}</p>}
              {!isDeliveryBoy && <p className="text-xs text-blue-500 mt-0.5">per BT</p>}
              <p className="text-xs text-blue-600 font-semibold mt-1">Default Qty: {customer.default_bt_qty || 0}</p>
            </div>
          )}
          {customer.jug_enabled && (
            <div className="bg-cyan-50 rounded-xl p-3 text-center">
              {!isDeliveryBoy && <p className="text-2xl font-bold text-cyan-700">₹{customer.jug_price}</p>}
              {!isDeliveryBoy && <p className="text-xs text-cyan-500 mt-0.5">per JUG</p>}
              <p className="text-xs text-cyan-600 font-semibold mt-1">Default Qty: {customer.default_jug_qty || 0}</p>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      {!isDeliveryBoy && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Link
            to={`/billing/generate?customer_id=${id}`}
            className="flex items-center justify-center gap-2 h-11 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 transition"
          >
            <FileText className="w-4 h-4" /> Generate Bill
          </Link>
          {customer.status === 'active' && (
            <button
              onClick={() => setIsPauseOpen(true)}
              className="flex items-center justify-center gap-2 h-11 border border-amber-300 bg-amber-50 text-amber-700 rounded-xl text-sm font-semibold hover:bg-amber-100 transition"
            >
              <Pause className="w-4 h-4" /> Pause Delivery
            </button>
          )}
          {customer.status === 'paused' && (
            <button
              onClick={() => statusMutation.mutate({ status: 'active' })}
              disabled={statusMutation.isPending}
              className="flex items-center justify-center gap-2 h-11 border border-green-300 bg-green-50 text-green-700 rounded-xl text-sm font-semibold hover:bg-green-100 transition"
            >
              Resume Delivery
            </button>
          )}
          {customer.status !== 'closed' && (
            <button
              onClick={() => { if (confirm('Close this customer?')) statusMutation.mutate({ status: 'closed', closed_date: new Date().toISOString().split('T')[0] }); }}
              disabled={statusMutation.isPending}
              className="flex items-center justify-center gap-2 h-11 border border-red-200 bg-red-50 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-100 transition col-span-2 sm:col-span-1"
            >
              <XCircle className="w-4 h-4" /> Close Profile
            </button>
          )}
        </div>
      )}

      {/* Pause Scheduler Modal */}
      {isPauseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-background border border-border w-full max-w-md rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-foreground">Schedule Pause Window</h3>
            <form onSubmit={handlePauseSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Pause Start Date</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Pause End Date</label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Reason / Notes</label>
                <input
                  type="text"
                  placeholder="Vacation, out of town…"
                  value={pauseReason}
                  onChange={e => setPauseReason(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPauseOpen(false)}
                  className="flex-1 h-11 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pauseMutation.isPending}
                  className="flex-1 h-11 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 transition disabled:opacity-60 flex items-center justify-center"
                >
                  {pauseMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Set Pause'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pauses History */}
      {customer.pauses?.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="font-semibold text-foreground mb-3">Pause History</h2>
          <div className="space-y-2">
            {customer.pauses.map(p => (
              <div key={p.id} className="flex items-center justify-between text-sm p-3 bg-muted/40 rounded-xl">
                <div className="flex-1">
                  <span className="font-semibold text-foreground block">{p.reason || 'Pause Window'}</span>
                  <span className="text-muted-foreground text-xs font-mono">
                    {new Date(p.start_date).toLocaleDateString('en-IN')} – {new Date(p.end_date).toLocaleDateString('en-IN')}
                  </span>
                </div>
                {!isDeliveryBoy && (
                  <button
                    onClick={() => { if (confirm('Delete this pause window?')) deletePauseMutation.mutate(p.id); }}
                    disabled={deletePauseMutation.isPending}
                    className="text-destructive hover:text-destructive/80 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
