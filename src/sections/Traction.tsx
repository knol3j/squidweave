import { useEffect, useRef, useState } from 'react';
import { TrendingUp, Code2, Puzzle, Plug, DollarSign, Target, ArrowRight } from 'lucide-react';

const stats = [
  { icon: Code2, value: 84, suffix: '+', label: 'API Endpoints', color: 'text-indigo-400' },
  { icon: Puzzle, value: 6, suffix: '', label: 'Automation Modules', color: 'text-violet-400' },
  { icon: Plug, value: 3, suffix: '', label: 'Connectors', color: 'text-blue-400' },
  { icon: DollarSign, value: 0, suffix: '', prefix: '$', label: 'Per-Seat Cost', color: 'text-emerald-400' },
];

const milestones = [
  { quarter: 'Q1 2025', title: 'Seed Closed', desc: '$750K seed round' },
  { quarter: 'Q2 2025', title: 'Public Launch', desc: 'Open source v1.0' },
  { quarter: 'Q3 2025', title: 'Enterprise', desc: 'Cloud hosting live' },
  { quarter: 'Q4 2025', title: 'Scale', desc: '10 enterprise customers' },
  { quarter: '2026', title: 'Series A', desc: 'Next growth phase' },
];

function AnimatedCounter({ value, suffix = '', prefix = '' }: { value: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated.current) {
            hasAnimated.current = true;
            let start = 0;
            const duration = 1500;
            const step = (timestamp: number) => {
              if (!start) start = timestamp;
              const progress = Math.min((timestamp - start) / duration, 1);
              const eased = 1 - Math.pow(1 - progress, 3);
              setCount(Math.floor(eased * value));
              if (progress < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
          }
        });
      },
      { threshold: 0.5 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value]);

  return (
    <span ref={ref}>
      {prefix}{count}{suffix}
    </span>
  );
}

export default function Traction() {
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
    <section id="traction" ref={sectionRef} className="relative py-24 lg:py-32 bg-[#0a0e1a] overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16 reveal">
          <span className="inline-block px-3 py-1 text-xs font-semibold text-indigo-400 bg-indigo-500/10 rounded-full mb-4">
            TRACTION & METRICS
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            Built for <span className="gradient-text">Scale</span>
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Real numbers from a real product. Shipping fast, growing faster.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className={`reveal stagger-${i + 1} p-6 lg:p-8 rounded-2xl border border-slate-800 bg-slate-900/50 text-center`}
            >
              <div className={`w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center mx-auto mb-4`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div className={`text-4xl lg:text-5xl font-extrabold ${stat.color} mb-2`}>
                <AnimatedCounter value={stat.value} suffix={stat.suffix} prefix={stat.prefix || ''} />
              </div>
              <div className="text-sm text-slate-400">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Market size callout */}
        <div className="reveal mb-20 p-8 rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-500/5 to-violet-500/5 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-indigo-400" />
            <span className="text-sm text-indigo-300 font-medium">Market Opportunity</span>
          </div>
          <div className="text-3xl lg:text-4xl font-bold text-white mb-1">
            $8.3B → $19.7B by 2032
          </div>
          <div className="text-slate-400 text-sm">
            12.3% CAGR (14.1% B2B segment) — and we&apos;re positioned to capture it.
          </div>
        </div>

        {/* Timeline */}
        <div className="reveal">
          <h3 className="text-xl font-bold text-white text-center mb-10">Roadmap to Series A</h3>
          <div className="relative">
            {/* Timeline line */}
            <div className="hidden md:block absolute top-6 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 rounded-full" />

            <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
              {milestones.map((m, i) => (
                <div key={m.quarter} className="relative flex flex-col items-center text-center">
                  {/* Dot */}
                  <div className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
                    i === 0
                      ? 'bg-indigo-500 shadow-lg shadow-indigo-500/30'
                      : 'bg-slate-800 border border-slate-700'
                  }`}>
                    {i === 0 ? (
                      <Target className="w-5 h-5 text-white" />
                    ) : (
                      <span className="text-xs font-bold text-slate-400">{i + 1}</span>
                    )}
                  </div>
                  <div className="text-xs font-semibold text-indigo-400 mb-1">{m.quarter}</div>
                  <div className="text-sm font-bold text-white mb-1">{m.title}</div>
                  <div className="text-xs text-slate-500">{m.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* The Ask */}
        <div className="reveal mt-16 text-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5">
            <span className="text-slate-400 text-sm">The Ask:</span>
            <span className="text-white font-bold">$750K Seed</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400 text-sm">18-month runway to Series A</span>
            <ArrowRight className="w-4 h-4 text-indigo-400" />
          </div>
        </div>
      </div>
    </section>
  );
}
