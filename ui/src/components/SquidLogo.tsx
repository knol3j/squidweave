import React from 'react';

export default function SquidLogo({
  className = '',
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <img
        src="/branding/squidweave-logo.png"
        alt="SquidWeave"
        className="h-11 w-11 rounded-xl object-cover"
        onError={event => {
          const target = event.currentTarget;
          target.style.display = 'none';
          const sibling = target.nextElementSibling as HTMLElement | null;
          if (sibling) sibling.style.display = 'flex';
        }}
      />
      <div
        style={{ display: 'none' }}
        className="h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-500/10 text-cyan-200"
      >
        <span className="text-lg font-bold leading-none">S</span>
      </div>
      {showWordmark && (
        <div className="leading-tight">
          <div className="text-xl font-semibold tracking-tight text-white">SquidWeave</div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300/85">Autonomous Marketing Engine</div>
        </div>
      )}
    </div>
  );
}

