import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../../shared/api/client';
import toast from 'react-hot-toast';
import { ArrowLeft, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { formatDate, formatDateLong } from '../../../shared/utils/date';

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => apiFetch(`/billing/invoices/${id}`),
  });

  const payMutation = useMutation({
    mutationFn: () => apiFetch(`/billing/invoices/${id}/payment`, {
      method: 'POST',
      body: JSON.stringify({ amount: parseFloat(payAmount), payment_method: payMethod, payment_date: payDate }),
    }),
    onSuccess: data => {
      toast.success(`Payment recorded! Status: ${data.status}`);
      setPayAmount('');
      qc.invalidateQueries({ queryKey: ['invoice', id] });
    },
    onError: err => toast.error(err.message),
  });

  const cancelMutation = useMutation({
    mutationFn: () => apiFetch(`/billing/invoices/${id}/cancel`, { method: 'PUT' }),
    onSuccess: () => { toast.success('Invoice cancelled'); qc.invalidateQueries({ queryKey: ['invoice', id] }); },
  });

  if (isLoading) return <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…</div>;
  if (!invoice) return <div className="p-8 text-center text-muted-foreground">Invoice not found</div>;

  const STATUS_STYLES = { unpaid: 'bg-red-100 text-red-700', partial: 'bg-amber-100 text-amber-700', paid: 'bg-green-100 text-green-700', cancelled: 'bg-gray-100 text-gray-500' };

  return (
    <div className="p-4 lg:p-8 max-w-xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-muted-foreground text-sm mb-6 hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Invoice card */}
      <div className="bg-card border border-border rounded-2xl p-5 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">{invoice.customer_name}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{invoice.invoice_number}</p>
          </div>
          <span className={`text-xs px-3 py-1 rounded-full font-semibold ${STATUS_STYLES[invoice.status]}`}>
            {invoice.status.toUpperCase()}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            ['Period', `${formatDate(invoice.period_start)} – ${formatDate(invoice.period_end)}`],
            ['BT Delivered', invoice.bt_qty],
            ['JUG Delivered', invoice.jug_qty],
            ['BT Price', `₹${invoice.bt_price}`],
            ['JUG Price', `₹${invoice.jug_price}`],
          ].map(([k, v]) => (
            <div key={k} className="bg-muted/40 rounded-xl p-3">
              <p className="text-xs text-muted-foreground">{k}</p>
              <p className="font-semibold text-foreground text-sm mt-0.5">{v}</p>
            </div>
          ))}
        </div>
        <div className="border-t border-border pt-4 space-y-1">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total</span><span className="font-bold text-foreground text-lg">₹{Number(invoice.total_amount).toLocaleString('en-IN')}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Paid</span><span className="text-green-600 font-medium">₹{Number(invoice.paid_amount).toLocaleString('en-IN')}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Balance</span><span className="text-red-600 font-bold">₹{Number(invoice.balance).toLocaleString('en-IN')}</span></div>
        </div>
      </div>

      {/* Record Payment */}
      {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
        <div className="bg-card border border-border rounded-2xl p-5 mb-4">
          <h2 className="font-semibold text-foreground mb-3">Record Payment</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Amount (₹)</label>
                <input
                  type="number" min="0" value={payAmount} onChange={e => setPayAmount(e.target.value)}
                  placeholder="0"
                  className="w-full h-10 px-3 rounded-xl border border-input text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Method</label>
                <select value={payMethod} onChange={e => setPayMethod(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-input text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Date</label>
              <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-input text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button onClick={() => payMutation.mutate()} disabled={payMutation.isPending || !payAmount}
              className="w-full h-11 bg-green-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60"
            >
              {payMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Record Payment
            </button>
          </div>
        </div>
      )}

      {/* Payment history */}
      {invoice.payments?.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5 mb-4">
          <h2 className="font-semibold text-foreground mb-3">Payment History</h2>
          <div className="space-y-2">
            {invoice.payments.map(p => (
              <div key={p.id} className="flex items-center justify-between text-sm p-3 bg-muted/40 rounded-xl">
                <div>
                  <p className="font-medium text-foreground">₹{Number(p.amount).toLocaleString('en-IN')}</p>
                  <p className="text-xs text-muted-foreground capitalize">{p.payment_method} · {formatDate(p.payment_date)}</p>
                </div>
                <p className="text-xs text-muted-foreground">{p.recorded_by_name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Itemized Daily Logs */}
      {invoice.deliveries?.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5 mb-4">
          <h2 className="font-semibold text-foreground mb-3">Itemized Daily Deliveries</h2>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {invoice.deliveries.map((d, index) => (
              <div key={index} className="flex items-center justify-between text-xs p-2.5 bg-muted/40 rounded-xl">
                <div>
                  <p className="font-medium text-foreground">
                    {formatDateLong(d.delivery_date)}
                  </p>
                  {d.notes && <p className="text-[10px] text-muted-foreground italic mt-0.5">{d.notes}</p>}
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground">
                    {d.status === 'delivered' ? (
                      <>
                        {Number(d.bt_qty) > 0 && `${d.bt_qty} BT `}
                        {Number(d.jug_qty) > 0 && `${d.jug_qty} JUG`}
                        {Number(d.bt_qty) === 0 && Number(d.jug_qty) === 0 && '0 Qty'}
                      </>
                    ) : (
                      <span className="text-destructive font-medium capitalize">{d.status}</span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cancel */}
      {invoice.status !== 'cancelled' && (
        <button
          onClick={() => { if (confirm('Cancel this invoice?')) cancelMutation.mutate(); }}
          className="w-full h-10 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition flex items-center justify-center gap-2"
        >
          <XCircle className="w-4 h-4" /> Cancel Invoice
        </button>
      )}
    </div>
  );
}
