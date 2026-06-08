import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../../shared/api/client';
import toast from 'react-hot-toast';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function EventFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: existing } = useQuery({
    queryKey: ['event', id],
    queryFn: () => apiFetch(`/events/${id}`),
    enabled: isEdit,
  });

  const { data: boys = [] } = useQuery({
    queryKey: ['delivery-boys'],
    queryFn: () => apiFetch('/employees/delivery-boys'),
  });

  const { register, handleSubmit, reset, watch } = useForm({
    defaultValues: { water_type: 'normal', delivery_status: 'pending', bottles_returned: false },
  });

  useEffect(() => {
    if (existing) {
      let formattedDate = '';
      if (existing.event_date) {
        formattedDate = existing.event_date.split('T')[0];
      }
      reset({
        ...existing,
        event_date: formattedDate,
      });
    }
  }, [existing, reset]);

  const mutation = useMutation({
    mutationFn: data => isEdit
      ? apiFetch(`/events/${id}`, { method: 'PUT', body: JSON.stringify(data) })
      : apiFetch('/events', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      toast.success(isEdit ? 'Event updated' : 'Event created');
      qc.invalidateQueries({ queryKey: ['events'] });
      navigate('/events');
    },
    onError: err => toast.error(err.message),
  });

  const inputCls = "w-full h-11 px-3 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="p-4 lg:p-8 max-w-xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-muted-foreground text-sm mb-6 hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <h1 className="text-2xl font-bold text-foreground mb-6">{isEdit ? 'Edit Event' : 'New Event Order'}</h1>

      <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Event Name *</label>
          <input {...register('event_name', { required: true })} placeholder="Ramesh Kumar Wedding" className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Customer Name *</label>
            <input {...register('customer_name', { required: true })} placeholder="Ramesh Kumar" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Phone *</label>
            <input {...register('phone', { required: true })} placeholder="9876543210" className={inputCls} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Address</label>
          <textarea {...register('address')} rows={2} className={`${inputCls} h-auto py-2`} placeholder="Venue address…" />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Event Date *</label>
          <input {...register('event_date', { required: true })} type="date" className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">BT Quantity</label>
            <input {...register('bt_qty')} type="number" min="0" defaultValue={0} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">JUG Quantity</label>
            <input {...register('jug_qty')} type="number" min="0" defaultValue={0} className={inputCls} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Water Type</label>
          <select {...register('water_type')} className={inputCls}>
            <option value="normal">Normal</option>
            <option value="chilled">Chilled</option>
            <option value="mixed">Mixed</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Total Amount (₹)</label>
            <input {...register('total_amount')} type="number" min="0" defaultValue={0} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Advance Paid (₹)</label>
            <input {...register('advance_paid')} type="number" min="0" defaultValue={0} className={inputCls} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Assign Delivery Boy</label>
          <select {...register('assigned_boy_id')} className={inputCls}>
            <option value="">Not assigned</option>
            {boys.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        {isEdit && (
          <>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Delivery Status</label>
              <select {...register('delivery_status')} className={inputCls}>
                <option value="pending">Pending</option>
                <option value="dispatched">Dispatched</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" {...register('bottles_returned')} className="w-4 h-4 accent-primary" />
              <span className="text-sm text-foreground">Bottles Returned</span>
            </label>
          </>
        )}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Notes</label>
          <textarea {...register('notes')} rows={2} className={`${inputCls} h-auto py-2`} placeholder="Special instructions…" />
        </div>

        <button type="submit" disabled={mutation.isPending}
          className="w-full h-12 bg-primary text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60"
        >
          {mutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : isEdit ? 'Update Event' : 'Create Event'}
        </button>
      </form>
    </div>
  );
}
