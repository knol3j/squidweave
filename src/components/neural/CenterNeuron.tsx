import { useState } from 'react';
import { motion } from 'framer-motion';
import type { StageStatus } from '@/types';

interface CenterNeuronProps {
  cx: number;
  cy: number;
  campaignName: string;
  status: StageStatus;
  onClick: () => void;
  isRunningBrain: boolean;
  isDimmed: boolean;
  animationDelay?: number;
}

export default function CenterNeuron({
  cx,
  cy,
  campaignName,
  onClick,
  isRunningBrain,
  isDimmed,
  animationDelay = 0,
}: CenterNeuronProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const radius = 80;
  const pulseScale = isRunningBrain ? [1, 1.1, 1] : [1, 1.03, 1];
  const pulseDuration = isRunningBrain ? 1.5 : 3;

  return (
    <motion.g
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: isDimmed ? 0.4 : 1 }}
      transition={{
        scale: { type: 'spring', stiffness: 260, damping: 20, delay: animationDelay },
        opacity: { duration: 0.3 },
      }}
      style={{ originX: `${cx}px`, originY: `${cy}px`, cursor: 'pointer' }}
      onMouseEnter={() => {
        setIsHovered(true);
        setShowTooltip(true);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowTooltip(false);
      }}
      onClick={onClick}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Outer glow ring */}
      <motion.circle
        cx={cx}
        cy={cy}
        r={radius + 20}
        fill="none"
        stroke="url(#centerGlow)"
        strokeWidth="1"
        opacity={isHovered ? 0.6 : 0.3}
        animate={{
          r: [radius + 15, radius + 25, radius + 15],
          opacity: isHovered ? [0.4, 0.7, 0.4] : [0.2, 0.35, 0.2],
        }}
        transition={{ duration: pulseDuration, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Main glow */}
      <defs>
        <radialGradient id="centerGlow">
          <stop offset="0%" stopColor="#6366f1" stopOpacity={isHovered ? 0.5 : 0.3} />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="centerFill">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="70%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#4f46e5" />
        </radialGradient>
        <radialGradient id="centerFillHover">
          <stop offset="0%" stopColor="#a5b4fc" />
          <stop offset="70%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#6366f1" />
        </radialGradient>
      </defs>

      {/* Main circle */}
      <motion.circle
        cx={cx}
        cy={cy}
        r={radius}
        fill={isHovered ? 'url(#centerFillHover)' : 'url(#centerFill)'}
        animate={{
          r: isRunningBrain ? [radius, radius + 6, radius] : [radius, radius + 3, radius],
        }}
        transition={{ duration: pulseDuration, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          filter: isHovered
            ? 'drop-shadow(0 0 40px rgba(99,102,241,0.6)) drop-shadow(0 0 80px rgba(99,102,241,0.3))'
            : 'drop-shadow(0 0 30px rgba(99,102,241,0.4)) drop-shadow(0 0 60px rgba(99,102,241,0.15))',
        }}
      />

      {/* Inner ring */}
      <circle
        cx={cx}
        cy={cy}
        r={radius - 12}
        fill="none"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="1"
      />

      {/* Rotating dashed status ring */}
      <motion.circle
        cx={cx}
        cy={cy}
        r={radius - 6}
        fill="none"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="1.5"
        strokeDasharray="8 6"
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        style={{ originX: `${cx}px`, originY: `${cy}px` }}
      />

      {/* Center icon / text */}
      <text
        x={cx}
        y={cy - 6}
        textAnchor="middle"
        fill="white"
        fontSize="12"
        fontWeight="700"
        letterSpacing="0.15em"
        style={{ pointerEvents: 'none' }}
      >
        CORE
      </text>
      <circle cx={cx} cy={cy + 10} r="3" fill="#34d399">
        <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" />
      </circle>

      {/* Label below */}
      <text
        x={cx}
        y={cy + radius + 22}
        textAnchor="middle"
        fill="#94a3b8"
        fontSize="10"
        fontWeight="500"
        letterSpacing="0.1em"
        style={{ pointerEvents: 'none' }}
      >
        CAMPAIGN CORE
      </text>
      <text
        x={cx}
        y={cy + radius + 38}
        textAnchor="middle"
        fill="#e2e8f0"
        fontSize="12"
        fontWeight="600"
        style={{ pointerEvents: 'none' }}
      >
        {campaignName.length > 22 ? campaignName.slice(0, 22) + '...' : campaignName}
      </text>

      {/* Tooltip */}
      {showTooltip && (
        <motion.g
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
        >
          <rect
            x={cx - 90}
            y={cy - radius - 55}
            width="180"
            height="40"
            rx="8"
            fill="#0f172a"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="1"
            opacity="0.95"
          />
          <text
            x={cx}
            y={cy - radius - 38}
            textAnchor="middle"
            fill="#e2e8f0"
            fontSize="11"
            fontWeight="600"
          >
            Campaign Control Center
          </text>
          <text
            x={cx}
            y={cy - radius - 26}
            textAnchor="middle"
            fill="#64748b"
            fontSize="9"
          >
            Click to edit campaign settings
          </text>
        </motion.g>
      )}
    </motion.g>
  );
}
