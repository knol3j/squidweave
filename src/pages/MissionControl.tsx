import { useRef, useEffect, memo } from "react";
import StepperSidebar from "@/components/StepperSidebar";
import StageRow from "@/components/stage/StageRow";
import CampaignRow from "@/components/stage/CampaignRow";
import ResearchRow from "@/components/stage/ResearchRow";
import DecisionRow from "@/components/stage/DecisionRow";
import ContentRow from "@/components/stage/ContentRow";
import OutreachRow from "@/components/stage/OutreachRow";
import MemoryRow from "@/components/stage/MemoryRow";

const SCROLL_KEY = "sw_mission_scroll";

function saveMainScroll(pos: number) {
  try { sessionStorage.setItem(SCROLL_KEY, String(pos)); } catch { /* silent */ }
}
function loadMainScroll(): number {
  try { const s = sessionStorage.getItem(SCROLL_KEY); return s ? parseInt(s, 10) : 0; } catch { return 0; }
}

const MissionControl = memo(function MissionControl() {
  const mainRef = useRef<HTMLElement>(null);

  // Restore scroll on mount
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const saved = loadMainScroll();
    if (saved > 0) {
      el.scrollTo({ top: saved, behavior: "auto" });
    }
  }, []);

  // Save scroll position on scroll
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const handler = () => saveMainScroll(el.scrollTop);
    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, []);

  return (
    <div className="flex flex-1 overflow-hidden">
      <StepperSidebar />
      <main
        ref={mainRef}
        className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 custom-scrollbar"
      >
        <StageRow stageId={0} title="Setup" summary={<>Business profile, campaign config, design system</>}>
          <CampaignRow />
        </StageRow>
        <StageRow stageId={1} title="Research" summary={<>Agent business research, data sources, connectors</>}>
          <ResearchRow />
        </StageRow>
        <StageRow stageId={2} title="Targets" summary={<>Target market discovery, ranked prospects, playbooks</>}>
          <DecisionRow />
        </StageRow>
        <StageRow stageId={3} title="Pitches" summary={<>Agent-generated pitch gallery, content approval</>}>
          <ContentRow />
        </StageRow>
        <StageRow stageId={4} title="Launch" summary={<>Execution timeline, DLQ, safety gates, send controls</>}>
          <OutreachRow />
        </StageRow>
        <StageRow stageId={5} title="Learn" summary={<>Knowledge graph, playbooks, target profiles</>}>
          <MemoryRow />
        </StageRow>
      </main>
    </div>
  );
});

export default MissionControl;
