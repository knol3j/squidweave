import { useState } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Outlet, Link, useLocation } from 'react-router-dom';
import SquidLogo from './SquidLogo';
import { Menu, X, LayoutDashboard, Users, Megaphone, Filter, Calendar, BarChart3, Target, Settings } from 'lucide-react';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/crm', label: 'CRM', icon: Users },
  { path: '/campaigns', label: 'Campaigns', icon: Megaphone },
  { path: '/funnels', label: 'Funnels', icon: Filter },
  { path: '/appointments', label: 'Appointments', icon: Calendar },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/prospecting', label: 'Prospecting', icon: Target },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-[#020617] text-slate-100 font-sans">
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col border-r border-white/10 bg-[#07101d]/95 transition-transform duration-300 ease-in-out md:relative md:z-auto md:translate-x-0',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="absolute right-3 top-4 z-50 rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white md:hidden"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="border-b border-white/10 px-6 py-6">
          <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">Command Center</div>
          <div className="mt-3">
            <SquidLogo />
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  active
                    ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
          squidweave agent platform v0.12.5a
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="md:hidden flex items-center gap-2 border-b border-white/10 bg-[#07101d]/95 px-4 py-3 text-slate-300 transition hover:text-white"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
          <span className="text-sm font-medium">Menu</span>
        </button>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
