import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Droplets, FileText,
  CalendarDays, ClipboardCheck, Package, BarChart3, UserCog,
  Menu, X, LogOut, ChevronRight, Waves
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/daily-entry', icon: Droplets, label: 'Daily Entry', highlight: true },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/billing', icon: FileText, label: 'Billing' },
  { to: '/events', icon: CalendarDays, label: 'Events' },
  { to: '/attendance', icon: ClipboardCheck, label: 'Attendance' },
  { to: '/inventory', icon: Package, label: 'Inventory' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/employees', icon: UserCog, label: 'Employees' },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isDeliveryBoy = user.role === 'delivery_boy';

  useEffect(() => {
    if (isDeliveryBoy) {
      const allowed = ['/daily-entry', '/customers', '/attendance'];
      const path = window.location.pathname;
      const isAllowed = allowed.some(p => path.startsWith(p));
      if (!isAllowed) {
        navigate('/daily-entry', { replace: true });
      }
    }
  }, [isDeliveryBoy, navigate]);

  const filteredNavItems = navItems.filter(item => {
    if (isDeliveryBoy) {
      return item.to === '/daily-entry' || item.to === '/customers' || item.to === '/attendance';
    }
    return true;
  });

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login', { replace: true });
  }

  const Sidebar = ({ mobile = false }) => (
    <div className={`flex flex-col h-full bg-sidebar`}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
        <div className="w-9 h-9 rounded-xl bg-sidebar-primary/20 flex items-center justify-center">
          <Waves className="w-5 h-5 text-sidebar-primary" />
        </div>
        <div>
          <h1 className="text-sidebar-foreground font-bold text-base leading-tight">AquaFlow</h1>
          <p className="text-sidebar-foreground/50 text-xs">Delivery Manager</p>
        </div>
        {mobile && (
          <button onClick={() => setSidebarOpen(false)} className="ml-auto text-sidebar-foreground/60 hover:text-sidebar-foreground">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {filteredNavItems.map(({ to, icon: Icon, label, highlight }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => mobile && setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                isActive
                  ? 'bg-sidebar-primary text-white shadow-sm'
                  : highlight
                  ? 'text-sidebar-primary bg-sidebar-primary/10 hover:bg-sidebar-primary/20'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
              }`
            }
          >
            <Icon className="w-4.5 h-4.5 shrink-0" />
            <span className="flex-1">{label}</span>
            {highlight && <span className="text-[10px] bg-sidebar-primary/30 text-sidebar-primary px-1.5 py-0.5 rounded-full font-semibold">DAILY</span>}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-sidebar-primary/20 flex items-center justify-center text-sidebar-primary font-bold text-sm">
            {user.name?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sidebar-foreground text-sm font-medium truncate">{user.name}</p>
            <p className="text-sidebar-foreground/40 text-xs capitalize">{user.role?.replace('_', ' ')}</p>
          </div>
          <button onClick={logout} title="Logout" className="text-sidebar-foreground/40 hover:text-red-400 transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-border">
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-72 flex flex-col shadow-2xl">
            <Sidebar mobile />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header (mobile) */}
        <header className="lg:hidden flex items-center gap-3 px-4 h-14 border-b border-border bg-background shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="text-foreground/60 hover:text-foreground">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Waves className="w-5 h-5 text-primary" />
            <span className="font-bold text-foreground">AquaFlow</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
