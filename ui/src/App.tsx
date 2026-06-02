/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Layout from './components/Layout';
import Sidebar from './components/Sidebar';
import { Activity, Bot, Download, FileCode, FileJson, FileText, Share2, User as UserIcon, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Suspense, lazy, useState, useEffect, useRef } from 'react';
import { CTRChart, ConversionChart } from './components/PerformanceChart';
import { formatShortDateTime } from './lib/format';
import { CollaborationProvider, useCollaboration } from './components/CollaborationProvider';
import { dataService, getApiUrl, getAuthEventName, setAuthCredentials, clearAuthCredentials, hasAuthCredentials } from './services/dataService';
import { SquidCompatProvider } from './lib/squid';

const Onboarding = lazy(() => import('./components/Onboarding'));
const BrainDashboard = lazy(() => import('./components/BrainDashboard'));
const ChatPanel = lazy(() => import('./components/ChatPanel'));
const CampaignPreview = lazy(() => import('./components/CampaignPreview'));
const ABTestingPanel = lazy(() => import('./components/ABTestingPanel'));
const AudienceInsight = lazy(() => import('./components/AudienceInsight'));
const Performance = lazy(() => import('./components/Performance'));
const FundingDashboard = lazy(() => import('./components/FundingDashboard'));

function PanelFallback({ label = 'Loading module...' }: { label?: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-[28px] border border-white/10 bg-[#08111f]/92">
      <div className="text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10">
          <Zap className="w-8 h-8 text-indigo-400 animate-pulse" />
        </div>
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{label}</div>
      </div>
    </div>
  );
}

// ── Login Gate ──────────────────────────────────────────────
// Shows a simple login form when the server returns 401.
// Stores credentials in sessionStorage for subsequent API calls.
function LoginGate({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState(hasAuthCredentials());
  const [error, setError] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const handleAuthChange = () => {
      setAuthenticated(hasAuthCredentials());
    };
    window.addEventListener(getAuthEventName(), handleAuthChange);
    return () => window.removeEventListener(getAuthEventName(), handleAuthChange);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      setAuthCredentials(username, password);
      await dataService.verifyCredentials();
      setAuthenticated(true);
    } catch (err) {
      clearAuthCredentials();
      setError(err instanceof Error ? err.message : 'Connection error');
    } finally {
      setSubmitting(false);
    }
  };

  if (authenticated) return <>{children}</>;

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#020617', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif' }}>
      <form onSubmit={handleSubmit} style={{ background: '#0f172a', padding: '2.5rem 2rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.08)', width: '380px', boxShadow: '0 0 60px -15px rgba(112, 48, 192, 0.15)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src="/logo-login.png" alt="SquidWeave" style={{ height: '100px', margin: '0 auto 1rem', display: 'block', objectFit: 'contain' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.25rem' }}>Welcome Back</h2>
          <p style={{ fontSize: '0.75rem', color: '#64748b', letterSpacing: '0.05em' }}>Sign in to SquidWeave</p>
        </div>
        {error && <div style={{ color: '#f87171', marginBottom: '0.75rem', textAlign: 'center', fontSize: '0.875rem' }}>{error}</div>}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', color: '#94a3b8' }}>Username</label>
          <input type="text" value={username} onChange={e => setUsername(e.target.value)} style={{ width: '100%', padding: '0.5rem', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.375rem', color: '#e2e8f0', boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', color: '#94a3b8' }}>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoFocus style={{ width: '100%', padding: '0.5rem', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.375rem', color: '#e2e8f0', boxSizing: 'border-box' }} />
        </div>
        <button type="submit" disabled={submitting} style={{ width: '100%', padding: '0.625rem', background: 'linear-gradient(135deg, #7c3aed, #2563eb)', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: submitting ? 'wait' : 'pointer', fontWeight: 600, fontSize: '0.875rem', letterSpacing: '0.03em', boxShadow: '0 0 20px -5px rgba(124, 58, 237, 0.3)', opacity: submitting ? 0.8 : 1 }}>{submitting ? 'Signing In...' : 'Sign In'}</button>
      </form>
    </div>
  );
}

function AppContent() {
  const { user, loading: authLoading, campaignState, updateCampaignState, sendMessage, messages } = useCollaboration();
  const activePrompt = campaignState.activePrompt;
  const activeTab = campaignState.activeTab || 'engine';
  
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [runningBrain, setRunningBrain] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // D4(a): Read URL query params on mount and apply to active tab
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    const campaignIdParam = params.get('campaignId');
    const updates: Record<string, string> = {};
    if (tabParam) updates.activeTab = tabParam;
    if (campaignIdParam) updates.id = campaignIdParam;
    if (Object.keys(updates).length > 0) {
      void updateCampaignState(updates as any);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(event.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const hasSeenOnboarding =
      localStorage.getItem('squidweave_onboarding_seen') ||
      localStorage.getItem('localeweave_onboarding_seen');
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, []);

  const handleOnboardingComplete = () => {
    localStorage.setItem('squidweave_onboarding_seen', 'true');
    setShowOnboarding(false);
  };

  const handleTemplateSelect = (prompt: string) => {
    updateCampaignState({ activePrompt: prompt });
  };

  const setActiveTab = (tab: string) => {
    updateCampaignState({ activeTab: tab });
  };

  const runBrain = async () => {
    setRunningBrain(true);
    try {
      await dataService.runAutomation(campaignState.id || 'main-campaign', 'top-bar-run');
      await updateCampaignState({ automationEnabled: true, activeTab: 'engine' });
    } catch (err) {
      console.error('runBrain error:', err);
    } finally {
      setRunningBrain(false);
    }
  };

  const handleExport = async (format: 'txt' | 'json' | 'pdf') => {
    const fileName = `squidweave-campaign-export.${format}`;
    setExportMenuOpen(false);

    if (format === 'pdf') {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 210, 297, 'F');
      
      doc.setTextColor(99, 102, 241);
      doc.setFontSize(24);
      doc.text("SQUIDWEAVE", 20, 30);
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.text("Campaign Architecture Report", 20, 45);
      
      doc.setDrawColor(255, 255, 255, 0.1);
      doc.line(20, 55, 190, 55);
      
      doc.setFontSize(10);
      doc.setTextColor(148, 163, 184);
      doc.text(`Generated: ${formatShortDateTime(new Date())}`, 20, 65);
      doc.text(`User: ${user?.displayName || 'Anonymous'}`, 20, 72);
      
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text("Campaign Context & Vision", 20, 90);
      
      doc.setFontSize(10);
      doc.setTextColor(203, 213, 225);
      const splitText = doc.splitTextToSize(activePrompt || "No prompt active", 170);
      doc.text(splitText, 20, 100);

      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text("Latest Collaboration Thread", 20, 160);
      
      let y = 170;
      messages.slice(-5).forEach((msg: any) => {
        doc.setFontSize(8);
        doc.setTextColor(99, 102, 241);
        doc.text(msg.role.toUpperCase(), 20, y);
        doc.setTextColor(148, 163, 184);
        const msgLines = doc.splitTextToSize(msg.content.substring(0, 200), 170);
        doc.text(msgLines, 20, y + 5);
        y += 25;
      });
      
      doc.save(fileName);
      return;
    }

    let content = "";
    let type = "";

    if (format === 'txt') {
      content = "SquidWeave Campaign Export\n" + 
                "==========================\n\n" + 
                "Context: " + (activePrompt || "None") + "\n\n" +
                "Date: " + formatShortDateTime(new Date());
      type = 'text/plain';
    } else if (format === 'json') {
      content = JSON.stringify({
        version: "2.4.0",
        exportDate: new Date().toISOString(),
        user: { name: user?.displayName, id: user?.uid },
        campaign: {
          prompt: activePrompt,
          tab: activeTab
        },
        recentMessages: messages.slice(-20)
      }, null, 2);
      type = 'application/json';
    }

    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (authLoading) {
    return (
      <div className="h-screen w-screen bg-[#020617] flex items-center justify-center">
        <Zap className="w-12 h-12 text-indigo-500 animate-pulse" />
      </div>
    );
  }

  return (
    <Layout sidebar={<Sidebar onSelectTemplate={handleTemplateSelect} activeTab={activeTab} onSelectTab={setActiveTab} />}>
      <AnimatePresence>
        {showOnboarding && (
          <Suspense fallback={<PanelFallback label="Loading onboarding..." />}>
            <Onboarding onComplete={handleOnboardingComplete} />
          </Suspense>
        )}
      </AnimatePresence>

      <div className="flex h-full flex-1 gap-4 overflow-hidden bg-transparent p-4">
        {/* Main Workspace Group */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Top Bar for Engine Status */}
          <div className="flex h-16 items-center justify-between rounded-[24px] border border-white/10 bg-[#08111f]/90 px-6 shadow-[0_18px_48px_rgba(2,6,23,0.35)] backdrop-blur-xl">
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.2em]">Agent Platform: live telemetry only</span>
                </div>
              <div className="hidden text-[10px] uppercase tracking-[0.2em] text-slate-500 md:block">
                Mission Scope: <span className="text-slate-200">{campaignState.markets?.join(', ') || campaignState.locales?.join(', ') || 'No markets configured'}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
                <div className="w-6 h-6 rounded-full overflow-hidden border border-indigo-500/20 bg-[#111c2b]">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || ''} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <UserIcon className="w-full h-full p-1 text-slate-400" />
                  )}
                </div>
                <span className="text-[10px] font-bold text-slate-200 uppercase tracking-[0.18em] max-w-[80px] truncate">
                  {user.displayName?.split(' ')[0]}
                </span>
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
              </div>

              <div className="w-px h-6 bg-white/10"></div>

              <div className="relative" ref={exportRef}>
                <button 
                  onClick={() => setExportMenuOpen(!exportMenuOpen)}
                  className="group relative rounded-lg p-2 text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-100"
                  title="Export Campaign"
                >
                  <Download className="w-4 h-4" />
                  <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">Export Options</span>
                </button>

                <AnimatePresence>
                  {exportMenuOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#08111f] shadow-2xl"
                    >
                      <div className="p-2 space-y-1">
                        <div className="mb-1 border-b border-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                          Select Format
                        </div>
                        <button 
                          onClick={() => handleExport('txt')}
                          className="group/item flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs text-slate-300 transition-all hover:bg-white/5 hover:text-white"
                        >
                          <FileText className="w-4 h-4 text-blue-400 group-hover/item:scale-110 transition-transform" />
                          <div className="text-left">
                            <div className="font-bold">Text Document</div>
                            <div className="text-[10px] text-slate-500">Simple context dump</div>
                          </div>
                        </button>
                        <button 
                          onClick={() => handleExport('json')}
                          className="group/item flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs text-slate-300 transition-all hover:bg-white/5 hover:text-white"
                        >
                          <FileJson className="w-4 h-4 text-fuchsia-400 group-hover/item:scale-110 transition-transform" />
                          <div className="text-left">
                            <div className="font-bold">JSON Schema</div>
                            <div className="text-[10px] text-slate-500">Full campaign data</div>
                          </div>
                        </button>
                        <button 
                          onClick={() => handleExport('pdf')}
                          className="group/item flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs text-slate-300 transition-all hover:bg-white/5 hover:text-white"
                        >
                          <FileCode className="w-4 h-4 text-emerald-400 group-hover/item:scale-110 transition-transform" />
                          <div className="text-left">
                            <div className="font-bold">PDF Master Report</div>
                            <div className="text-[10px] text-slate-500">Executive summary</div>
                          </div>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                onClick={() => {
                  const base = window.location.origin + window.location.pathname;
                  const params = new URLSearchParams({
                    tab: activeTab,
                    campaignId: campaignState.id || 'main-campaign',
                  });
                  navigator.clipboard.writeText(`${base}?${params.toString()}`);
                  setLinkCopied(true);
                  setTimeout(() => setLinkCopied(false), 2000);
                }}
                className="group relative rounded-lg p-2 text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-100"
              >
                <Share2 className="w-4 h-4" />
                <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">{linkCopied ? 'Copied!' : 'Share Link'}</span>
              </button>
              <div className="mx-2 h-6 w-px bg-white/10"></div>
              <button
                onClick={runBrain}
                disabled={runningBrain}
                className="rounded-xl bg-indigo-500 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {runningBrain ? 'running...' : activeTab === 'ab-test' ? 'rerun test' : 'run brain'}
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-hidden relative">
            <AnimatePresence mode="wait">
              {activeTab === 'engine' ? (
                <motion.div 
                  key="engine"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute inset-0 overflow-hidden rounded-[28px] border border-white/10 bg-[#08111f]/92 shadow-[0_14px_40px_rgba(2,6,23,0.35)]"
                >
                  <Suspense fallback={<PanelFallback label="Loading engine..." />}>
                    <div className="grid h-full min-h-0 xl:grid-cols-[1.5fr_0.7fr]">
                      <div className="min-h-0 overflow-hidden">
                        <BrainDashboard />
                      </div>
                      <div className="min-h-0 border-l border-white/10 bg-[#091425]">
                        <ChatPanel externalPrompt={activePrompt} />
                      </div>
                    </div>
                  </Suspense>
                </motion.div>
              ) : activeTab === 'campaigns' ? (
                <motion.div 
                  key="campaigns"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute inset-0 overflow-hidden rounded-[28px] border border-white/10 bg-[#08111f]/92 shadow-[0_14px_40px_rgba(2,6,23,0.35)]"
                >
                  <Suspense fallback={<PanelFallback label="Loading campaign workspace..." />}>
                    <CampaignPreview />
                  </Suspense>
                </motion.div>
              ) : activeTab === 'ab-test' ? (
                <motion.div 
                  key="ab-test"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute inset-0 overflow-hidden rounded-[28px]"
                >
                  <Suspense fallback={<PanelFallback label="Loading AB testing..." />}>
                    <ABTestingPanel 
                      onNavigatePerformance={() => setActiveTab('performance')} 
                      onNavigateEngine={(context) => {
                        updateCampaignState({ activePrompt: context, activeTab: 'engine' });
                      }}
                    />
                  </Suspense>
                </motion.div>
              ) : activeTab === 'audience' ? (
                <motion.div 
                  key="audience"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute inset-0 overflow-hidden rounded-[28px]"
                >
                  <Suspense fallback={<PanelFallback label="Loading audience insights..." />}>
                    <AudienceInsight />
                  </Suspense>
                </motion.div>
              ) : activeTab === 'performance' ? (
                <motion.div 
                  key="performance"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute inset-0 overflow-hidden rounded-[28px]"
                >
                  <Suspense fallback={<PanelFallback label="Loading performance..." />}>
                    <Performance />
                  </Suspense>
                </motion.div>
              ) : activeTab === 'funding' ? (
                <motion.div 
                  key="funding"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute inset-0 overflow-hidden rounded-[28px] border border-white/10 bg-[#08111f]/92 shadow-[0_14px_40px_rgba(2,6,23,0.35)]"
                >
                  <Suspense fallback={<PanelFallback label="Loading funding workspace..." />}>
                    <FundingDashboard />
                  </Suspense>
                </motion.div>
              ) : (
                <motion.div 
                  key="fallback"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 flex items-center justify-center rounded-[28px] border border-white/10 bg-[#08111f]/92"
                >
                  <div className="text-center space-y-4">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10">
                      <Zap className="w-8 h-8 text-indigo-400 animate-pulse" />
                    </div>
                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{activeTab} node initializing...</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Sidebar: Build Output / Performance */}
        <aside className="hidden w-72 shrink-0 flex-col gap-4 overflow-hidden xl:flex">
          <div className="flex flex-1 flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#08111f]/90 p-5 shadow-[0_14px_40px_rgba(2,6,23,0.35)]">
            <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
              <Activity className="w-3 h-3 text-indigo-400" />
              operations
            </h3>
            
            <div className="flex-1 space-y-6 overflow-y-auto pr-2 text-[10px] font-mono custom-scrollbar">
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-bold uppercase tracking-tight text-slate-500">Decision Rhythm</span>
                  <span className="font-bold text-indigo-400">live</span>
                </div>
                <div className="flex h-44 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-2">
                  <CTRChart />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-bold uppercase tracking-tight text-slate-500">Locale Conversions</span>
                  <span className="font-bold text-fuchsia-500">tracked</span>
                </div>
                <div className="flex h-44 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-2">
                  <ConversionChart />
                </div>
              </div>
              
              <div className="mt-6 space-y-2 rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-4">
                <div className="flex items-center gap-2">
                  <Bot className="h-3.5 w-3.5 text-indigo-300" />
                  <span className="font-bold uppercase tracking-tight text-indigo-200">Agent Insight</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-300">
                  This rail only reflects persisted backend state. If a source is not connected, the UI should show no live data instead of synthetic estimates.
                </p>
              </div>
            </div>
          </div>

          {/* Footer Metrics */}
          <div className="flex h-28 flex-col justify-center gap-3 rounded-[28px] border border-white/10 bg-[#08111f]/90 p-4 shadow-[0_14px_40px_rgba(2,6,23,0.35)]">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-slate-500">AUTOMATION</span>
              <span className="text-slate-100">{campaignState.automationEnabled ? 'ENABLED' : 'DISABLED'}</span>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-slate-500">LINKED MODULES</span>
              <span className="text-indigo-400">{campaignState.enabledModules?.length || 0}</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: campaignState.automationEnabled ? "100%" : "0%" }}
                className="h-full bg-indigo-500" 
              />
            </div>
          </div>
        </aside>
      </div>
    </Layout>
  );
}

export default function App() {
  return (
    <SquidCompatProvider>
      <LoginGate>
        <CollaborationProvider>
          <AppContent />
        </CollaborationProvider>
      </LoginGate>
    </SquidCompatProvider>
  );
}
