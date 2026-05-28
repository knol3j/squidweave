import React from 'react';

type StageTone = {
  ring: string;
  glow: string;
  icon: string;
  pulse: string;
};

const STAGE_TONES: Record<string, StageTone> = {
  intake: {
    ring: '#ef5bff',
    glow: 'rgba(239, 91, 255, 0.38)',
    icon: '#f58cff',
    pulse: 'rgba(239, 91, 255, 0.22)',
  },
  strategy: {
    ring: '#49f2ff',
    glow: 'rgba(73, 242, 255, 0.34)',
    icon: '#6bf6ff',
    pulse: 'rgba(73, 242, 255, 0.2)',
  },
  design: {
    ring: '#36ff9c',
    glow: 'rgba(54, 255, 156, 0.34)',
    icon: '#73ffba',
    pulse: 'rgba(54, 255, 156, 0.2)',
  },
  research: {
    ring: '#ffd740',
    glow: 'rgba(255, 215, 64, 0.34)',
    icon: '#ffe374',
    pulse: 'rgba(255, 215, 64, 0.2)',
  },
  optimization: {
    ring: '#ff9b3f',
    glow: 'rgba(255, 155, 63, 0.34)',
    icon: '#ffb069',
    pulse: 'rgba(255, 155, 63, 0.2)',
  },
};

function normalizeStage(stage: string) {
  const value = String(stage || '').toLowerCase();
  if (value.includes('optim')) return 'optimization';
  if (value.includes('research')) return 'research';
  if (value.includes('design')) return 'design';
  if (value.includes('strategy')) return 'strategy';
  if (value.includes('intake')) return 'intake';
  return 'strategy';
}

export default function AgentStageIcon({
  stage,
  size = 32,
}: {
  stage: string;
  size?: number;
}) {
  const key = normalizeStage(stage);
  const tone = STAGE_TONES[key];
  const ringThickness = Math.max(2, Math.round(size * 0.08));
  const squidSize = Math.round(size * 0.55);

  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: '999px',
        border: `${ringThickness}px solid ${tone.ring}`,
        boxShadow: `0 0 ${Math.round(size * 0.4)}px ${tone.glow}, inset 0 0 ${Math.round(size * 0.2)}px ${tone.pulse}`,
        background:
          'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.18), rgba(255,255,255,0.02) 55%, rgba(2,6,23,0.6))',
      }}
      className="relative inline-flex items-center justify-center"
    >
      <svg
        viewBox="0 0 24 24"
        width={squidSize}
        height={squidSize}
        fill="none"
        stroke={tone.icon}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3c-3.5 0-6 2.3-6 5.1 0 2.5 2 4.4 4.2 5.2.9.4 1.8.6 1.8 1.3 0-.7.9-.9 1.8-1.3C16 12.5 18 10.6 18 8.1 18 5.3 15.5 3 12 3Z" />
        <circle cx="9.5" cy="8.7" r="0.6" fill={tone.icon} stroke="none" />
        <circle cx="14.5" cy="8.7" r="0.6" fill={tone.icon} stroke="none" />
        <path d="M8.1 13.2c-.5 1.8-1.7 3-3.3 3.7" />
        <path d="M10.4 13.9c-.2 1.8-1 3.3-2.3 4.3" />
        <path d="M13.6 13.9c.2 1.8 1 3.3 2.3 4.3" />
        <path d="M15.9 13.2c.5 1.8 1.7 3 3.3 3.7" />
      </svg>
    </div>
  );
}

