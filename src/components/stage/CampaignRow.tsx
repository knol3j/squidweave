import { useState } from "react";
import { Globe, Palette, Save, Pencil, Building2, Globe2, Target, Sparkles, Loader2, CheckCircle, ScrollText, Bot, Cpu, Clock, Landmark, Radio, Github } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { dataService } from "@/services/dataService";
import DomainIntelligence from "@/components/funnel/DomainIntelligence";
import InvestorContactSheets from "@/components/funnel/InvestorContactSheets";
import SocialIntelligence from "@/components/funnel/SocialIntelligence";
import GitHubIntegration from "@/components/funnel/GitHubIntegration";

export default function CampaignRow() {
  const { state, updateBusinessProfile, runResearch } = useApp();
  const { campaign, businessProfile } = state;
  const [tab, setTabRaw] = useState<"profile" | "domain" | "investors" | "social" | "github">(() => {
    try { const s = localStorage.getItem("sw_tab_campaign"); return (s as any) || "profile"; } catch { return "profile"; }
  });
  const setTab = (t: "profile" | "domain" | "investors" | "social" | "github") => {
    setTabRaw(t);
    try { localStorage.setItem("sw_tab_campaign", t); } catch { /* silent */ }
  };
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({});
  const [bizForm, setBizForm] = useState({
    businessName: businessProfile.businessName,
    website: businessProfile.website,
    goals: businessProfile.goals,
    industry: businessProfile.industry,
    productDescription: businessProfile.productDescription,
    targetCustomer: businessProfile.targetCustomer,
  });

  const hasBiz = businessProfile.businessName && businessProfile.website && businessProfile.goals;
  const isResearching = businessProfile.researchStatus === "researching";
  const hasResearch = businessProfile.researchStatus === "completed";

  const startEdit = () => { setForm({ ...campaign }); setEditing(true); };

  const save = async () => {
    setSaving(true);
    try { await dataService.updateCampaign(campaign.id, form); setEditing(false); }
    catch (e: any) { alert("Save failed: " + e.message); }
    setSaving(false);
  };

  const saveBusiness = async () => {
    const profile = { ...bizForm, researchStatus: "idle" as const };
    updateBusinessProfile(profile);
    // Sync business profile to backend campaign so content generation / automation can use it
    const cid = state.campaignId || state.campaign?.id || "main-campaign";
    try {
      await dataService.updateCampaign(cid, {
        name: profile.businessName || cid,
        objective: profile.goals,
        audience: profile.targetCustomer,
        brandVoice: profile.industry,
        baseBody: profile.productDescription,
        automationEnabled: true,
      });
    } catch (e: any) {
      console.warn("[CampaignRow] Backend sync failed:", e.message);
      // Non-fatal: profile is still saved locally
    }
  };

  // runResearch now comes from AppContext — calls real backend APIs

  const locales: string[] = campaign?.locales || [];
  const palette: string[] = campaign?.designPalette || [];

  const tabs = [
    { key: "profile" as const, label: "Business Profile", icon: Building2 },
    { key: "domain" as const, label: "Domain Intel", icon: Globe },
    { key: "investors" as const, label: "Investors", icon: Landmark },
    { key: "social" as const, label: "Social", icon: Radio },
    { key: "github" as const, label: "GitHub", icon: Github },
  ];

  return (
    <div className="space-y-5 pt-3">
      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-1">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md transition-colors"
            style={tab === t.key ? { background: "rgba(99,102,241,0.12)", color: "#a5b4fc" } : { color: "#475569" }}>
            <t.icon className="w-3 h-3" />{t.label}
          </button>
        ))}
      </div>

      {tab === "profile" && (<>
      {/* Business Onboarding Section */}
      <div className="p-4 rounded-2xl border border-indigo-500/15" style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.06), rgba(139,92,246,0.04))" }}>
        <div className="flex items-center gap-2 mb-3">
          <Building2 className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-indigo-300">Business Profile</span>
          {hasResearch && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 ml-auto">Research Complete</span>}
          {isResearching && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 ml-auto flex items-center gap-1"><Loader2 className="w-2.5 h-2.5 animate-spin" /> Researching...</span>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <BizInput icon={<Building2 className="w-3 h-3" />} label="Business Name" value={bizForm.businessName} onChange={v => setBizForm({ ...bizForm, businessName: v })} placeholder="Acme Corp" />
          <BizInput icon={<Globe2 className="w-3 h-3" />} label="Website" value={bizForm.website} onChange={v => setBizForm({ ...bizForm, website: v })} placeholder="https://example.com" />
          <BizInput icon={<Target className="w-3 h-3" />} label="Industry" value={bizForm.industry} onChange={v => setBizForm({ ...bizForm, industry: v })} placeholder="SaaS, E-commerce..." />
          <div className="sm:col-span-2">
            <label className="text-[10px] font-medium text-slate-500 mb-1 flex items-center gap-1"><Target className="w-3 h-3" />Marketing Goals</label>
            <textarea value={bizForm.goals} onChange={e => setBizForm({ ...bizForm, goals: e.target.value })} placeholder="What do you want to achieve? e.g. Generate 100 qualified leads per month in the healthcare sector..."
              className="w-full text-xs px-2.5 py-2 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-indigo-500 transition-colors min-h-[60px] resize-y" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10px] font-medium text-slate-500 mb-1">What does your business do? What do you sell?</label>
            <textarea value={bizForm.productDescription} onChange={e => setBizForm({ ...bizForm, productDescription: e.target.value })} placeholder="Describe your product/service, key benefits, pricing tier..."
              className="w-full text-xs px-2.5 py-2 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-indigo-500 transition-colors min-h-[60px] resize-y" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10px] font-medium text-slate-500 mb-1">Who is your ideal customer?</label>
            <textarea value={bizForm.targetCustomer} onChange={e => setBizForm({ ...bizForm, targetCustomer: e.target.value })} placeholder="e.g. CTOs at mid-market healthcare companies, 100-500 employees..."
              className="w-full text-xs px-2.5 py-2 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-indigo-500 transition-colors min-h-[50px] resize-y" />
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          <button onClick={saveBusiness}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium bg-indigo-500 text-white hover:opacity-90 transition-opacity">
            <Save className="w-3 h-3" /> Save Profile
          </button>
          {hasBiz && (
            <button onClick={runResearch} disabled={isResearching}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #06b6d4, #0891b2)", color: "#fff" }}>
              {isResearching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              {isResearching ? "Agents Researching..." : "Run Agent Research"}
            </button>
          )}
        </div>

        {/* Research Findings */}
        {hasResearch && businessProfile.researchFindings.length > 0 && (
          <div className="mt-4 p-3 rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04]">
            <div className="flex items-center gap-1.5 mb-2">
              <CheckCircle className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Agent Research Findings</span>
            </div>
            <div className="space-y-1.5">
              {businessProfile.researchFindings.map((f, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px]">
                  <span className="text-emerald-500/60 mt-0.5">{i + 1}.</span>
                  <span className="text-slate-400">{f}</span>
                </div>
              ))}
            </div>
            {businessProfile.valueProposition && (
              <div className="mt-3 pt-2 border-t border-emerald-500/10">
                <span className="text-[10px] text-slate-600">Value Prop: </span>
                <span className="text-[11px] text-slate-300">{businessProfile.valueProposition}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Existing Campaign Display */}
      {campaign && (
        <div className="border-t border-white/[0.04] pt-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-base font-semibold text-slate-100">{campaign.name || "Untitled"}</h3>
              <p className="text-xs mt-0.5 text-slate-500">{campaign.objective || "No objective set"}</p>
            </div>
            <button onClick={startEdit}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-white/[0.1] text-slate-400 hover:bg-white/5 transition-colors">
              <Pencil className="w-3 h-3" /> Edit
            </button>
          </div>

          {!editing ? (
            <>
              <div className="flex flex-wrap gap-2 mb-3">
                {locales.map((loc: string) => (
                  <span key={loc} className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-indigo-500/30 text-indigo-300 bg-indigo-500/10">
                    <Globe className="w-2.5 h-2.5 inline mr-1" />{loc}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Audience" value={campaign.audience} />
                <Field label="Offer" value={campaign.offer} />
                <Field label="Channel" value={campaign.channel} />
                <Field label="Brand Voice" value={campaign.brandVoice} />
              </div>
              {campaign.designTheme && (
                <div className="mt-3 pt-3 border-t border-white/[0.04]">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-2">
                    <Palette className="w-3 h-3" /> Design System
                  </div>
                  <div className="text-xs text-slate-500">Theme: <span className="text-slate-100">{campaign.designTheme}</span></div>
                  {palette.length > 0 && (
                    <div className="flex gap-1.5 mt-1">
                      {palette.map((c: string, i: number) => (
                        <div key={i} className="w-5 h-5 rounded-full border border-white/20" style={{ background: c }} title={c} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <Input label="Name" value={form.name || ""} onChange={v => setForm({ ...form, name: v })} />
              <Input label="Objective" value={form.objective || ""} onChange={v => setForm({ ...form, objective: v })} />
              <Input label="Audience" value={form.audience || ""} onChange={v => setForm({ ...form, audience: v })} />
              <Input label="Offer" value={form.offer || ""} onChange={v => setForm({ ...form, offer: v })} />
              <div className="flex gap-2 pt-2">
                <button onClick={save} disabled={saving} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium bg-indigo-500 text-white disabled:opacity-50">
                  <Save className="w-3 h-3" /> {saving ? "Saving..." : "Save"}
                </button>
                <button onClick={() => setEditing(false)} className="text-xs px-3 py-1.5 rounded-lg border border-white/[0.1] text-slate-400 hover:bg-white/5">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mission Brief Panel */}
      {state.brainState && (
        <div className="p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
          <div className="flex items-center gap-2 mb-3">
            <ScrollText className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">Mission Brief</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><div className="text-[10px] text-slate-600">Markets</div><div className="text-xs text-slate-300">{(campaign?.markets || campaign?.locales || []).join(', ') || 'Not defined'}</div></div>
            <div><div className="text-[10px] text-slate-600">Audience</div><div className="text-xs text-slate-300">{campaign?.audience || 'Not defined'}</div></div>
            <div><div className="text-[10px] text-slate-600">Success</div><div className="text-xs text-slate-300">{campaign?.successDefinition || campaign?.objective || 'Not defined'}</div></div>
            <div><div className="text-[10px] text-slate-600">Channel</div><div className="text-xs text-slate-300">{campaign?.channel || 'Not defined'}</div></div>
          </div>
        </div>
      )}

      {/* Agent Studio Panel */}
      <div className="p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center gap-2 mb-3">
          <Bot className="w-4 h-4 text-violet-400" />
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-violet-300">Agent Studio</span>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {['Product Launch', 'SaaS Expansion', 'Brand Refresh'].map(agent => (
            <div key={agent} className="flex items-center justify-between p-2.5 rounded-xl border border-white/[0.06] bg-white/[0.03]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-violet-400" />
                <span className="text-xs text-slate-300">{agent}</span>
              </div>
              <span className="text-[10px] text-slate-600">{(campaign?.enabledModules || []).includes(agent) ? 'Active' : 'Available'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Autonomous Stack Panel */}
      {state.brainState && (
        <div className="p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-300">Autonomous Stack</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Automation</span>
              <span className={state.brainState.scheduler?.running ? 'text-emerald-400' : 'text-slate-600'}>
                {state.brainState.scheduler?.running ? 'enabled' : 'disabled'}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Target Profiles</span>
              <span className="text-slate-300">{state.brainState.memory?.targetProfiles?.length || 0}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Tactic Observations</span>
              <span className="text-slate-300">{state.brainState.memory?.tacticObservations?.length || 0}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Decisions</span>
              <span className="text-slate-300">{state.brainState.decisions?.length || 0}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Content Packs</span>
              <span className="text-slate-300">{state.brainState.contentPacks?.length || 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* Scheduler Panel */}
      {state.scheduler && (
        <div className="p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-sky-300">Scheduler</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between"><span className="text-slate-500">Status</span><span className={state.scheduler.running ? 'text-emerald-400' : 'text-slate-600'}>{state.scheduler.running ? 'Running' : 'Stopped'}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Interval</span><span className="text-slate-300">{state.scheduler.intervalSeconds ? `${state.scheduler.intervalSeconds}s` : 'N/A'}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Last Tick</span><span className="text-slate-300">{state.scheduler.lastTickAt ? new Date(state.scheduler.lastTickAt).toLocaleTimeString() : 'Never'}</span></div>
          </div>
        </div>
      )}
      </>)}

      {tab === "domain" && <DomainIntelligence />}

      {tab === "investors" && <InvestorContactSheets />}

      {tab === "social" && <SocialIntelligence />}

      {tab === "github" && <GitHubIntegration />}
    </div>
  );
}

function BizInput({ icon, label, value, onChange, placeholder }: { icon: React.ReactNode; label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div>
      <label className="text-[10px] font-medium text-slate-500 mb-1 flex items-center gap-1">{icon}{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-indigo-500 transition-colors" />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-medium uppercase tracking-wider text-slate-600">{label}</div>
      <div className="text-xs mt-0.5 text-slate-100">{value || "\u2014"}</div>
    </div>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[10px] font-medium block mb-1 text-slate-500">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)}
        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-indigo-500 transition-colors" />
    </div>
  );
}
