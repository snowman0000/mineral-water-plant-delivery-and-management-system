import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../../shared/api/client';
import toast from 'react-hot-toast';
import { Plus, Loader2, CalendarDays, Phone, ChevronRight } from 'lucide-react';

const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-700',
  dispatched: 'bg-blue-100 text-blue-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

export default function EventsPage() {
  const [filter, setFilter] = useState('');
  const qc = useQueryClient();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events', filter],
    queryFn: () => apiFetch(`/events${filter ? `?delivery_status=${filter}` : ''}`),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, delivery_status }) =>
      apiFetch(`/events/${id}`, { method: 'PUT', body: JSON.stringify({ delivery_status }) }),
    onSuccess: () => {
      toast.success('Event status updated');
      qc.invalidateQueries({ queryKey: ['events'] });
    },
    onError: err => toast.error(err.message),
  });

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Events</h1>
          <p className="text-muted-foreground text-sm">Wedding & event orders</p>
        </div>
        <Link
          to="/events/new"
          className="flex items-center gap-2 h-10 px-4 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 transition"
        >
          <Plus className="w-4 h-4" /> New Event
        </Link>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {[['', 'All'], ['pending', 'Pending'], ['dispatched', 'Dispatched'], ['delivered', 'Delivered'], ['cancelled', 'Cancelled']].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={`h-9 px-4 rounded-xl text-sm font-medium transition whitespace-nowrap ${filter === v ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
          >
            {l}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No events found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map(ev => (
            <Link key={ev.id} to={`/events/${ev.id}/edit`} className="block">
              <div className="bg-card border border-border rounded-2xl p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                    <CalendarDays className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-foreground truncate">{ev.event_name}</p>
                      <select
                        value={ev.delivery_status}
                        onClick={e => e.stopPropagation()}
                        onChange={e => {
                          e.stopPropagation();
                          e.preventDefault();
                          statusMutation.mutate({ id: ev.id, delivery_status: e.target.value });
                        }}
                        className={`text-xs px-2 py-0.5 rounded-full font-medium border border-transparent focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer ${STATUS_STYLES[ev.delivery_status]}`}
                      >
                        <option value="pending">Pending</option>
                        <option value="dispatched">Dispatched</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="w-3 h-3" />{ev.customer_name} · {ev.phone}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      📅 {new Date(ev.event_date).toLocaleDateString('en-IN')} · {ev.bt_qty} BT · {ev.jug_qty} JUG
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-foreground">₹{Number(ev.total_amount).toLocaleString('en-IN')}</p>
                    {Number(ev.remaining_amount) > 0 && (
                      <p className="text-xs text-red-600">₹{Number(ev.remaining_amount).toLocaleString('en-IN')} due</p>
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
