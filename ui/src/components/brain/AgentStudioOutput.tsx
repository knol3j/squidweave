import React from 'react';
import { Sparkles } from 'lucide-react';

interface AgentStudioOutputProps {
  variants: Array<{ locale: string; cta?: string }>;
}

export default function AgentStudioOutput({ variants }: AgentStudioOutputProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
        <Sparkles className="h-4 w-4 text-violet-500" />
        Agent Studio Output
      </div>
      <div className="mt-4 space-y-2">
        {(variants || []).slice(0, 3).map((variant) => (
          <div key={variant.locale} className="rounded-xl bg-white/[0.06] px-3 py-2">
            <div className="text-xs font-semibold text-slate-200">{variant.locale}</div>
            <div className="mt-1 text-xs text-slate-400">{variant.cta}</div>
          </div>
        ))}
        {!variants?.length && (
          <div className="text-xs text-slate-400">No live content pack available.</div>
        )}
      </div>
    </div>
  );
}
