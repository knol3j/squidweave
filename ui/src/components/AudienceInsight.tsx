import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Target, Zap, Brain, TrendingUp,
  MapPin, Plus, Sparkles
} from 'lucide-react';
import { dataService, Persona } from '../services/dataService';
import { useCollaboration } from './CollaborationProvider';

export default function AudienceInsight() {
  const { campaignState, updateCampaignState } = useCollaboration();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!campaignState.id) return;
    
    const unsubscribe = dataService.subscribeToPersonas(campaignState.id, (data) => {
      setPersonas(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [campaignState.id]);

  const triggerAudienceRefresh = async (reason: string) => {
    setRunning(true);
    try {
      await updateCampaignState({
        activeTab: 'audience',
        automationEnabled: true,
        activePrompt: campaignState.activePrompt || `Refresh audience modeling for ${campaignState.name || campaignState.id}`,
      });
      await dataService.runAutomation(campaignState.id || 'main-campaign', reason);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-4 md:p-8 glass-panel">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/5 pb-8">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3 tracking-tight">
              <Brain className="w-6 h-6 text-indigo-400" />
              Neural Audience Modeling
            </h2>
            <p className="text-slate-400 text-sm mt-1">Research-backed persona identification and clustering.</p>
          </div>
          <button
            onClick={() => triggerAudienceRefresh('audience-segment-refresh')}
            disabled={running}
            className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="w-4 h-4" />
            {running ? 'Refreshing...' : 'Identify New Segment'}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Zap className="w-8 h-8 text-indigo-500 animate-pulse" />
          </div>
        ) : personas.length === 0 ? (
          <div className="text-center py-32 space-y-4">
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto border border-white/10">
              <Users className="w-8 h-8 text-slate-500" />
            </div>
            <p className="text-slate-500 text-sm">No personas identified. Use the Engine to generate research.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {personas.map((persona, i) => (
                <motion.div
                  key={persona.id}
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-card !p-6 hover:bg-white/[0.07] transition-all group overflow-hidden relative"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Target className="w-24 h-24 text-white" />
                  </div>

                  <div className="relative z-10 space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xl">
                        {persona.name.includes('Gen Z') ? '🤳' : persona.name.includes('Professional') ? '💼' : '🧭'}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white tracking-tight">{persona.name}</h3>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-0.5">
                          <MapPin className="w-3 h-3" /> {persona.demographics}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
                        <div className="text-[9px] text-slate-500 uppercase font-bold tracking-widest mb-2 flex items-center gap-1.5">
                          <Zap className="w-3 h-3 text-amber-400" /> Pain Points
                        </div>
                        <ul className="space-y-1.5">
                          {persona.pains.map((pain, idx) => (
                            <li key={idx} className="text-[10px] text-slate-300 flex items-start gap-1.5 leading-tight">
                              <span className="w-1 h-1 rounded-full bg-slate-600 mt-1.5 shrink-0" />
                              {pain}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
                        <div className="text-[9px] text-slate-500 uppercase font-bold tracking-widest mb-2 flex items-center gap-1.5">
                          <TrendingUp className="w-3 h-3 text-emerald-400" /> Key Value
                        </div>
                        <ul className="space-y-1.5">
                          {persona.gains.map((gain, idx) => (
                            <li key={idx} className="text-[10px] text-slate-300 flex items-start gap-1.5 leading-tight">
                              <span className="w-1 h-1 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                              {gain}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Inference Confidence</span>
                        <span className="text-[10px] text-indigo-400 font-mono font-bold">{(persona.engagementScore * 100).toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${persona.engagementScore * 100}%` }}
                          className="h-full bg-gradient-to-r from-indigo-500 to-fuchsia-500"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-[32px] p-8 flex flex-col md:flex-row items-center gap-8">
          <div className="w-20 h-20 rounded-[28px] bg-indigo-500/10 flex items-center justify-center shrink-0 border-2 border-indigo-500/20 shadow-xl shadow-indigo-500/10">
            <Sparkles className="w-10 h-10 text-indigo-400" />
          </div>
          <div className="flex-1 space-y-2 text-center md:text-left">
            <h4 className="text-lg font-bold text-white tracking-tight">Real-World Narrative Analysis</h4>
            <p className="text-sm text-slate-400 leading-relaxed max-w-2xl">
              Audience cards only appear when live persona research records are ingested for <span className="text-indigo-400 font-bold">"{campaignState.activePrompt || campaignState.name || campaignState.id}"</span>.
              {personas.length > 0 ? ` Active audience feed contains ${personas.length} current persona records.` : ' No live audience feed is connected yet.'}
            </p>
          </div>
          <button
            onClick={() => triggerAudienceRefresh('audience-cluster-recalibration')}
            disabled={running}
            className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-xs font-bold transition-all border border-white/10 whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-60"
          >
            {running ? 'Syncing...' : 'Recalibrate Clusters'}
          </button>
        </div>
      </div>
    </div>
  );
}
