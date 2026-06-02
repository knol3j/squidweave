import { useState } from 'react';
import { motion } from 'framer-motion';

interface SynapseLineProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color1: string;
  color2: string;
  active: boolean;
  isFeedback?: boolean;
  isRunningSequence?: boolean;
  animationDelay?: number;
  label?: string;
}

export default function SynapseLine({
  x1,
  y1,
  x2,
  y2,
  color1,
  color2,
  active,
  isFeedback = false,
  isRunningSequence = false,
  animationDelay = 0,
  label,
}: SynapseLineProps) {
  const [isHovered, setIsHovered] = useState(false);

  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  const gradientId = `synapse-${x1}-${y1}-${x2}-${y2}`.replace(/\./g, '');

  const strokeColor = active || isRunningSequence
    ? `url(#${gradientId})`
    : isFeedback
      ? '#475569'
      : '#334155';

  const strokeWidth = isHovered ? 2.5 : active || isRunningSequence ? 2 : 1;
  const strokeDasharray = isFeedback && !active && !isRunningSequence ? '6 4' : 'none';
  const opacity = isHovered ? 1 : active || isRunningSequence ? 0.9 : 0.5;

  return (
    <motion.g
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity }}
      transition={{
        pathLength: { duration: 0.3, delay: animationDelay },
        opacity: { duration: 0.3, delay: animationDelay },
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ cursor: 'default' }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={color1} stopOpacity="0.8" />
          <stop offset="100%" stopColor={color2} stopOpacity="0.8" />
        </linearGradient>
      </defs>

      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray}
        strokeLinecap="round"
        style={{
          transition: 'stroke-width 0.2s ease',
          filter: active || isRunningSequence
            ? `drop-shadow(0 0 4px ${color1}60)`
            : 'none',
        }}
      />

      {/* Hover tooltip at midpoint */}
      {isHovered && label && (
        <motion.g
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.15 }}
        >
          <rect
            x={midX - 60}
            y={midY - 22}
            width="120"
            height="22"
            rx="6"
            fill="#0f172a"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="1"
            opacity="0.95"
          />
          <text
            x={midX}
            y={midY - 7}
            textAnchor="middle"
            fill="#94a3b8"
            fontSize="8"
            fontWeight="500"
          >
            {label}
          </text>
        </motion.g>
      )}
    </motion.g>
  );
}
