import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { apiFetch } from '../../../shared/api/client';
import toast from 'react-hot-toast';
import { Droplets, Loader2, ArrowRight } from 'lucide-react';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: () => apiFetch('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, phone, password }),
    }),
    onSuccess: (data) => {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      toast.success('Account created successfully');
      navigate('/dashboard');
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-elevated">
            <Droplets className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">Create an account</h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Bhavani Mineral Waters Business Manager
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-card py-8 px-4 shadow-elevated sm:rounded-2xl sm:px-10 border border-border">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Full Name</label>
              <input
                type="text" required value={name} onChange={e => setName(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Business Owner"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Email address</label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="admin@waterdelivery.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Phone (Optional)</label>
              <input
                type="text" value={phone} onChange={e => setPhone(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="9876543210"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
              <input
                type="password" required value={password} onChange={e => setPassword(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit" disabled={mutation.isPending}
              className="w-full h-12 bg-primary text-white rounded-xl font-bold text-base shadow-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition disabled:opacity-60 mt-2"
            >
              {mutation.isPending ? <><Loader2 className="w-5 h-5 animate-spin" /> Creating...</> : <><ArrowRight className="w-5 h-5" /> Sign Up</>}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-primary hover:underline">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
