import { useState } from "react";
import { FileText } from "lucide-react";
import { AutonomousResearch } from "@/components/funnel/AutonomousResearch";
import { CompanyDossier } from "@/components/funnel/CompanyDossier";
import { PainPointAnalyzer } from "@/components/funnel/PainPointAnalyzer";
import { DecisionMakerFinder } from "@/components/funnel/DecisionMakerFinder";
import { IngestionRow } from "./IngestionRow";

export function ResearchRow() {
  const [activeTab, setActiveTab] = useState<"data" | "research" | "dossier" | "painpoints" | "contacts">("data");
  const [savedDossiers, setSavedDossiers] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem("sw_dossiers") || "[]"); } catch { return []; }
  });
  const [selectedDossier, setSelectedDossier] = useState<any>(null);

  const tabs = [
    { key: "data" as const, label: "Data Sources" },
    { key: "research" as const, label: "Research" },
    { key: "dossier" as const, label: "Dossiers" },
    { key: "painpoints" as const, label: "Pain Points" },
    { key: "contacts" as const, label: "Contacts" },
  ];

  return (
    <div className="space-y-3 pt-3">
      <div className="flex flex-wrap gap-1" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            role="tab"
            aria-selected={activeTab === t.key}
            className="text-[10px] px-2.5 py-1 rounded-md transition-colors"
            style={
              activeTab === t.key
                ? { background: "rgba(99,102,241,0.15)", color: "#a5b4fc" }
                : { color: "#475569" }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "data" && <IngestionRow />}

      {activeTab === "research" && <AutonomousResearch />}

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

      {activeTab === "painpoints" && <PainPointAnalyzer />}

      {activeTab === "contacts" && <DecisionMakerFinder />}
    </div>
  );
}
