import React from 'react';
import { Target } from 'lucide-react';
import { motion } from 'motion/react';
import {
  AUDIENCE_OPTIONS,
  OFFER_OPTIONS,
  MARKET_OPTIONS,
  CHANNEL_OPTIONS,
  BRAND_VOICE_OPTIONS,
  splitList,
  splitChannelList,
  PresetSingleSelectField,
  PresetMultiSelectField,
} from './formHelpers';
import type { IntakeDraft } from './types';

interface ClientIntakeFormProps {
  displayDraft: IntakeDraft;
  setPendingDraft: React.Dispatch<React.SetStateAction<IntakeDraft | null>>;
  intakeSaving: boolean;
  onSave: () => void;
}

export default function ClientIntakeForm({
  displayDraft,
  setPendingDraft,
  intakeSaving,
  onSave,
}: ClientIntakeFormProps) {
  const set = (key: keyof IntakeDraft) => (value: string) =>
    setPendingDraft(current => ({ ...(current ?? displayDraft), [key]: value }));

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(2,6,23,0.35)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
            <Target className="h-3.5 w-3.5 text-indigo-400" />
            Client Intake
          </div>
          <h3 className="mt-2 text-xl font-semibold text-white">Capture what the client actually wants</h3>
        </div>
        <button
          onClick={onSave}
          disabled={intakeSaving}
          className="rounded-xl bg-indigo-500 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-white transition hover:bg-indigo-400 disabled:opacity-60"
        >
          {intakeSaving ? 'Saving...' : 'Save Brief'}
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {[
          { key: 'clientName', label: 'Client Name', placeholder: 'Acme Growth Team' },
          { key: 'brandName', label: 'Brand / Campaign Name', placeholder: 'Acme Pipeline Acceleration' },
          { key: 'successDefinition', label: 'Success Definition', placeholder: '20 SQLs/month with CAC under target' },
        ].map(field => (
          <label key={field.key} className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">{field.label}</span>
            <input
              value={displayDraft[field.key as keyof IntakeDraft]}
              onChange={event => set(field.key as keyof IntakeDraft)(event.target.value)}
              placeholder={field.placeholder}
              className="w-full rounded-xl border border-white/10 bg-[#0b1526] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-indigo-400/50"
            />
          </label>
        ))}

        <PresetSingleSelectField
          label="Target Audience"
          value={displayDraft.audience}
          options={AUDIENCE_OPTIONS}
          placeholder="Select target audience"
          onChange={set('audience')}
        />

        <PresetSingleSelectField
          label="Primary Offer"
          value={displayDraft.offer}
          options={OFFER_OPTIONS}
          placeholder="Select primary offer"
          onChange={set('offer')}
        />

        <PresetMultiSelectField
          label="Markets / Locales"
          value={displayDraft.markets}
          options={MARKET_OPTIONS}
          placeholder="Select markets and locales"
          splitter={splitList}
          joiner={values => values.join(', ')}
          onChange={set('markets')}
        />

        <PresetMultiSelectField
          label="Primary Channel"
          value={displayDraft.channel}
          options={CHANNEL_OPTIONS}
          placeholder="Select primary channels"
          splitter={splitChannelList}
          joiner={values => values.join(' + ')}
          onChange={set('channel')}
        />

        <PresetMultiSelectField
          label="Brand Voice"
          value={displayDraft.brandVoice}
          options={BRAND_VOICE_OPTIONS}
          placeholder="Select brand voice traits"
          splitter={splitList}
          joiner={values => values.join(', ')}
          onChange={set('brandVoice')}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4">
        {[
          { key: 'clientNeed', label: 'What the client wants', rows: 4, placeholder: 'Describe the concrete business outcome, urgency, and non-negotiables.' },
          { key: 'differentiators', label: 'Differentiators and proof', rows: 3, placeholder: 'Why should the market trust this offer? What proof exists?' },
          { key: 'constraints', label: 'Constraints, risk, and guardrails', rows: 3, placeholder: 'Budget, legal boundaries, tone constraints, product realities, prohibited claims.' },
          { key: 'successMetrics', label: 'Success metrics', rows: 3, placeholder: 'One metric per line: SQLs, CAC, reply rate, retention, expansion revenue.' },
          { key: 'researchObjectives', label: 'Research objectives for the agent swarm', rows: 3, placeholder: 'One objective per line: competitors, ICP signals, objections, trends, retention blockers.' },
        ].map(field => (
          <label key={field.key} className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">{field.label}</span>
            <textarea
              rows={field.rows}
              value={displayDraft[field.key as keyof IntakeDraft]}
              onChange={event => set(field.key as keyof IntakeDraft)(event.target.value)}
              placeholder={field.placeholder}
              className="w-full rounded-xl border border-white/10 bg-[#0b1526] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-indigo-400/50"
            />
          </label>
        ))}
      </div>
    </motion.section>
  );
}
