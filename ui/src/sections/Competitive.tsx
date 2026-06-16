import { useEffect, useRef } from 'react';
import { Check, X } from 'lucide-react';

const features = [
  { name: 'Learning Memory', description: 'Compounds campaign outcomes into trusted playbooks', squidweave: true, hubspot: false, clay: false, apollo: false },
  { name: 'Multi-Platform Scraping', description: 'Reddit, Twitter/X, Google, company websites', squidweave: true, hubspot: false, clay: 'limited', apollo: 'limited' },
  { name: 'AI Decision Engine', description: 'Tactic scoring per campaign context', squidweave: true, hubspot: false, clay: false, apollo: false },
  { name: 'Zero Per-Seat Cost', description: 'Open source core, free self-hosted', squidweave: true, hubspot: false, clay: false, apollo: false },
  { name: 'Data Sovereignty', description: 'Local-first, Docker + Postgres ready', squidweave: true, hubspot: false, clay: false, apollo: false },
  { name: 'Autonomous Agents', description: 'Self-directing multi-agent orchestration', squidweave: true, hubspot: false, clay: false, apollo: false },
  { name: 'Email Automation', description: 'SMTP delivery with enrichment', squidweave: true, hubspot: true, clay: true, apollo: true },
  { name: 'CRM Integration', description: 'Connect to existing CRM stacks', squidweave: true, hubspot: true, clay: true, apollo: true },
  { name: 'A/B Testing', description: 'Campaign variant testing', squidweave: true, hubspot: true, clay: false, apollo: true },
  { name: 'Scheduling', description: 'Cal.com integration', squidweave: true, hubspot: true, clay: false, apollo: false },
];

function FeatureIcon({ value }: { value: boolean | string }) {
  if (value === true) return <Check className="w-5 h-5 text-emerald-400" />;
  if (value === false) return <X className="w-5 h-5 text-slate-600" />;
  return <span className="text-xs text-amber-400 font-medium">Limited</span>;
}

export default function Competitive() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('visible');
        });
      },
      { threshold: 0.1 }
    );

    const els = sectionRef.current?.querySelectorAll('.reveal');
    els?.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <section id="compare" ref={sectionRef} className="relative py-24 lg:py-32 bg-[#f8fafc] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16 reveal">
          <span className="inline-block px-3 py-1 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-full mb-4">
            COMPETITIVE EDGE
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
            Why Squid<span className="gradient-text">Weave</span> Wins
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            See how we stack up against the incumbents. Built for teams that demand intelligence, not just tools.
          </p>
        </div>

        {/* Table */}
        <div className="reveal overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse">
            {/* Header */}
            <thead>
              <tr>
                <th className="text-left py-4 px-4 text-sm font-semibold text-slate-500 border-b border-slate-200 w-[30%]">Feature</th>
                <th className="text-center py-4 px-4 border-b border-indigo-500 bg-indigo-50/50 w-[17.5%]">
                  <div className="flex flex-col items-center">
                    <span className="text-sm font-bold gradient-text">SquidWeave</span>
                  </div>
                </th>
                <th className="text-center py-4 px-4 text-sm font-semibold text-slate-600 border-b border-slate-200 w-[17.5%]">HubSpot</th>
                <th className="text-center py-4 px-4 text-sm font-semibold text-slate-600 border-b border-slate-200 w-[17.5%]">Clay</th>
                <th className="text-center py-4 px-4 text-sm font-semibold text-slate-600 border-b border-slate-200 w-[17.5%]">Apollo</th>
              </tr>
            </thead>
            <tbody>
              {features.map((feature, i) => (
                <tr
                  key={feature.name}
                  className={`group transition-colors hover:bg-slate-50 ${
                    i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                  }`}
                >
                  <td className="py-4 px-4 border-b border-slate-100">
                    <div className="font-medium text-slate-900 text-sm">{feature.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{feature.description}</div>
                  </td>
                  <td className="py-4 px-4 border-b border-indigo-100 bg-indigo-50/30 text-center">
                    <div className="flex justify-center"><FeatureIcon value={feature.squidweave} /></div>
                  </td>
                  <td className="py-4 px-4 border-b border-slate-100 text-center">
                    <div className="flex justify-center"><FeatureIcon value={feature.hubspot} /></div>
                  </td>
                  <td className="py-4 px-4 border-b border-slate-100 text-center">
                    <div className="flex justify-center"><FeatureIcon value={feature.clay} /></div>
                  </td>
                  <td className="py-4 px-4 border-b border-slate-100 text-center">
                    <div className="flex justify-center"><FeatureIcon value={feature.apollo} /></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 text-center reveal">
          <p className="text-slate-500 text-sm mb-4">
            Ready to switch to the only marketing brain that learns?
          </p>
          <a
            href="#pricing"
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-xl shadow-lg shadow-indigo-500/20 transition-all"
          >
            Get Started Free
          </a>
        </div>
      </div>
    </section>
  );
}
