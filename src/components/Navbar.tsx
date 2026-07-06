import { useState, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  BrainCircuit,
  Network,
  LogOut,
  Play,
  Settings,
  Activity,
  Wifi,
  WifiOff,
  Loader2,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { dataService } from "@/services/dataService";

export function Navbar({ onLogout }: { onLogout: () => void }) {
  const location = useLocation();
  const state = useApp();
  const [running, setRunning] = useState(false);
  const [navError, setNavError] = useState<string | null>(null);

  const handleRunBrain = useCallback(async () => {
    setNavError(null);
    setRunning(true);
    try {
      await dataService.runBrain();
    } catch (err: any) {
      setNavError(err.message || "Brain run failed");
    } finally {
      setRunning(false);
    }
  }, []);

  const isNeural = location.pathname === "/neural";

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06]"
      style={{ background: "rgba(3,7,18,0.85)", backdropFilter: "blur(12px)" }}
    >
      <div className="max-w-[1440px] mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm font-bold tracking-tight"
          >
            <BrainCircuit className="w-5 h-5 text-violet-400" />
            <span className="bg-gradient-to-r from-violet-400 to-indigo-300 bg-clip-text text-transparent">
              SquidWeave
            </span>
          </Link>

          <div className="hidden sm:flex items-center gap-1 ml-4">
            <Link
              to="/"
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md transition-colors ${
                !isNeural
                  ? "text-slate-200"
                  : "text-slate-500 hover:text-slate-400"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Mission Control
            </Link>
            <Link
              to="/neural"
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md transition-colors ${
                isNeural
                  ? "text-slate-200"
                  : "text-slate-500 hover:text-slate-400"
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              Neural Net
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {navError && (
            <span className="text-[10px] text-red-400 mr-2 max-w-[200px] truncate">
              {navError}
            </span>
          )}

          <button
            onClick={handleRunBrain}
            disabled={running}
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium text-white disabled:opacity-50 transition-all hover:opacity-90"
            style={{
              background: running
                ? "rgba(99,102,241,0.5)"
                : "linear-gradient(135deg, #6366f1, #8b5cf6)",
            }}
          >
            {running ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Play className="w-3 h-3" />
            )}
            {running ? "Running..." : "Run Brain"}
          </button>

          <div className="flex items-center gap-1 text-[10px] text-slate-600">
            {state.isPolling ? (
              <Wifi className="w-3 h-3 text-emerald-400 animate-pulse" />
            ) : (
              <WifiOff className="w-3 h-3 text-slate-700" />
            )}
            <span className="hidden sm:inline">
              {state.lastRefresh || "—"}
            </span>
          </div>

          <button
            onClick={onLogout}
            className="p-1.5 rounded-md text-slate-600 hover:text-slate-400 transition-colors"
            aria-label="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </nav>
  );
}
