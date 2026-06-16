import { useEffect, useRef } from 'react';
import { DollarSign, Puzzle, Users } from 'lucide-react';

const problems = [
  {
    icon: DollarSign,
    stat: '$120B',
    label: 'Annual Waste',
    description: 'Burned annually on fragmented B2B marketing tools with diminishing returns across the industry.',
    accent: 'text-red-400',
    bg: 'bg-red-500/5 border-red-500/10',
  },
  {
    icon: Puzzle,
    stat: '10+',
    label: 'Disconnected Tools',
    description: 'Average number of apps marketers juggle daily, creating data silos and manual handoffs.',
    accent: 'text-orange-400',
    bg: 'bg-orange-500/5 border-orange-500/10',
  },
  {
    icon: Users,
    stat: '$800-2K',
    label: 'Per Seat / Month',
    description: 'Enterprise marketing stack costs per seat monthly — a barrier for growing teams.',
    accent: 'text-rose-400',
    bg: 'bg-rose-500/5 border-rose-500/10',
  },
];

export default function Problem() {
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
      { threshold: 0.2 }
    );

    const els = sectionRef.current?.querySelectorAll('.reveal');
    els?.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <section id="problem" ref={sectionRef} className="relative py-24 lg:py-32 bg-[#0a0e1a] overflow-hidden">
      {/* Subtle red tint accents */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500/20 via-orange-500/20 to-rose-500/20" />
      <div className="absolute top-0 right-0 w-72 h-72 bg-red-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16 reveal">
          <span className="inline-block px-3 py-1 text-xs font-semibold text-red-400 bg-red-500/10 rounded-full mb-4">
            THE PROBLEM
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            B2B Marketing Is <span className="text-red-400">Broken</span>
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Fragmented tools, manual workflows, and zero intelligence are burning budgets and burning out teams.
          </p>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {problems.map((p, i) => (
            <div
              key={p.label}
              className={`reveal stagger-${i + 1} relative p-8 rounded-2xl border ${p.bg} backdrop-blur-sm`}
            >
              <div className={`w-14 h-14 rounded-xl ${p.bg} flex items-center justify-center mb-6`}>
                <p.icon className={`w-7 h-7 ${p.accent}`} />
              </div>
              <div className={`text-4xl lg:text-5xl font-extrabold ${p.accent} mb-2`}>
                {p.stat}
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{p.label}</h3>
              <p className="text-slate-400 leading-relaxed">{p.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
