import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../../shared/api/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, Calendar, MapPin, User, Loader2 } from 'lucide-react';

const tabs = [
  { key: 'monthly', label: 'Monthly', icon: TrendingUp },
  { key: 'daily', label: 'Daily', icon: Calendar },
  { key: 'area', label: 'By Area', icon: MapPin },
  { key: 'customer', label: 'Customer', icon: User },
];

export default function ReportsPage() {
  const [tab, setTab] = useState('monthly');
  const now = new Date();
  const [month, setMonth] = useState(now.toISOString().slice(0, 7));
  const [date, setDate] = useState(now.toISOString().split('T')[0]);
  const [customerId, setCustomerId] = useState('');

  const { data: monthly, isLoading: loadingMonthly } = useQuery({
    queryKey: ['report-monthly', month],
    queryFn: () => apiFetch(`/reports/monthly-revenue?month=${month}`),
    enabled: tab === 'monthly',
  });

  const { data: daily } = useQuery({
    queryKey: ['report-daily', date],
    queryFn: () => apiFetch(`/reports/daily-revenue?date=${date}`),
    enabled: tab === 'daily',
  });

  const { data: area = [] } = useQuery({
    queryKey: ['report-area', month],
    queryFn: () => apiFetch(`/reports/area?month=${month}`),
    enabled: tab === 'area',
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers-active'],
    queryFn: () => apiFetch('/customers?status=active'),
    enabled: tab === 'customer',
  });

  const { data: custReport } = useQuery({
    queryKey: ['report-customer', customerId, month],
    queryFn: () => apiFetch(`/reports/customer?customer_id=${customerId}&month=${month}`),
    enabled: tab === 'customer' && !!customerId,
  });

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-6">Reports</h1>

      {/* Tab bar */}
      <div className="flex gap-1 bg-muted p-1 rounded-xl mb-6 overflow-x-auto">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 min-w-[80px] flex items-center justify-center gap-1.5 h-9 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              tab === key ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {/* Monthly Report */}
      {tab === 'monthly' && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <input type="month" value={month} onChange={e => setMonth(e.target.value)}
              className="h-10 px-3 rounded-xl border border-input text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {loadingMonthly ? <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div> : (
            <>
              <div className="grid grid-cols-3 gap-3">
                {[
                  ['Total Revenue', `₹${Number(monthly?.total_revenue || 0).toLocaleString('en-IN')}`],
                  ['BT Delivered', monthly?.total_bt || 0],
                  ['JUG Delivered', monthly?.total_jug || 0],
                ].map(([k, v]) => (
                  <div key={k} className="bg-card border border-border rounded-2xl p-4 text-center">
                    <p className="text-xl font-bold text-foreground">{v}</p>
                    <p className="text-xs text-muted-foreground mt-1">{k}</p>
                  </div>
                ))}
              </div>
              <div className="bg-card border border-border rounded-2xl p-4">
                <p className="text-sm font-semibold text-foreground mb-4">Daily Revenue — {month}</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthly?.daily || []} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="delivery_date" tick={{ fontSize: 11 }} tickFormatter={v => v.split('-')[2]} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${v}`} />
                    <Tooltip formatter={v => [`₹${v}`, 'Revenue']} />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      )}

      {/* Daily report */}
      {tab === 'daily' && (
        <div className="space-y-4">
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="h-10 px-3 rounded-xl border border-input text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {daily && (
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Revenue', `₹${Number(daily.revenue || 0).toLocaleString('en-IN')}`],
                ['Deliveries', daily.delivered || 0],
                ['BT', daily.total_bt || 0],
                ['JUG', daily.total_jug || 0],
                ['Declined', daily.declined_count || 0],
              ].map(([k, v]) => (
                <div key={k} className="bg-card border border-border rounded-2xl p-4">
                  <p className="text-lg font-bold text-foreground">{v}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{k}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Area report */}
      {tab === 'area' && (
        <div className="space-y-4">
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="h-10 px-3 rounded-xl border border-input text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="space-y-2">
            {area.length === 0 && <p className="text-center py-10 text-muted-foreground">No data for this month</p>}
            {area.map(a => (
              <div key={a.area} className="bg-card border border-border rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-foreground">{a.area || 'No Area'}</p>
                  <p className="font-bold text-primary">₹{Number(a.revenue).toLocaleString('en-IN')}</p>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>{a.customer_count} customers</span>
                  <span>{a.total_bt} BT</span>
                  <span>{a.total_jug} JUG</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Customer report */}
      {tab === 'customer' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <select value={customerId} onChange={e => setCustomerId(e.target.value)}
              className="flex-1 h-10 px-3 rounded-xl border border-input text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select customer…</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input type="month" value={month} onChange={e => setMonth(e.target.value)}
              className="h-10 px-3 rounded-xl border border-input text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {custReport && (
            <div className="bg-card border border-border rounded-2xl p-5">
              <p className="font-semibold text-foreground mb-4">{custReport.customer?.name} — {month}</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['BT Delivered', custReport.bt_qty],
                  ['JUG Delivered', custReport.jug_qty],
                  ['Total Days', custReport.total_days],
                  ['Declined', custReport.declined_days],
                  ['Total Amount', `₹${Number(custReport.total_amount || 0).toLocaleString('en-IN')}`],
                ].map(([k, v]) => (
                  <div key={k} className="bg-muted/40 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground">{k}</p>
                    <p className="font-bold text-foreground mt-0.5">{v}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
