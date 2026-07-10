/**
 * SquidWeave v22 — Mission Control + Neural Net
 * Authenticated access only. Sessions expire after 8 hours.
 */
import { useState, useCallback, useEffect, lazy, Suspense } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { AppProvider } from "./context/AppContext";
import Login from "./pages/Login";

const MissionControl = lazy(() => import("./pages/MissionControl"));
const NeuralNet = lazy(() => import("./pages/NeuralNet"));

const SESSION_KEY = "sw_authenticated";
const AUTH_TOKEN_KEY = "sw_auth";
const SESSION_EXPIRY_KEY = "sw_session_expiry";
const LEGACY_AUTH_KEY = "authenticated";
const LAST_ACTIVITY_KEY = "sw_last_activity";
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;
const ACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

function clearAuth() {
  try {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(LEGACY_AUTH_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(SESSION_EXPIRY_KEY);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
  } catch {}
}

function touchActivity() {
  try { localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now())); } catch {}
}

function isSessionValid(): boolean {
  try {
    const auth = localStorage.getItem(SESSION_KEY) === "true" || localStorage.getItem(LEGACY_AUTH_KEY) === "true";
    if (!auth) return false;
    const expiry = localStorage.getItem(SESSION_EXPIRY_KEY);
    if (expiry && Date.now() > parseInt(expiry, 10)) { clearAuth(); return false; }
    const last = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (last && Date.now() - parseInt(last, 10) > ACTIVITY_TIMEOUT_MS) { clearAuth(); return false; }
    return true;
  } catch { return false; }
}

export default function App() {
  const [auth, setAuth] = useState(() => isSessionValid());

  useEffect(() => {
    if (!auth) return;
    touchActivity();
    const interval = setInterval(() => { if (!isSessionValid()) setAuth(false); }, 60000);
    const handler = () => { touchActivity(); if (!isSessionValid()) setAuth(false); };
    ["mousedown", "keydown", "touchstart", "scroll"].forEach(e => window.addEventListener(e, handler, { passive: true }));
    return () => { clearInterval(interval); ["mousedown", "keydown", "touchstart", "scroll"].forEach(e => window.removeEventListener(e, handler)); };
  }, [auth]);

  const handleLogin = useCallback(() => { touchActivity(); setAuth(true); }, []);
  const handleLogout = useCallback(() => { clearAuth(); setAuth(false); }, []);

  if (!auth) return <Login onLogin={handleLogin} />;

  return (
    <AppProvider>
      <HashRouter>
        <div className="min-h-screen" style={{ background: "#030712" }}>
          <Navbar onLogout={handleLogout} />
          <main className="pt-14">
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
