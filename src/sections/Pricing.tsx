import { useEffect, useRef } from 'react';
import { Check, Building2, Code2, Handshake, ArrowRight } from 'lucide-react';

const tiers = [
  {
    name: 'Open Source',
    icon: Code2,
    price: 'Free',
    period: 'forever',
    description: 'Self-hosted. Full control. Community supported.',
    features: [
      'Full source code access',
      'Docker + Postgres setup',
      'All 6 automation modules',
      'Multi-platform scraping',
      'AI decision engine',
      'Episodic memory',
      'Community Discord support',
      'Self-hosted deployment',
    ],
    cta: 'Get Started',
    ctaLink: 'https://github.com',
    ctaPrimary: false,
    border: 'border-slate-200',
    bg: 'bg-white',
    highlight: false,
  },
  {
    name: 'Enterprise',
    icon: Building2,
    price: '$500-2K',
    period: '/ month',
    description: 'Managed cloud. Priority support. SLA guaranteed.',
    features: [
      'Everything in Open Source',
      'Managed cloud hosting',
      '99.9% uptime SLA',
      'Priority email & phone support',
      'Custom integrations',
      'SSO & team management',
      'Advanced analytics dashboard',
      'Dedicated account manager',
    ],
    cta: 'Contact Us',
    ctaLink: 'mailto:nolan.weeces@hashnhedge.com',
    ctaPrimary: true,
    border: 'border-indigo-500/30',
    bg: 'bg-gradient-to-b from-indigo-50/50 to-white',
    highlight: true,
  },
  {
    name: 'Custom Services',
    icon: Handshake,
    price: 'Custom',
    period: 'pricing',
    description: 'White-label, consulting, and bespoke deployments.',
    features: [
      'Everything in Enterprise',
      'White-label licensing',
      'Custom AI model training',
      'Bespoke feature development',
      'On-premise deployment',
      'Security audit & compliance',
      'Training & workshops',
      'Co-development partnership',
    ],
    cta: 'Talk to Sales',
    ctaLink: 'mailto:nolan.weeces@hashnhedge.com',
    ctaPrimary: false,
    border: 'border-slate-200',
    bg: 'bg-white',
    highlight: false,
  },
];

export default function Pricing() {
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
    <section id="pricing" ref={sectionRef} className="relative py-24 lg:py-32 bg-[#f8fafc] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16 reveal">
          <span className="inline-block px-3 py-1 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-full mb-4">
            BUSINESS MODEL
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
            Simple, Transparent <span className="gradient-text">Pricing</span>
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Start free, scale when ready. No per-seat fees. No hidden costs.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid lg:grid-cols-3 gap-8 items-stretch">
          {tiers.map((tier, i) => (
            <div
              key={tier.name}
              className={`reveal stagger-${i + 1} relative flex flex-col rounded-2xl border ${tier.border} ${tier.bg} p-8 ${
                tier.highlight ? 'shadow-xl shadow-indigo-500/10 lg:scale-105' : 'shadow-sm'
              }`}
            >
              {tier.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Header */}
              <div className="mb-6">
                <div className={`w-12 h-12 rounded-xl ${tier.highlight ? 'bg-indigo-500/10' : 'bg-slate-100'} flex items-center justify-center mb-4`}>
                  <tier.icon className={`w-6 h-6 ${tier.highlight ? 'text-indigo-600' : 'text-slate-600'}`} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-1">{tier.name}</h3>
                <p className="text-sm text-slate-500">{tier.description}</p>
              </div>

              {/* Price */}
              <div className="mb-6 pb-6 border-b border-slate-200">
                <span className="text-4xl font-extrabold text-slate-900">{tier.price}</span>
                <span className="text-slate-500 text-sm ml-1">{tier.period}</span>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8 flex-1">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-slate-600">
                    <Check className={`w-5 h-5 flex-shrink-0 ${tier.highlight ? 'text-indigo-500' : 'text-slate-400'}`} />
                    {feature}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <a
                href={tier.ctaLink}
                className={`w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold rounded-xl transition-all ${
                  tier.ctaPrimary
                    ? 'text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-500/20'
                    : 'text-slate-700 bg-slate-100 hover:bg-slate-200'
                }`}
              >
                {tier.cta}
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
