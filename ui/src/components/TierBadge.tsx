import { getTierMode, tierModeLabel } from '../lib/tier';
import { Zap, Rocket, Crown } from 'lucide-react';

export default function TierBadge({ onClick }: { onClick?: () => void }) {
  const tierMode = getTierMode();
  const configs = {
    free:     { label: tierModeLabel('free'),     color: 'bg-[#64748B]/10 text-[#94A3B8] border-[#64748B]/20', icon: Zap },
    paid:     { label: tierModeLabel('paid'),     color: 'bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/20', icon: Rocket },
    unlimited:{ label: tierModeLabel('unlimited'),color: 'bg-[#8B5CF6]/10 text-[#8B5CF6] border-[#8B5CF6]/20', icon: Crown },
  };
  const cfg = configs[tierMode];
  const Icon = cfg.icon;
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${cfg.color} hover:opacity-80 transition-opacity`}>
      <Icon size={13} />
      {cfg.label}
    </button>
  );
}
