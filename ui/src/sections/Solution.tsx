import { useEffect, useRef } from 'react';
import { Globe, Brain, Rocket, BookOpen, RefreshCw } from 'lucide-react';

const steps = [
  {
    icon: Globe,
    title: 'CONNECT',
    description: 'Autonomous agents discover conversations across Reddit, Twitter/X, and the open web.',
    color: 'from-blue-500 to-indigo-500',
  },
  {
    icon: Brain,
    title: 'DECIDE',
    description: 'AI engine scores tactics per campaign context and picks the optimal outreach strategy.',
    color: 'from-indigo-500 to-violet-500',
  },
  {
    icon: Rocket,
    title: 'EXECUTE',
    description: 'Zero-cost automation delivers via SMTP, enriches emails, and schedules via Cal.com.',
    color: 'from-violet-500 to-purple-500',
  },
  {
    icon: BookOpen,
    title: 'LEARN',
    description: 'Campaign outcomes compound into trusted playbooks — your memory gets smarter over time.',
    color: 'from-purple-500 to-fuchsia-500',
  },
  {
    icon: RefreshCw,
    title: 'REPEAT',
    description: 'The loop continues, refining every cycle with accumulated intelligence and better results.',
    color: 'from-fuchsia-500 to-pink-500',
  },
];

export default function Solution() {
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
    <section id="solution" ref={sectionRef} className="relative py-24 lg:py-32 bg-[#f8fafc] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16 reveal">
          <span className="inline-block px-3 py-1 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-full mb-4">
            THE SOLUTION
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
            The <span className="gradient-text">SquidWeave Loop</span>
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            One brain that does it all. Scrapes, decides, remembers, and executes — at zero per-seat cost.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Desktop connector line */}
          <div className="hidden lg:block absolute top-[60px] left-[10%] right-[10%] h-0.5">
            <div className="w-full h-full bg-gradient-to-r from-blue-400 via-indigo-400 via-violet-400 via-purple-400 to-pink-400 rounded-full" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-6">
            {steps.map((step, i) => (
              <div
                key={step.title}
                className={`reveal stagger-${i + 1} relative flex flex-col items-center text-center`}
              >
                {/* Icon */}
                <div className={`relative z-10 w-[72px] h-[72px] rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg mb-6`}>
                  <step.icon className="w-8 h-8 text-white" />
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-slate-900 mb-2">{step.title}</h3>

                {/* Description */}
                <p className="text-sm text-slate-600 leading-relaxed max-w-[220px]">
                  {step.description}
                </p>

                {/* Arrow between steps (mobile) */}
                {i < steps.length - 1 && (
                  <div className="lg:hidden mt-4 flex justify-center">
                    <div className="w-0.5 h-6 bg-gradient-to-b from-indigo-400 to-violet-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
