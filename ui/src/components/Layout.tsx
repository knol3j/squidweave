import React, { useState } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import SquidLogo from './SquidLogo';
import { Menu, X } from 'lucide-react';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LayoutProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
}

export default function Layout({ children, sidebar }: LayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[#020617] text-slate-100 font-sans">
      {/* Dark overlay – mobile only */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar – always visible on md+, slide-in on mobile */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col border-r border-white/10 bg-[#07101d]/95 transition-transform duration-300 ease-in-out md:relative md:z-auto md:translate-x-0',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        {/* Mobile close button */}
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
        <div className="flex-1 overflow-y-auto">{sidebar}</div>
        <div className="border-t border-white/10 px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
          squidweave agent platform v0.12.5a
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile hamburger button */}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="md:hidden flex items-center gap-2 border-b border-white/10 bg-[#07101d]/95 px-4 py-3 text-slate-300 transition hover:text-white"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
          <span className="text-sm font-medium">Menu</span>
        </button>

        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}