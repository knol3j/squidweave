import { useStore, type Tier } from '../store/useStore';
import { Zap, Rocket, Crown, Building2 } from 'lucide-react';

export default function TierBadge({ onClick }: { onClick?: () => void }) {
  const tier = useStore(s => s.tier);
  const configs: Record<Tier, { label: string; color: string; icon: any }> = {
    free:    { label: 'Free',    color: 'bg-[#64748B]/10 text-[#94A3B8] border-[#64748B]/20', icon: Zap },
    growth:  { label: 'Growth',  color: 'bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/20', icon: Rocket },
    pro:     { label: 'Pro',     color: 'bg-[#8B5CF6]/10 text-[#8B5CF6] border-[#8B5CF6]/20', icon: Crown },
    enterprise: { label: 'Enterprise', color: 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20', icon: Building2 },
  };
  const cfg = configs[tier];
  const Icon = cfg.icon;
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${cfg.color} hover:opacity-80 transition-opacity`}>
      <Icon size={13} />
      {cfg.label}
    </button>
  );
}
