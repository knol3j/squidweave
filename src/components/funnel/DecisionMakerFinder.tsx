import { useState, useCallback, useMemo } from "react";
import {
  UserCircle,
  Mail,
  Linkedin,
  Phone,
  Zap,
  Users,
  Search,
  Plus,
  Filter,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Building2,
  MessageSquare,
  Crown,
  Monitor,
  ArrowRight,
  Sparkles,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
interface DecisionMaker {
  id: string;
  name: string;
  title: string;
  department: string;
  emailPattern: string;
  linkedinUrl: string;
  powerScore: number;
  techSavviness: number;
  bestChannel: string;
  firstTouchMessage: string;
}

/* ------------------------------------------------------------------ */
/*  Name pools                                                          */
/* ------------------------------------------------------------------ */
const firstNames = [
  "Sarah", "Michael", "Jennifer", "David", "Emily", "James", "Jessica", "Robert", "Amanda",
  "William", "Laura", "Daniel", "Michelle", "Christopher", "Rebecca", "Matthew", "Ashley",
  "Joshua", "Nicole", "Andrew", "Elizabeth", "Ryan", "Stephanie", "Brian", "Heather",
];
const lastNames = [
  "Chen", "Rodriguez", "Johnson", "Smith", "Williams", "Brown", "Davis", "Miller", "Wilson",
  "Moore", "Taylor", "Anderson", "Thomas", "Jackson", "White", "Harris", "Martin", "Thompson",
  "Garcia", "Martinez", "Robinson", "Clark", "Lewis", "Lee", "Walker", "Hall",
];

/* ------------------------------------------------------------------ */
/*  Roles by company size                                               */
/* ------------------------------------------------------------------ */
const rolesBySize: Record<string, { title: string; dept: string }[]> = {
  "1-50": [
    { title: "CEO & Co-Founder", dept: "Executive" },
    { title: "CTO", dept: "Engineering" },
    { title: "Head of Growth", dept: "Growth" },
    { title: "VP of Operations", dept: "Operations" },
  ],
  "50-200": [
    { title: "VP of Marketing", dept: "Marketing" },
    { title: "VP of Sales", dept: "Sales" },
    { title: "Director of Growth", dept: "Growth" },
    { title: "Head of Product", dept: "Product" },
    { title: "Director of Engineering", dept: "Engineering" },
  ],
  "200-500": [
    { title: "CMO", dept: "Marketing" },
    { title: "VP of Demand Generation", dept: "Marketing" },
    { title: "Director of Marketing Ops", dept: "Marketing" },
    { title: "Head of Business Development", dept: "Sales" },
    { title: "VP of Product", dept: "Product" },
  ],
  "500-1000": [
    { title: "CMO", dept: "Marketing" },
    { title: "VP of Digital Marketing", dept: "Marketing" },
    { title: "Director of Revenue Operations", dept: "Revenue" },
    { title: "Head of Partnerships", dept: "Business Development" },
    { title: "VP of Strategy", dept: "Strategy" },
  ],
  "1000-5000": [
    { title: "Chief Revenue Officer", dept: "Revenue" },
    { title: "SVP of Marketing", dept: "Marketing" },
    { title: "VP of Growth Marketing", dept: "Marketing" },
    { title: "Director of GTM Strategy", dept: "GTM" },
    { title: "Head of Sales Enablement", dept: "Sales" },
  ],
  "5000+": [
    { title: "Chief Growth Officer", dept: "Growth" },
    { title: "EVP of Global Marketing", dept: "Marketing" },
    { title: "VP of Marketing Technology", dept: "MarTech" },
    { title: "Director of Digital Transformation", dept: "Digital" },
    { title: "Head of Innovation", dept: "Innovation" },
  ],
};

const sizeOptions = ["1-50", "50-200", "200-500", "500-1000", "1000-5000", "5000+"];

const channelConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  Email: { icon: Mail, color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20", label: "Email" },
  LinkedIn: { icon: Linkedin, color: "text-blue-400 bg-blue-500/10 border-blue-500/20", label: "LinkedIn" },
  Phone: { icon: Phone, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", label: "Phone" },
};

/* ------------------------------------------------------------------ */
/*  Pseudo-random helpers                                               */
/* ------------------------------------------------------------------ */
function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i);
  return Math.abs(h);
}

