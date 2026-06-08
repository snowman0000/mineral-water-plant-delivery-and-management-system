import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../../shared/api/client';
import { Link } from 'react-router-dom';
import {
  Users, Droplets, FileText, TrendingUp,
  CalendarDays, AlertCircle, ArrowRight, Loader2, Waves
} from 'lucide-react';

function StatCard({ icon: Icon, label, value, sub, color, to }) {
  const content = (
    <div className={`bg-card rounded-2xl p-5 border border-border shadow-card hover:shadow-md transition-shadow ${to ? 'cursor-pointer hover:-translate-y-0.5 transition-transform' : ''}`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        {to && <ArrowRight className="w-4 h-4 text-muted-foreground" />}
      </div>
      <p className="text-2xl font-bold text-foreground">{value ?? '—'}</p>
      <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
      {sub && <p className="text-xs text-muted-foreground/70 mt-1">{sub}</p>}
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiFetch('/reports/dashboard'),
    refetchInterval: 60_000,
  });

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-muted-foreground mt-1">{today}</p>
      </div>

      {/* Quick action — daily entry (most prominent) */}
      <Link
        to="/daily-entry"
        id="daily-entry-btn"
        className="flex items-center gap-4 p-5 mb-8 rounded-2xl gradient-hero text-white shadow-elevated hover:opacity-95 active:scale-[0.99] transition-all"
      >
        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <Droplets className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-lg">Enter Today's Deliveries</p>
          <p className="text-white/70 text-sm">Tap to start the daily entry workflow</p>
        </div>
        <ArrowRight className="w-6 h-6 shrink-0" />
      </Link>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading dashboard…
        </div>
      ) : (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={Users} label="Active Customers" value={data?.active_customers}
              color="bg-blue-100 text-blue-600"
              to="/customers"
            />
            <StatCard
              icon={Droplets} label="Today's Deliveries"
              value={data?.today_deliveries}
              sub={`${data?.today_bt ?? 0} BT · ${data?.today_jug ?? 0} JUG`}
              color="bg-primary/10 text-primary"
            />
            <StatCard
              icon={TrendingUp} label="Month Revenue"
              value={`₹${Number(data?.month_revenue || 0).toLocaleString('en-IN')}`}
              color="bg-green-100 text-green-600"
              to="/reports"
            />
            <StatCard
              icon={FileText} label="Unpaid Invoices"
              value={data?.unpaid_invoices}
              sub={`₹${Number(data?.unpaid_balance || 0).toLocaleString('en-IN')} due`}
              color="bg-amber-100 text-amber-600"
              to="/billing"
            />
          </div>

          {/* Bottom row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <StatCard
              icon={CalendarDays} label="Pending Events"
              value={data?.pending_events}
              color="bg-purple-100 text-purple-600"
              to="/events"
            />
            <Link
              to="/billing/generate"
              id="generate-bills-btn"
              className="flex items-center gap-4 p-5 rounded-2xl border border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">Generate All Bills</p>
                <p className="text-sm text-muted-foreground">Create invoices for all active customers</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
