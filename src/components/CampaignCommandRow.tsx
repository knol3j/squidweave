import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, RotateCcw, Save, Palette, Type, Globe, Users, Gift, BookOpen, ToggleLeft, ToggleRight } from 'lucide-react';
import type { Campaign } from '@/types';
import { useApp } from '@/context/AppContext';
import { cn } from '@/lib/utils';

interface Props {
  campaign: Campaign;
  expanded: boolean;
}

const ALL_LOCALES = ['de-DE', 'pt-BR', 'en-US', 'fr-FR', 'es-ES', 'ja-JP'];

export default function CampaignCommandRow({ campaign, expanded }: Props) {
  const { dispatch } = useApp();
  const [form, setForm] = useState({ ...campaign });
  const [showSaved, setShowSaved] = useState(false);

  const toggleLocale = (locale: string) => {
    const has = form.locales.includes(locale);
    setForm(prev => ({
      ...prev,
      locales: has ? prev.locales.filter(l => l !== locale) : [...prev.locales, locale],
    }));
  };

  const toggleModule = (moduleId: string) => {
    setForm(prev => ({
      ...prev,
      modules: prev.modules.map(m =>
        m.id === moduleId ? { ...m, enabled: !m.enabled } : m
      ),
    }));
  };

  const handleSave = () => {
    dispatch({ type: 'UPDATE_CAMPAIGN', campaign: form });
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  const handleReset = () => setForm({ ...campaign });

  return (
    <div className="relative">
      {/* Collapsed / Header */}
      <div
        className={cn(
          'flex items-center justify-between p-4 rounded-2xl border border-[rgba(255,255,255,0.08)] transition-all duration-300 cursor-pointer hover:translate-y-[-2px] hover:border-[rgba(255,255,255,0.12)]',
          expanded && 'rounded-b-none border-b-0'
        )}
        style={{ backgroundColor: '#0f172a', borderLeftWidth: '4px', borderLeftColor: '#6366f1' }}
        onClick={() => !expanded && dispatch({ type: 'EXPAND_STAGE', stageId: 0 })}
      >
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(99,102,241,0.15)' }}>
            <Check className="w-4 h-4 text-[#6366f1]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#e2e8f0]">CAMPAIGN COMMAND</h3>
            <p className="text-xs text-[#64748b]">{campaign.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {campaign.locales.map(l => (
              <span key={l} className="px-2 py-0.5 rounded text-[0.65rem] font-medium bg-[rgba(99,102,241,0.15)] text-[#818cf8]">{l}</span>
            ))}
          </div>
          <span className="px-2 py-0.5 rounded-full text-[0.65rem] font-medium bg-[rgba(16,185,129,0.15)] text-[#34d399]">
            {campaign.active ? 'ACTIVE' : 'DRAFT'}
          </span>
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-4 h-4 text-[#64748b]" />
          </motion.div>
        </div>
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="overflow-hidden"
          >
            <div className="p-5 rounded-b-2xl border border-t-0 border-[rgba(255,255,255,0.08)] space-y-5" style={{ backgroundColor: '#0f172a', borderLeftWidth: '4px', borderLeftColor: '#6366f1' }}>
              {/* Campaign Form */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[0.7rem] uppercase tracking-wider text-[#64748b] font-medium">Campaign Name</label>
                  <div className="relative">
                    <Type className="absolute left-2.5 top-2 w-3.5 h-3.5 text-[#64748b]" />
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full h-8 pl-8 pr-3 rounded-lg text-xs bg-[#111c2b] border border-[rgba(255,255,255,0.08)] text-[#e2e8f0] focus:outline-none focus:border-[#6366f1] transition-colors"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[0.7rem] uppercase tracking-wider text-[#64748b] font-medium">Channel</label>
                  <select
                    value={form.channel}
                    onChange={e => setForm(prev => ({ ...prev, channel: e.target.value }))}
                    className="w-full h-8 px-3 rounded-lg text-xs bg-[#111c2b] border border-[rgba(255,255,255,0.08)] text-[#e2e8f0] focus:outline-none focus:border-[#6366f1]"
                  >
                    <option value="email">Email</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="multi-channel">Multi-Channel</option>
                    <option value="twitter">Twitter/X</option>
                  </select>
                </div>
                <div className="space-y-1.5 col-span-2">
                  <label className="text-[0.7rem] uppercase tracking-wider text-[#64748b] font-medium">Objective</label>
                  <textarea
                    value={form.objective}
                    onChange={e => setForm(prev => ({ ...prev, objective: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg text-xs bg-[#111c2b] border border-[rgba(255,255,255,0.08)] text-[#e2e8f0] focus:outline-none focus:border-[#6366f1] resize-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[0.7rem] uppercase tracking-wider text-[#64748b] font-medium flex items-center gap-1"><Users className="w-3 h-3" /> Audience</label>
                  <input
                    type="text"
                    value={form.audience}
                    onChange={e => setForm(prev => ({ ...prev, audience: e.target.value }))}
                    className="w-full h-8 px-3 rounded-lg text-xs bg-[#111c2b] border border-[rgba(255,255,255,0.08)] text-[#e2e8f0] focus:outline-none focus:border-[#6366f1]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[0.7rem] uppercase tracking-wider text-[#64748b] font-medium flex items-center gap-1"><Gift className="w-3 h-3" /> Offer</label>
                  <input
                    type="text"
                    value={form.offer}
                    onChange={e => setForm(prev => ({ ...prev, offer: e.target.value }))}
                    className="w-full h-8 px-3 rounded-lg text-xs bg-[#111c2b] border border-[rgba(255,255,255,0.08)] text-[#e2e8f0] focus:outline-none focus:border-[#6366f1]"
                  />
                </div>
              </div>

              {/* Locales */}
              <div className="space-y-2">
                <label className="text-[0.7rem] uppercase tracking-wider text-[#64748b] font-medium flex items-center gap-1"><Globe className="w-3 h-3" /> Target Locales</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_LOCALES.map(locale => {
                    const active = form.locales.includes(locale);
                    return (
                      <button
                        key={locale}
                        onClick={() => toggleLocale(locale)}
                        className={cn(
                          'px-3 py-1 rounded-full text-xs font-medium border transition-all',
                          active
                            ? 'bg-[rgba(99,102,241,0.2)] border-[#6366f1] text-[#818cf8]'
                            : 'bg-transparent border-[#334155] text-[#64748b] hover:border-[#475569]'
                        )}
                      >
                        {locale}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Design System */}
              <div className="space-y-3 p-4 rounded-xl" style={{ backgroundColor: '#111c2b' }}>
                <label className="text-[0.7rem] uppercase tracking-wider text-[#64748b] font-medium flex items-center gap-1"><Palette className="w-3 h-3" /> Design System</label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={form.theme}
                    onChange={e => setForm(prev => ({ ...prev, theme: e.target.value }))}
                    placeholder="Theme..."
                    className="h-8 px-3 rounded-lg text-xs bg-[#0f172a] border border-[rgba(255,255,255,0.08)] text-[#e2e8f0] focus:outline-none focus:border-[#6366f1]"
                  />
                  <div className="flex items-center gap-2">
                    {form.palette.map((color, i) => (
                      <div key={i} className="w-6 h-6 rounded-full border border-[rgba(255,255,255,0.12)]" style={{ backgroundColor: color }} />
                    ))}
                  </div>
                </div>
                <textarea
                  value={form.guidelines}
                  onChange={e => setForm(prev => ({ ...prev, guidelines: e.target.value }))}
                  placeholder="Content guidelines..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg text-xs bg-[#0f172a] border border-[rgba(255,255,255,0.08)] text-[#e2e8f0] focus:outline-none focus:border-[#6366f1] resize-none"
                />
                <div className="flex flex-wrap gap-1.5">
                  {form.contentAngles.map((angle, i) => (
                    <span key={i} className="px-2 py-0.5 rounded text-[0.65rem] bg-[rgba(99,102,241,0.15)] text-[#818cf8]">{angle}</span>
                  ))}
                </div>
              </div>

              {/* Module Toggles */}
              <div className="space-y-2">
                <label className="text-[0.7rem] uppercase tracking-wider text-[#64748b] font-medium flex items-center gap-1"><BookOpen className="w-3 h-3" /> Modules</label>
                <div className="grid grid-cols-4 gap-2">
                  {form.modules.map(mod => (
                    <button
                      key={mod.id}
                      onClick={() => toggleModule(mod.id)}
                      className={cn(
                        'flex items-center justify-between p-2.5 rounded-lg border transition-all text-left',
                        mod.enabled
                          ? 'border-[rgba(99,102,241,0.3)] bg-[rgba(99,102,241,0.08)]'
                          : 'border-[rgba(255,255,255,0.06)] bg-[#111c2b]'
                      )}
                    >
                      <span className={cn('text-xs', mod.enabled ? 'text-[#e2e8f0]' : 'text-[#64748b]')}>{mod.name}</span>
                      {mod.enabled ? <ToggleRight className="w-4 h-4 text-[#6366f1]" /> : <ToggleLeft className="w-4 h-4 text-[#475569]" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Activation + Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-[rgba(255,255,255,0.06)]">
                <button
                  onClick={() => setForm(prev => ({ ...prev, active: !prev.active }))}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all',
                    form.active
                      ? 'bg-[rgba(16,185,129,0.15)] text-[#34d399] border border-[rgba(16,185,129,0.3)]'
                      : 'bg-[rgba(245,158,11,0.15)] text-[#fbbf24] border border-[rgba(245,158,11,0.3)]'
                  )}
                >
                  {form.active ? 'Campaign Active' : 'Activate Campaign'}
                </button>

                <div className="flex items-center gap-2">
                  {showSaved && (
                    <motion.span initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="text-xs text-[#10b981]">
                      Saved!
                    </motion.span>
                  )}
                  <button onClick={handleReset} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[rgba(255,255,255,0.04)] transition-all">
                    <RotateCcw className="w-3 h-3" /> Reset
                  </button>
                  <button onClick={handleSave} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white gradient-indigo hover:shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-all">
                    <Save className="w-3 h-3" /> Save
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
