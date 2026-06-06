import { useState, useEffect, useCallback, useMemo } from "react";
import {
  FlaskConical,
  Plus,
  TrendingUp,
  RotateCcw,
  Trash2,
  ChevronDown,
  ChevronUp,
  type LucideIcon,
} from "lucide-react";
import { useApp } from "@/context/AppContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Variant {
  id: string;
  label: string;
  conversions: number;
  impressions: number;
  conversionRate: number;
  percentage: number;
  isWinner: boolean;
}

interface ABTest {
  id: string;
  name: string;
  type: "subject" | "body" | "cta" | "sender";
  status: "running" | "paused" | "completed";
  totalSamples: number;
  winner: string | null;
  significance: number | null;
  variants: Variant[];
  createdAt: string;
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

const STORAGE_KEY = "sw_ab_tests";

function loadTests(): ABTest[] {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) return JSON.parse(s) as ABTest[];
  } catch { /* silent */ }
  return [];
}

function saveTests(tests: ABTest[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tests));
}

// ─── Z-Test for statistical significance ──────────────────────────────────────

function computeZTest(a: { conversions: number; impressions: number }, b: { conversions: number; impressions: number }): number | null {
  if (a.impressions === 0 || b.impressions === 0) return null;
  const p1 = a.conversions / a.impressions;
  const p2 = b.conversions / b.impressions;
  const n1 = a.impressions;
  const n2 = b.impressions;
  const pPooled = (a.conversions + b.conversions) / (n1 + n2);
  const se = Math.sqrt(pPooled * (1 - pPooled) * (1 / n1 + 1 / n2));
  if (se === 0) return null;
  const z = Math.abs(p1 - p2) / se;
  // Convert Z to confidence percentage (two-tailed)
  // Common Z thresholds: 1.645 = 90%, 1.96 = 95%, 2.576 = 99%
  const confidence = Math.min(99.9, Math.max(50, (1 - 2 * (1 - normalCDF(z))) * 100));
  return Math.round(confidence * 10) / 10;
}

function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x) / Math.sqrt(2);
  const t = 1 / (1 + p * ax);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return 0.5 * (1 + sign * y);
}

// ─── Pre-populated demo data ──────────────────────────────────────────────────

function makeDemoTests(): ABTest[] {
  const now = new Date().toISOString();
  return [
    {
      id: `abt-${Date.now()}-1`,
      name: "Subject Line: Benefit vs. Curiosity",
      type: "subject",
      status: "completed",
      totalSamples: 2840,
      winner: "Benefit-Focused",
      significance: 97.2,
      variants: [
        { id: "v1", label: "Benefit-Focused: Increase your ROI by 40% this quarter", conversions: 142, impressions: 1420, conversionRate: 10.0, percentage: 100, isWinner: true },
        { id: "v2", label: "Curiosity: The strategy most teams overlook", conversions: 98, impressions: 1420, conversionRate: 6.9, percentage: 69, isWinner: false },
      ],
      createdAt: now,
    },
    {
      id: `abt-${Date.now()}-2`,
      name: "CTA Button: 'Book Demo' vs. 'See How'",
      type: "cta",
      status: "running",
      totalSamples: 1560,
      winner: null,
      significance: 87.4,
      variants: [
        { id: "v1", label: "Book a Demo", conversions: 62, impressions: 780, conversionRate: 7.9, percentage: 100, isWinner: false },
        { id: "v2", label: "See How It Works", conversions: 71, impressions: 780, conversionRate: 9.1, percentage: 100, isWinner: false },
      ],
      createdAt: now,
    },
    {
      id: `abt-${Date.now()}-3`,
      name: "Sender Name: Company vs. Personal",
      type: "sender",
      status: "completed",
      totalSamples: 4200,
      winner: "Personal Name",
      significance: 99.1,
      variants: [
        { id: "v1", label: "From: Team at SquidWeave", conversions: 168, impressions: 2100, conversionRate: 8.0, percentage: 72, isWinner: false },
        { id: "v2", label: "From: Alex Chen (Personal)", conversions: 231, impressions: 2100, conversionRate: 11.0, percentage: 100, isWinner: true },
      ],
      createdAt: now,
    },
  ];
}

// ─── Type helpers ─────────────────────────────────────────────────────────────

const TEST_TYPE_LABELS: Record<ABTest["type"], string> = {
  subject: "Subject Line",
  body: "Email Body",
  cta: "Call to Action",
  sender: "Sender Name",
};

