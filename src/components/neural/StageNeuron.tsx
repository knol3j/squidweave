import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, CheckCircle } from 'lucide-react';
import type { StageStatus } from '@/types';

interface StageNeuronProps {
  cx: number;
  cy: number;
  name: string;
  description: string;
  accent: string;
  status: StageStatus;
  onClick: () => void;
  animationDelay?: number;
  isDimmed: boolean;
}

export default function StageNeuron({
  cx,
  cy,
  name,
  description,
  accent,
  status,
  onClick,
  animationDelay = 0,
  isDimmed,
}: StageNeuronProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  const radius = 45;
  const isLocked = status === 'locked';
  const isReady = status === 'ready' || status === 'configuring';
  const isActive = status === 'active';
  const isCompleted = status === 'completed';
  const isUnlocked = !isLocked;

  const handleClick = () => {
    if (isLocked) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 400);
    }
    onClick();
  };

  // Darker shade of accent for gradient
  const darkerAccent = accent;

  const statusLabel = status.toUpperCase();

  return (
    <motion.g
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: isShaking ? 1 : 1,
        opacity: isDimmed ? 0.4 : isLocked ? 0.3 : 1,
        x: isShaking ? [0, -4, 4, -4, 4, 0] : 0,
      }}
      transition={{
        scale: { type: 'spring', stiffness: 260, damping: 20, delay: animationDelay },
        opacity: { duration: 0.3, delay: animationDelay * 0.5 },
        x: { duration: 0.4, ease: 'easeInOut' },
      }}
      style={{
        originX: `${cx}px`,
        originY: `${cy}px`,
        cursor: isUnlocked ? 'pointer' : 'not-allowed',
        filter: isLocked ? 'grayscale(0.7)' : 'none',
      }}
      onMouseEnter={() => {
        if (isUnlocked) setIsHovered(true);
      }}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      whileHover={isUnlocked ? { scale: 1.1 } : {}}
      whileTap={isUnlocked ? { scale: 0.95 } : {}}
    >
      {/* Glow ring */}
      {(isReady || isActive || isCompleted) && (
        <motion.circle
          cx={cx}
          cy={cy}
          r={radius + 12}
          fill="none"
          stroke={accent}
          strokeWidth="1"
          opacity={isHovered ? 0.5 : isActive ? 0.4 : 0.2}
          animate={
            isActive
              ? { r: [radius + 10, radius + 18, radius + 10], opacity: [0.3, 0.6, 0.3] }
              : isReady
                ? { r: [radius + 8, radius + 14, radius + 8], opacity: [0.15, 0.3, 0.15] }
                : {}
          }
          transition={{ duration: isActive ? 2 : 3, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Glow fill */}
      <defs>
        <radialGradient id={`glow-${name}`}>
          <stop offset="0%" stopColor={accent} stopOpacity={isHovered ? 0.35 : 0.2} />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`fill-${name}`}>
          <stop offset="0%" stopColor={accent} stopOpacity={isHovered ? 1 : 0.9} />
          <stop offset="60%" stopColor={accent} stopOpacity={isHovered ? 0.85 : 0.75} />
          <stop offset="100%" stopColor={darkerAccent} stopOpacity={isHovered ? 0.7 : 0.6} />
        </radialGradient>
      </defs>

      <circle
        cx={cx}
        cy={cy}
        r={radius + 20}
        fill={`url(#glow-${name})`}
        opacity={isActive ? 1 : 0.6}
      />

      {/* Main circle */}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill={`url(#fill-${name})`}
        stroke={isShaking ? '#f43f5e' : isHovered ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'}
        strokeWidth={isHovered ? 2 : 1}
        style={{
          filter: isHovered
            ? `drop-shadow(0 0 20px ${accent}80) drop-shadow(0 0 40px ${accent}40)`
            : isActive
              ? `drop-shadow(0 0 15px ${accent}60) drop-shadow(0 0 30px ${accent}30)`
              : `drop-shadow(0 0 10px ${accent}30)`,
          transition: 'filter 0.2s ease',
        }}
      />

      {/* Inner highlight */}
      <circle
        cx={cx}
        cy={cy}
        r={radius - 8}
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="1"
      />

      {/* Padlock icon for locked */}
      {isLocked && (
        <foreignObject x={cx - 10} y={cy - 10} width="20" height="20">
          <div className="flex items-center justify-center w-full h-full">
            <Lock className="w-4 h-4 text-[#64748b]" />
          </div>
        </foreignObject>
      )}

      {/* Checkmark for completed */}
      {isCompleted && (
        <foreignObject x={cx + radius - 16} y={cy - radius - 4} width="20" height="20">
          <div className="flex items-center justify-center w-full h-full">
            <CheckCircle className="w-5 h-5 text-[#10b981]" />
          </div>
        </foreignObject>
      )}

      {/* Status dot for active */}
      {isActive && (
        <motion.circle
          cx={cx + radius - 6}
          cy={cy - radius + 6}
          r="5"
          fill="#10b981"
          animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}

      {/* Label */}
      <text
        x={cx}
        y={cy + radius + 18}
        textAnchor="middle"
        fill={isLocked ? '#64748b' : '#e2e8f0'}
        fontSize="10"
        fontWeight="600"
        letterSpacing="0.12em"
        style={{ pointerEvents: 'none' }}
      >
        {name}
      </text>

      {/* Status label */}
      <text
        x={cx}
        y={cy + radius + 32}
        textAnchor="middle"
        fill="#64748b"
        fontSize="8"
        fontWeight="500"
        letterSpacing="0.08em"
        style={{ pointerEvents: 'none' }}
      >
        {statusLabel}
      </text>

      {/* Tooltip on hover */}
      {isHovered && isUnlocked && (
        <motion.g
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
        >
          <rect
            x={cx - 100}
            y={cy - radius - 60}
            width="200"
            height="48"
            rx="8"
            fill="#0f172a"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="1"
            opacity="0.95"
          />
          <text
            x={cx}
            y={cy - radius - 42}
            textAnchor="middle"
            fill="#e2e8f0"
            fontSize="11"
            fontWeight="600"
          >
            {name} LAYER
          </text>
          <text
            x={cx}
            y={cy - radius - 30}
            textAnchor="middle"
            fill="#94a3b8"
            fontSize="9"
          >
            {description}
          </text>
          <text
            x={cx}
            y={cy - radius - 18}
            textAnchor="middle"
            fill={accent}
            fontSize="8"
            fontWeight="500"
          >
            Status: {statusLabel}
          </text>
        </motion.g>
      )}

      {/* Locked tooltip */}
      {isHovered && isLocked && (
        <motion.g
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
        >
          <rect
            x={cx - 80}
            y={cy - radius - 35}
            width="160"
            height="28"
            rx="8"
            fill="#0f172a"
            stroke="rgba(244,63,94,0.4)"
            strokeWidth="1"
            opacity="0.95"
          />
          <text
            x={cx}
            y={cy - radius - 16}
            textAnchor="middle"
            fill="#f43f5e"
            fontSize="9"
            fontWeight="500"
          >
            Complete previous stage first
          </text>
        </motion.g>
      )}
    </motion.g>
  );
}
