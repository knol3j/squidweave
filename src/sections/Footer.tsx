import { Github, FileText, Mail, Phone, Zap, ExternalLink } from 'lucide-react';

const navLinks = [
  { label: 'Problem', href: '#problem' },
  { label: 'Solution', href: '#solution' },
  { label: 'Capabilities', href: '#capabilities' },
  { label: 'Compare', href: '#compare' },
  { label: 'Traction', href: '#traction' },
  { label: 'Pricing', href: '#pricing' },
];

const resourceLinks = [
  { label: 'GitHub Repository', href: 'https://github.com', icon: Github },
  { label: 'Documentation', href: '#', icon: FileText },
  { label: 'Contact Sales', href: 'mailto:nolan.weeces@hashnhedge.com', icon: Mail },
];

export default function Footer() {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('#')) {
      e.preventDefault();
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="relative bg-[#0a0e1a] border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Logo & Tagline */}
          <div className="lg:col-span-2">
            <a href="#" className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-white leading-tight">
                  Squid<span className="text-indigo-400">Weave</span>
                </span>
                <span className="text-[10px] text-slate-400 leading-tight -mt-0.5">by Hash &apos;n Hedge</span>
              </div>
            </a>
            <p className="text-slate-400 text-sm leading-relaxed max-w-sm mb-6">
              The autonomous marketing brain for B2B growth. Scrapes, decides, remembers, and executes — while you sleep.
            </p>
            <div className="flex flex-col gap-2">
              <a
                href="mailto:nolan.weeces@hashnhedge.com"
                className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-indigo-400 transition-colors"
              >
                <Mail className="w-4 h-4" />
                nolan.weeces@hashnhedge.com
              </a>
              <a
                href="tel:5315103061"
                className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-indigo-400 transition-colors"
              >
                <Phone className="w-4 h-4" />
                531-510-3061
              </a>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Navigation</h4>
            <ul className="space-y-2.5">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={(e) => handleClick(e, link.href)}
                    className="text-sm text-slate-400 hover:text-indigo-400 transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Resources</h4>
            <ul className="space-y-2.5">
              {resourceLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target={link.href.startsWith('http') ? '_blank' : undefined}
                    rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-indigo-400 transition-colors"
                  >
                    <link.icon className="w-4 h-4" />
                    {link.label}
                    {link.href.startsWith('http') && <ExternalLink className="w-3 h-3" />}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            &copy; 2025 Hash &apos;n Hedge. All rights reserved.
          </p>
          <div className="flex items-center gap-1 text-xs text-slate-600">
            <span>Made with</span>
            <span className="text-indigo-500">precision</span>
            <span>for B2B marketers worldwide</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
