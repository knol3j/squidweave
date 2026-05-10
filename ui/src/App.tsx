/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Layout from './components/Layout';
import Sidebar from './components/Sidebar';
import ChatPanel from './components/ChatPanel';
import { Activity, Bot, Download, FileCode, FileJson, FileText, Share2, User as UserIcon, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect, useRef } from 'react';
import { CTRChart, ConversionChart } from './components/PerformanceChart';
import Onboarding from './components/Onboarding';
import ABTestingPanel from './components/ABTestingPanel';
import CampaignPreview from './components/CampaignPreview';
import AudienceInsight from './components/AudienceInsight';
import Performance from './components/Performance';
import { CollaborationProvider, useCollaboration } from './components/CollaborationProvider';
import { jsPDF } from 'jspdf';
import BrainDashboard from './components/BrainDashboard';
import { dataService } from './services/dataService';
import { SquidCompatProvider } from './lib/squid';

function AppContent() {
  const { user, loading: authLoading, campaignState, updateCampaignState, sendMessage, messages } = useCollaboration();
  const activePrompt = campaignState.activePrompt;
  const activeTab = campaignState.activeTab || 'engine';
  
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [runningBrain, setRunningBrain] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

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
    const hasSeenOnboarding = localStorage.getItem('localeweave_onboarding_seen');
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, []);

  const handleOnboardingComplete = () => {
    localStorage.setItem('localeweave_onboarding_seen', 'true');
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
      await updateCampaignState({ automationEnabled: true, activeTab: 'engine' });
      await dataService.runAutomation(campaignState.id || 'main-campaign', 'top-bar-run');
    } finally {
      setRunningBrain(false);
    }
  };

  const handleExport = (format: 'txt' | 'json' | 'pdf') => {
    const fileName = `localeweave-campaign-export.${format}`;
    setExportMenuOpen(false);

    if (format === 'pdf') {
      const doc = new jsPDF();
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 210, 297, 'F');
      
      doc.setTextColor(99, 102, 241);
      doc.setFontSize(24);
      doc.text("LOCALEWEAVE", 20, 30);
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.text("Campaign Architecture Report", 20, 45);
      
      doc.setDrawColor(255, 255, 255, 0.1);
      doc.line(20, 55, 190, 55);
      
      doc.setFontSize(10);
      doc.setTextColor(148, 163, 184);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 65);
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
      content = "LocaleWeave Campaign Export\n" + 
                "==========================\n\n" + 
                "Context: " + (activePrompt || "None") + "\n\n" +
                "Date: " + new Date().toLocaleString();
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
        {showOnboarding && <Onboarding onComplete={handleOnboardingComplete} />}
      </AnimatePresence>

      <div className="flex h-full flex-1 gap-4 overflow-hidden bg-[#f4f1f9] p-4">
        {/* Main Workspace Group */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Top Bar for Engine Status */}
          <div className="flex h-16 items-center justify-between rounded-[24px] border border-slate-200 bg-white px-6 shadow-[0_6px_24px_rgba(99,102,241,0.05)]">
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-[0.2em]">Agent Platform: live telemetry only</span>
                </div>
              <div className="hidden text-[10px] uppercase tracking-[0.2em] text-slate-400 md:block">
                Translation Layer: <span className="text-slate-700">{campaignState.locales?.join(', ') || 'No locales configured'}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
                <div className="w-6 h-6 rounded-full overflow-hidden border border-violet-200 bg-white">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || ''} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <UserIcon className="w-full h-full p-1 text-slate-500" />
                  )}
                </div>
                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-[0.18em] max-w-[80px] truncate">
                  {user.displayName?.split(' ')[0]}
                </span>
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
              </div>

              <div className="w-px h-6 bg-slate-200"></div>

              <div className="relative" ref={exportRef}>
                <button 
                  onClick={() => setExportMenuOpen(!exportMenuOpen)}
                  className="group relative rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  title="Export Campaign"
                >
                  <Download className="w-4 h-4" />
                  <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">Export Options</span>
                </button>

                <AnimatePresence>
                  {exportMenuOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
                    >
                      <div className="p-2 space-y-1">
                        <div className="mb-1 border-b border-slate-100 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                          Select Format
                        </div>
                        <button 
                          onClick={() => handleExport('txt')}
                          className="group/item flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900"
                        >
                          <FileText className="w-4 h-4 text-blue-400 group-hover/item:scale-110 transition-transform" />
                          <div className="text-left">
                            <div className="font-bold">Text Document</div>
                            <div className="text-[10px] text-slate-400">Simple context dump</div>
                          </div>
                        </button>
                        <button 
                          onClick={() => handleExport('json')}
                          className="group/item flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900"
                        >
                          <FileJson className="w-4 h-4 text-fuchsia-400 group-hover/item:scale-110 transition-transform" />
                          <div className="text-left">
                            <div className="font-bold">JSON Schema</div>
                            <div className="text-[10px] text-slate-400">Full campaign data</div>
                          </div>
                        </button>
                        <button 
                          onClick={() => handleExport('pdf')}
                          className="group/item flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900"
                        >
                          <FileCode className="w-4 h-4 text-emerald-400 group-hover/item:scale-110 transition-transform" />
                          <div className="text-left">
                            <div className="font-bold">PDF Master Report</div>
                            <div className="text-[10px] text-slate-400">Executive summary</div>
                          </div>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button className="group relative rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
                <Share2 className="w-4 h-4" />
                <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">Share Link</span>
              </button>
              <div className="mx-2 h-6 w-px bg-slate-200"></div>
              <button
                onClick={runBrain}
                disabled={runningBrain}
                className="rounded-xl bg-violet-500 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white shadow-lg shadow-violet-500/20 transition-all hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
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
                  className="absolute inset-0 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_8px_30px_rgba(102,70,170,0.06)]"
                >
                  <div className="grid h-full min-h-0 xl:grid-cols-[1.5fr_0.7fr]">
                    <div className="min-h-0 overflow-hidden">
                      <BrainDashboard />
                    </div>
                    <div className="min-h-0 border-l border-slate-200 bg-[#fcfbfe]">
                      <ChatPanel externalPrompt={activePrompt} />
                    </div>
                  </div>
                </motion.div>
              ) : activeTab === 'campaigns' ? (
                <motion.div 
                  key="campaigns"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute inset-0 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_8px_30px_rgba(102,70,170,0.06)]"
                >
                  <CampaignPreview />
                </motion.div>
              ) : activeTab === 'ab-test' ? (
                <motion.div 
                  key="ab-test"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute inset-0 overflow-hidden rounded-[28px]"
                >
                  <ABTestingPanel 
                    onNavigatePerformance={() => setActiveTab('performance')} 
                    onNavigateEngine={(context) => {
                      updateCampaignState({ activePrompt: context, activeTab: 'engine' });
                    }}
                  />
                </motion.div>
              ) : activeTab === 'audience' ? (
                <motion.div 
                  key="audience"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute inset-0 overflow-hidden rounded-[28px]"
                >
                  <AudienceInsight />
                </motion.div>
              ) : activeTab === 'performance' ? (
                <motion.div 
                  key="performance"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute inset-0 overflow-hidden rounded-[28px]"
                >
                  <Performance />
                </motion.div>
              ) : (
                <motion.div 
                  key="fallback"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 flex items-center justify-center rounded-[28px] border border-slate-200 bg-white"
                >
                  <div className="text-center space-y-4">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-200 bg-violet-50">
                      <Zap className="w-8 h-8 text-violet-500 animate-pulse" />
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
          <div className="flex flex-1 flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(102,70,170,0.06)]">
            <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
              <Activity className="w-3 h-3 text-violet-500" />
              operations
            </h3>
            
            <div className="flex-1 space-y-6 overflow-y-auto pr-2 text-[10px] font-mono custom-scrollbar">
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-bold uppercase tracking-tight text-slate-500">Decision Rhythm</span>
                  <span className="font-bold text-violet-500">live</span>
                </div>
                <div className="flex h-44 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 p-2">
                  <CTRChart />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-bold uppercase tracking-tight text-slate-500">Locale Conversions</span>
                  <span className="font-bold text-fuchsia-500">tracked</span>
                </div>
                <div className="flex h-44 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 p-2">
                  <ConversionChart />
                </div>
              </div>
              
              <div className="mt-6 space-y-2 rounded-2xl border border-violet-100 bg-violet-50 p-4">
                <div className="flex items-center gap-2">
                  <Bot className="h-3.5 w-3.5 text-violet-500" />
                  <span className="font-bold uppercase tracking-tight text-violet-700">Brain Insight</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-600">
                  This rail only reflects persisted backend state. If a source is not connected, the UI should show no live data instead of synthetic estimates.
                </p>
              </div>
            </div>
          </div>

          {/* Footer Metrics */}
          <div className="flex h-28 flex-col justify-center gap-3 rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_8px_30px_rgba(102,70,170,0.06)]">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-slate-500">AUTOMATION</span>
              <span className="text-slate-800">{campaignState.automationEnabled ? 'ENABLED' : 'DISABLED'}</span>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-slate-500">LINKED MODULES</span>
              <span className="text-violet-500">{campaignState.enabledModules?.length || 0}</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: campaignState.automationEnabled ? "100%" : "0%" }}
                className="h-full bg-violet-500" 
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
      <CollaborationProvider>
        <AppContent />
      </CollaborationProvider>
    </SquidCompatProvider>
  );
}
