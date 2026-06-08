import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiFetch } from '../../../shared/api/client';
import toast from 'react-hot-toast';
import { Waves, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left — Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-center p-16">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Waves className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Bhavani Mineral Waters</h1>
              <p className="text-white/60 text-sm">Water Delivery Manager</p>
            </div>
          </div>
          <h2 className="text-5xl font-bold text-white leading-tight mb-6">
            Manage your water<br />delivery business<br />with ease.
          </h2>
          <p className="text-white/70 text-lg max-w-sm">
            Fast daily entry, smart billing, and real-time reports — all from your phone.
          </p>
          <div className="mt-12 grid grid-cols-3 gap-6">
            {[['100+', 'Customers'], ['0 Clicks', 'Wasted'], ['Instant', 'Billing']].map(([v, l]) => (
              <div key={l} className="bg-white/10 backdrop-blur rounded-2xl p-4 text-center">
                <p className="text-white font-bold text-xl">{v}</p>
                <p className="text-white/60 text-xs mt-1">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md animate-slide-up">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10 justify-center">
            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center">
              <Waves className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Bhavani Mineral Waters</h1>
              <p className="text-muted-foreground text-xs">Water Delivery Manager</p>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-foreground mb-2">Welcome back</h2>
          <p className="text-muted-foreground mb-8">Sign in to your account to continue</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@waterdelivery.com"
                required
                className="w-full h-12 px-4 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full h-12 px-4 pr-11 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              id="login-btn"
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-semibold text-base flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition disabled:opacity-60"
            >
              {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Signing in…</> : 'Sign In'}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Default: admin@waterdelivery.com / password
          </p>
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/signup" className="font-semibold text-primary hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
