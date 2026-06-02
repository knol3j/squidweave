import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, BookOpen, Search, GitBranch, Clock, Layers } from 'lucide-react';
import type { Playbook, ConsolidationEvent, KnowledgeNode, KnowledgeEdge } from '@/types';
import { useApp } from '@/context/AppContext';
import { cn } from '@/lib/utils';

interface Props {
  playbooks: Playbook[];
  consolidationEvents: ConsolidationEvent[];
  knowledgeNodes: KnowledgeNode[];
  knowledgeEdges: KnowledgeEdge[];
  expanded: boolean;
}

const nodeTypeColors: Record<string, string> = {
  core: '#6366f1',
  playbook: '#10b981',
  target: '#06b6d4',
  observation: '#f59e0b',
  content: '#f43f5e',
  decision: '#8b5cf6',
};

export default function MemoryPalaceRow({ playbooks, consolidationEvents, knowledgeNodes, knowledgeEdges, expanded }: Props) {
  const { dispatch } = useApp();
  const [activeTab, setActiveTab] = useState<'graph' | 'playbooks' | 'memory'>('graph');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const scoreColor = (v: number) => v >= 80 ? '#10b981' : v >= 60 ? '#f59e0b' : '#f43f5e';

  const connectedEdges = selectedNode
    ? knowledgeEdges.filter(e => e.from === selectedNode || e.to === selectedNode)
    : [];

  return (
    <div className="relative">
      <div
        className={cn(
          'flex items-center justify-between p-4 rounded-2xl border border-[rgba(255,255,255,0.08)] transition-all duration-300 cursor-pointer hover:translate-y-[-2px] hover:border-[rgba(255,255,255,0.12)]',
          expanded && 'rounded-b-none border-b-0'
        )}
        style={{ backgroundColor: '#0f172a', borderLeftWidth: '4px', borderLeftColor: '#8b5cf6' }}
        onClick={() => !expanded && dispatch({ type: 'EXPAND_STAGE', stageId: 5 })}
      >
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(139,92,246,0.15)' }}>
            <BookOpen className="w-4 h-4 text-[#8b5cf6]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#e2e8f0]">MEMORY PALACE</h3>
            <p className="text-xs text-[#64748b]">{playbooks.length} playbooks · {consolidationEvents.length} consolidations</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            {playbooks.slice(0, 3).map(p => (
              <span key={p.id} className="px-2 py-0.5 rounded-full text-[0.6rem] font-medium bg-[rgba(139,92,246,0.15)] text-[#a78bfa]">{p.segment}</span>
            ))}
          </div>
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-4 h-4 text-[#64748b]" />
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="overflow-hidden"
          >
            <div className="p-5 rounded-b-2xl border border-t-0 border-[rgba(255,255,255,0.08)] space-y-4" style={{ backgroundColor: '#0f172a', borderLeftWidth: '4px', borderLeftColor: '#8b5cf6' }}>
              {/* Tabs */}
              <div className="flex items-center gap-1">
                {([['graph', 'Knowledge Graph'], ['playbooks', 'Playbooks'], ['memory', 'Memory']] as const).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                      activeTab === key ? 'bg-[rgba(139,92,246,0.15)] text-[#a78bfa]' : 'text-[#64748b] hover:text-[#94a3b8]'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {activeTab === 'graph' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                  <svg viewBox="0 0 400 300" className="w-full h-64 rounded-xl border border-[rgba(255,255,255,0.06)]" style={{ backgroundColor: '#111c2b' }}>
                    {/* Edges */}
                    {knowledgeEdges.map((edge, i) => {
                      const from = knowledgeNodes.find(n => n.id === edge.from);
                      const to = knowledgeNodes.find(n => n.id === edge.to);
                      if (!from || !to) return null;
                      const isHighlighted = selectedNode && (edge.from === selectedNode || edge.to === selectedNode);
                      return (
                        <line
                          key={i}
                          x1={from.x}
                          y1={from.y}
                          x2={to.x}
                          y2={to.y}
                          stroke={isHighlighted ? '#a78bfa' : '#1e293b'}
                          strokeWidth={isHighlighted ? 2 : 1}
                          opacity={selectedNode && !isHighlighted ? 0.2 : 1}
                        />
                      );
                    })}
                    {/* Nodes */}
                    {knowledgeNodes.map(node => {
                      const color = nodeTypeColors[node.type] || '#64748b';
                      const isSelected = selectedNode === node.id;
                      const isConnected = connectedEdges.some(e => e.from === node.id || e.to === node.id);
                      return (
                        <g
                          key={node.id}
                          onClick={() => setSelectedNode(isSelected ? null : node.id)}
                          className="cursor-pointer"
                        >
                          <circle
                            cx={node.x}
                            cy={node.y}
                            r={isSelected ? 22 : 18}
                            fill={`${color}20`}
                            stroke={color}
                            strokeWidth={isSelected ? 2.5 : 1.5}
                            opacity={selectedNode && !isSelected && !isConnected ? 0.3 : 1}
                          >
                            {node.type === 'core' && <animate attributeName="r" values="18;20;18" dur="3s" repeatCount="indefinite" />}
                          </circle>
                          <text
                            x={node.x}
                            y={node.y + 4}
                            textAnchor="middle"
                            fill={color}
                            fontSize="10"
                            fontWeight={600}
                            opacity={selectedNode && !isSelected && !isConnected ? 0.3 : 1}
                          >
                            {node.label.slice(0, 8)}
                          </text>
                          {node.type === 'core' && (
                            <circle cx={node.x} cy={node.y} r={6} fill={color} opacity={0.5}>
                              <animate attributeName="r" values="6;14;6" dur="2s" repeatCount="indefinite" />
                              <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite" />
                            </circle>
                          )}
                        </g>
                      );
                    })}
                    {/* Legend */}
                    <g transform="translate(10, 270)">
                      {Object.entries(nodeTypeColors).map(([type, color], i) => (
                        <g key={type} transform={`translate(${i * 65}, 0)`}>
                          <circle cx="0" cy="0" r="5" fill={`${color}30`} stroke={color} strokeWidth="1" />
                          <text x="10" y="3" fill="#64748b" fontSize="8" textAnchor="start">{type}</text>
                        </g>
                      ))}
                    </g>
                  </svg>
                </motion.div>
              )}

              {activeTab === 'playbooks' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-2 gap-3">
                  {playbooks.map(pb => (
                    <div key={pb.id} className="p-4 rounded-xl border border-[rgba(255,255,255,0.06)] space-y-3" style={{ backgroundColor: '#111c2b' }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="text-xs font-semibold text-[#e2e8f0]">{pb.segment}</h5>
                          <p className="text-[0.65rem] text-[#64748b]">{pb.region} · {pb.channel}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[0.6rem] font-medium" style={{ backgroundColor: `${scoreColor(pb.confidence)}20`, color: scoreColor(pb.confidence) }}>
                          {pb.confidence}%
                        </span>
                      </div>
                      <p className="text-[0.7rem] text-[#94a3b8] leading-relaxed line-clamp-2">{pb.rationale}</p>
                      <div className="flex items-center gap-3 pt-1">
                        <div className="flex items-center gap-1">
                          <GitBranch className="w-3 h-3 text-[#10b981]" />
                          <span className="text-[0.65rem] text-[#94a3b8]">{pb.winRate}% win</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <AlertMini className="w-3 h-3 text-[#f59e0b]" />
                          <span className="text-[0.65rem] text-[#94a3b8]">{pb.riskRate}% risk</span>
                        </div>
                        <span className="text-[0.6rem] text-[#475569]">{pb.cadence}</span>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}

              {activeTab === 'memory' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-2 w-4 h-4 text-[#64748b]" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search memory..."
                      className="w-full h-8 pl-9 pr-3 rounded-lg text-xs bg-[#111c2b] border border-[rgba(255,255,255,0.06)] text-[#e2e8f0] focus:outline-none focus:border-[#8b5cf6]"
                    />
                  </div>

                  {/* Consolidation Timeline */}
                  <div className="space-y-2">
                    <h5 className="text-xs font-semibold text-[#94a3b8] flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Consolidation Timeline</h5>
                    <div className="relative pl-4 space-y-2">
                      <div className="absolute left-[7px] top-0 bottom-0 w-px bg-[#1e293b]" />
                      {consolidationEvents.map(ce => (
                        <div key={ce.id} className="relative flex items-start gap-2">
                          <div className="absolute left-[-11px] w-2 h-2 rounded-full mt-1" style={{ backgroundColor: ce.type === 'reflection' ? '#8b5cf6' : ce.type === 'observation' ? '#f59e0b' : '#10b981' }} />
                          <div className="flex-1 p-2 rounded-lg border border-[rgba(255,255,255,0.04)]" style={{ backgroundColor: '#111c2b' }}>
                            <p className="text-xs text-[#e2e8f0]">{ce.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="px-1.5 py-0.5 rounded text-[0.55rem]" style={{ backgroundColor: `${ce.type === 'reflection' ? '#8b5cf6' : ce.type === 'observation' ? '#f59e0b' : '#10b981'}15`, color: ce.type === 'reflection' ? '#a78bfa' : ce.type === 'observation' ? '#fbbf24' : '#34d399' }}>{ce.type}</span>
                              <span className="text-[0.6rem] text-[#475569]">{new Date(ce.timestamp).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Playbook recall */}
                  <div className="space-y-2 pt-2 border-t border-[rgba(255,255,255,0.04)]">
                    <h5 className="text-xs font-semibold text-[#94a3b8] flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" /> Playbook Recall</h5>
                    <div className="grid grid-cols-2 gap-2">
                      {playbooks.filter(pb => pb.segment.toLowerCase().includes(searchQuery.toLowerCase()) || searchQuery === '').map(pb => (
                        <div key={pb.id} className="p-2 rounded-lg border border-[rgba(255,255,255,0.04)]" style={{ backgroundColor: '#111c2b' }}>
                          <span className="text-xs text-[#e2e8f0]">{pb.segment}</span>
                          <span className="text-[0.6rem] text-[#64748b] ml-2">{pb.channel}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AlertMini({ className }: { className?: string }) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}
