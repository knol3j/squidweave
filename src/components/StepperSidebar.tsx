import { motion } from 'framer-motion';
import { Check, Lock, Loader2 } from 'lucide-react';
import type { Stage } from '@/types';

interface StepperSidebarProps {
  stages: Stage[];
  activeStage: number;
  onSelect: (stageId: number) => void;
}

const statusConfig: Record<string, { bg: string; border: string; icon: string; text: string }> = {
  completed: { bg: '#10b981', border: '#10b981', icon: '#10b981', text: '#10b981' },
  active: { bg: '#6366f1', border: '#6366f1', icon: '#6366f1', text: '#6366f1' },
  ready: { bg: 'transparent', border: '#6366f1', icon: '#6366f1', text: '#6366f1' },
  locked: { bg: 'transparent', border: '#475569', icon: '#475569', text: '#475569' },
  configuring: { bg: 'transparent', border: '#f59e0b', icon: '#f59e0b', text: '#f59e0b' },
};

export default function StepperSidebar({ stages, activeStage, onSelect }: StepperSidebarProps) {
  return (
    <aside className="w-[220px] shrink-0 border-r border-[rgba(255,255,255,0.08)] p-4 overflow-y-auto" style={{ backgroundColor: '#08111f' }}>
      <div className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-[#64748b] mb-4 px-2">
        Pipeline Stages
      </div>
      <div className="relative">
        {/* Vertical connecting line */}
        <div className="absolute left-[19px] top-3 bottom-3 w-px bg-[#1e293b]" />

        <div className="space-y-0">
          {stages.map((stage, index) => {
            const config = statusConfig[stage.status] || statusConfig.locked;
            const isClickable = stage.status !== 'locked';
            const isActive = activeStage === stage.id;

            return (
              <motion.div
                key={stage.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                onClick={() => isClickable && onSelect(stage.id)}
                className={`relative flex items-center gap-3 py-3 px-2 rounded-lg transition-all duration-200 ${
                  isClickable ? 'cursor-pointer hover:bg-[rgba(255,255,255,0.04)]' : 'cursor-not-allowed'
                } ${isActive ? 'bg-[rgba(99,102,241,0.08)]' : ''}`}
              >
                {/* Step dot */}
                <div className="relative z-10 flex items-center justify-center">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                      stage.status === 'active' ? 'animate-dot-pulse' : ''
                    }`}
                    style={{
                      backgroundColor: stage.status === 'ready' || stage.status === 'locked' ? 'transparent' : config.bg,
                      borderColor: config.border,
                    }}
                  >
                    {stage.status === 'completed' && (
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    )}
                    {stage.status === 'locked' && (
                      <Lock className="w-2.5 h-2.5 text-[#475569]" />
                    )}
                    {stage.status === 'configuring' && (
                      <Loader2 className="w-3 h-3 text-[#f59e0b] animate-spin" />
                    )}
                    {stage.status === 'active' && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                    {stage.status === 'ready' && (
                      <div className="w-1.5 h-1.5 rounded-full bg-[#6366f1]" />
                    )}
                  </div>
                </div>

                {/* Label */}
                <div className="flex flex-col">
                  <span
                    className="text-xs font-medium transition-colors"
                    style={{ color: isActive ? config.text : stage.status === 'locked' ? '#475569' : '#94a3b8' }}
                  >
                    {stage.name}
                  </span>
                  <span className="text-[0.65rem] text-[#64748b] capitalize">
                    {stage.status}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