const TEST_TYPE_ICONS: Record<string, LucideIcon> = {
  subject: FlaskConical,
  body: FlaskConical,
  cta: FlaskConical,
  sender: FlaskConical,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ABTestingEngine() {
  const { state } = useApp();
  const { pitches } = state;

  const [tests, setTests] = useState<ABTest[]>(() => {
    const stored = loadTests();
    return stored.length > 0 ? stored : makeDemoTests();
  });
  const [showCreate, setShowCreate] = useState(false);
  const [testType, setTestType] = useState<ABTest["type"]>("subject");
  const [testName, setTestName] = useState("");
  const [variantA, setVariantA] = useState("");
  const [variantB, setVariantB] = useState("");
  const [expandedTest, setExpandedTest] = useState<string | null>(null);

  // Persist to localStorage
  useEffect(() => { saveTests(tests); }, [tests]);

  // Recompute significance when tests change
  const computedTests = useMemo(() => {
    return tests.map(test => {
      if (test.variants.length !== 2) return test;
      const [vA, vB] = test.variants;
      const sig = computeZTest(
        { conversions: vA.conversions, impressions: vA.impressions },
        { conversions: vB.conversions, impressions: vB.impressions }
      );
      const winner = sig && sig >= 95
        ? (vA.conversionRate > vB.conversionRate ? vA.label : vB.label)
        : test.status === "completed" ? test.winner : null;
      const maxRate = Math.max(...test.variants.map(v => v.conversionRate));
      return {
        ...test,
        significance: sig,
        totalSamples: test.variants.reduce((acc, v) => acc + v.impressions, 0),
        winner,
        variants: test.variants.map(v => ({
          ...v,
          isWinner: winner ? v.conversionRate === maxRate : false,
          percentage: maxRate > 0 ? (v.conversionRate / maxRate) * 100 : 50,
        })),
      };
    });
  }, [tests]);

  const createTest = useCallback(() => {
    if (!variantA.trim() || !variantB.trim()) return;
    const name = testName.trim() || `${TEST_TYPE_LABELS[testType]} Test`;
    const newTest: ABTest = {
      id: `abt-${Date.now()}`,
      name,
      type: testType,
      status: "running",
      totalSamples: 0,
      winner: null,
      significance: null,
      variants: [
        { id: "va", label: variantA.trim(), conversions: 0, impressions: 0, conversionRate: 0, percentage: 50, isWinner: false },
        { id: "vb", label: variantB.trim(), conversions: 0, impressions: 0, conversionRate: 0, percentage: 50, isWinner: false },
      ],
      createdAt: new Date().toISOString(),
    };
    setTests(prev => [newTest, ...prev]);
    setVariantA("");
    setVariantB("");
    setTestName("");
    setShowCreate(false);
  }, [testType, testName, variantA, variantB]);

  const deleteTest = useCallback((id: string) => {
    setTests(prev => prev.filter(t => t.id !== id));
  }, []);

  const resetTests = useCallback(() => {
    setTests(makeDemoTests());
  }, []);

  const toggleStatus = useCallback((id: string) => {
    setTests(prev => prev.map(t => {
      if (t.id !== id) return t;
      const nextStatus: ABTest["status"] = t.status === "running" ? "paused" : t.status === "paused" ? "running" : "completed";
      return { ...t, status: nextStatus };
    }));
  }, []);

  const simulateData = useCallback((id: string) => {
    setTests(prev => prev.map(t => {
      if (t.id !== id) return t;
      return {
        ...t,
        variants: t.variants.map(v => {
          const newImpressions = v.impressions + Math.floor(Math.random() * 50) + 10;
          const newConversions = v.conversions + Math.floor(Math.random() * 6) + 1;
          return {
            ...v,
            impressions: newImpressions,
            conversions: newConversions,
            conversionRate: Math.round((newConversions / newImpressions) * 1000) / 10,
          };
        }),
      };
    }));
  }, []);

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-indigo-400" />
          <div className="text-xs font-bold uppercase tracking-[0.15em] text-slate-300">A/B Testing Engine</div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={resetTests}
            className="p-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-slate-500 hover:text-slate-300 transition-colors"
            title="Reset demo data"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
          <button
            onClick={() => setShowCreate(p => !p)}
            className="flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-lg bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition-colors"
          >
            <Plus className="w-3 h-3" />
            New Test
          </button>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">Active Tests</div>
          <div className="text-lg font-bold text-slate-100 mt-1">
            {computedTests.filter(t => t.status === "running").length}
          </div>
        </div>
        <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">Completed</div>
          <div className="text-lg font-bold text-slate-100 mt-1">
            {computedTests.filter(t => t.status === "completed").length}
          </div>
        </div>
        <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">Winners Found</div>
          <div className="text-lg font-bold text-emerald-400 mt-1">
            {computedTests.filter(t => !!t.winner).length}
          </div>
        </div>
      </div>

      {/* ── Create New Test Form ── */}
      {showCreate && (
        <div className="p-4 rounded-xl border border-indigo-500/15 bg-indigo-500/[0.03]">
          <div className="text-xs font-bold uppercase tracking-wider text-indigo-300 mb-3">Create New Test</div>
          <input
            value={testName}
            onChange={e => setTestName(e.target.value)}
            placeholder="Test name (optional)"
            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 mb-2 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/30"
          />
          <select
            value={testType}
            onChange={e => setTestType(e.target.value as ABTest["type"])}
            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 mb-3 focus:outline-none focus:border-indigo-500/30"
          >
            <option value="subject">Subject Line</option>
            <option value="body">Email Body</option>
            <option value="cta">Call to Action</option>
            <option value="sender">Sender Name</option>
          </select>
          <div className="space-y-2 mb-3">
            <input
              value={variantA}
              onChange={e => setVariantA(e.target.value)}
              placeholder="Variant A"
              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/30"
            />
            <input
              value={variantB}
              onChange={e => setVariantB(e.target.value)}
              placeholder="Variant B"
              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/30"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={createTest}
              disabled={!variantA.trim() || !variantB.trim()}
              className="text-xs px-3 py-1.5 rounded-lg bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Start Test
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="text-xs px-3 py-1.5 rounded-lg border border-white/[0.1] text-slate-400 hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Linked Pitches Banner ── */}
      {pitches.length > 0 && (
        <div className="p-3 rounded-xl border border-amber-500/10 bg-amber-500/[0.03]">
          <div className="text-[10px] text-amber-400/80 font-medium mb-1">
            {pitches.length} pitch{pitches.length > 1 ? "es" : ""} available for testing
          </div>
          <div className="flex flex-wrap gap-1">
            {pitches.slice(0, 4).map(p => (
              <span key={p.id} className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 truncate max-w-[180px]">
                {p.title}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Active Tests List ── */}
      <div className="space-y-3">
        {computedTests.length === 0 && (
          <div className="py-8 text-center text-xs text-slate-600">
            No A/B tests yet. Create your first test to start optimizing.
          </div>
        )}
        {computedTests.map(test => {
          const TypeIcon = TEST_TYPE_ICONS[test.type] || FlaskConical;
          const isExpanded = expandedTest === test.id;
          return (
            <div
              key={test.id}
              className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] transition-colors hover:border-white/[0.08]"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <TypeIcon className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-200 truncate">{test.name}</div>
                    <div className="text-[10px] text-slate-500">
                      {TEST_TYPE_LABELS[test.type]} · {" "}
                      <button
                        onClick={() => toggleStatus(test.id)}
                        className={`hover:underline ${test.status === "running" ? "text-amber-400" : test.status === "paused" ? "text-rose-400" : "text-emerald-400"}`}
                      >
                        {test.status}
                      </button>
                      {" · "}{test.totalSamples.toLocaleString()} samples
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {test.winner ? (
                    <div className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400">
                      <TrendingUp className="w-2.5 h-2.5" />
                      Winner
                    </div>
                  ) : (
                    <div className={`text-[10px] px-2 py-1 rounded-full ${test.status === "running" ? "bg-amber-500/10 text-amber-400" : "bg-slate-500/10 text-slate-400"}`}>
                      {test.status === "running" ? "Running" : test.status === "paused" ? "Paused" : "No winner"}
                    </div>
                  )}
                  <button
                    onClick={() => simulateData(test.id)}
                    className="p-1 rounded-md text-slate-600 hover:text-indigo-400 transition-colors"
                    title="Simulate data"
                  >
                    <TrendingUp className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setExpandedTest(isExpanded ? null : test.id)}
                    className="p-1 rounded-md text-slate-600 hover:text-slate-300 transition-colors"
                  >
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={() => deleteTest(test.id)}
                    className="p-1 rounded-md text-slate-600 hover:text-rose-400 transition-colors"
                    title="Delete test"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Variant comparison bars */}
              <div className="space-y-2">
                {test.variants.map(v => (
                  <div key={v.id}>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-slate-400 truncate max-w-[60%]">{v.label}</span>
                      <span className={v.isWinner ? "text-emerald-400 font-medium" : "text-slate-500"}>
                        {v.conversionRate}% ({v.conversions}/{v.impressions})
                      </span>
                    </div>
                    <div className="h-4 rounded-md bg-white/[0.04] overflow-hidden">
                      <div
                        className="h-full rounded-md transition-all flex items-center px-2 text-[9px] font-medium truncate"
                        style={{
                          width: `${Math.max(v.percentage, 8)}%`,
                          background: v.isWinner ? "rgba(16,185,129,0.3)" : "rgba(99,102,241,0.2)",
                          color: v.isWinner ? "#6ee7b7" : "#a5b4fc",
                        }}
                      >
                        {v.label.slice(0, 30)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Significance & expanded details */}
              <div className="mt-2 flex items-center justify-between">
                {test.significance ? (
                  <div className={`text-[10px] ${test.significance >= 95 ? "text-emerald-400" : test.significance >= 90 ? "text-amber-400" : "text-slate-500"}`}>
                    Confidence: {test.significance}%
                    {test.significance >= 95 && " — Statistically significant"}
                    {test.significance >= 90 && test.significance < 95 && " — Trending"}
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-600">Collecting data...</div>
                )}
              </div>

              {isExpanded && test.winner && (
                <div className="mt-3 pt-3 border-t border-white/[0.06]">
                  <div className="text-[10px] text-emerald-400 font-medium mb-1">
                    Winning variant: {test.winner}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Recommendation: Roll out the winning variant to 100% of traffic.
                    Expected lift: +{Math.abs(test.variants[0].conversionRate - test.variants[1].conversionRate).toFixed(1)}% conversion rate.
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
