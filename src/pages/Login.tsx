import { useState } from "react";
import { Lock, Eye, EyeOff, ArrowRight, UserPlus, LogIn, Shield, Database, Download, Upload, User, ChevronDown } from "lucide-react";
import { registerUser, loginUser, importUserData, getUserCount, downloadDataExport } from "@/lib/userDatabase";
import type { DataExport } from "@/lib/userDatabase";

type AuthMode = "login" | "register" | "data";

export default function Login({ onLogin }: { onLogin: () => void }) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [company, setCompany] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [success, setSuccess] = useState("");
  const hasUsers = getUserCount() > 0;

  const resetForm = () => {
    setError("");
    setSuccess("");
    setPassword("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setChecking(true);

    const result = await loginUser(username, password);
    if (result.success) {
      onLogin();
    } else {
      setError(result.error || "Login failed");
    }
    setChecking(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setChecking(true);

    const result = await registerUser({
      username,
      password,
      email,
      displayName: displayName || username,
      company,
    });

    if (result.success) {
      setSuccess("Account created! Logging in...");
      setTimeout(() => onLogin(), 800);
    } else {
      setError(result.error || "Registration failed");
    }
    setChecking(false);
  };

  const handleLegacyLogin = () => {
    if (password === "squidweave") {
      localStorage.setItem("sw_authenticated", "true");
      onLogin();
    } else {
      setError("Invalid legacy password");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string) as DataExport;
        const result = importUserData(data);
        if (result.success) {
          setSuccess("Data imported! " + (data.exportedBy ? `Previously exported by ${data.exportedBy}` : ""));
        } else {
          setError(result.error || "Import failed");
        }
      } catch {
        setError("Invalid JSON file");
      }
    };
    reader.readAsText(file);
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
          <div className="text-xs text-slate-500">Mission Control v25</div>
        </div>

        {/* Mode Switcher */}
        <div className="flex gap-1 mb-4 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          {(["login", "register", "data"] as AuthMode[]).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); resetForm(); }}
              className={`flex-1 text-[11px] py-1.5 rounded-lg font-medium transition-all ${
                mode === m
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {m === "login" && <span className="flex items-center justify-center gap-1"><LogIn className="w-3 h-3"/> Sign In</span>}
              {m === "register" && <span className="flex items-center justify-center gap-1"><UserPlus className="w-3 h-3"/> Register</span>}
              {m === "data" && <span className="flex items-center justify-center gap-1"><Database className="w-3 h-3"/> My Data</span>}
            </button>
          ))}
        </div>

        {/* Login Card */}
        <div className="p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02]">

          {mode === "login" && (
            <>
              <div className="text-center mb-5">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center mx-auto mb-3">
                  <Lock className="w-5 h-5 text-indigo-400" />
                </div>
                <div className="text-sm font-medium text-slate-200">Sign In</div>
                <div className="text-[10px] text-slate-500 mt-1">Access your advertising command center</div>
              </div>

              <form onSubmit={handleLogin}>
                <div className="space-y-3">
                  <input
                    type="text" value={username} onChange={e => { setUsername(e.target.value); setError(""); }}
                    placeholder="Username or email"
                    autoFocus
                    className="w-full text-xs px-3 py-2.5 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-indigo-500 placeholder:text-slate-600"
                  />
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"} value={password} onChange={e => { setPassword(e.target.value); setError(""); }}
                      placeholder="Password"
                      className="w-full text-xs px-3 py-2.5 pr-10 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-indigo-500 placeholder:text-slate-600"
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                      {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {error && <div className="text-[10px] text-rose-400 mt-2 px-1">{error}</div>}

                <button type="submit" disabled={checking || !username || !password}
                  className="w-full flex items-center justify-center gap-2 text-xs px-4 py-2.5 mt-4 rounded-lg bg-indigo-500 text-white font-medium disabled:opacity-50 hover:bg-indigo-600 transition-colors">
                  {checking ? "Signing in..." : <>Sign In <ArrowRight className="w-3.5 h-3.5" /></>}
                </button>
              </form>

              {/* Legacy login fallback */}
              {!hasUsers && (
                <div className="mt-4 pt-4 border-t border-white/[0.06]">
                  <div className="text-[10px] text-slate-500 mb-2 text-center">No registered users yet. Use legacy access:</div>
                  <button onClick={handleLegacyLogin}
                    className="w-full text-[10px] py-1.5 rounded-lg border border-white/[0.1] text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] transition-colors">
                    Legacy Access (password: squidweave)
                  </button>
                </div>
              )}
            </>
          )}

          {mode === "register" && (
            <>
              <div className="text-center mb-5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                  <UserPlus className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="text-sm font-medium text-slate-200">Create Account</div>
                <div className="text-[10px] text-slate-500 mt-1">Your data stays local — you own everything</div>
              </div>

              <form onSubmit={handleRegister}>
                <div className="space-y-3">
                  <input type="text" value={username} onChange={e => { setUsername(e.target.value); setError(""); }}
                    placeholder="Username (min 3 chars)" autoFocus
                    className="w-full text-xs px-3 py-2.5 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-indigo-500 placeholder:text-slate-600" />
                  <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
                    placeholder="Display Name (optional)"
                    className="w-full text-xs px-3 py-2.5 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-indigo-500 placeholder:text-slate-600" />
                  <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(""); }}
                    placeholder="Email"
                    className="w-full text-xs px-3 py-2.5 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-indigo-500 placeholder:text-slate-600" />
                  <input type="text" value={company} onChange={e => setCompany(e.target.value)}
                    placeholder="Company (optional)"
                    className="w-full text-xs px-3 py-2.5 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-indigo-500 placeholder:text-slate-600" />
                  <div className="relative">
                    <input type={showPw ? "text" : "password"} value={password} onChange={e => { setPassword(e.target.value); setError(""); }}
                      placeholder="Password (min 6 chars)"
                      className="w-full text-xs px-3 py-2.5 pr-10 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-indigo-500 placeholder:text-slate-600" />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                      {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {error && <div className="text-[10px] text-rose-400 mt-2 px-1">{error}</div>}
                {success && <div className="text-[10px] text-emerald-400 mt-2 px-1">{success}</div>}

                <button type="submit" disabled={checking || !username || !email || !password}
                  className="w-full flex items-center justify-center gap-2 text-xs px-4 py-2.5 mt-4 rounded-lg bg-emerald-600 text-white font-medium disabled:opacity-50 hover:bg-emerald-700 transition-colors">
                  {checking ? "Creating account..." : <>Create Account <ArrowRight className="w-3.5 h-3.5" /></>}
                </button>

                <div className="flex items-center gap-2 mt-3 text-[10px] text-slate-500">
                  <Shield className="w-3 h-3" />
                  <span>Passwords are hashed with SHA-256 + salt. All data stored locally.</span>
                </div>
              </form>
            </>
          )}

          {mode === "data" && (
            <>
              <div className="text-center mb-5">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center mx-auto mb-3">
                  <Database className="w-5 h-5 text-violet-400" />
                </div>
                <div className="text-sm font-medium text-slate-200">Data Ownership</div>
                <div className="text-[10px] text-slate-500 mt-1">You own your data. Export or import anytime.</div>
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                  <div className="flex items-center gap-2 mb-2">
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-xs font-medium text-slate-200">Export Your Data</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mb-2">
                    Download a complete backup of all your campaigns, contacts, decks, and settings as a JSON file.
                  </div>
                  <button
                    onClick={() => {
                      const userId = JSON.parse(localStorage.getItem("sw_current_user") || "{}").id;
                      if (userId) {
                        downloadDataExport(userId);
                      } else {
                        // Legacy: export all localStorage
                        const allData: Record<string, any> = {};
                        for (let i = 0; i < localStorage.length; i++) {
                          const key = localStorage.key(i);
                          if (key && key.startsWith("sw_")) {
                            try { allData[key] = JSON.parse(localStorage.getItem(key) || ""); } catch { allData[key] = localStorage.getItem(key); }
                          }
                        }
                        const blob = new Blob([JSON.stringify(allData, null, 2)], { type: "application/json" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url; a.download = `squidweave-backup-${new Date().toISOString().split("T")[0]}.json`;
                        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
                      }
                    }}
                    className="w-full text-[11px] py-1.5 rounded-lg border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 transition-colors"
                  >
                    Download Full Backup
                  </button>
                </div>

                <div className="p-3 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                  <div className="flex items-center gap-2 mb-2">
                    <Upload className="w-3.5 h-3.5 text-sky-400" />
                    <span className="text-xs font-medium text-slate-200">Import Data</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mb-2">
                    Restore from a previous backup. This will overwrite existing data.
                  </div>
                  <label className="w-full block text-center text-[11px] py-1.5 rounded-lg border border-sky-500/30 text-sky-300 hover:bg-sky-500/10 transition-colors cursor-pointer">
                    Select Backup File
                    <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                  </label>
                </div>

                {success && <div className="text-[10px] text-emerald-400 px-1">{success}</div>}
                {error && <div className="text-[10px] text-rose-400 px-1">{error}</div>}

                <div className="text-[10px] text-slate-600 text-center pt-2">
                  <User className="w-3 h-3 inline mr-1" />
                  {getUserCount()} registered user{getUserCount() !== 1 ? "s" : ""} on this device
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
