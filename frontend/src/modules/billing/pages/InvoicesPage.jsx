import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../../shared/api/client';
import toast from 'react-hot-toast';
import { Plus, FileText, IndianRupee, Loader2, ChevronRight } from 'lucide-react';

const STATUS_STYLES = {
  unpaid: 'bg-red-100 text-red-700',
  partial: 'bg-amber-100 text-amber-700',
  paid: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

export default function InvoicesPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [month, setMonth] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');

  const { data: customers = [] } = useQuery({
    queryKey: ['customers-active-dropdown'],
    queryFn: () => apiFetch('/customers?status=active'),
  });

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices', statusFilter, month, selectedCustomerId],
    queryFn: () => {
      const p = new URLSearchParams();
      if (statusFilter) p.set('status', statusFilter);
      if (month) p.set('month', month);
      if (selectedCustomerId) p.set('customer_id', selectedCustomerId);
      return apiFetch(`/billing/invoices?${p}`);
    },
  });

  const totalDue = invoices.filter(i => ['unpaid', 'partial'].includes(i.status))
    .reduce((s, i) => s + Number(i.balance || 0), 0);

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Billing</h1>
          <p className="text-muted-foreground text-sm">{invoices.length} invoices · ₹{totalDue.toLocaleString('en-IN')} due</p>
        </div>
        <Link
          to="/billing/generate"
          id="generate-bill-btn"
          className="flex items-center gap-2 h-10 px-4 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 transition"
        >
          <Plus className="w-4 h-4" /> Generate Bills
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <select
          value={selectedCustomerId}
          onChange={e => setSelectedCustomerId(e.target.value)}
          className="h-10 px-3 rounded-xl border border-input text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring max-w-xs"
        >
          <option value="">All Customers</option>
          {customers.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="h-10 px-3 rounded-xl border border-input text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Status</option>
          <option value="unpaid">Unpaid</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <input
          type="month"
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="h-10 px-3 rounded-xl border border-input text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading invoices…
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No invoices found</p>
          <Link to="/billing/generate" className="mt-3 inline-block text-primary text-sm font-medium">Generate your first invoice</Link>
        </div>
      ) : (
        <div className="space-y-2">
          {invoices.map(inv => (
            <Link key={inv.id} to={`/billing/${inv.id}`} className="block">
              <div className="bg-card border border-border rounded-2xl p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-foreground text-sm truncate">{inv.customer_name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_STYLES[inv.status]}`}>
                        {inv.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{inv.invoice_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(inv.period_start).toLocaleDateString('en-IN')} – {new Date(inv.period_end).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-foreground">₹{Number(inv.total_amount).toLocaleString('en-IN')}</p>
                    {Number(inv.balance) > 0 && (
                      <p className="text-xs text-red-600">₹{Number(inv.balance).toLocaleString('en-IN')} due</p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
