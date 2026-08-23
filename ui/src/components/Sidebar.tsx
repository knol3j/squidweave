import { NavLink, useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';
import {
  LayoutDashboard, Users, Send, Filter, Calendar,
  BarChart3, Search, Megaphone, Settings, ChevronLeft, ChevronRight
} from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Users, label: 'CRM', path: '/crm' },
  { icon: Send, label: 'Campaigns', path: '/campaigns' },
  { icon: Filter, label: 'Funnels', path: '/funnels' },
  { icon: Calendar, label: 'Appointments', path: '/appointments' },
  { icon: BarChart3, label: 'Analytics', path: '/analytics' },
  { icon: Search, label: 'Prospecting', path: '/prospecting' },
  { icon: Megaphone, label: 'Ad Engine', path: '/advertising' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export default function Sidebar() {
  const collapsed = useStore(s => s.sidebarCollapsed);
  const toggle = useStore(s => s.toggleSidebar);
  const location = useLocation();

  return (
    <aside className={`flex flex-col bg-[#111827] border-r border-[#1E293B] transition-all duration-200 ${collapsed ? 'w-16' : 'w-60'}`}>
      <div className="h-14 flex items-center px-4 border-b border-[#1E293B]">
        {!collapsed && <span className="font-bold text-[#00D4AA] text-lg">SquidWeave</span>}
        <button onClick={toggle} className="ml-auto p-1 rounded hover:bg-[#1A2235] text-[#94A3B8]">
          {collapsed ? <ChevronRight size={16}/> : <ChevronLeft size={16}/>}
        </button>
      </div>
      <nav className="flex-1 py-4 space-y-1">
        {navItems.map(item => {
          const Icon = item.icon;
          const active = location.pathname === item.path;
          return (
            <NavLink key={item.path} to={item.path}
              className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-md text-sm transition-colors ${
                active ? 'bg-[#00D4AA]/10 text-[#00D4AA]' : 'text-[#94A3B8] hover:bg-[#1A2235] hover:text-[#F1F5F9]'
              }`}>
              <Icon size={18}/>
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>
      <div className="p-4 border-t border-[#1E293B]">
        {!collapsed && (
          <div className="text-xs text-[#64748B]">
            <p className="font-medium text-[#94A3B8]">Free Plan</p>
            <p>20/100 contacts</p>
          </div>
        )}
      </div>
    </aside>
  );
}
