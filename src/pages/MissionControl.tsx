import { motion } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import StepperSidebar from '@/components/StepperSidebar';
import CampaignCommandRow from '@/components/CampaignCommandRow';
import IngestionRow from '@/components/IngestionRow';
import DecisionRow from '@/components/DecisionRow';
import ContentStudioRow from '@/components/ContentStudioRow';
import OutreachHubRow from '@/components/OutreachHubRow';
import MemoryPalaceRow from '@/components/MemoryPalaceRow';
import {
  campaign,
  connectors,
  researchRecords,
  analyticsEvents,
  outreachEvents,
  targets,
  investors,
  tacticScores,
  contentVariants,
  abTests,
  dlqEntries,
  executionReceipts,
  playbooks,
  consolidationEvents,
  knowledgeNodes,
  knowledgeEdges,
} from '@/data/mockData';

export default function MissionControl() {
  const { state, dispatch } = useApp();

  const handleStageSelect = (stageId: number) => {
    const stage = state.stages.find(s => s.id === stageId);
    if (stage && stage.status !== 'locked') {
      dispatch({ type: 'EXPAND_STAGE', stageId });
    }
  };

  return (
    <div className="flex" style={{ height: 'calc(100dvh - 3.5rem)' }}>
      <StepperSidebar
        stages={state.stages}
        activeStage={state.activeStage}
        onSelect={handleStageSelect}
      />

      <motion.div
        className="flex-1 overflow-y-auto p-4 space-y-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.0, duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        >
          <CampaignCommandRow campaign={state.campaign} expanded={state.activeStage === 0} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        >
          <IngestionRow
            connectors={state.connectors}
            researchRecords={state.researchRecords}
            analyticsEvents={state.analyticsEvents}
            outreachEvents={state.outreachEvents}
            expanded={state.activeStage === 1}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        >
          <DecisionRow
            targets={state.targets}
            investors={state.investors}
            tacticScores={tacticScores}
            expanded={state.activeStage === 2}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        >
          <ContentStudioRow
            contentVariants={state.contentVariants}
            abTests={state.abTests}
            expanded={state.activeStage === 3}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        >
          <OutreachHubRow
            outreachEvents={state.outreachEvents}
            dlqEntries={state.dlqEntries}
            executionReceipts={state.executionReceipts}
            dryRunMode={state.dryRunMode}
            expanded={state.activeStage === 4}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        >
          <MemoryPalaceRow
            playbooks={state.playbooks}
            consolidationEvents={consolidationEvents}
            knowledgeNodes={knowledgeNodes}
            knowledgeEdges={knowledgeEdges}
            expanded={state.activeStage === 5}
          />
        </motion.div>
      </motion.div>
    </div>
  );
}
