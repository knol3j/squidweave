import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LayoutProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
}

export default function Layout({ children, sidebar }: LayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f1f9] text-slate-900 font-sans">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-[#fbfafc] sm:flex">
        <div className="border-b border-slate-200 px-6 py-6">
          <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">Command Center</div>
          <div className="flex items-center gap-3">
            <div className="mt-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 shadow-[0_10px_25px_rgba(139,92,246,0.15)]">
              <div className="h-4 w-4 rounded-full bg-violet-500" />
            </div>
            <h1 className="mt-3 text-xl font-semibold tracking-tight text-slate-900">
              LocaleWeave <span className="font-normal text-violet-500">brain</span>
            </h1>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">{sidebar}</div>
        <div className="border-t border-slate-200 px-6 py-4 text-[10px] uppercase tracking-[0.22em] text-slate-400">
          local agent platform v0.12.5a
        </div>
      </aside>

      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
