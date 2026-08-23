import { useStore, type Tier } from '../store/useStore';
import { Lock, ArrowRight } from 'lucide-react';

const tierNames: Record<Tier, string> = { free: 'Free', growth: 'Growth', pro: 'Pro', enterprise: 'Enterprise' };
const tierPrices: Record<Tier, string> = { free: '$0/mo', growth: '$49/mo', pro: '$149/mo', enterprise: '$499/mo' };

export default function UpgradeCTA({ requiredTier, featureName, description }: { requiredTier: Tier; featureName: string; description: string }) {
  const setTier = useStore(s => s.setTier);
  return (
    <div className='flex flex-col items-center justify-center py-16 px-4 text-center'>
      <div className='w-14 h-14 rounded-full bg-[#1A2235] border border-[#1E293B] flex items-center justify-center mb-4'>
        <Lock size={24} className='text-[#64748B]' />
      </div>
      <h3 className='text-lg font-semibold text-[#F1F5F9] mb-1'>{featureName}</h3>
      <p className='text-sm text-[#64748B] max-w-sm mb-6'>{description}</p>
      <div className='bg-[#111827] border border-[#1E293B] rounded-lg p-4 w-full max-w-xs'>
        <p className='text-xs text-[#64748B] mb-2'>Requires <span className='text-[#F1F5F9] font-medium'>{tierNames[requiredTier]}</span> plan</p>
        <button onClick={() => setTier(requiredTier)} className='w-full flex items-center justify-center gap-2 bg-[#00D4AA] hover:bg-[#00D4AA]/90 text-[#0A0F1E] px-4 py-2 rounded-md text-xs font-semibold'>
          Upgrade for {tierPrices[requiredTier]} <ArrowRight size={12} />
        </button>
      </div>
    </div>
  );
}
