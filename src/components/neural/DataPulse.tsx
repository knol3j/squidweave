import { motion } from 'framer-motion';

interface DataPulseProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  duration?: number;
  delay?: number;
  repeatDelay?: number;
  isActive?: boolean;
}

export default function DataPulse({
  x1,
  y1,
  x2,
  y2,
  color,
  duration = 2,
  delay = 0,
  repeatDelay = 4,
  isActive = true,
}: DataPulseProps) {
  if (!isActive) return null;

  return (
    <motion.circle
      r="5"
      fill={color}
      initial={{ cx: x1, cy: y1, opacity: 0, scale: 0.5 }}
      animate={{
        cx: [x1, x2],
        cy: [y1, y2],
        opacity: [0, 1, 1, 0],
        scale: [0.5, 1.2, 1, 0.8],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        repeatDelay,
        ease: 'easeInOut',
        times: [0, 0.15, 0.85, 1],
      }}
      style={{
        filter: `drop-shadow(0 0 6px ${color}) drop-shadow(0 0 12px ${color}80)`,
        pointerEvents: 'none',
      }}
    />
  );
}
