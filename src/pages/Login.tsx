import { useState } from "react";
import { Lock, Eye, EyeOff, ArrowRight } from "lucide-react";

export default function Login({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setChecking(true);

    // Option 1: Hardcoded password (matches old frontend)
    if (password === "squidweave") {
      localStorage.setItem("sw_authenticated", "true");
      onLogin();
      setChecking(false);
      return;
    }

    // Option 2: Try backend auth
    try {
      const baseUrl = localStorage.getItem("sw_api_base") || "https://squidweave-api-production.up.railway.app";
      const res = await fetch(`${baseUrl}/state`, {
        headers: {
          "Authorization": `Basic ${btoa(`admin:${password}`)}`,
        },
      });
      if (res.ok) {
        localStorage.setItem("sw_authenticated", "true");
        localStorage.setItem("sw_auth", `Basic ${btoa(`admin:${password}`)}`);
        onLogin();
      } else {
        setError("Invalid password");
      }
    } catch {
      setError("Invalid password");
    }
    setChecking(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#08111f" }}>
      <div className="w-full max-w-sm mx-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="14" stroke="#818cf8" strokeWidth="1.5" opacity="0.5" />
              <circle cx="16" cy="16" r="8" stroke="#818cf8" strokeWidth="1.5" opacity="0.7" />
              <circle cx="16" cy="16" r="3" fill="#818cf8" opacity="0.9" />
              <circle cx="16" cy="5" r="2" fill="#f43f5e" opacity="0.9" />
              <circle cx="27" cy="20" r="2" fill="#f59e0b" opacity="0.9" />
              <circle cx="5" cy="20" r="2" fill="#10b981" opacity="0.9" />
            </svg>
            <span className="text-lg font-semibold tracking-tight text-slate-100">SquidWeave</span>
          </div>
          <div className="text-xs text-slate-500">Mission Control v21</div>
        </div>

        {/* Login Card */}
        <div className="p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
          <div className="text-center mb-5">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center mx-auto mb-3">
              <Lock className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="text-sm font-medium text-slate-200">Authentication Required</div>
            <div className="text-[10px] text-slate-500 mt-1">Enter your password to access the control panel</div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="relative mb-3">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(""); }}
                placeholder="Password"
                autoFocus
                className="w-full text-xs px-3 py-2.5 pr-10 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-indigo-500 placeholder:text-slate-600"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>

            {error && (
              <div className="text-[10px] text-rose-400 mb-3 px-1">{error}</div>
            )}

            <button
              type="submit"
              disabled={checking || !password}
              className="w-full flex items-center justify-center gap-2 text-xs px-4 py-2.5 rounded-lg bg-indigo-500 text-white font-medium disabled:opacity-50 hover:bg-indigo-600 transition-colors"
            >
              {checking ? "Authenticating..." : (
                <>Access Mission Control <ArrowRight className="w-3.5 h-3.5" /></>
              )}
            </button>
          </form>
        </div>

        {/* Hint */}
        <div className="text-center mt-4">
          <div className="text-[10px] text-slate-600">Default password: <span className="text-slate-400 font-mono">squidweave</span></div>
        </div>
      </div>
    </div>
  );
}
