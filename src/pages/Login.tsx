import { useState, useRef, useEffect } from "react";
import { Lock, Eye, EyeOff, ArrowRight, Shield, AlertTriangle } from "lucide-react";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000;
const ATTEMPTS_KEY = "sw_login_attempts";
const LOCKOUT_UNTIL_KEY = "sw_lockout_until";
const SESSION_EXPIRY_KEY = "sw_session_expiry";
const AUTH_TOKEN_KEY = "sw_auth";
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

function getAttempts(): number {
  try { return parseInt(localStorage.getItem(ATTEMPTS_KEY) || "0", 10); } catch { return 0; }
}
function incrementAttempts() {
  try { localStorage.setItem(ATTEMPTS_KEY, String(getAttempts() + 1)); } catch {}
}
function resetAttempts() {
  try { localStorage.removeItem(ATTEMPTS_KEY); localStorage.removeItem(LOCKOUT_UNTIL_KEY); } catch {}
}
function isLockedOut(): boolean {
  try { return Date.now() < parseInt(localStorage.getItem(LOCKOUT_UNTIL_KEY) || "0", 10); } catch { return false; }
}
function getRemainingLockout(): number {
  try { return Math.max(0, parseInt(localStorage.getItem(LOCKOUT_UNTIL_KEY) || "0", 10) - Date.now()); } catch { return 0; }
}
function setLockout() {
  try { localStorage.setItem(LOCKOUT_UNTIL_KEY, String(Date.now() + LOCKOUT_MS)); } catch {}
}
function setSession(authToken: string) {
  try {
    const expiry = Date.now() + SESSION_DURATION_MS;
    localStorage.setItem("sw_authenticated", "true");
    localStorage.setItem(AUTH_TOKEN_KEY, authToken);
    localStorage.setItem(SESSION_EXPIRY_KEY, String(expiry));
  } catch {}
}

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [locked, setLocked] = useState(isLockedOut());
  const [lockoutRemaining, setLockoutRemaining] = useState(getRemainingLockout());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!locked) return;
    const interval = setInterval(() => {
      const remaining = getRemainingLockout();
      setLockoutRemaining(remaining);
      if (remaining <= 0) { setLocked(false); resetAttempts(); clearInterval(interval); }
    }, 1000);
    return () => clearInterval(interval);
  }, [locked]);

  useEffect(() => { inputRef.current?.focus(); }, [locked]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (isLockedOut()) { setLocked(true); return; }
    if (!password.trim()) { setError("Password is required"); return; }

    setChecking(true);
    try {
      const baseUrl = localStorage.getItem("sw_api_base") || "https://squidweave-api-production.up.railway.app";
      const authToken = `Basic ${btoa(`admin:${password}`)}`;
      const res = await fetch(`${baseUrl}/state`, { headers: { Authorization: authToken } });

      if (res.ok) {
        setSession(authToken);
        resetAttempts();
        onLogin();
      } else {
        handleAuthFailure();
      }
    } catch {
      handleAuthFailure();
    }
    setChecking(false);
  };

  const handleAuthFailure = () => {
    incrementAttempts();
    const remaining = MAX_ATTEMPTS - getAttempts();
    if (remaining <= 0) {
      setLockout();
      setLocked(true);
      setLockoutRemaining(getRemainingLockout());
      setError("Too many failed attempts. Locked out for 5 minutes.");
    } else {
      setError(`Invalid password. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.`);
    }
  };

  const fmt = (ms: number) => {
    const m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#030712" }}>
      <div className="w-full max-w-sm mx-4">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
            <Lock className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-100">SquidWeave</h1>
          <p className="text-xs text-slate-500 mt-1">Mission Control v22</p>
        </div>

        <div className="p-6 rounded-2xl border border-white/[0.06]" style={{ background: "rgba(15,23,42,0.8)" }}>
          <div className="text-center mb-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: locked ? "rgba(245,158,11,0.1)" : "rgba(99,102,241,0.1)" }}>
              {locked ? <AlertTriangle className="w-5 h-5 text-amber-400" /> : <Shield className="w-5 h-5 text-indigo-400" />}
            </div>
            <div className="text-sm font-medium text-slate-200">
              {locked ? "Account Temporarily Locked" : "Authentication Required"}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              {locked ? "Too many failed login attempts" : "Enter your admin password to continue"}
            </div>
          </div>

          {locked ? (
            <div className="text-center">
              <div className="text-2xl font-mono font-bold text-amber-400 mb-2">{fmt(lockoutRemaining)}</div>
              <div className="text-[10px] text-slate-500">Please wait before trying again</div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="relative mb-3">
                <input ref={inputRef} type={showPw ? "text" : "password"} value={password}
                  onChange={e => { setPassword(e.target.value); setError(""); }}
                  placeholder="Password" autoComplete="current-password"
                  className="w-full text-xs px-3 py-2.5 pr-10 rounded-lg border border-white/[0.1] text-slate-100 outline-none focus:border-indigo-500 placeholder:text-slate-600"
                  style={{ background: "#0f172a" }} />
                <button type="button" onClick={() => setShowPw(!showPw)} aria-label={showPw ? "Hide" : "Show"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              {error && <div className="flex items-center gap-1.5 text-[10px] text-rose-400 mb-3"><AlertTriangle className="w-3 h-3 shrink-0" />{error}</div>}
              <button type="submit" disabled={checking || !password.trim()}
                className="w-full flex items-center justify-center gap-2 text-xs px-4 py-2.5 rounded-lg font-medium text-white disabled:opacity-50 transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
                {checking ? "Authenticating..." : <>Access Mission Control <ArrowRight className="w-3.5 h-3.5" /></>}
              </button>
            </form>
          )}
        </div>
        <div className="flex items-center justify-center gap-1 text-[10px] text-slate-600 mt-4"><Shield className="w-3 h-3" />Secured with Basic Auth &middot; 8h session</div>
      </div>
    </div>
  );
}
