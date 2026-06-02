import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import CenterNeuron from '@/components/neural/CenterNeuron';
import StageNeuron from '@/components/neural/StageNeuron';
import SynapseLine from '@/components/neural/SynapseLine';
import DataPulse from '@/components/neural/DataPulse';
import DetailPanel from '@/components/neural/DetailPanel';

/* ─── STAGE CONFIGURATION ─── */
interface StageConfig {
  id: number;
  name: string;
  angle: number;
  accent: string;
  description: string;
  ring: number;
}

const STAGE_NEURONS: StageConfig[] = [
  { id: 1, name: 'INGEST', angle: 210, accent: '#06b6d4', description: 'Data ingestion from external sources and connectors', ring: 1 },
  { id: 2, name: 'DECIDE', angle: 180, accent: '#f59e0b', description: 'Decision engine for targeting and scoring', ring: 2 },
  { id: 3, name: 'CREATE', angle: 150, accent: '#f43f5e', description: 'Content creation studio with locale variants', ring: 3 },
  { id: 4, name: 'SEND', angle: 30, accent: '#10b981', description: 'Outreach execution hub with safety controls', ring: 4 },
  { id: 5, name: 'LEARN', angle: 0, accent: '#8b5cf6', description: 'Learning engine with knowledge graph', ring: 5 },
  { id: 6, name: 'MEMORY', angle: 330, accent: '#d946ef', description: 'Memory consolidation and feedback loops', ring: 6 },
];

/* ─── SVG CONFIGURATION ─── */
const SVG_WIDTH = 1200;
const SVG_HEIGHT = 800;
const CENTER_X = SVG_WIDTH / 2;
const CENTER_Y = SVG_HEIGHT / 2;
const RADIUS = 250;

/* ─── HELPER: Polar to Cartesian ─── */
function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy - r * Math.sin(rad),
  };
}

/* ─── FEEDBACK CONNECTIONS ─── */
const FEEDBACK_CONNECTIONS = [
  { from: 'LEARN', to: 'DECIDE', label: 'Feedback: insights → decisions' },
  { from: 'MEMORY', to: 'CENTER', label: 'Feedback: learning → campaign' },
];

