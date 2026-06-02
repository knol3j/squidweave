/**
 * KnowledgeGraph — the SVG node/edge visualization extracted from BrainDashboard.
 */
import React from 'react';
import { motion } from 'motion/react';

interface GraphNode {
  id: string;
  label: string;
  x: number;
  y: number;
  size: number;
  tone: string;
}

interface KnowledgeGraphProps {
  nodes: GraphNode[];
  edges: [string, string][];
}

export function KnowledgeGraph({ nodes, edges }: KnowledgeGraphProps) {
  return (
    <div className="relative h-full min-h-[430px] overflow-hidden rounded-[24px] bg-[#0b1526]">
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
        {edges.map(([from, to], index) => {
          const a = nodes.find(node => node.id === from);
          const b = nodes.find(node => node.id === to);
          if (!a || !b) return null;
          return <line key={`${from}-${to}-${index}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#6366f1" strokeWidth="0.35" />;
        })}
      </svg>
      {nodes.map(node => (
        <motion.div
          key={node.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${node.x}%`, top: `${node.y}%` }}
        >
          <div className={`rounded-full ${node.tone} shadow-[0_0_0_12px_rgba(167,139,250,0.06)]`} style={{ width: node.size * 2, height: node.size * 2 }} />
          <div className="mt-2 whitespace-nowrap text-center text-[11px] font-medium text-slate-300">{node.label}</div>
        </motion.div>
      ))}
    </div>
  );
}
