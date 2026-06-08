import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../../shared/api/client';
import toast from 'react-hot-toast';
import { Plus, Loader2, UserCog, Phone, Shield } from 'lucide-react';

const ROLE_LABELS = { admin: 'Admin', accountant: 'Accountant', delivery_boy: 'Delivery Boy' };
const ROLE_COLORS = { admin: 'bg-purple-100 text-purple-700', accountant: 'bg-blue-100 text-blue-700', delivery_boy: 'bg-teal-100 text-teal-700' };

export default function EmployeesPage() {
  const qc = useQueryClient();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => apiFetch('/employees'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, name, email, phone, role, is_active }) =>
      apiFetch(`/employees/${id}`, { method: 'PUT', body: JSON.stringify({ name, email, phone, role, is_active }) }),
    onSuccess: () => { toast.success('Updated'); qc.invalidateQueries({ queryKey: ['employees'] }); },
    onError: err => toast.error(err.message),
  });

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Employees</h1>
          <p className="text-muted-foreground text-sm">{employees.length} team members</p>
        </div>
        {user.role === 'admin' && (
          <Link
            to="/employees/new"
            className="flex items-center gap-2 h-10 px-4 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 transition"
          >
            <Plus className="w-4 h-4" /> Add Employee
          </Link>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
        </div>
      ) : (
        <div className="space-y-2">
          {employees.map(emp => (
            <div key={emp.id} className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                  {emp.name[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-foreground">{emp.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[emp.role]}`}>
                      {ROLE_LABELS[emp.role]}
                    </span>
                    {!emp.is_active && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactive</span>}
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p>{emp.email}</p>
                    {emp.phone && <p className="flex items-center gap-1"><Phone className="w-3 h-3" />{emp.phone}</p>}
                  </div>
                </div>
                {user.role === 'admin' && (
                  <Link
                    to={`/employees/${emp.id}/edit`}
                    className="h-8 px-3 rounded-lg border border-border text-xs text-foreground hover:bg-muted transition"
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
