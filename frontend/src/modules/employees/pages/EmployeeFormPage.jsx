import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../../shared/api/client';
import toast from 'react-hot-toast';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function EmployeeFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: existing } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => apiFetch(`/employees/${id}`),
    enabled: isEdit,
  });

  const { register, handleSubmit, reset } = useForm({
    defaultValues: { role: 'delivery_boy', is_active: 1 },
  });

  useEffect(() => { if (existing) reset(existing); }, [existing, reset]);

  const mutation = useMutation({
    mutationFn: data => isEdit
      ? apiFetch(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) })
      : apiFetch('/employees', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      toast.success(isEdit ? 'Employee updated' : 'Employee added');
      qc.invalidateQueries({ queryKey: ['employees'] });
      navigate('/employees');
    },
    onError: err => toast.error(err.message),
  });

  const inputCls = "w-full h-11 px-3 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="p-4 lg:p-8 max-w-xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-muted-foreground text-sm mb-6 hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <h1 className="text-2xl font-bold text-foreground mb-6">{isEdit ? 'Edit Employee' : 'Add Employee'}</h1>

      <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Full Name *</label>
          <input {...register('name', { required: true })} placeholder="Raju Kumar" className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Email *</label>
          <input {...register('email', { required: true })} type="email" placeholder="raju@waterdelivery.com" className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Phone</label>
          <input {...register('phone')} placeholder="9876543210" className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Role *</label>
          <select {...register('role')} className={inputCls}>
            <option value="delivery_boy">Delivery Boy</option>
            <option value="accountant">Accountant</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        {!isEdit && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Password *</label>
            <input {...register('password', { required: !isEdit })} type="password" placeholder="Set initial password" className={inputCls} />
          </div>
        )}
        {isEdit && (
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" {...register('is_active')} className="w-4 h-4 accent-primary" defaultChecked />
            <span className="text-sm text-foreground">Active (uncheck to deactivate)</span>
          </label>
        )}
        <button type="submit" disabled={mutation.isPending}
          className="w-full h-12 bg-primary text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60"
        >
          {mutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : isEdit ? 'Update' : 'Add Employee'}
        </button>
      </form>
    </div>
  );
}