/* ─── MAIN PAGE COMPONENT ─── */
export default function NeuralNet() {
  const { state } = useApp();

  const [selectedNode, setSelectedNode] = useState<'center' | string | null>(null);
  const [activeSynapseIndex, setActiveSynapseIndex] = useState<number>(-1);
  const [runSequenceStep, setRunSequenceStep] = useState<number>(-1);

  // Determine which stages are unlocked based on gating logic
  const getStageStatus = useCallback(
    (stageId: number): import('@/types').StageStatus => {
      // Check if there's a matching stage in state
      const match = state.stages.find((s) => s.id === stageId);
      if (match) return match.status;

      // MEMORY (id: 6) is a virtual stage - appears when all other stages are ready/active
      if (stageId === 6) {
        const allReady = state.stages.slice(1).every((s) => s.status !== 'locked');
        return allReady ? 'ready' : 'locked';
      }

      return 'locked';
    },
    [state.stages]
  );

  // Check if a stage should be visible (unlocked)
  const isStageVisible = useCallback(
    (ring: number) => {
      // Ring 1 always appears once Setup is ready (campaign configured)
      if (ring === 1) {
        const setupReady =
          state.campaign.name.trim().length > 0 &&
          state.campaign.objective.trim().length > 0 &&
          state.campaign.locales.length > 0;
        return setupReady;
      }
      // Higher rings: previous ring must not be locked
      const prevStage = STAGE_NEURONS.find((s) => s.ring === ring - 1);
      if (!prevStage) return false;
      const prevStatus = getStageStatus(prevStage.id);
      return prevStatus !== 'locked' && isStageVisible(ring - 1);
    },
    [getStageStatus, state.campaign]
  );

  // Handle "Run Brain" animation sequence
  useEffect(() => {
    if (state.isRunningBrain) {
      setRunSequenceStep(0);

      const timeouts: ReturnType<typeof setTimeout>[] = [];

      // Step 0: Center pulse (already handled by isRunningBrain prop)
      // Steps 1-6: Sequential synapse lighting
      for (let i = 1; i <= 6; i++) {
        timeouts.push(
          setTimeout(() => {
            setRunSequenceStep(i);
            setActiveSynapseIndex(i - 1);
          }, i * 500)
        );
      }

      // Step 7: Feedback loops
      timeouts.push(
        setTimeout(() => {
          setRunSequenceStep(7);
          setActiveSynapseIndex(-2); // Special: feedback active
        }, 4000)
      );

      // Reset
      timeouts.push(
        setTimeout(() => {
          setRunSequenceStep(-1);
          setActiveSynapseIndex(-1);
        }, 5000)
      );

      return () => timeouts.forEach(clearTimeout);
    }
  }, [state.isRunningBrain]);

  // Calculate stage positions
  const stagePositions = useMemo(() => {
    return STAGE_NEURONS.map((stage) => ({
      ...stage,
      ...polarToCartesian(CENTER_X, CENTER_Y, RADIUS, stage.angle),
    }));
  }, []);

  // Determine if a node is dimmed (when another node is selected)
  const isNodeDimmed = useCallback(
    (nodeName: string) => {
      if (selectedNode === null) return false;
      if (selectedNode === 'center') return nodeName !== 'CENTER';
      return nodeName !== selectedNode;
    },
    [selectedNode]
  );

  // Handle neuron clicks
  const handleStageClick = useCallback(
    (stageName: string, status: import('@/types').StageStatus) => {
      if (status === 'locked') {
        // Shake animation is handled in StageNeuron
        return;
      }
      setSelectedNode((prev) => (prev === stageName ? null : stageName));
    },
    []
  );

  const handleCenterClick = useCallback(() => {
    setSelectedNode((prev) => (prev === 'center' ? null : 'center'));
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Get selected stage info for detail panel
  const selectedStageInfo = useMemo(() => {
    if (selectedNode === 'center') {
      return {
        name: 'CENTER',
        description: 'Campaign settings and configuration',
        accent: '#6366f1',
        status: 'active' as import('@/types').StageStatus,
      };
    }
    if (selectedNode) {
      const stage = STAGE_NEURONS.find((s) => s.name === selectedNode);
      if (stage) {
        return {
          name: stage.name,
          description: stage.description,
          accent: stage.accent,
          status: getStageStatus(stage.id),
        };
      }
    }
    return {
      name: '',
      description: '',
      accent: '#6366f1',
      status: 'locked' as import('@/types').StageStatus,
    };
  }, [selectedNode, getStageStatus]);

  // Check if feedback synapses should be visible
  const showFeedback = useMemo(() => {
    return state.stages.slice(1).every((s) => s.status !== 'locked');
  }, [state.stages]);

  return (
    <div className="relative flex-1 overflow-hidden" style={{ backgroundColor: '#020617' }}>
      {/* Background radial gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 50% 50%, #0a1628 0%, #020617 70%)',
        }}
      />

      {/* Dot grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'radial-gradient(circle, #ffffff 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Run Brain: expanding ring wave */}
      <AnimatePresence>
        {state.isRunningBrain && (
          <motion.div
            initial={{ width: 0, height: 0, opacity: 0.6 }}
            animate={{ width: 600, height: 600, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, ease: 'easeOut' }}
            className="absolute top-1/2 left-1/2 rounded-full border-2 border-[#6366f1] pointer-events-none"
            style={{
              transform: 'translate(-50%, -50%)',
              boxShadow: '0 0 60px rgba(99,102,241,0.3)',
            }}
          />
        )}
      </AnimatePresence>

      {/* SVG Canvas */}
      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className="absolute inset-0 w-full h-full"
        style={{ zIndex: 10 }}
      >
        <defs>
          {/* Glow filters */}
          {STAGE_NEURONS.map((stage) => (
            <filter key={`glow-${stage.name}`} id={`glow-filter-${stage.name}`}>
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          ))}
          <filter id="glow-filter-CENTER">
            <feGaussianBlur stdDeviation="6" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ─── SYNAPSE LINES ─── */}
        {/* Center to each stage */}
        {stagePositions.map((stage, index) => {
          const status = getStageStatus(stage.id);
          const isVisible = isStageVisible(stage.ring);
          if (!isVisible) return null;

          const isActive = activeSynapseIndex === index || runSequenceStep === index + 1;
          const lineColor1 = '#6366f1';
          const lineColor2 = stage.accent;

          return (
            <g key={`synapse-${stage.name}`}>
              <SynapseLine
                x1={CENTER_X}
                y1={CENTER_Y}
                x2={stage.x}
                y2={stage.y}
                color1={lineColor1}
                color2={lineColor2}
                active={status !== 'locked'}
                isRunningSequence={isActive}
                animationDelay={0.5 + index * 0.1}
                label={`${status !== 'locked' ? Math.floor(Math.random() * 200 + 50) : 0} events/min · ${Math.floor(Math.random() * 20 + 5)}ms`}
              />
              {/* Data pulse on active synapses */}
              {status !== 'locked' && (
                <DataPulse
                  x1={CENTER_X}
                  y1={CENTER_Y}
                  x2={stage.x}
                  y2={stage.y}
                  color={isActive ? stage.accent : lineColor1}
                  duration={2}
                  delay={index * 0.8}
                  repeatDelay={3 + index * 0.5}
                  isActive={true}
                />
              )}
            </g>
          );
        })}

        {/* Adjacent stage connections (light gray, thin) */}
        {stagePositions.map((stage, i) => {
          const nextStage = stagePositions[(i + 1) % stagePositions.length];
          const status1 = getStageStatus(stage.id);
          const status2 = getStageStatus(nextStage.id);
          const isVisible1 = isStageVisible(stage.ring);
          const isVisible2 = isStageVisible(nextStage.ring);

          if (!isVisible1 || !isVisible2) return null;

          return (
            <line
              key={`adj-${stage.name}-${nextStage.name}`}
              x1={stage.x}
              y1={stage.y}
              x2={nextStage.x}
              y2={nextStage.y}
              stroke="#1e293b"
              strokeWidth="0.5"
              strokeDasharray="4 4"
              opacity="0.4"
            />
          );
        })}

        {/* Feedback synapses */}
        {showFeedback &&
          FEEDBACK_CONNECTIONS.map((conn, i) => {
            const fromStage = stagePositions.find((s) => s.name === conn.from);
            const toStage =
              conn.to === 'CENTER'
                ? { x: CENTER_X, y: CENTER_Y }
                : stagePositions.find((s) => s.name === conn.to);

            if (!fromStage || !toStage) return null;

            const isActive = runSequenceStep === 7;

            return (
              <g key={`feedback-${i}`}>
                <SynapseLine
                  x1={fromStage.x}
                  y1={fromStage.y}
                  x2={toStage.x}
                  y2={toStage.y}
                  color1={fromStage.accent}
                  color2={conn.to === 'CENTER' ? '#6366f1' : toStage.accent}
                  active={true}
                  isFeedback={true}
                  isRunningSequence={isActive}
                  animationDelay={0.8}
                  label={conn.label}
                />
                {isActive && (
                  <DataPulse
                    x1={fromStage.x}
                    y1={fromStage.y}
                    x2={toStage.x}
                    y2={toStage.y}
                    color={fromStage.accent}
                    duration={3}
                    delay={i * 0.5}
                    repeatDelay={5}
                    isActive={true}
                  />
                )}
              </g>
            );
          })}

        {/* ─── STAGE NEURONS ─── */}
        {stagePositions.map((stage, index) => {
          const status = getStageStatus(stage.id);
          const isVisible = isStageVisible(stage.ring);

          if (!isVisible) return null;

          return (
            <StageNeuron
              key={stage.name}
              cx={stage.x}
              cy={stage.y}
              name={stage.name}
              description={stage.description}
              accent={stage.accent}
              status={status}
              onClick={() => handleStageClick(stage.name, status)}
              animationDelay={0.5 + index * 0.1}
              isDimmed={isNodeDimmed(stage.name)}
            />
          );
        })}

        {/* ─── CENTER NEURON ─── */}
        <CenterNeuron
          cx={CENTER_X}
          cy={CENTER_Y}
          campaignName={state.campaign.name}
          status="active"
          onClick={handleCenterClick}
          isRunningBrain={state.isRunningBrain}
          isDimmed={isNodeDimmed('CENTER')}
          animationDelay={0}
        />
      </svg>

      {/* ─── DETAIL PANEL ─── */}
      <DetailPanel
        selectedNode={selectedNode}
        stageName={selectedStageInfo.name}
        stageDescription={selectedStageInfo.description}
        accent={selectedStageInfo.accent}
        status={selectedStageInfo.status}
        onClose={handleClosePanel}
      />
    </div>
  );
}