function generateDecisionMakers(domain: string, size: string): DecisionMaker[] {
  const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/^www\./, "");
  const h = hashCode(cleanDomain + size);
  const roles = rolesBySize[size] || rolesBySize["1-50"];

  return roles.map((role, i) => {
    const fn = firstNames[(h + i * 3) % firstNames.length];
    const ln = lastNames[(h + i * 7 + 5) % lastNames.length];
    const power = Math.max(5, Math.min(10, 10 - i + (h % 3)));
    const tech = Math.max(4, Math.min(10, 8 - i + ((h + i * 2) % 4)));
    const channels = Object.keys(channelConfig);
    const bestChannel = channels[(h + i) % channels.length];
    const id = `${cleanDomain.replace(/\./g, "-")}-${i}-${Date.now()}`;

    return {
      id,
      name: `${fn} ${ln}`,
      title: role.title,
      department: role.dept,
      emailPattern: `${fn.toLowerCase()}.${ln.toLowerCase()}@${cleanDomain}`,
      linkedinUrl: `https://linkedin.com/in/${fn.toLowerCase()}-${ln.toLowerCase()}-${(h % 900) + 100}`,
      powerScore: power,
      techSavviness: tech,
      bestChannel,
      firstTouchMessage: `Hi ${fn}, I noticed ${cleanDomain} is scaling fast. We've helped similar ${size}-person companies streamline their growth operations and reduce overhead by 40%. Worth a brief conversation?`,
    };
  });
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */
export default function DecisionMakerFinder() {
  const [domain, setDomain] = useState("");
  const [size, setSize] = useState("50-200");
  const [contacts, setContacts] = useState<DecisionMaker[]>([]);
  const [searched, setSearched] = useState(false);
  const [filterDept, setFilterDept] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [addedToSequence, setAddedToSequence] = useState<Set<string>>(new Set());

  const handleSearch = useCallback(() => {
    if (!domain.trim()) return;
    const results = generateDecisionMakers(domain, size);
    setContacts(results);
    setSearched(true);
    setExpandedId(results[0]?.id || null);
  }, [domain, size]);

  const handleCopyEmail = useCallback((email: string) => {
    navigator.clipboard.writeText(email).catch(() => {});
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  }, []);

  const handleAddToSequence = useCallback((id: string) => {
    setAddedToSequence((prev) => new Set(prev).add(id));
  }, []);

  const departments = useMemo(() => {
    const depts = new Set(contacts.map((c) => c.department));
    return ["All", ...Array.from(depts)];
  }, [contacts]);

  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      const matchDept = filterDept === "All" || c.department === filterDept;
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.department.toLowerCase().includes(q);
      return matchDept && matchSearch;
    });
  }, [contacts, filterDept, searchQuery]);

  const avgPower = contacts.length > 0 ? Math.round(contacts.reduce((s, c) => s + c.powerScore, 0) / contacts.length) : 0;
  const avgTech = contacts.length > 0 ? Math.round(contacts.reduce((s, c) => s + c.techSavviness, 0) / contacts.length) : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <UserCircle className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-100">Decision Maker Finder</h2>
          <p className="text-[11px] text-slate-500">Discover and analyze key contacts at target companies</p>
        </div>
      </div>

      {/* Search Input */}
      <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
          <Building2 className="w-3 h-3" />
          Company Targeting
        </div>
        <div className="flex gap-2 flex-wrap">
          <input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="company.com"
            className="flex-1 min-w-[180px] text-xs px-3 py-2 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-emerald-500 transition-colors"
          />
          <select
            value={size}
            onChange={(e) => setSize(e.target.value)}
            className="text-xs px-3 py-2 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-emerald-500 cursor-pointer"
          >
            {sizeOptions.map((s) => (
              <option key={s} value={s}>{s} employees</option>
            ))}
          </select>
          <button
            onClick={handleSearch}
            disabled={!domain.trim()}
            className="text-xs px-4 py-2 rounded-lg bg-emerald-500 text-white font-medium disabled:opacity-50 flex items-center gap-1.5 hover:bg-emerald-600 transition-colors"
          >
            <Search className="w-3 h-3" />
            Find Contacts
          </button>
        </div>
      </div>

      {/* Results */}
      {searched && (
        <>
          {/* Stats Bar */}
          <div className="grid grid-cols-4 gap-2">
            <div className="p-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] text-center">
              <div className="text-lg font-bold text-slate-200">{contacts.length}</div>
              <div className="text-[10px] text-slate-500">Contacts Found</div>
            </div>
            <div className="p-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] text-center">
              <div className="text-lg font-bold text-indigo-400">{avgPower}</div>
              <div className="text-[10px] text-slate-500">Avg Power</div>
            </div>
            <div className="p-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] text-center">
              <div className="text-lg font-bold text-emerald-400">{avgTech}</div>
              <div className="text-[10px] text-slate-500">Avg Tech Savvy</div>
            </div>
            <div className="p-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] text-center">
              <div className="text-lg font-bold text-amber-400">{addedToSequence.size}</div>
              <div className="text-[10px] text-slate-500">In Sequence</div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <Filter className="w-3 h-3" />
              <span>Dept:</span>
            </div>
            {departments.map((dept) => (
              <button
                key={dept}
                onClick={() => setFilterDept(dept)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-all ${
                  filterDept === dept
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
                    : "bg-transparent text-slate-500 border-white/[0.06] hover:text-slate-400"
                }`}
              >
                {dept}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-1.5">
              <Search className="w-3 h-3 text-slate-600" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search contacts..."
                className="text-[11px] px-2 py-1 rounded border border-white/[0.06] bg-[#0f172a] text-slate-300 outline-none focus:border-emerald-500 w-36"
              />
            </div>
          </div>

          {/* Contact Cards */}
          <div className="space-y-2">
            {filtered.map((contact) => {
              const expanded = expandedId === contact.id;
              const channelInfo = channelConfig[contact.bestChannel] || channelConfig.Email;
              const ChannelIcon = channelInfo.icon;
              const isAdded = addedToSequence.has(contact.id);

              return (
                <div
                  key={contact.id}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden hover:border-white/[0.1] transition-colors"
                >
                  <button
                    onClick={() => setExpandedId(expanded ? null : contact.id)}
                    className="w-full flex items-center gap-3 p-3 text-left"
                  >
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500/20 to-emerald-500/20 border border-white/[0.08] flex items-center justify-center text-xs font-bold text-slate-300 flex-shrink-0">
                      {contact.name.split(" ").map((n) => n[0]).join("")}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-200">{contact.name}</div>
                      <div className="text-[10px] text-slate-500">
                        {contact.title} · {contact.department}
                      </div>
                    </div>

                    {/* Power & Tech Bars */}
                    <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-[10px] text-slate-600">
                          <Crown className="w-2.5 h-2.5" /> Power
                        </div>
                        <div className="w-14 h-1.5 rounded-full bg-white/[0.06] mt-0.5 overflow-hidden">
                          <div className="h-full rounded-full bg-indigo-500" style={{ width: `${contact.powerScore * 10}%` }} />
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-[10px] text-slate-600">
                          <Monitor className="w-2.5 h-2.5" /> Tech
                        </div>
                        <div className="w-14 h-1.5 rounded-full bg-white/[0.06] mt-0.5 overflow-hidden">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${contact.techSavviness * 10}%` }} />
                        </div>
                      </div>
                    </div>

                    {/* Best channel badge */}
                    <div className={`px-1.5 py-0.5 rounded text-[10px] font-medium border flex items-center gap-1 flex-shrink-0 ${channelInfo.color}`}>
                      <ChannelIcon className="w-2.5 h-2.5" />
                      {channelInfo.label}
                    </div>

                    {expanded ? (
                      <ChevronUp className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    )}
                  </button>

                  {expanded && (
                    <div className="px-3 pb-3 space-y-2.5">
                      {/* Contact Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="p-2.5 rounded-lg bg-[#0f172a] border border-white/[0.06]">
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-1">
                            <Mail className="w-3 h-3" /> Email Pattern
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-300">{contact.emailPattern}</span>
                            <button
                              onClick={() => handleCopyEmail(contact.emailPattern)}
                              className="p-1 rounded hover:bg-white/[0.06] text-slate-600 hover:text-slate-400 transition-colors"
                            >
                              {copiedEmail === contact.emailPattern ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>
                        <a
                          href={contact.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 rounded-lg bg-[#0f172a] border border-white/[0.06] hover:border-blue-500/20 transition-colors group"
                        >
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-1">
                            <Linkedin className="w-3 h-3" /> LinkedIn Profile
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-blue-400 group-hover:underline truncate">{contact.linkedinUrl.replace("https://", "")}</span>
                            <ArrowRight className="w-3 h-3 text-blue-500 flex-shrink-0" />
                          </div>
                        </a>
                      </div>

                      {/* Score Bars (mobile) */}
                      <div className="flex sm:hidden items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                            <span className="flex items-center gap-1"><Crown className="w-2.5 h-2.5" /> Decision Power</span>
                            <span>{contact.powerScore}/10</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                            <div className="h-full rounded-full bg-indigo-500" style={{ width: `${contact.powerScore * 10}%` }} />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                            <span className="flex items-center gap-1"><Monitor className="w-2.5 h-2.5" /> Tech Savviness</span>
                            <span>{contact.techSavviness}/10</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${contact.techSavviness * 10}%` }} />
                          </div>
                        </div>
                      </div>

                      {/* Suggested First Touch */}
                      <div className="p-2.5 rounded-lg bg-emerald-500/[0.04] border border-emerald-500/15">
                        <div className="flex items-center gap-1.5 mb-1">
                          <MessageSquare className="w-3 h-3 text-emerald-400" />
                          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Suggested First Touch</span>
                        </div>
                        <p className="text-[11px] text-slate-400 italic leading-relaxed">&ldquo;{contact.firstTouchMessage}&rdquo;</p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAddToSequence(contact.id)}
                          disabled={isAdded}
                          className={`flex-1 flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg font-medium transition-all ${
                            isAdded
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-default"
                              : "bg-indigo-500 text-white hover:bg-indigo-600"
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <Check className="w-3 h-3" />
                              Added to Sequence
                            </>
                          ) : (
                            <>
                              <Plus className="w-3 h-3" />
                              Add to Outreach Sequence
                            </>
                          )}
                        </button>
                        <a
                          href={`https://${domain.replace(/^https?:\/\//, "").replace(/^www\./, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg border border-white/[0.08] hover:bg-white/[0.03] text-slate-500 hover:text-slate-300 transition-colors"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Empty state */}
          {filtered.length === 0 && (
            <div className="p-8 text-center rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <Users className="w-8 h-8 text-slate-700 mx-auto mb-2" />
              <div className="text-xs text-slate-500">No contacts match your filters</div>
            </div>
          )}
        </>
      )}

      {/* Tip */}
      {!searched && (
        <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-start gap-2">
          <Zap className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="text-[11px] text-slate-500 leading-relaxed">
            <span className="text-slate-400 font-medium">Pro tip:</span> Enter a target company domain and select their size range to generate realistic decision-maker profiles with recommended outreach strategies.
          </div>
        </div>
      )}
    </div>
  );
}
