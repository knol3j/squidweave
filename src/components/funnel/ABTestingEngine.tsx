import { useState, useCallback, useMemo } from "react";
import {
  FlaskConical,
  Plus,
  Trash2,
  Save,
  TrendingUp,
  Users,
  MousePointerClick,
  BarChart3,
  Loader2,
} from "lucide-react";

interface ABTest {
  id: string;
  name: string;
  variantA: string;
  variantB: string;
  metric: string;
  status: "draft" | "running" | "completed";
  createdAt: string;
}

const STORAGE_KEY = "sw_ab_tests";

function loadTests(): ABTest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveTests(tests: ABTest[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tests));
  } catch { /* silent */ }
}

export function ABTestingEngine() {
  const [tests, setTests] = useState<ABTest[]>(loadTests);
  const [editing, setEditing] = useState<ABTest | null>(null);
  const [saving, setSaving] = useState(false);

  const handleAdd = useCallback(() => {
    const newTest: ABTest = {
      id: crypto.randomUUID(),
      name: "",
      variantA: "",
      variantB: "",
      metric: "click-through rate",
      status: "draft",
      createdAt: new Date().toISOString(),
    };
    setEditing(newTest);
  }, []);

  const handleSave = useCallback(() => {
    if (!editing || !editing.name.trim()) return;
    setSaving(true);
    setTests((prev) => {
      const exists = prev.find((t) => t.id === editing.id);
      const next = exists
        ? prev.map((t) => (t.id === editing.id ? editing : t))
        : [...prev, editing];
      saveTests(next);
      return next;
    });
    setTimeout(() => {
      setSaving(false);
      setEditing(null);
    }, 300);
  }, [editing]);

  const handleDelete = useCallback((id: string) => {
    setTests((prev) => {
      const next = prev.filter((t) => t.id !== id);
      saveTests(next);
      return next;
    });
  }, []);

  const metricIcon = useMemo(() => {
    const map: Record<string, any> = {
      "click-through rate": MousePointerClick,
      "open rate": TrendingUp,
      "conversion rate": Users,
      "reply rate": BarChart3,
    };
    return map;
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">A/B Testing Engine</h3>
          <p className="text-[10px] text-slate-600 mt-0.5">
            Create and manage outreach experiments
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium text-white"
          style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
        >
          <Plus className="w-3 h-3" />
          New Test
        </button>
      </div>

      {/* Editor */}
      {editing && (
        <div className="p-4 rounded-xl border border-white/[0.06] bg-[#0f172a] space-y-3">
          <input
            value={editing.name}
            onChange={(e) =>
              setEditing({ ...editing, name: e.target.value })
            }
            placeholder="Test name (e.g., Subject Line Test Q3)"
            className="w-full text-xs px-3 py-2 rounded-lg border border-white/[0.1] bg-[#0a121f] text-slate-100 outline-none focus:border-violet-500"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-600 mb-1 block">
                Variant A
              </label>
              <textarea
                value={editing.variantA}
                onChange={(e) =>
                  setEditing({ ...editing, variantA: e.target.value })
                }
                placeholder="Subject line or copy for variant A"
                rows={3}
                className="w-full text-xs px-3 py-2 rounded-lg border border-white/[0.1] bg-[#0a121f] text-slate-100 outline-none focus:border-violet-500 resize-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-600 mb-1 block">
                Variant B
              </label>
              <textarea
                value={editing.variantB}
                onChange={(e) =>
                  setEditing({ ...editing, variantB: e.target.value })
                }
                placeholder="Subject line or copy for variant B"
                rows={3}
                className="w-full text-xs px-3 py-2 rounded-lg border border-white/[0.1] bg-[#0a121f] text-slate-100 outline-none focus:border-violet-500 resize-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={editing.metric}
              onChange={(e) =>
                setEditing({ ...editing, metric: e.target.value })
              }
              className="text-xs px-3 py-2 rounded-lg border border-white/[0.1] bg-[#0a121f] text-slate-100 outline-none"
            >
              <option>click-through rate</option>
              <option>open rate</option>
              <option>conversion rate</option>
              <option>reply rate</option>
            </select>
            <button
              onClick={handleSave}
              disabled={saving || !editing.name.trim()}
              className="flex items-center gap-1 text-xs px-3 py-2 rounded-lg font-medium bg-emerald-500 text-white disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Save className="w-3 h-3" />
              )}
              Save
            </button>
            <button
              onClick={() => setEditing(null)}
              className="text-xs px-3 py-2 rounded-lg border border-white/[0.1] text-slate-400 hover:bg-white/5"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Test List */}
      {tests.length === 0 ? (
        <div className="p-8 text-center rounded-xl border border-white/[0.06] bg-[#0a121f]">
          <FlaskConical className="w-8 h-8 text-slate-700 mx-auto mb-2" />
          <p className="text-xs text-slate-500">No A/B tests yet.</p>
          <p className="text-[10px] text-slate-600 mt-1">
            Create your first test above to compare subject lines, copy variants, and CTAs.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {tests.map((test) => {
            const Icon = metricIcon[test.metric] || BarChart3;
            return (
              <div
                key={test.id}
                className="p-3 rounded-xl border border-white/[0.06] bg-[#0f172a] flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-100">
                      {test.name}
                    </span>
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded font-medium capitalize"
                      style={{
                        background:
                          test.status === "running"
                            ? "rgba(16,185,129,0.1)"
                            : test.status === "completed"
                              ? "rgba(99,102,241,0.1)"
                              : "rgba(255,255,255,0.04)",
                        color:
                          test.status === "running"
                            ? "#34d399"
                            : test.status === "completed"
                              ? "#a5b4fc"
                              : "#475569",
                      }}
                    >
                      {test.status}
                    </span>
                  </div>
                  <div className="flex gap-4 mt-1 text-[10px] text-slate-600">
                    <span>Variant A: {test.variantA.slice(0, 30) || "—"}</span>
                    <span>Variant B: {test.variantB.slice(0, 30) || "—"}</span>
                  </div>
                  <div className="text-[10px] text-slate-700 mt-1 capitalize">
                    Metric: {test.metric}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(test.id)}
                  className="p-1 rounded text-slate-600 hover:text-red-400 transition-colors shrink-0"
                  aria-label="Delete test"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
