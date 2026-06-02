import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Loader2, Squid } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { cn } from '@/lib/utils';

export default function Navbar() {
  const { state, runBrain } = useApp();
  const location = useLocation();
  const isMissionControl = location.pathname === '/';

  return (
    <nav className="h-14 border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between px-4 shrink-0" style={{ backgroundColor: '#08111f' }}>
      {/* Left: Logo */}
      <div className="flex items-center gap-2.5">
        <Squid className="w-6 h-6 text-[#6366f1]" />
        <span className="font-bold text-sm tracking-[0.15em] text-[#e2e8f0]">
          SQUIDWEAVE
        </span>
      </div>

      {/* Center: Tab switcher */}
      <div className="flex items-center gap-1 bg-[#0f172a] rounded-full p-1">
        <Link
          to="/"
          className={cn(
            'px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200',
            isMissionControl
              ? 'bg-[#6366f1] text-white'
              : 'text-[#94a3b8] hover:text-[#e2e8f0]'
          )}
        >
          Mission Control
        </Link>
        <Link
          to="/neural"
          className={cn(
            'px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200',
            !isMissionControl
              ? 'bg-[#6366f1] text-white'
              : 'text-[#94a3b8] hover:text-[#e2e8f0]'
          )}
        >
          Neural Net
        </Link>
      </div>

      {/* Right: Run Brain button */}
      <motion.button
        onClick={runBrain}
        disabled={state.isRunningBrain}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all',
          state.isRunningBrain
            ? 'bg-[#334155] cursor-wait'
            : 'gradient-indigo hover:shadow-[0_0_20px_rgba(99,102,241,0.3)]'
        )}
      >
        {state.isRunningBrain ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Running...
          </>
        ) : (
          <>
            <Play className="w-3.5 h-3.5" />
            Run Brain
          </>
        )}
      </motion.button>
    </nav>
  );
}
