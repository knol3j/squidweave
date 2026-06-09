/**
 * SquidWeave v21 — Mission Control + Neural Net + 22 Data Funnels
 */
import { Suspense, lazy, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { AppProvider } from "@/context/AppContext";
import Navbar from "@/components/Navbar";
import Login from "@/pages/Login";

const MissionControl = lazy(() => import("@/pages/MissionControl"));
const NeuralNet = lazy(() => import("@/pages/NeuralNet"));

function LoadingFallback() {
  return (
    <div className="flex h-screen items-center justify-center bg-[#020617]">
      <div className="text-center space-y-4">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10"
        >
          <Zap className="w-8 h-8 text-indigo-400" />
        </motion.div>
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Loading SquidWeave v2</div>
      </div>
    </div>
  );
}

function isAuthenticated(): boolean {
  // Check both new and old auth keys for backward compatibility
  return localStorage.getItem("sw_authenticated") === "true" ||
         localStorage.getItem("authenticated") === "true";
}

function AppShell() {
  const [view, setView] = useState<"mission" | "neural">("mission");
  const [loggedIn, setLoggedIn] = useState(isAuthenticated);

  const handleLogin = useCallback(() => {
    setLoggedIn(true);
  }, []);

  if (!loggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#020617]">
      <Navbar view={view} onSwitchView={setView} />
      <Suspense fallback={<LoadingFallback />}>
        {view === "mission" ? <MissionControl /> : <NeuralNet />}
      </Suspense>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
