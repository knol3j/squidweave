import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import SquidLogo from './SquidLogo';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LayoutProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
}

export default function Layout({ children, sidebar }: LayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#020617] text-slate-100 font-sans">
      <aside className="hidden w-72 shrink-0 flex-col border-r border-white/10 bg-[#07101d]/95 sm:flex">
        <div className="border-b border-white/10 px-6 py-6">
          <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Command Center</div>
          <div className="mt-3">
            <SquidLogo />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">{sidebar}</div>
        <div className="border-t border-white/10 px-6 py-4 text-[10px] uppercase tracking-[0.22em] text-slate-500">
          squidweave agent platform v0.12.5a
        </div>
      </aside>

      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
