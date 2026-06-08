import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../../shared/api/client';
import toast from 'react-hot-toast';
import { ArrowLeft, Loader2 } from 'lucide-react';

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  mobile: z.string().min(10, 'Enter valid mobile'),
  address: z.string().optional(),
  area: z.string().optional(),
  join_date: z.string().optional(),
  bt_enabled: z.boolean(),
  jug_enabled: z.boolean(),
  bt_price: z.coerce.number().min(0),
  jug_price: z.coerce.number().min(0),
  default_bt_qty: z.coerce.number().min(0).default(0),
  default_jug_qty: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
});

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error.message}</p>}
    </div>
  );
}

export default function CustomerFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: existing } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => apiFetch(`/customers/${id}`),
    enabled: isEdit,
  });

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { bt_enabled: true, jug_enabled: false, bt_price: 0, jug_price: 0, default_bt_qty: 0, default_jug_qty: 0 },
  });

  useEffect(() => {
    if (existing) reset({ ...existing });
  }, [existing, reset]);

  const mutation = useMutation({
    mutationFn: data => isEdit
      ? apiFetch(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) })
      : apiFetch('/customers', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      toast.success(isEdit ? 'Customer updated' : 'Customer added');
      qc.invalidateQueries({ queryKey: ['customers'] });
      navigate('/customers');
    },
    onError: err => toast.error(err.message),
  });

  const inputCls = "w-full h-11 px-3 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring";
  const bt_enabled = watch('bt_enabled');
  const jug_enabled = watch('jug_enabled');

  return (
    <div className="p-4 lg:p-8 max-w-xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-muted-foreground text-sm mb-6 hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <h1 className="text-2xl font-bold text-foreground mb-6">{isEdit ? 'Edit Customer' : 'Add Customer'}</h1>

      <form onSubmit={handleSubmit(data => mutation.mutate(data))} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full Name *" error={errors.name}>
            <input {...register('name')} placeholder="Ramesh Kumar" className={inputCls} />
          </Field>
          <Field label="Mobile *" error={errors.mobile}>
            <input {...register('mobile')} placeholder="9876543210" className={inputCls} />
          </Field>
        </div>

        <Field label="Address" error={errors.address}>
          <textarea {...register('address')} rows={2} className={`${inputCls} h-auto py-2`} placeholder="House no, Street" />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Area" error={errors.area}>
            <input {...register('area')} placeholder="Koramangala" className={inputCls} />
          </Field>
          <Field label="Join Date" error={errors.join_date}>
            <input {...register('join_date')} type="date" className={inputCls} />
          </Field>
        </div>

        {/* Product Setup */}
        <div className="bg-muted/50 rounded-2xl p-4 space-y-4">
          <p className="text-sm font-semibold text-foreground">Product Setup</p>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" {...register('bt_enabled')} className="w-4 h-4 accent-primary" />
              <span className="text-sm text-foreground">BT (Bottle)</span>
            </label>
            {bt_enabled && (
              <div className="ml-7 grid grid-cols-2 gap-3">
                <Field label="BT Price (₹)" error={errors.bt_price}>
                  <input {...register('bt_price')} type="number" min="0" step="0.5" className={inputCls} />
                </Field>
                <Field label="Default BT Qty" error={errors.default_bt_qty}>
                  <input {...register('default_bt_qty')} type="number" min="0" step="0.5" className={inputCls} />
                </Field>
              </div>
            )}
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" {...register('jug_enabled')} className="w-4 h-4 accent-primary" />
              <span className="text-sm text-foreground">JUG</span>
            </label>
            {jug_enabled && (
              <div className="ml-7 grid grid-cols-2 gap-3">
                <Field label="JUG Price (₹)" error={errors.jug_price}>
                  <input {...register('jug_price')} type="number" min="0" step="0.5" className={inputCls} />
                </Field>
                <Field label="Default JUG Qty" error={errors.default_jug_qty}>
                  <input {...register('default_jug_qty')} type="number" min="0" step="0.5" className={inputCls} />
                </Field>
              </div>
            )}
          </div>
        </div>

        <Field label="Notes" error={errors.notes}>
          <textarea {...register('notes')} rows={2} className={`${inputCls} h-auto py-2`} placeholder="Any extra notes…" />
        </Field>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full h-12 bg-primary text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition disabled:opacity-60"
        >
          {mutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : isEdit ? 'Update Customer' : 'Add Customer'}
        </button>
      </form>
    </div>
  );
}
