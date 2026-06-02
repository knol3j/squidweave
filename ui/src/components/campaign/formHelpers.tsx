// Shared form helper components and option lists for campaign subcomponents
import React from 'react';

export const AUDIENCE_OPTIONS = [
  'Founders',
  'CEO',
  'COO',
  'CRO',
  'VP Revenue',
  'VP Revenue Operations',
  'Demand Gen Leaders',
  'Heads of Growth',
  'CMO',
  'Marketing Operations',
];

export const OFFER_OPTIONS = [
  'Book a 20 minute audit',
  'Book a strategy review',
  'Request a demo',
  'Get a custom teardown',
  'Start a pilot',
  'Download the deck',
];

export const MARKET_OPTIONS = [
  'en-US',
  'en-GB',
  'de-DE',
  'fr-FR',
  'es-ES',
  'DACH fintech',
  'UK SaaS',
  'US SaaS',
  'Mid-market SaaS',
  'Enterprise SaaS',
  'PLG SaaS',
  'B2B services',
];

export const CHANNEL_OPTIONS = [
  'LinkedIn',
  'Email',
  'Landing page',
  'Outbound calling',
  'Paid social',
  'Google Search',
  'Webinar',
  'Partner co-marketing',
];

export const BRAND_VOICE_OPTIONS = [
  'Direct',
  'Expert',
  'Specific',
  'No fluff',
  'Analytical',
  'Confident',
  'Warm',
  'Executive',
];

export const SOURCE_OPTIONS = [
  'manual-ingest',
  'G2',
  'LinkedIn',
  'analyst-note',
  'CRM-export',
  'apollo',
  'zoominfo',
  'web-scrape',
  'referral',
];

export const REGION_OPTIONS = [
  'US',
  'DACH',
  'France',
  'UK',
  'EMEA',
  'APAC',
  'NA',
  'LATAM',
];

export function splitList(value: string) {
  return value
    .split(/[\n,]/g)
    .map(item => item.trim())
    .filter(Boolean);
}

export function splitChannelList(value: string) {
  return value
    .split(/[\n,+]/g)
    .map(item => item.trim())
    .filter(Boolean);
}

function uniqueOptions(options: string[], currentValue: string, splitter: (value: string) => string[]) {
  return [...new Set([...options, ...splitter(currentValue)])];
}

export function PresetSingleSelectField({
  label,
  value,
  options,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  placeholder: string;
  onChange: (nextValue: string) => void;
}) {
  const mergedOptions = React.useMemo(
    () => [...new Set([...options, ...(value && !options.includes(value) ? [value] : [])])],
    [options, value],
  );

  return (
    <label className="space-y-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">{label}</span>
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className="w-full rounded-xl border border-white/10 bg-[#0b1526] px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-400/50"
      >
        <option value="">{placeholder}</option>
        {mergedOptions.map(option => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export function PresetMultiSelectField({
  label,
  value,
  options,
  placeholder,
  splitter,
  joiner,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  placeholder: string;
  splitter: (value: string) => string[];
  joiner: (values: string[]) => string;
  onChange: (nextValue: string) => void;
}) {
  const selected = splitter(value);
  const mergedOptions = React.useMemo(() => uniqueOptions(options, value, splitter), [options, value, splitter]);

  const toggleOption = (option: string) => {
    const nextSelected = selected.includes(option)
      ? selected.filter(item => item !== option)
      : [...selected, option];
    onChange(joiner(nextSelected));
  };

  return (
    <label className="space-y-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">{label}</span>
      <details className="rounded-xl border border-white/10 bg-[#0b1526]">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm text-white outline-none">
          <div className="flex items-center justify-between gap-3">
            <span className={selected.length ? 'text-white' : 'text-slate-600'}>
              {selected.length ? selected.join(', ') : placeholder}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-indigo-300">
              {selected.length || 0} selected
            </span>
          </div>
        </summary>
        <div className="border-t border-white/10 px-4 py-3">
          <div className="grid gap-2">
            {mergedOptions.map(option => (
              <label key={option} className="flex items-center gap-3 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={selected.includes(option)}
                  onChange={() => toggleOption(option)}
                  className="h-4 w-4 rounded border-white/10 bg-[#08111f] text-indigo-500 focus:ring-indigo-400"
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </div>
      </details>
    </label>
  );
}
