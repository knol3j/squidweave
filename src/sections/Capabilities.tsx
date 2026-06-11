import { useEffect, useRef } from 'react';
import {
  Globe2,
  BrainCircuit,
  Database,
  Zap,
  Languages,
  ShieldCheck,
} from 'lucide-react';

const capabilities = [
  {
    icon: Globe2,
    title: 'Multi-Platform Scraping',
    description: 'Reddit, Twitter/X, Google search, and company websites — all monitored continuously by autonomous agents.',
    color: 'bg-blue-500/10 text-blue-400 border-blue-500/10',
  },
  {
    icon: BrainCircuit,
    title: 'AI Decision Engine',
    description: 'Scores tactics per campaign context and automatically picks the optimal outreach strategy every time.',
    color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/10',
  },
  {
    icon: Database,
    title: 'Episodic Memory',
    description: 'Target profiles, tactic observations, and trusted playbooks that compound with every campaign.',
    color: 'bg-violet-500/10 text-violet-400 border-violet-500/10',
  },
  {
    icon: Zap,
    title: 'Zero-Cost Automation',
    description: 'SMTP delivery, free email enrichment, and Cal.com scheduling — no per-seat fees, ever.',
    color: 'bg-amber-500/10 text-amber-400 border-amber-500/10',
  },
  {
    icon: Languages,
    title: 'Localization Engine',
    description: 'LM Studio integration with deterministic fallback ensures accurate, localized outreach at scale.',
    color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/10',
  },
  {
    icon: ShieldCheck,
    title: 'Safety-First Design',
    description: 'DRY_RUN default mode, approval gates, and full audit trails keep your campaigns safe and compliant.',
    color: 'bg-rose-500/10 text-rose-400 border-rose-500/10',
  },
];

export default function Capabilities() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1 }
    );

    const els = sectionRef.current?.querySelectorAll('.reveal');
    els?.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <section id="capabilities" ref={sectionRef} className="relative py-24 lg:py-32 bg-[#0a0e1a] overflow-hidden">
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16 reveal">
          <span className="inline-block px-3 py-1 text-xs font-semibold text-indigo-400 bg-indigo-500/10 rounded-full mb-4">
            CAPABILITIES
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            Everything You Need, <span className="gradient-text">Nothing You Don&apos;t</span>
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            A complete autonomous marketing stack built for B2B growth teams that demand results.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {capabilities.map((cap, i) => (
            <div
              key={cap.title}
              className={`reveal stagger-${i + 1} card-glow group p-6 lg:p-8 rounded-2xl border border-slate-800 bg-slate-900/50 hover:border-indigo-500/30 backdrop-blur-sm`}
            >
              <div className={`w-12 h-12 rounded-xl ${cap.color} border flex items-center justify-center mb-5`}>
                <cap.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2 group-hover:text-indigo-300 transition-colors">
                {cap.title}
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                {cap.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
