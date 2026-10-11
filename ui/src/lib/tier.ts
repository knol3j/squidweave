export type TierMode = 'free' | 'paid' | 'unlimited';

export function getTierMode(): TierMode {
  const mode = import.meta.env.VITE_TIER_MODE;
  if (mode === 'paid' || mode === 'unlimited') return mode;
  return 'free';
}

export function isPaidTier(mode?: TierMode): boolean {
  return mode === 'paid' || mode === 'unlimited';
}

export function tierModeLabel(mode: TierMode): string {
  switch (mode) {
    case 'paid': return 'Paid';
    case 'unlimited': return 'Unlimited';
    default: return 'Free';
  }
}
