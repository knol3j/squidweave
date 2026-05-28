import React from 'react';

export default function SquidLogo({
  className = '',
  showWordmark = true,
  size = 'default',
}: {
  className?: string;
  showWordmark?: boolean;
  size?: 'sm' | 'default' | 'lg' | 'xl';
}) {
  const iconSizes = { sm: 'h-8 w-8', default: 'h-12 w-12', lg: 'h-16 w-16', xl: 'h-24 w-24' };
  const wordSizes = { sm: 'text-sm', default: 'text-xl', lg: 'text-2xl', xl: 'text-3xl' };
  const subSizes = { sm: 'text-[8px]', default: 'text-[10px]', lg: 'text-xs', xl: 'text-sm' };

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <div className={`${iconSizes[size]} flex-shrink-0 overflow-hidden rounded-xl`}>
        <img
          src="/logo-icon.png"
          alt="SquidWeave"
          className="h-full w-full object-contain"
          onError={(e) => {
            const target = e.currentTarget;
            target.style.display = 'none';
            const fallback = target.nextElementSibling as HTMLElement | null;
            if (fallback) fallback.style.display = 'flex';
          }}
        />
        <div
          style={{ display: 'none' }}
          className="h-full w-full items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-500/10 text-cyan-200"
        >
          <span className="text-lg font-bold leading-none">S</span>
        </div>
      </div>
      {showWordmark && (
        <div className="leading-tight">
          <div className={`${wordSizes[size]} font-semibold tracking-tight text-white`}>SquidWeave</div>
          <div className={`${subSizes[size]} font-semibold uppercase tracking-[0.15em] text-cyan-300/85`}>Autonomous Marketing Engine</div>
        </div>
      )}
    </div>
  );
}