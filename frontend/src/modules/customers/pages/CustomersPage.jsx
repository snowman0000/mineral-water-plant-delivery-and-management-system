import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../../shared/api/client';
import toast from 'react-hot-toast';
import { Plus, Search, User, Phone, MapPin, Pause, XCircle, CheckCircle, Loader2, MoreVertical } from 'lucide-react';

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-700',
  paused: 'bg-amber-100 text-amber-700',
  closed: 'bg-red-100 text-red-600',
};

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const navigate = useNavigate();
  const qc = useQueryClient();

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isDeliveryBoy = user.role === 'delivery_boy';

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers', statusFilter, search],
    queryFn: () => {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      if (search) params.set('search', search);
      return apiFetch(`/customers?${params}`);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) =>
      apiFetch(`/customers/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
    onSuccess: () => { toast.success('Status updated'); qc.invalidateQueries({ queryKey: ['customers'] }); },
    onError: err => toast.error(err.message),
  });

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Customers</h1>
          <p className="text-muted-foreground text-sm">{customers.length} customers</p>
        </div>
        {!isDeliveryBoy && (
          <Link
            to="/customers/new"
            id="add-customer-btn"
            className="flex items-center gap-2 h-10 px-4 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 transition"
          >
            <Plus className="w-4 h-4" /> Add Customer
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search name or mobile…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-input text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="h-10 px-3 rounded-xl border border-input text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* Customer list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
        </div>
      ) : customers.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <User className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No customers found</p>
          {!isDeliveryBoy && <Link to="/customers/new" className="mt-4 inline-block text-primary text-sm font-medium">+ Add first customer</Link>}
        </div>
      ) : (
        <div className="space-y-2">
          {customers.map(c => (
            <div key={c.id} className="bg-card border border-border rounded-2xl p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                  {c.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Link to={`/customers/${c.id}`} className="font-semibold text-foreground hover:text-primary truncate">
                      {c.name}
                    </Link>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLORS[c.status]}`}>
                      {c.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.mobile}</span>
                    {c.area && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{c.area}</span>}
                    {!isDeliveryBoy && (
                      <span className="flex items-center gap-1">
                        {c.bt_enabled ? `BT ₹${c.bt_price}` : ''}
                        {c.bt_enabled && c.jug_enabled ? ' · ' : ''}
                        {c.jug_enabled ? `JUG ₹${c.jug_price}` : ''}
                      </span>
                    )}
                  </div>
                </div>
                {!isDeliveryBoy && (
                  <Link
                    to={`/customers/${c.id}/edit`}
                    className="shrink-0 h-8 px-3 rounded-lg border border-border text-xs text-foreground hover:bg-muted transition"
                  >
                    Edit
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
