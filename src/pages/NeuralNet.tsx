import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BrainCircuit,
  Network,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Info,
  Search,
  X,
  ChevronRight,
  Zap,
  GitBranch,
  Target,
  Cpu,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
interface NetworkNode {
  id: string;
  label: string;
  type: "input" | "hidden" | "output";
  x: number;
  y: number;
  layer: number;
  bias: number;
  activation: number;
  description: string;
}

interface NetworkEdge {
  source: string;
  target: string;
  weight: number;
  active: boolean;
}

interface NetworkData {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  layers: number[];
}

/* ------------------------------------------------------------------ */
/*  Demo Data — empty arrays, no fake data.                             */
/*  In production, this would be populated from real API responses.     */
/* ------------------------------------------------------------------ */
function getEmptyNetwork(): NetworkData {
  return { nodes: [], edges: [], layers: [] };
}

/* ------------------------------------------------------------------ */
/*  Helper Functions                                                    */
/* ------------------------------------------------------------------ */
function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function formatWeight(w: number): string {
  return w >= 0 ? `+${w.toFixed(3)}` : w.toFixed(3);
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                      */
/* ------------------------------------------------------------------ */
export default function NeuralNet() {
  const [network] = useState<NetworkData>(getEmptyNetwork);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [activePath, setActivePath] = useState<string[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredNodes = useMemo(() => {
    if (!searchQuery) return network.nodes;
    const q = searchQuery.toLowerCase();
    return network.nodes.filter((n) =>
      n.label.toLowerCase().includes(q) ||
      n.description.toLowerCase().includes(q)
    );
  }, [network.nodes, searchQuery]);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === svgRef.current || (e.target as HTMLElement).tagName === "svg") {
        setIsDragging(true);
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      }
    },
    [pan]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) {
        setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
      }
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((prev) => Math.max(0.3, Math.min(3, prev + delta)));
  }, []);

  const simulateForwardPass = useCallback(() => {
    if (network.nodes.length === 0) return;
    setAnimating(true);
    const inputNodes = network.nodes.filter((n) => n.type === "input");
    const activationOrder: string[] = [];

    // BFS from input nodes
    const queue = [...inputNodes.map((n) => n.id)];
    const visited = new Set<string>();
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);
      activationOrder.push(nodeId);
      const outgoing = network.edges.filter((e) => e.source === nodeId);
      for (const edge of outgoing) {
        if (!visited.has(edge.target)) {
          queue.push(edge.target);
        }
      }
    }

    // Animate activation
    let i = 0;
    const interval = setInterval(() => {
      if (i >= activationOrder.length) {
        clearInterval(interval);
        setAnimating(false);
        setActivePath([]);
        return;
      }
      setActivePath((prev) => [...prev, activationOrder[i]]);
      i++;
    }, 200);
  }, [network]);

  const inputNodes = useMemo(
    () => network.nodes.filter((n) => n.type === "input"),
    [network.nodes]
  );
  const hiddenNodes = useMemo(
    () => network.nodes.filter((n) => n.type === "hidden"),
    [network.nodes]
  );
  const outputNodes = useMemo(
    () => network.nodes.filter((n) => n.type === "output"),
    [network.nodes]
  );

  return (
    <div className="h-screen flex flex-col bg-[#050a14]" ref={containerRef}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#050a14]/90 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <BrainCircuit className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-100">Neural Network Visualizer</h1>
            <p className="text-[10px] text-slate-500">
              {network.nodes.length === 0
                ? "No network data loaded"
                : `${network.nodes.length} nodes &middot; ${network.edges.length} edges &middot; ${network.layers.length} layers`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-3 h-3 text-slate-500 absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search nodes..."
              className="text-[11px] pl-6 pr-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-slate-200 placeholder:text-slate-600 outline-none focus:border-violet-500/30 w-40"
            />
          </div>

          {/* Simulate */}
          <button
            onClick={simulateForwardPass}
            disabled={animating || network.nodes.length === 0}
            className="flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-lg bg-violet-500 text-white font-medium hover:bg-violet-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Zap className="w-3 h-3" />
            {animating ? "Running..." : "Simulate"}
          </button>

          {/* Zoom controls */}
          <div className="flex items-center gap-0.5 bg-white/[0.03] rounded-lg border border-white/[0.06] p-0.5">
            <button
              onClick={() => setZoom((p) => Math.max(0.3, p - 0.1))}
              className="p-1.5 rounded hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] text-slate-500 w-10 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((p) => Math.min(3, p + 0.1))}
              className="p-1.5 rounded hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={resetView}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 transition-colors"
            title="Reset view"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowHelp(true)}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 transition-colors"
            title="Help"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Empty State */}
      {network.nodes.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
              <Network className="w-8 h-8 text-violet-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-100 mb-2">
              Neural Network Visualizer
            </h2>
            <p className="text-sm text-slate-400 mb-4">
              Upload a trained model configuration or connect to your ML pipeline
              to visualize network architecture, weights, and activations.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {["PyTorch", "TensorFlow", "ONNX", "HuggingFace"].map((name) => (
                <span
                  key={name}
                  className="text-[10px] px-2 py-1 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Network Canvas */}
      {network.nodes.length > 0 && (
        <div
          className="flex-1 overflow-hidden relative cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          <svg
            ref={svgRef}
            className="w-full h-full"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "center center",
            }}
          >
            {/* Edges */}
            {network.edges.map((edge, i) => {
              const source = network.nodes.find((n) => n.id === edge.source);
              const target = network.nodes.find((n) => n.id === edge.target);
              if (!source || !target) return null;
              const isActive = activePath.includes(edge.source) && activePath.includes(edge.target);
              return (
                <line
                  key={i}
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={isActive ? "#8b5cf6" : "rgba(255,255,255,0.06)"}
                  strokeWidth={isActive ? 2 : Math.abs(edge.weight) * 2}
                  strokeOpacity={isActive ? 1 : 0.3}
                />
              );
            })}

            {/* Nodes */}
            {filteredNodes.map((node) => {
              const isSelected = selectedNode?.id === node.id;
              const isActive = activePath.includes(node.id);
              const r = node.type === "input" ? 20 : node.type === "output" ? 24 : 18;
              const fill =
                node.type === "input"
                  ? "#6366f1"
                  : node.type === "output"
                  ? "#10b981"
                  : "#f59e0b";

              return (
                <g
                  key={node.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNode(isSelected ? null : node);
                  }}
                  className="cursor-pointer"
                >
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={r}
                    fill={fill}
                    fillOpacity={isActive ? 1 : isSelected ? 0.3 : 0.15}
                    stroke={isSelected ? "#fff" : isActive ? fill : `${fill}40`}
                    strokeWidth={isSelected ? 2 : 1}
                  />
                  <text
                    x={node.x}
                    y={node.y - r - 8}
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="10"
                    fontFamily="sans-serif"
                  >
                    {node.label}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Legend */}
          <div className="absolute bottom-4 left-4 p-3 rounded-xl border border-white/[0.06] bg-[#050a14]/90 backdrop-blur-sm">
            <div className="text-[10px] font-semibold text-slate-400 mb-2">Layer Types</div>
            <div className="space-y-1.5">
              {[
                { label: "Input", color: "#6366f1", count: inputNodes.length },
                { label: "Hidden", color: "#f59e0b", count: hiddenNodes.length },
                { label: "Output", color: "#10b981", count: outputNodes.length },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: item.color }}
                  />
                  <span className="text-[10px] text-slate-400">
                    {item.label} ({item.count})
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Node Detail Panel */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed right-0 top-[49px] bottom-0 w-80 bg-[#0a1220] border-l border-white/[0.08] shadow-2xl z-20 overflow-y-auto"
          >
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      background:
                        selectedNode.type === "input"
                          ? "#6366f1"
                          : selectedNode.type === "output"
                          ? "#10b981"
                          : "#f59e0b",
                    }}
                  />
                  <span className="text-xs font-semibold text-slate-100">
                    {selectedNode.label}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="p-1 rounded hover:bg-white/[0.06] text-slate-400 hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="text-[11px] text-slate-400 leading-relaxed">
                {selectedNode.description}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                  <div className="text-[10px] text-slate-500 mb-0.5">Activation</div>
                  <div className="text-xs font-semibold text-slate-200">
                    {selectedNode.activation.toFixed(4)}
                  </div>
                </div>
                <div className="p-2 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                  <div className="text-[10px] text-slate-500 mb-0.5">Bias</div>
                  <div className="text-xs font-semibold text-slate-200">
                    {selectedNode.bias.toFixed(4)}
                  </div>
                </div>
                <div className="p-2 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                  <div className="text-[10px] text-slate-500 mb-0.5">Layer</div>
                  <div className="text-xs font-semibold text-slate-200">
                    {selectedNode.layer}
                  </div>
                </div>
                <div className="p-2 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                  <div className="text-[10px] text-slate-500 mb-0.5">Type</div>
                  <div className="text-xs font-semibold text-slate-200 capitalize">
                    {selectedNode.type}
                  </div>
                </div>
              </div>

              {/* Connected edges */}
              <div>
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Connections
                </div>
                <div className="space-y-1">
                  {network.edges
                    .filter(
                      (e) =>
                        e.source === selectedNode.id ||
                        e.target === selectedNode.id
                    )
                    .map((edge, i) => {
                      const isOutgoing = edge.source === selectedNode.id;
                      const otherId = isOutgoing ? edge.target : edge.source;
                      const other = network.nodes.find((n) => n.id === otherId);
                      if (!other) return null;
                      return (
                        <div
                          key={i}
                          className="flex items-center justify-between p-2 rounded-lg border border-white/[0.04] bg-white/[0.02]"
                        >
                          <div className="flex items-center gap-1.5">
                            <ChevronRight
                              className={`w-3 h-3 ${
                                isOutgoing
                                  ? "text-emerald-400"
                                  : "text-sky-400 rotate-180"
                              }`}
                            />
                            <span className="text-[10px] text-slate-300">
                              {other.label}
                            </span>
                          </div>
                          <span
                            className={`text-[10px] font-medium ${
                              edge.weight >= 0
                                ? "text-emerald-400"
                                : "text-rose-400"
                            }`}
                          >
                            {formatWeight(edge.weight)}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Help Modal */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
            onClick={() => setShowHelp(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0a1220] border border-white/[0.08] rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-violet-400" />
                  <h3 className="text-sm font-semibold text-slate-100">
                    How to Use
                  </h3>
                </div>
                <button
                  onClick={() => setShowHelp(false)}
                  className="p-1 rounded hover:bg-white/[0.06] text-slate-400 hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3 text-[11px] text-slate-400">
                <div className="flex items-start gap-2">
                  <Search className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                  <span>
                    Use the search bar to find specific nodes by name or
                    description.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Zap className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                  <span>
                    Click "Simulate" to run a forward pass and see activation
                    flow through the network.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Target className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                  <span>
                    Click on any node to view its properties, bias, activation,
                    and connections.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Maximize2 className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                  <span>
                    Drag to pan, scroll to zoom. Click the reset button to
                    restore the default view.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <GitBranch className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                  <span>
                    Import a model from PyTorch, TensorFlow, or ONNX to
                    visualize your own network architecture.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Cpu className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                  <span>
                    Connect to your ML pipeline API to load real-time model
                    configurations.
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
