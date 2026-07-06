import { useApp } from "@/context/AppContext";
import { StepperSidebar } from "@/components/StepperSidebar";
import { StageRow } from "@/components/stage/StageRow";
import { CampaignRow } from "@/components/stage/CampaignRow";
import { ResearchRow } from "@/components/stage/ResearchRow";
import { DecisionRow } from "@/components/stage/DecisionRow";
import { ContentRow } from "@/components/stage/ContentRow";
import { OutreachRow } from "@/components/stage/OutreachRow";
import { MemoryRow } from "@/components/stage/MemoryRow";

export default function MissionControl() {
  const { stages, isLoading } = useApp();

  return (
    <div className="max-w-[1440px] mx-auto px-4 py-6">
      <div className="flex gap-6">
        <StepperSidebar />

        <div className="flex-1 min-w-0 space-y-4">
          {/* Campaign Stage */}
          <StageRow stage={stages[0]}>
            <CampaignRow />
          </StageRow>

          {/* Research Stage */}
          <StageRow stage={stages[1]}>
            <ResearchRow />
          </StageRow>

          {/* Decision Stage */}
          <StageRow stage={stages[2]}>
            <DecisionRow />
          </StageRow>

          {/* Content Stage */}
          <StageRow stage={stages[3]}>
            <ContentRow />
          </StageRow>

          {/* Outreach Stage */}
          <StageRow stage={stages[4]}>
            <OutreachRow />
          </StageRow>

          {/* Memory Stage */}
          <StageRow stage={stages[5]}>
            <MemoryRow />
          </StageRow>
        </div>
      </div>
    </div>
  );
}
