import { Orbit, Play, RefreshCw, Activity, Server } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { switchToLocalBackend, getApiBase } from "@/services/dataService";
import { useState } from "react";

interface NavbarProps {
  view: "mission" | "neural";
  onSwitchView: (v: "mission" | "neural") => void;
}

export default function Navbar({ view, onSwitchView }: NavbarProps) {
  const { state, setCampaignId, refresh, runAutomation, clearError } = useApp();
  const { campaigns, campaignId, health, isPolling, lastRefresh } = state;
  const [apiBase, setApiBase] = useState(getApiBase());
  const [ngrokInput, setNgrokInput] = useState("");
  const isLocal = !apiBase.includes("railway");

  const handleSwitchLocal = async () => {
    const endpoint = ngrokInput.trim() || "http://127.0.0.1:4010";
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 5000);
      const res = await fetch(`${endpoint}/health`, { signal: ctrl.signal });
      clearTimeout(t);
      if (res.ok) {
        const data = await res.json();
        const model = data.model || "unknown";
        const dryRun = data.dryRun;
        switchToLocalBackend(endpoint);
        setApiBase(endpoint);
        setNgrokInput("");
        // Refresh data from new backend instead of page reload
        refresh();
        alert(`Connected to local backend\nModel: ${model}\nDry run: ${dryRun}`);
      } else {
        const text = await res.text();
        alert(`Backend returned ${res.status}:\n${text.slice(0, 200)}`);
      }
    } catch (err: any) {
      alert(`Cannot reach ${endpoint}.\n\nError: ${err.message}\n\nMake sure your backend is running:\n  cd ~/squidweave && node src/server.mjs\n\nIf using localhost from HTTPS page, use ngrok:\n  ngrok http 4010`);
    }
  };

  return (
    <nav className="h-14 border-b border-white/[0.08] flex items-center px-4 gap-4 shrink-0" style={{ background: "#08111f" }}>
      <div className="flex items-center gap-2 shrink-0">
        <Orbit className="w-5 h-5 text-indigo-400" />
        <span className="font-bold tracking-wider text-sm text-slate-100">SQUIDWEAVE</span>
      </div>

      {/* View Switcher */}
      <div className="flex items-center gap-1 ml-4">
        <button
          onClick={() => onSwitchView("mission")}
          className={`text-[11px] px-3 py-1.5 rounded-lg font-medium transition-all ${
            view === "mission"
              ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
              : "text-slate-500 hover:text-slate-300 hover:bg-white/5 border border-transparent"
          }`}>
          Mission Control
        </button>
        <button
          onClick={() => onSwitchView("neural")}
          className={`text-[11px] px-3 py-1.5 rounded-lg font-medium transition-all ${
            view === "neural"
              ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
              : "text-slate-500 hover:text-slate-300 hover:bg-white/5 border border-transparent"
          }`}>
          Neural Net
        </button>
      </div>

      <div className="flex-1" />

      <select
        value={campaignId}
        onChange={e => { setCampaignId(e.target.value); clearError(); }}
        className="bg-[#0f172a] border border-white/[0.12] text-slate-100 text-xs rounded-lg px-3 py-1.5 outline-none focus:border-indigo-500 transition-colors"
      >
        {campaigns.map(c => (
          <option key={c.id} value={c.id}>{c.name || c.id}</option>
        ))}
        {campaigns.length === 0 && <option value="">No campaigns</option>}
      </select>

      {/* Local Backend Toggle */}
      {!isLocal ? (
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={ngrokInput}
            onChange={e => setNgrokInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSwitchLocal()}
            placeholder="ngrok https URL (optional)"
            className="w-40 text-[10px] px-2 py-1 rounded-lg border border-white/[0.12] bg-[#0f172a] text-slate-300 outline-none focus:border-emerald-500 placeholder:text-slate-600"
          />
          <button
            onClick={handleSwitchLocal}
            className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 transition-all shrink-0"
            title="Connect to local backend"
          >
            <Server className="w-3 h-3" /> Connect
          </button>
        </div>
      ) : (
        <span className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 shrink-0">
          <Server className="w-3 h-3" /> {apiBase.replace("https://", "").replace("http://", "").slice(0, 20)}
        </span>
      )}

      {isPolling && (
        <span className="flex items-center gap-1.5 text-xs text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </span>
      )}

      {health && (
        <span className={`flex items-center gap-1 text-xs ${health.ok ? "text-emerald-400" : "text-red-400"}`}>
          <Activity className="w-3 h-3" />
          {health.ok ? "Healthy" : "Issues"}
        </span>
      )}

      {lastRefresh && (
        <span className="text-xs hidden sm:inline text-slate-500">{lastRefresh}</span>
      )}

      <button
        onClick={refresh}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-white/[0.12] text-slate-400 transition-all hover:bg-white/5 hover:text-slate-200"
      >
        <RefreshCw className="w-3 h-3" />
        Refresh
      </button>

      <button
        onClick={runAutomation}
        disabled={state.isLoading}
        className="flex items-center gap-1.5 text-xs font-medium px-4 py-1.5 rounded-lg transition-all hover:opacity-90 disabled:opacity-50"
        style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff" }}
      >
        <Play className="w-3 h-3" />
        {state.isLoading ? "Running..." : "Run Brain"}
      </button>
    </nav>
  );
}
