import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { AppProvider } from "./context/AppContext";

const MissionControl = lazy(() => import("./pages/MissionControl"));
const NeuralNet = lazy(() => import("./pages/NeuralNet"));

function isAuthenticated(): boolean {
  try {
    return localStorage.getItem("sw_authenticated") === "true" ||
           localStorage.getItem("authenticated") === "true";
  } catch {
    return false;
  }
}

function Login({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "squidweave") {
      try { localStorage.setItem("sw_authenticated", "true"); } catch { /* silent */ }
      onLogin();
    } else {
      setError("Invalid password");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#030712" }}>
      <div className="w-full max-w-sm p-8 rounded-2xl border border-white/[0.06]" style={{ background: "rgba(15,23,42,0.8)" }}>
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-100">SquidWeave</h1>
          <p className="text-sm text-slate-500 mt-1">Mission Control</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              placeholder="Enter password"
              className="w-full px-4 py-3 rounded-xl border border-white/[0.1] text-sm text-slate-100 outline-none focus:border-violet-500"
              style={{ background: "#0f172a" }}
              aria-label="Password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-300"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            type="submit"
            className="w-full py-3 rounded-xl font-medium text-sm text-white transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
            aria-label="Sign in"
          >
            Enter Mission Control
          </button>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const [auth, setAuth] = useState(() => isAuthenticated());

  const handleLogin = useCallback(() => setAuth(true), []);
  const handleLogout = useCallback(() => {
    try { localStorage.removeItem("sw_authenticated"); } catch { /* silent */ }
    setAuth(false);
  }, []);

  if (!auth) return <Login onLogin={handleLogin} />;

  return (
    <AppProvider>
      <HashRouter>
        <div className="min-h-screen" style={{ background: "#030712" }}>
          <Navbar onLogout={handleLogout} />
          <main className="pt-16">
            <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-slate-500 text-sm">Loading...</div>}>
              <Routes>
                <Route path="/" element={<MissionControl />} />
                <Route path="/neural" element={<NeuralNet />} />
              </Routes>
            </Suspense>
          </main>
        </div>
      </HashRouter>
    </AppProvider>
  );
}
