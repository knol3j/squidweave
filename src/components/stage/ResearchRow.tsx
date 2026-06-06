import { useState, useEffect } from "react";
import {
  Database,
  Brain,
  FileText,
  AlertTriangle,
  UserCheck,
} from "lucide-react";
import IngestionRow from "./IngestionRow";
import AutonomousResearch from "@/components/funnel/AutonomousResearch";
import CompanyDossier from "@/components/funnel/CompanyDossier";
import type { CompanyDossierData } from "@/components/funnel/CompanyDossier";
import PainPointAnalyzer from "@/components/funnel/PainPointAnalyzer";
import DecisionMakerFinder from "@/components/funnel/DecisionMakerFinder";

const STORAGE_KEY = "sw_research_dossiers";

function loadSavedDossiers(): CompanyDossierData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* silent */ }
  return [];
}

type ResearchTab = "data" | "research" | "dossier" | "painpoints" | "contacts";

export default function ResearchRow() {
  const [activeTab, setActiveTab] = useState<ResearchTab>("data");
  const [savedDossiers, setSavedDossiers] = useState<CompanyDossierData[]>(loadSavedDossiers);
  const [selectedDossier, setSelectedDossier] = useState<CompanyDossierData | null>(null);

  // Refresh dossiers when switching to dossier tab
  useEffect(() => {
    if (activeTab === "dossier") {
      const dossiers = loadSavedDossiers();
      setSavedDossiers(dossiers);
      if (dossiers.length > 0 && !selectedDossier) {
        setSelectedDossier(dossiers[0]);
      }
    }
  }, [activeTab]);

  const tabs: { key: ResearchTab; label: string; icon: React.ElementType }[] = [
    { key: "data", label: "Data", icon: Database },
    { key: "research", label: "Research", icon: Brain },
    { key: "dossier", label: "Dossier", icon: FileText },
    { key: "painpoints", label: "Pain Points", icon: AlertTriangle },
    { key: "contacts", label: "Contacts", icon: UserCheck },
  ];

  return (
    <div className="space-y-3 pt-3">
      {/* Tab bar */}
      <div className="flex flex-wrap gap-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className="flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-md transition-colors font-medium"
            style={
              activeTab === t.key
                ? { background: "rgba(6,182,212,0.12)", color: "#22d3ee" }
                : { color: "#475569" }
            }
          >
            <t.icon className="w-3 h-3" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Data tab — existing ingestion row */}
      {activeTab === "data" && <IngestionRow />}

      {/* Research tab — autonomous research engine */}
      {activeTab === "research" && <AutonomousResearch />}

      {/* Dossier tab — saved company dossiers */}
      {activeTab === "dossier" && (
        <div className="space-y-3">
          {savedDossiers.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <FileText className="w-8 h-8 text-slate-700 mx-auto mb-2" />
              <div className="text-xs text-slate-500">No dossiers yet</div>
              <div className="text-[10px] text-slate-600 mt-1">
                Run research in the Research tab to generate company dossiers
              </div>
            </div>
          ) : (
            <>
              {/* Dossier selector */}
              {savedDossiers.length > 1 && (
                <div className="flex flex-wrap gap-1.5">
                  {savedDossiers.map((d) => (
                    <button
                      key={`${d.domain}-${d.researchDate}`}
                      onClick={() => setSelectedDossier(d)}
                      className={`text-[10px] px-2.5 py-1 rounded-md border transition-colors font-medium ${
                        selectedDossier?.domain === d.domain &&
                        selectedDossier?.researchDate === d.researchDate
                          ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/25"
                          : "bg-transparent text-slate-500 border-white/[0.06] hover:text-slate-400"
                      }`}
                    >
                      {d.name}
                    </button>
                  ))}
                </div>
              )}
              {selectedDossier && <CompanyDossier dossier={selectedDossier} />}
            </>
          )}
        </div>
      )}

      {/* Pain Points tab */}
      {activeTab === "painpoints" && <PainPointAnalyzer />}

      {/* Contacts tab */}
      {activeTab === "contacts" && <DecisionMakerFinder />}
    </div>
  );
}
