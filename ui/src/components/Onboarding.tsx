import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Image as ImageIcon, Zap, Target, ChevronRight, X } from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
}

const steps = [
  {
    title: "Welcome to SquidWeave",
    description: "Your agent platform for campaign strategy, automation, and privacy-first execution.",
    icon: Zap,
    color: "text-indigo-400",
  },
  {
    title: "Campaign Generation",
    description: "Describe your goals to generate full-funnel strategies, SEO copy, and social media plans in seconds.",
    icon: Sparkles,
    color: "text-fuchsia-400",
  },
  {
    title: "Multimodal Asset Analysis",
    description: "Upload product photos or brand assets. The engine analyzes visuals to generate context-aware marketing copy.",
    icon: ImageIcon,
    color: "text-blue-400",
  },
  {
    title: "Build Visualization",
    description: "Watch your build in real-time. See the architecture mapping vision tokens to marketing logic as it executes.",
    icon: Target,
    color: "text-emerald-400",
  }
];

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const current = steps[currentStep];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#020617]/80 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-lg bg-[#0F172A] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl relative"
      >
        <button 
          onClick={onComplete}
          className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-12 text-center flex flex-col items-center">
          {currentStep === 0 ? (
            <motion.div
              key="logo"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mb-8"
            >
              <img src="/logo-login.png" alt="SquidWeave" className="h-24 w-auto object-contain mx-auto" />
            </motion.div>
          ) : (
            <motion.div 
              key={currentStep}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mb-8 border border-white/10 shadow-inner`}
            >
              <current.icon className={`w-10 h-10 ${current.color}`} />
            </motion.div>
          )}

          <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">{current.title}</h2>
          <p className="text-slate-400 leading-relaxed text-base mb-10 max-w-sm">
            {current.description}
          </p>

          <div className="flex gap-2 mb-10">
            {steps.map((_, i) => (
              <div 
                key={i} 
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === currentStep ? 'w-8 bg-indigo-500' : 'w-2 bg-white/10'
                }`}
              />
            ))}
          </div>

          <button 
            onClick={nextStep}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20 group uppercase tracking-widest text-xs"
          >
            {currentStep === steps.length - 1 ? 'Get Started' : 'Next Step'}
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="bg-white/5 p-4 text-center">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em]">Local Inference Node v2.4.0-Stable</span>
        </div>
      </motion.div>
    </div>
  );
}
