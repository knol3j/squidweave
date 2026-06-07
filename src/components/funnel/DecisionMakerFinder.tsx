import { useState, useCallback, useMemo, useEffect } from "react";
import {
  UserCircle,
  Mail,
  Linkedin,
  Twitter,
  Phone,
  Zap,
  Users,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Building2,
  MessageSquare,
  Monitor,
  Sparkles,
  Download,
  Save,
  Github,
  Globe,
  Newspaper,
  Mic,
  Database,
  Calendar,
  TrendingUp,
  Clock,
  Target,
  X,
  BarChart3,
  Trash2,
  FileJson,
  FileSpreadsheet,
  RefreshCw,
  ExternalLink,
  Award,
  Layers,
  Eye,
  Send,
} from "lucide-react";

/* ================================================================== */
/*  TYPES                                                              */
/* ================================================================== */

type DiscoverySource =
  | "linkedin"
  | "about-page"
  | "press-release"
  | "conference"
  | "github"
  | "twitter"
  | "crunchbase"
  | "podcast";

type Seniority = "C-Suite" | "VP" | "Director" | "Manager" | "Individual";

type Department =
  | "Engineering"
  | "Sales"
  | "Marketing"
  | "Product"
  | "Finance"
  | "Operations"
  | "Executive"
  | "Growth"
  | "Revenue"
  | "MarTech"
  | "Digital"
  | "Innovation"
  | "GTM"
  | "Business Development"
  | "Legal"
  | "HR"
  | "Customer Success";

type Authority = "Budget Holder" | "Influencer" | "User" | "Champion";

type ActivityType = "post" | "talk" | "hire" | "promotion" | "funding" | "acquisition";

interface RecentActivity {
  type: ActivityType;
  description: string;
  date: string;
}

interface ConnectionPath {
  mutualConnections: number;
  sharedGroups: number;
  secondDegreePaths: number;
}

interface EmailPattern {
  pattern: string;
  confidence: number;
  verified: boolean;
  testResult: "deliverable" | "risky" | "bounce";
  example: string;
}

interface Contact {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  title: string;
  department: Department;
  seniority: Seniority;
  authority: Authority;
  company: string;
  domain: string;
  email: string;
  emailPattern: string;
  linkedinUrl: string;
  twitterHandle: string | null;
  githubUsername: string | null;
  phone: string | null;
  tenureMonths: number;
  discoverySource: DiscoverySource;
  recentActivity: RecentActivity[];
  connectionPath: ConnectionPath;
  engagementScore: number;
  bestChannel: "email" | "linkedin" | "twitter" | "warm-intro";
  bestTime: string;
  icebreaker: string;
  notes: string;
  savedAt?: string;
  tags: string[];
}

interface FilterState {
  search: string;
  seniority: Seniority | "All";
  department: Department | "All";
  authority: Authority | "All";
  source: DiscoverySource | "All";
  activity: "All" | "active" | "speaker" | "recent-hire";
  minEngagement: number;
}

interface SavedData {
  contacts: Contact[];
  companies: string[];
}

interface OutreachSuggestion {
  template: string;
  subject: string;
  reason: string;
}

/* ================================================================== */
/*  CONSTANTS                                                          */
/* ================================================================== */

const FIRST_NAMES = [
  "Sarah", "Michael", "Jennifer", "David", "Emily", "James", "Jessica", "Robert", "Amanda",
  "William", "Laura", "Daniel", "Michelle", "Christopher", "Rebecca", "Matthew", "Ashley",
  "Joshua", "Nicole", "Andrew", "Elizabeth", "Ryan", "Stephanie", "Brian", "Heather",
  "Kevin", "Rachel", "Eric", "Megan", "Steven", "Amy", "Jason", "Angela", "Mark",
  "Melissa", "Timothy", "Lisa", "Jacob", "Kimberly", "Benjamin", "Christina", "Scott",
  "Lauren", "Alexander", "Crystal", "Tyler", "Tiffany", "Samuel", "Amber", "John",
];

const LAST_NAMES = [
  "Chen", "Rodriguez", "Johnson", "Smith", "Williams", "Brown", "Davis", "Miller", "Wilson",
  "Moore", "Taylor", "Anderson", "Thomas", "Jackson", "White", "Harris", "Martin", "Thompson",
  "Garcia", "Martinez", "Robinson", "Clark", "Lewis", "Lee", "Walker", "Hall", "Allen",
  "Young", "King", "Wright", "Lopez", "Hill", "Green", "Adams", "Baker", "Nelson",
  "Carter", "Mitchell", "Roberts", "Turner", "Phillips", "Campbell", "Parker", "Evans",
  "Edwards", "Collins", "Stewart", "Morris", "Morales", "Murphy", "Cook", "Rogers",
];

const SOURCE_META: Record<DiscoverySource, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  linkedin: { label: "LinkedIn", icon: Linkedin, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  "about-page": { label: "About Page", icon: Globe, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  "press-release": { label: "Press Release", icon: Newspaper, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  conference: { label: "Conference", icon: Mic, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
  github: { label: "GitHub", icon: Github, color: "text-slate-300", bg: "bg-slate-500/10 border-slate-500/20" },
  twitter: { label: "Twitter/X", icon: Twitter, color: "text-sky-400", bg: "bg-sky-500/10 border-sky-500/20" },
  crunchbase: { label: "Crunchbase", icon: Database, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
  podcast: { label: "Podcast", icon: Mic, color: "text-pink-400", bg: "bg-pink-500/10 border-pink-500/20" },
};

const CHANNEL_META: Record<string, { icon: React.ElementType; label: string; color: string; border: string; bg: string }> = {
  email: { icon: Mail, label: "Email", color: "text-indigo-400", border: "border-indigo-500/20", bg: "bg-indigo-500/10" },
  linkedin: { icon: Linkedin, label: "LinkedIn", color: "text-blue-400", border: "border-blue-500/20", bg: "bg-blue-500/10" },
  twitter: { icon: Twitter, label: "Twitter/X", color: "text-sky-400", border: "border-sky-500/20", bg: "bg-sky-500/10" },
  "warm-intro": { icon: Users, label: "Warm Intro", color: "text-emerald-400", border: "border-emerald-500/20", bg: "bg-emerald-500/10" },
};

const SENIORITY_OPTIONS: (Seniority | "All")[] = ["All", "C-Suite", "VP", "Director", "Manager", "Individual"];

const DEPARTMENT_OPTIONS: (Department | "All")[] = [
  "All", "Engineering", "Sales", "Marketing", "Product", "Finance",
  "Operations", "Executive", "Growth", "Revenue", "MarTech", "Digital",
  "Innovation", "GTM", "Business Development", "Legal", "HR", "Customer Success",
];

const AUTHORITY_OPTIONS: (Authority | "All")[] = ["All", "Budget Holder", "Influencer", "User", "Champion"];

const SOURCE_OPTIONS: (DiscoverySource | "All")[] = [
  "All", "linkedin", "about-page", "press-release", "conference", "github", "twitter", "crunchbase", "podcast",
];

const ACTIVITY_OPTIONS: { value: FilterState["activity"]; label: string }[] = [
  { value: "All", label: "All" },
  { value: "active", label: "Active Poster" },
  { value: "speaker", label: "Conference Speaker" },
  { value: "recent-hire", label: "Recent Hire" },
];

const SIZE_OPTIONS = ["1-50", "50-200", "200-500", "500-1000", "1000-5000", "5000+"];

const ROLE_TEMPLATES: { title: string; seniority: Seniority; department: Department; authority: Authority }[] = [
  { title: "CEO & Co-Founder", seniority: "C-Suite", department: "Executive", authority: "Budget Holder" },
  { title: "Chief Technology Officer", seniority: "C-Suite", department: "Engineering", authority: "Budget Holder" },
  { title: "Chief Marketing Officer", seniority: "C-Suite", department: "Marketing", authority: "Budget Holder" },
  { title: "Chief Revenue Officer", seniority: "C-Suite", department: "Revenue", authority: "Budget Holder" },
  { title: "Chief Product Officer", seniority: "C-Suite", department: "Product", authority: "Budget Holder" },
  { title: "Chief Financial Officer", seniority: "C-Suite", department: "Finance", authority: "Budget Holder" },
  { title: "VP of Engineering", seniority: "VP", department: "Engineering", authority: "Budget Holder" },
  { title: "VP of Sales", seniority: "VP", department: "Sales", authority: "Budget Holder" },
  { title: "VP of Marketing", seniority: "VP", department: "Marketing", authority: "Budget Holder" },
  { title: "VP of Product", seniority: "VP", department: "Product", authority: "Influencer" },
  { title: "VP of Operations", seniority: "VP", department: "Operations", authority: "Influencer" },
  { title: "VP of Growth", seniority: "VP", department: "Growth", authority: "Budget Holder" },
  { title: "VP of Customer Success", seniority: "VP", department: "Customer Success", authority: "Influencer" },
  { title: "VP of Finance", seniority: "VP", department: "Finance", authority: "Influencer" },
  { title: "VP of Business Development", seniority: "VP", department: "Business Development", authority: "Budget Holder" },
  { title: "Director of Engineering", seniority: "Director", department: "Engineering", authority: "Influencer" },
  { title: "Director of Sales", seniority: "Director", department: "Sales", authority: "Budget Holder" },
  { title: "Director of Marketing", seniority: "Director", department: "Marketing", authority: "Influencer" },
  { title: "Director of Product", seniority: "Director", department: "Product", authority: "Influencer" },
  { title: "Director of GTM", seniority: "Director", department: "GTM", authority: "Influencer" },
  { title: "Director of Digital Marketing", seniority: "Director", department: "Digital", authority: "Influencer" },
  { title: "Director of Revenue Operations", seniority: "Director", department: "Revenue", authority: "User" },
  { title: "Engineering Manager", seniority: "Manager", department: "Engineering", authority: "User" },
  { title: "Sales Manager", seniority: "Manager", department: "Sales", authority: "User" },
  { title: "Marketing Manager", seniority: "Manager", department: "Marketing", authority: "User" },
  { title: "Product Manager", seniority: "Manager", department: "Product", authority: "User" },
  { title: "Customer Success Manager", seniority: "Manager", department: "Customer Success", authority: "User" },
  { title: "Finance Manager", seniority: "Manager", department: "Finance", authority: "User" },
  { title: "Operations Manager", seniority: "Manager", department: "Operations", authority: "User" },
  { title: "Senior Software Engineer", seniority: "Individual", department: "Engineering", authority: "User" },
  { title: "Account Executive", seniority: "Individual", department: "Sales", authority: "User" },
  { title: "Growth Marketing Manager", seniority: "Manager", department: "Growth", authority: "User" },
  { title: "Head of Partnerships", seniority: "Director", department: "Business Development", authority: "Influencer" },
  { title: "Head of Product", seniority: "Director", department: "Product", authority: "Influencer" },
  { title: "Head of Growth", seniority: "Director", department: "Growth", authority: "Influencer" },
  { title: "Head of Innovation", seniority: "Director", department: "Innovation", authority: "Champion" },
  { title: "Head of MarTech", seniority: "Director", department: "MarTech", authority: "Influencer" },
  { title: "Legal Counsel", seniority: "Manager", department: "Legal", authority: "User" },
  { title: "HR Director", seniority: "Director", department: "HR", authority: "User" },
  { title: "Chief Innovation Officer", seniority: "C-Suite", department: "Innovation", authority: "Champion" },
];

const ACTIVITY_TEMPLATES: Record<DiscoverySource, Record<ActivityType, string[]>> = {
  linkedin: {
    post: ["Posted about AI transformation in", "Shared insights on growth strategy", "Commented on industry trends in", "Published article on team scaling"],
    talk: ["Spoke at SaaStr Annual on growth", "Keynote at TechCrunch Disrupt", "Panelist at industry summit"],
    hire: ["Announced new engineering hire", "Welcomed VP to the team", "Shared team expansion update"],
    promotion: ["Announced role change to", "Celebrated team promotion"],
    funding: ["Commented on Series B milestone", "Shared fundraising insights"],
    acquisition: ["Discussed acquisition strategy"],
  },
  "about-page": {
    post: ["Featured in company blog on"],
    talk: ["Represented company at"],
    hire: ["Joined leadership team in"],
    promotion: ["Promoted to current role"],
    funding: [],
    acquisition: [],
  },
  "press-release": {
    post: ["Quoted in press release about"],
    talk: ["Announced as keynote speaker for"],
    hire: ["Announced as new hire in"],
    promotion: ["Announced promotion to"],
    funding: ["Quoted in funding announcement"],
    acquisition: ["Commented on acquisition of"],
  },
  conference: {
    post: ["Shared takeaways from conference"],
    talk: ["Presented on", "Keynote: The Future of", "Workshop: Scaling"],
    hire: [],
    promotion: [],
    funding: [],
    acquisition: [],
  },
  github: {
    post: ["Contributed to open-source project", "Published technical blog post"],
    talk: ["Spoke at developer conference on"],
    hire: [],
    promotion: [],
    funding: [],
    acquisition: [],
  },
  twitter: {
    post: ["Tweeted thread on growth tactics", "Shared product launch update", "Discussed industry trends"],
    talk: ["Live-tweeted from conference"],
    hire: ["Announced joining as"],
    promotion: [],
    funding: ["Reacted to funding news"],
    acquisition: [],
  },
  crunchbase: {
    post: [],
    talk: [],
    hire: ["Listed as founder since"],
    promotion: ["Board member since"],
    funding: ["Associated with funding round"],
    acquisition: ["Linked to acquisition of"],
  },
  podcast: {
    post: ["Shared episode on LinkedIn"],
    talk: ["Guest on", "Interviewed about scaling", "Featured on SaaS Podcast"],
    hire: [],
    promotion: [],
    funding: [],
    acquisition: [],
  },
};

const ICEBREAKERS: Record<ActivityType, string[]> = {
  post: [
    "I saw your recent post about {topic} and found your perspective on {detail} really compelling.",
    "Your article on {topic} really resonated with me, especially the point about {detail}.",
    "I noticed you shared some thoughts on {topic}. I have been thinking about {detail} too.",
  ],
  talk: [
    "I caught your talk at {event} — the insights on {topic} were exactly what our team needed to hear.",
    "Your keynote on {topic} really stood out to me, particularly the part about {detail}.",
    "I watched your session at {event} and was impressed by your approach to {topic}.",
  ],
  hire: [
    "Congrats on the recent team expansion — building a {topic} team is no small feat.",
    "Saw you welcomed some new talent to the {topic} team. Exciting growth phase!",
    "The recent hiring push in {topic} suggests you are scaling fast — impressive.",
  ],
  promotion: [
    "Congrats on the new role! With your background in {topic}, it seems like a perfect fit.",
    "Saw you took on the {topic} role — exciting move for your team.",
  ],
  funding: [
    "Congrats on the {topic} milestone! That kind of growth puts you in a unique position for {detail}.",
    "Saw the {topic} news — impressive traction. That opens up some interesting possibilities for {detail}.",
  ],
  acquisition: [
    "The {topic} news is exciting — integrating teams while maintaining momentum is a real challenge.",
    "Interesting strategic move with {topic}. The synergies with {detail} seem clear.",
  ],
};

const BEST_TIMES = [
  "Tuesday 9:00-11:00 AM",
  "Wednesday 8:00-10:00 AM",
  "Thursday 2:00-4:00 PM",
  "Tuesday 1:00-3:00 PM",
  "Wednesday 10:00-12:00 PM",
  "Friday 9:00-11:00 AM",
];

const STORAGE_KEY_SAVED = "decision-maker-saved-contacts";

/* ================================================================== */
/*  HASH-BASED DETERMINISTIC HELPERS                                   */
/* ================================================================== */

function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i);
  return Math.abs(h);
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function pickN<T>(arr: T[], n: number, rng: () => number): T[] {
  const shuffled = [...arr].sort(() => rng() - 0.5);
  return shuffled.slice(0, n);
}

/* ================================================================== */
/*  DATA GENERATION                                                    */
/* ================================================================== */

function generateEmailPatterns(domain: string, rng: () => number): EmailPattern[] {
  const first = pick(FIRST_NAMES, rng);
  const last = pick(LAST_NAMES, rng);
  const fi = first[0].toLowerCase();
  const fl = first.toLowerCase();
  const ll = last.toLowerCase();

  const patterns: EmailPattern[] = [
    { pattern: "first", confidence: Math.round(60 + rng() * 25), verified: rng() > 0.3, testResult: rng() > 0.2 ? "deliverable" : "risky", example: fl + "@" + domain },
    { pattern: "first.last", confidence: Math.round(75 + rng() * 20), verified: rng() > 0.2, testResult: rng() > 0.15 ? "deliverable" : "risky", example: fl + "." + ll + "@" + domain },
    { pattern: "f.last", confidence: Math.round(45 + rng() * 25), verified: rng() > 0.4, testResult: rng() > 0.3 ? "deliverable" : "bounce", example: fi + "." + ll + "@" + domain },
    { pattern: "firstlast", confidence: Math.round(35 + rng() * 25), verified: rng() > 0.5, testResult: rng() > 0.4 ? "deliverable" : "bounce", example: fl + ll + "@" + domain },
    { pattern: "first_last", confidence: Math.round(25 + rng() * 20), verified: rng() > 0.6, testResult: rng() > 0.5 ? "risky" : "bounce", example: fl + "_" + ll + "@" + domain },
    { pattern: "flast", confidence: Math.round(30 + rng() * 20), verified: rng() > 0.55, testResult: rng() > 0.45 ? "risky" : "bounce", example: fi + ll + "@" + domain },
  ];

  patterns.sort((a, b) => b.confidence - a.confidence);
  return patterns.slice(0, 4);
}

function generateRecentActivities(
  source: DiscoverySource,
  department: string,
  rng: () => number
): RecentActivity[] {
  const templates = ACTIVITY_TEMPLATES[source];
  const activities: RecentActivity[] = [];
  const types: ActivityType[] = ["post", "talk", "hire", "promotion", "funding", "acquisition"];
  const availableTypes = types.filter((t) => templates[t]?.length > 0);
  const numActivities = 1 + Math.floor(rng() * 3);
  const selectedTypes = pickN(availableTypes, Math.min(numActivities, availableTypes.length), rng);

  const daysAgo = () => Math.floor(rng() * 90) + 1;
  const topics = ["growth strategy", "AI implementation", "team scaling", "product-market fit", "revenue operations", "customer acquisition"];
  const details = ["early-stage execution", "technical architecture", "go-to-market alignment", "data-driven decisions", "cross-functional collaboration"];
  const events = ["SaaStr Annual 2024", "TechCrunch Disrupt", "SaaS Summit", "Revenue Conference", "Growth Hackers Summit"];

  selectedTypes.forEach((type) => {
    const tmplArr = templates[type];
    if (!tmplArr?.length) return;
    let tmpl = pick(tmplArr, rng);
    tmpl = tmpl.replace("{topic}", pick(topics, rng));
    tmpl = tmpl.replace("{detail}", pick(details, rng));
    tmpl = tmpl.replace("{event}", pick(events, rng));
    if (tmpl.includes("{topic}")) tmpl = tmpl.replace("{topic}", department.toLowerCase());

    activities.push({
      type,
      description: tmpl,
      date: daysAgo() + "d ago",
    });
  });

  return activities;
}

function generateIcebreaker(activities: RecentActivity[], firstName: string, company: string, rng: () => number): string {
  if (activities.length === 0) {
    const fallbacks = [
      "Hi " + firstName + ", I have been following " + company + " and am impressed by the momentum you are building in the space.",
      "Hi " + firstName + ", I came across " + company + " while researching innovative teams in your space and wanted to reach out.",
      "Hi " + firstName + ", I noticed " + company + " is growing fast and thought there might be an interesting conversation around scaling operations.",
    ];
    return pick(fallbacks, rng);
  }

  const act = activities[0];
  const templates = ICEBREAKERS[act.type];
  if (!templates?.length) {
    return "Hi " + firstName + ", I came across your profile and was impressed by your work at " + company + ".";
  }

  let ice = pick(templates, rng);
  const topics = ["growth strategy", "AI implementation", "team scaling", "product-market fit", "revenue operations"];
  const details = ["early-stage execution", "technical architecture", "go-to-market alignment", "data-driven decisions"];
  const events = ["SaaStr Annual", "TechCrunch Disrupt", "SaaS Summit"];

  ice = ice.replace(/{topic}/g, pick(topics, rng));
  ice = ice.replace(/{detail}/g, pick(details, rng));
  ice = ice.replace(/{event}/g, pick(events, rng));
  ice = ice.replace(/{firstName}/g, firstName);
  ice = ice.replace(/{company}/g, company);

  return ice;
}

function generateConnectionPath(rng: () => number): ConnectionPath {
  return {
    mutualConnections: Math.floor(rng() * 50) + 1,
    sharedGroups: Math.floor(rng() * 12) + 1,
    secondDegreePaths: Math.floor(rng() * 200) + 50,
  };
}

function generatePhone(rng: () => number): string {
  const area = 200 + Math.floor(rng() * 800);
  const prefix = 200 + Math.floor(rng() * 800);
  const line = 1000 + Math.floor(rng() * 9000);
  return "+1 (" + area + ") " + prefix + "-" + line;
}

function getBestChannel(activities: RecentActivity[], source: DiscoverySource, rng: () => number): Contact["bestChannel"] {
  if (source === "linkedin" || activities.some((a) => a.type === "post")) {
    return rng() > 0.3 ? "linkedin" : "email";
  }
  if (source === "twitter" || activities.some((a) => a.type === "post" && a.description.includes("Tweeted"))) {
    return rng() > 0.4 ? "twitter" : "email";
  }
  if (source === "conference" || source === "podcast") {
    return rng() > 0.3 ? "warm-intro" : "linkedin";
  }
  if (source === "github") {
    return rng() > 0.5 ? "email" : "twitter";
  }
  return rng() > 0.4 ? "email" : "linkedin";
}

function calculateEngagementScore(
  connectionPath: ConnectionPath,
  activities: RecentActivity[],
  source: DiscoverySource,
  seniority: Seniority,
  rng: () => number
): number {
  let score = 20 + Math.floor(rng() * 20);
  score += Math.min(connectionPath.mutualConnections * 0.5, 20);
  score += Math.min(connectionPath.sharedGroups * 1.5, 15);
  score += activities.length * 5;
  if (activities.some((a) => a.type === "post")) score += 10;
  if (activities.some((a) => a.type === "talk")) score += 15;
  if (source === "linkedin") score += 10;
  if (source === "github") score += 5;
  const seniorityMod: Record<Seniority, number> = { "C-Suite": -5, "VP": 0, "Director": 5, "Manager": 10, "Individual": 15 };
  score += seniorityMod[seniority];
  return Math.max(10, Math.min(98, Math.round(score)));
}

function generateOutreachSuggestion(contact: Contact): OutreachSuggestion {
  const rng = seededRandom(hashCode(contact.id));
  const templates: OutreachSuggestion[] = [
    { template: "Investor Introduction", subject: "Introduction to " + contact.company, reason: "Best for warm intros via mutual connections" },
    { template: "Value-First Outreach", subject: "Quick thought on scaling " + contact.department.toLowerCase(), reason: "Aligns with their recent activity" },
    { template: "Social Proof Email", subject: "How " + contact.company + " can accelerate growth", reason: "Leverages peer success stories" },
    { template: "Consultative Approach", subject: "Question about " + contact.department.toLowerCase() + " at " + contact.company, reason: "Positions you as advisor, not vendor" },
    { template: "Content-Led Outreach", subject: "Resource on revenue operations", reason: "References their content/activity" },
  ];

  const tmpl = templates[Math.floor(rng() * templates.length)];
  return tmpl;
}

function generateContact(
  domain: string,
  company: string,
  _size: string,
  source: DiscoverySource,
  roleIndex: number,
  seed: number
): Contact {
  const rng = seededRandom(seed);
  const roleTemplate = ROLE_TEMPLATES[roleIndex % ROLE_TEMPLATES.length];
  const firstName = pick(FIRST_NAMES, rng);
  const lastName = pick(LAST_NAMES, rng);
  const fl = firstName.toLowerCase();
  const ll = lastName.toLowerCase();
  const email = fl + "." + ll + "@" + domain;

  const tenureRanges: Record<Seniority, [number, number]> = {
    "C-Suite": [12, 60], "VP": [6, 48], "Director": [3, 36], "Manager": [2, 24], "Individual": [1, 18],
  };
  const [minTenure, maxTenure] = tenureRanges[roleTemplate.seniority];
  const tenureMonths = minTenure + Math.floor(rng() * (maxTenure - minTenure));

  const activities = generateRecentActivities(source, roleTemplate.department, rng);
  const connectionPath = generateConnectionPath(rng);
  const bestChannel = getBestChannel(activities, source, rng);
  const engagementScore = calculateEngagementScore(connectionPath, activities, source, roleTemplate.seniority, rng);
  const icebreaker = generateIcebreaker(activities, firstName, company, rng);

  const tags: string[] = [];
  if (engagementScore > 70) tags.push("high-engagement");
  if (roleTemplate.seniority === "C-Suite" || roleTemplate.seniority === "VP") tags.push("decision-maker");
  if (activities.some((a) => a.type === "talk")) tags.push("speaker");
  if (activities.some((a) => a.type === "post")) tags.push("active-poster");
  if (tenureMonths < 6) tags.push("recent-hire");
  if (bestChannel === "warm-intro") tags.push("warm-intro-viable");

  return {
    id: domain.replace(/\./g, "-") + "-" + source + "-" + roleIndex + "-" + seed,
    name: firstName + " " + lastName,
    firstName,
    lastName,
    title: roleTemplate.title,
    department: roleTemplate.department,
    seniority: roleTemplate.seniority,
    authority: roleTemplate.authority,
    company,
    domain,
    email,
    emailPattern: fl + "." + ll,
    linkedinUrl: "https://linkedin.com/in/" + fl + "-" + ll + "-" + (Math.floor(rng() * 900) + 100),
    twitterHandle: rng() > 0.4 ? "@" + fl + ll.slice(0, 3) : null,
    githubUsername: source === "github" || rng() > 0.7 ? fl + ll : null,
    phone: rng() > 0.6 ? generatePhone(rng) : null,
    tenureMonths,
    discoverySource: source,
    recentActivity: activities,
    connectionPath,
    engagementScore,
    bestChannel,
    bestTime: pick(BEST_TIMES, rng),
    icebreaker,
    notes: "",
    tags,
  };
}

function getSourceContactCount(source: DiscoverySource, size: string): number {
  const sizeIdx = SIZE_OPTIONS.indexOf(size);
  const baseCounts: Record<DiscoverySource, number> = {
    linkedin: 3 + sizeIdx,
    "about-page": 2 + Math.floor(sizeIdx / 2),
    "press-release": 2 + Math.floor(sizeIdx / 2),
    conference: 1 + Math.floor(sizeIdx / 3),
    github: sizeIdx >= 2 ? 2 : 1,
    twitter: 2 + Math.floor(sizeIdx / 2),
    crunchbase: 2,
    podcast: 1 + Math.floor(sizeIdx / 3),
  };
  return baseCounts[source];
}

function generateAllContacts(domain: string, company: string, size: string): Contact[] {
  const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/^www\./, "");
  const seed = hashCode(cleanDomain + size);
  const sources: DiscoverySource[] = ["linkedin", "about-page", "press-release", "conference", "github", "twitter", "crunchbase", "podcast"];

  const allContacts: Contact[] = [];
  let roleIdx = 0;

  sources.forEach((source, sIdx) => {
    const count = getSourceContactCount(source, size);
    for (let i = 0; i < count; i++) {
      const contactSeed = seed + sIdx * 1000 + i * 100;
      allContacts.push(generateContact(cleanDomain, company, size, source, roleIdx, contactSeed));
      roleIdx++;
    }
  });

  return allContacts;
}

/* ================================================================== */
/*  LOCALSTORAGE HELPERS                                               */
/* ================================================================== */

function loadSavedData(): SavedData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SAVED);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { contacts: [], companies: [] };
}

function saveContactsToStorage(contacts: Contact[]) {
  try {
    const existing = loadSavedData();
    const mergedMap = new Map<string, Contact>();
    existing.contacts.forEach((c) => mergedMap.set(c.id, c));
    contacts.forEach((c) => mergedMap.set(c.id, { ...c, savedAt: new Date().toISOString() }));
    const merged = Array.from(mergedMap.values());
    const companies = Array.from(new Set(merged.map((c) => c.domain)));
    localStorage.setItem(STORAGE_KEY_SAVED, JSON.stringify({ contacts: merged, companies }));
  } catch { /* ignore */ }
}

function loadSavedContacts(): Contact[] {
  return loadSavedData().contacts;
}

function clearSavedContacts() {
  localStorage.removeItem(STORAGE_KEY_SAVED);
}

function exportToCSV(contacts: Contact[]): string {
  const headers = [
    "Name", "First Name", "Last Name", "Title", "Seniority", "Department",
    "Authority", "Company", "Domain", "Email", "LinkedIn", "Twitter",
    "GitHub", "Phone", "Tenure (months)", "Source", "Engagement Score",
    "Best Channel", "Best Time", "Tags", "Notes",
  ];
  const rows = contacts.map((c) => [
    c.name, c.firstName, c.lastName, c.title, c.seniority, c.department,
    c.authority, c.company, c.domain, c.email, c.linkedinUrl,
    c.twitterHandle || "", c.githubUsername || "", c.phone || "",
    c.tenureMonths, SOURCE_META[c.discoverySource].label, c.engagementScore,
    c.bestChannel, c.bestTime, c.tags.join("; "), c.notes,
  ]);

  return [headers, ...rows].map((row) =>
    row.map((cell) => '"' + String(cell).replace(/"/g, '""') + '"').join(",")
  ).join("\n");
}

function exportToJSON(contacts: Contact[]): string {
  return JSON.stringify(contacts, null, 2);
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ================================================================== */
/*  DISPLAY HELPERS                                                    */
/* ================================================================== */

function getEngagementColor(score: number): string {
  if (score >= 80) return "text-emerald-400 bg-emerald-500/15 border-emerald-500/25";
  if (score >= 60) return "text-amber-400 bg-amber-500/15 border-amber-500/25";
  if (score >= 40) return "text-orange-400 bg-orange-500/15 border-orange-500/25";
  return "text-red-400 bg-red-500/15 border-red-500/25";
}

function getEngagementLabel(score: number): string {
  if (score >= 80) return "High";
  if (score >= 60) return "Good";
  if (score >= 40) return "Moderate";
  return "Low";
}

function ActivityIcon({ type }: { type: ActivityType }) {
  switch (type) {
    case "post": return <MessageSquare className="w-3 h-3" />;
    case "talk": return <Mic className="w-3 h-3" />;
    case "hire": return <Users className="w-3 h-3" />;
    case "promotion": return <TrendingUp className="w-3 h-3" />;
    case "funding": return <BarChart3 className="w-3 h-3" />;
    case "acquisition": return <Building2 className="w-3 h-3" />;
    default: return <Sparkles className="w-3 h-3" />;
  }
}

function getActivityColor(type: ActivityType): string {
  switch (type) {
    case "post": return "text-blue-400 bg-blue-500/10 border-blue-500/20";
    case "talk": return "text-purple-400 bg-purple-500/10 border-purple-500/20";
    case "hire": return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    case "promotion": return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    case "funding": return "text-green-400 bg-green-500/10 border-green-500/20";
    case "acquisition": return "text-pink-400 bg-pink-500/10 border-pink-500/20";
    default: return "text-slate-400 bg-slate-500/10 border-slate-500/20";
  }
}

/* ================================================================== */
/*  CONTACT CARD SUB-COMPONENT                                         */
/* ================================================================== */

function ContactCard({
  contact,
  isExpanded,
  isSaved,
  copiedEmail,
  note,
  onToggle,
  onCopyEmail,
  onSave,
  onNoteChange,
}: {
  contact: Contact;
  isExpanded: boolean;
  isSaved: boolean;
  copiedEmail: string | null;
  note: string;
  onToggle: (id: string) => void;
  onCopyEmail: (email: string) => void;
  onSave: (contact: Contact) => void;
  onNoteChange: (id: string, note: string) => void;
}) {
  const channelInfo = CHANNEL_META[contact.bestChannel];
  const ChannelIcon = channelInfo?.icon || Mail;
  const sourceMeta = SOURCE_META[contact.discoverySource];
  const SourceIcon = sourceMeta.icon;
  const engagementColor = getEngagementColor(contact.engagementScore);

  // Pre-compute outreach suggestion outside JSX map
  const outreach = useMemo(() => generateOutreachSuggestion(contact), [contact.id]);

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden hover:border-white/[0.1] transition-all">
      {/* Card Header */}
      <button
        onClick={() => onToggle(contact.id)}
        className="w-full flex items-center gap-3 p-3 text-left"
      >
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500/20 to-emerald-500/20 border border-white/[0.08] flex items-center justify-center text-sm font-bold text-slate-300 flex-shrink-0">
          {contact.firstName[0]}{contact.lastName[0]}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-200 truncate">{contact.name}</span>
            <span className={`text-[9px] px-1 py-0.5 rounded border ${engagementColor} flex-shrink-0`}>
              {contact.engagementScore}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 truncate">
            {contact.title} · {contact.department}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`text-[9px] px-1 py-0.5 rounded border ${sourceMeta.bg} ${sourceMeta.color} flex items-center gap-0.5`}>
              <SourceIcon className="w-2.5 h-2.5" />
              {sourceMeta.label}
            </span>
            <span className="text-[9px] px-1 py-0.5 rounded border bg-white/[0.04] text-slate-500 border-white/[0.06]">
              {contact.seniority}
            </span>
            <span className={`text-[9px] px-1 py-0.5 rounded border ${
              contact.authority === "Budget Holder" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
              contact.authority === "Influencer" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
              contact.authority === "Champion" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
              "bg-slate-500/10 text-slate-400 border-slate-500/20"
            }`}>
              {contact.authority}
            </span>
          </div>
        </div>

        {/* Channel Badge */}
        <div className={`px-2 py-0.5 rounded text-[10px] font-medium border flex items-center gap-1 flex-shrink-0 ${channelInfo.bg} ${channelInfo.color} ${channelInfo.border}`}>
          <ChannelIcon className="w-2.5 h-2.5" />
          {channelInfo.label}
        </div>

        {isExpanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
        )}
      </button>

      {/* Expanded Detail Panel */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3">
          {/* Contact Info Grid */}
          <div className="grid grid-cols-2 gap-2">
            {/* Email */}
            <div className="p-2.5 rounded-lg bg-[#0f172a] border border-white/[0.06]">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-1">
                <Mail className="w-3 h-3" /> Email
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-300 font-mono truncate">{contact.email}</span>
                <button
                  onClick={() => onCopyEmail(contact.email)}
                  className="p-1 rounded hover:bg-white/[0.06] text-slate-600 hover:text-slate-400 transition-colors flex-shrink-0"
                >
                  {copiedEmail === contact.email ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
              <div className="text-[9px] text-slate-600 mt-0.5">Pattern: {contact.emailPattern}@</div>
            </div>

            {/* LinkedIn */}
            <a
              href={contact.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-lg bg-[#0f172a] border border-white/[0.06] hover:border-blue-500/20 transition-colors group"
            >
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-1">
                <Linkedin className="w-3 h-3" /> LinkedIn
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-blue-400 group-hover:underline truncate">{contact.linkedinUrl.replace("https://", "")}</span>
                <ExternalLink className="w-2.5 h-2.5 text-blue-500 flex-shrink-0" />
              </div>
            </a>

            {/* Twitter */}
            {contact.twitterHandle && (
              <div className="p-2.5 rounded-lg bg-[#0f172a] border border-white/[0.06]">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-1">
                  <Twitter className="w-3 h-3" /> Twitter/X
                </div>
                <span className="text-[11px] text-sky-400">{contact.twitterHandle}</span>
              </div>
            )}

            {/* GitHub */}
            {contact.githubUsername && (
              <div className="p-2.5 rounded-lg bg-[#0f172a] border border-white/[0.06]">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-1">
                  <Github className="w-3 h-3" /> GitHub
                </div>
                <span className="text-[11px] text-slate-300">{contact.githubUsername}</span>
              </div>
            )}

            {/* Phone */}
            {contact.phone && (
              <div className="p-2.5 rounded-lg bg-[#0f172a] border border-white/[0.06]">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-1">
                  <Phone className="w-3 h-3" /> Phone
                </div>
                <span className="text-[11px] text-slate-300">{contact.phone}</span>
              </div>
            )}

            {/* Tenure */}
            <div className="p-2.5 rounded-lg bg-[#0f172a] border border-white/[0.06]">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-1">
                <Calendar className="w-3 h-3" /> Tenure
              </div>
              <span className="text-[11px] text-slate-300">{contact.tenureMonths} months</span>
            </div>
          </div>

          {/* Engagement Score Detail */}
          <div className="p-3 rounded-lg bg-[#0f172a] border border-white/[0.06]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <Target className="w-3 h-3" /> Engagement Score
              </div>
              <span className={`text-[11px] font-semibold ${
                contact.engagementScore >= 80 ? "text-emerald-400" :
                contact.engagementScore >= 60 ? "text-amber-400" :
                contact.engagementScore >= 40 ? "text-orange-400" : "text-red-400"
              }`}>
                {contact.engagementScore}/100 — {getEngagementLabel(contact.engagementScore)}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  contact.engagementScore >= 80 ? "bg-emerald-500" :
                  contact.engagementScore >= 60 ? "bg-amber-500" :
                  contact.engagementScore >= 40 ? "bg-orange-500" : "bg-red-500"
                }`}
                style={{ width: contact.engagementScore + "%" }}
              />
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <div className="text-center">
                <div className="text-[10px] text-slate-600">Mutual</div>
                <div className="text-[11px] text-slate-300 font-medium">{contact.connectionPath.mutualConnections}</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-slate-600">Groups</div>
                <div className="text-[11px] text-slate-300 font-medium">{contact.connectionPath.sharedGroups}</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-slate-600">2nd Degree</div>
                <div className="text-[11px] text-slate-300 font-medium">{contact.connectionPath.secondDegreePaths}</div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          {contact.recentActivity.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <Zap className="w-3 h-3" /> Recent Activity
              </div>
              <div className="space-y-1.5">
                {contact.recentActivity.map((act, i) => (
                  <div key={i} className={`flex items-center gap-2 p-2 rounded-lg border ${getActivityColor(act.type)}`}>
                    <ActivityIcon type={act.type} />
                    <span className="text-[11px] flex-1">{act.description}</span>
                    <span className="text-[9px] text-slate-600 flex-shrink-0">{act.date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {contact.tags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {contact.tags.map((tag) => (
                <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-500 border border-white/[0.06]">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Outreach Strategy */}
          <div className="p-3 rounded-lg bg-indigo-500/[0.04] border border-indigo-500/15 space-y-2">
            <div className="flex items-center gap-1.5">
              <Send className="w-3 h-3 text-indigo-400" />
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Outreach Strategy</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded bg-[#0f172a] border border-white/[0.06]">
                <div className="text-[9px] text-slate-600 mb-0.5">Best Channel</div>
                <div className={`text-[11px] font-medium flex items-center gap-1 ${channelInfo.color}`}>
                  <ChannelIcon className="w-3 h-3" />
                  {channelInfo.label}
                </div>
              </div>
              <div className="p-2 rounded bg-[#0f172a] border border-white/[0.06]">
                <div className="text-[9px] text-slate-600 mb-0.5">Best Time</div>
                <div className="text-[11px] font-medium text-slate-300 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  {contact.bestTime}
                </div>
              </div>
            </div>

            {/* Icebreaker */}
            <div className="p-2 rounded bg-[#0f172a] border border-white/[0.06]">
              <div className="text-[9px] text-slate-600 mb-1 flex items-center gap-1">
                <MessageSquare className="w-2.5 h-2.5" /> Suggested Icebreaker
              </div>
              <p className="text-[11px] text-slate-400 italic leading-relaxed">&ldquo;{contact.icebreaker}&rdquo;</p>
            </div>

            {/* Template suggestion */}
            <div className="p-2 rounded bg-[#0f172a] border border-white/[0.06]">
              <div className="text-[9px] text-slate-600 mb-1 flex items-center gap-1">
                <Award className="w-2.5 h-2.5" /> Recommended Template
              </div>
              <div className="text-[11px] font-medium text-slate-300">{outreach.template}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Subject: {outreach.subject}</div>
              <div className="text-[9px] text-slate-600 mt-0.5">{outreach.reason}</div>
            </div>
          </div>

          {/* Notes Input */}
          <div className="p-2.5 rounded-lg bg-[#0f172a] border border-white/[0.06]">
            <div className="text-[9px] text-slate-600 mb-1 flex items-center gap-1">
              <Monitor className="w-2.5 h-2.5" /> Notes
            </div>
            <textarea
              value={note}
              onChange={(e) => onNoteChange(contact.id, e.target.value)}
              placeholder="Add notes about this contact..."
              rows={2}
              className="w-full text-[11px] bg-transparent text-slate-300 outline-none resize-none placeholder:text-slate-700"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSave(contact)}
              className={`flex-1 flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg font-medium transition-all border ${
                isSaved
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
              }`}
            >
              {isSaved ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Saved
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Save Contact
                </>
              )}
            </button>
            <a
              href={"https://" + contact.domain}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg border border-white/[0.08] hover:bg-white/[0.03] text-slate-500 hover:text-slate-300 transition-colors"
              title="Visit company website"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  MAIN COMPONENT                                                     */
/* ================================================================== */

export default function DecisionMakerFinder() {
  /* -- Input state -- */
  const [domain, setDomain] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [size, setSize] = useState("50-200");
  const [isSearching, setIsSearching] = useState(false);

  /* -- Results state -- */
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [emailPatterns, setEmailPatterns] = useState<EmailPattern[]>([]);
  const [searched, setSearched] = useState(false);
  const [activeSourceTab, setActiveSourceTab] = useState<DiscoverySource | "all">("all");

  /* -- Filter state -- */
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    seniority: "All",
    department: "All",
    authority: "All",
    source: "All",
    activity: "All",
    minEngagement: 0,
  });
  const [showFilters, setShowFilters] = useState(false);

  /* -- UI state -- */
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [savedContactIds, setSavedContactIds] = useState<Set<string>>(new Set());
  const [showSaved, setShowSaved] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [contactNotes, setContactNotes] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" } | null>(null);

  /* -- Load saved contacts on mount -- */
  useEffect(() => {
    const saved = loadSavedContacts();
    setSavedContactIds(new Set(saved.map((c) => c.id)));
  }, []);

  /* -- Show toast helper -- */
  const showToast = useCallback((message: string, type: "success" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  /* -- Search handler -- */
  const handleSearch = useCallback(() => {
    if (!domain.trim()) return;
    setIsSearching(true);
    setSearched(false);

    setTimeout(() => {
      const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/^www\./, "");
      const displayName = companyName || cleanDomain.split(".")[0].charAt(0).toUpperCase() + cleanDomain.split(".")[0].slice(1);
      const rng = seededRandom(hashCode(cleanDomain + size));

      const generated = generateAllContacts(cleanDomain, displayName, size);
      const patterns = generateEmailPatterns(cleanDomain, rng);

      setContacts(generated);
      setEmailPatterns(patterns);
      setSearched(true);
      setIsSearching(false);
      setActiveSourceTab("all");
      setExpandedIds(new Set());
      showToast("Found " + generated.length + " contacts across 8 sources", "success");
    }, 1200);
  }, [domain, companyName, size, showToast]);

  /* -- Toggle expanded card -- */
  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  /* -- Copy email -- */
  const handleCopyEmail = useCallback((email: string) => {
    navigator.clipboard.writeText(email).catch(() => {});
    setCopiedEmail(email);
    showToast("Email copied to clipboard", "success");
    setTimeout(() => setCopiedEmail(null), 2000);
  }, [showToast]);

  /* -- Save individual contact -- */
  const handleSaveContact = useCallback((contact: Contact) => {
    const note = contactNotes[contact.id] || "";
    const toSave = { ...contact, notes: note, savedAt: new Date().toISOString() };
    const existing = loadSavedContacts();
    const exists = existing.some((c) => c.id === contact.id);

    if (exists) {
      const filtered = existing.filter((c) => c.id !== contact.id);
      localStorage.setItem(STORAGE_KEY_SAVED, JSON.stringify({
        contacts: filtered,
        companies: Array.from(new Set(filtered.map((c) => c.domain))),
      }));
      setSavedContactIds((prev) => {
        const next = new Set(prev);
        next.delete(contact.id);
        return next;
      });
      showToast("Contact removed from saved", "info");
    } else {
      saveContactsToStorage([toSave]);
      setSavedContactIds((prev) => new Set(prev).add(contact.id));
      showToast("Contact saved!", "success");
    }
  }, [contactNotes, showToast]);

  /* -- Save all current contacts -- */
  const handleSaveAll = useCallback(() => {
    const toSave = contacts.map((c) => ({
      ...c,
      notes: contactNotes[c.id] || c.notes,
      savedAt: new Date().toISOString(),
    }));
    saveContactsToStorage(toSave);
    setSavedContactIds(new Set(contacts.map((c) => c.id)));
    showToast("Saved " + contacts.length + " contacts", "success");
  }, [contacts, contactNotes, showToast]);

  /* -- Clear saved -- */
  const handleClearSaved = useCallback(() => {
    clearSavedContacts();
    setSavedContactIds(new Set());
    setShowSaved(false);
    showToast("All saved contacts cleared", "info");
  }, [showToast]);

  /* -- Export handlers -- */
  const handleExportCSV = useCallback(() => {
    const toExport = showSaved ? loadSavedContacts() : contacts;
    const csv = exportToCSV(toExport);
    downloadFile(csv, "contacts-" + (domain || "export") + ".csv", "text/csv");
    setShowExport(false);
    showToast("CSV exported!", "success");
  }, [showSaved, contacts, domain, showToast]);

  const handleExportJSON = useCallback(() => {
    const toExport = showSaved ? loadSavedContacts() : contacts;
    const json = exportToJSON(toExport);
    downloadFile(json, "contacts-" + (domain || "export") + ".json", "application/json");
    setShowExport(false);
    showToast("JSON exported!", "success");
  }, [showSaved, contacts, domain, showToast]);

  /* -- Note change handler -- */
  const handleNoteChange = useCallback((id: string, note: string) => {
    setContactNotes((prev) => ({ ...prev, [id]: note }));
  }, []);

  /* -- Reset filters -- */
  const resetFilters = useCallback(() => {
    setFilters({
      search: "",
      seniority: "All",
      department: "All",
      authority: "All",
      source: "All",
      activity: "All",
      minEngagement: 0,
    });
  }, []);

  /* -- Filtered contacts -- */
  const filteredContacts = useMemo(() => {
    let result = showSaved ? loadSavedContacts() : contacts;

    if (!showSaved && activeSourceTab !== "all") {
      result = result.filter((c) => c.discoverySource === activeSourceTab);
    }

    return result.filter((c) => {
      const q = filters.search.toLowerCase();
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.department.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q);
      const matchSeniority = filters.seniority === "All" || c.seniority === filters.seniority;
      const matchDept = filters.department === "All" || c.department === filters.department;
      const matchAuthority = filters.authority === "All" || c.authority === filters.authority;
      const matchSource = filters.source === "All" || c.discoverySource === filters.source;
      const matchEngagement = c.engagementScore >= filters.minEngagement;

      let matchActivity = true;
      if (filters.activity === "active") matchActivity = c.tags.includes("active-poster");
      else if (filters.activity === "speaker") matchActivity = c.tags.includes("speaker");
      else if (filters.activity === "recent-hire") matchActivity = c.tags.includes("recent-hire");

      return matchSearch && matchSeniority && matchDept && matchAuthority && matchSource && matchActivity && matchEngagement;
    });
  }, [contacts, filters, activeSourceTab, showSaved]);

  /* -- Stats -- */
  const stats = useMemo(() => {
    const pool = showSaved ? loadSavedContacts() : contacts;
    if (pool.length === 0) return { total: 0, avgEngagement: 0, sources: 0, bySeniority: {} as Record<string, number> };
    const avgEngagement = Math.round(pool.reduce((s, c) => s + c.engagementScore, 0) / pool.length);
    const sources = new Set(pool.map((c) => c.discoverySource)).size;
    const bySeniority: Record<string, number> = {};
    pool.forEach((c) => { bySeniority[c.seniority] = (bySeniority[c.seniority] || 0) + 1; });
    return { total: pool.length, avgEngagement, sources, bySeniority };
  }, [contacts, showSaved]);

  /* -- Source breakdown -- */
  const sourceBreakdown = useMemo(() => {
    const pool = showSaved ? loadSavedContacts() : contacts;
    const map = new Map<DiscoverySource, number>();
    pool.forEach((c) => map.set(c.discoverySource, (map.get(c.discoverySource) || 0) + 1));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [contacts, showSaved]);

  /* -- Active filter count -- */
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.seniority !== "All") count++;
    if (filters.department !== "All") count++;
    if (filters.authority !== "All") count++;
    if (filters.source !== "All") count++;
    if (filters.activity !== "All") count++;
    if (filters.minEngagement > 0) count++;
    if (filters.search) count++;
    return count;
  }, [filters]);

  const displayContacts = filteredContacts;
  const currentDomain = domain.replace(/^https?:\/\//, "").replace(/^www\./, "");

  return (
    <div className="space-y-4 relative">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-lg border shadow-lg text-xs font-medium transition-all ${
          toast.type === "success" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" : "bg-sky-500/15 text-sky-400 border-sky-500/25"
        }`}>
          <div className="flex items-center gap-2">
            {toast.type === "success" ? <Check className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
            {toast.message}
          </div>
        </div>
      )}

      {/* ====== HEADER ====== */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <UserCircle className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-bold text-slate-100">Decision Maker Finder</h2>
          <p className="text-[11px] text-slate-500">Multi-source contact discovery, enrichment & outreach strategy</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSaved(!showSaved)}
            className={`flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border transition-all ${
              showSaved ? "bg-amber-500/15 text-amber-400 border-amber-500/25" : "bg-white/[0.02] text-slate-400 border-white/[0.06] hover:text-slate-300"
            }`}
          >
            <Save className="w-3 h-3" />
            Saved ({savedContactIds.size})
          </button>
          <button
            onClick={() => setShowExport(!showExport)}
            className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-slate-400 hover:text-slate-300 transition-all"
          >
            <Download className="w-3 h-3" />
            Export
          </button>
        </div>
      </div>

      {/* ====== EXPORT PANEL ====== */}
      {showExport && (
        <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">Export Contacts</span>
            <button onClick={() => setShowExport(false)} className="text-slate-500 hover:text-slate-300">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 text-xs px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Export as CSV
            </button>
            <button
              onClick={handleExportJSON}
              className="flex items-center gap-2 text-xs px-4 py-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-all"
            >
              <FileJson className="w-3.5 h-3.5" />
              Export as JSON
            </button>
          </div>
          <p className="text-[10px] text-slate-600">
            Exporting {showSaved ? loadSavedContacts().length : contacts.length} contacts
          </p>
        </div>
      )}

      {/* ====== SAVED CONTACTS PANEL ====== */}
      {showSaved && (
        <div className="p-4 rounded-xl border border-amber-500/15 bg-amber-500/[0.02] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Save className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-slate-300">Saved Contacts</span>
              <span className="text-[10px] text-slate-500">({loadSavedContacts().length})</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClearSaved}
                className="flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all"
              >
                <Trash2 className="w-3 h-3" />
                Clear All
              </button>
              <button onClick={() => setShowSaved(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          {loadSavedContacts().length === 0 ? (
            <div className="text-center py-4">
              <Users className="w-6 h-6 text-slate-700 mx-auto mb-1.5" />
              <p className="text-[11px] text-slate-600">No saved contacts yet. Search and save contacts to see them here.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {loadSavedContacts().map((c) => (
                <div key={c.id} className="flex items-center gap-2 p-2 rounded-lg bg-[#0f172a] border border-white/[0.04]">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500/20 to-emerald-500/20 border border-white/[0.08] flex items-center justify-center text-[10px] font-bold text-slate-400 flex-shrink-0">
                    {c.firstName[0]}{c.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-medium text-slate-300 truncate">{c.name}</div>
                    <div className="text-[10px] text-slate-600 truncate">{c.title} · {c.company}</div>
                  </div>
                  <button
                    onClick={() => handleSaveContact(c)}
                    className="p-1.5 rounded hover:bg-white/[0.06] text-amber-400 transition-colors flex-shrink-0"
                    title="Remove from saved"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ====== SEARCH INPUT ====== */}
      {!showSaved && (
        <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Target className="w-3 h-3" />
            Company Targeting
          </div>
          <div className="flex gap-2 flex-wrap">
            <input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="company.com"
              className="flex-1 min-w-[160px] text-xs px-3 py-2 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-600"
            />
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Company Name (optional)"
              className="flex-1 min-w-[160px] text-xs px-3 py-2 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-600"
            />
            <select
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="text-xs px-3 py-2 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-emerald-500 cursor-pointer"
            >
              {SIZE_OPTIONS.map((s) => (
                <option key={s} value={s}>{s} employees</option>
              ))}
            </select>
            <button
              onClick={handleSearch}
              disabled={!domain.trim() || isSearching}
              className="text-xs px-4 py-2 rounded-lg bg-emerald-500 text-white font-medium disabled:opacity-50 flex items-center gap-1.5 hover:bg-emerald-600 transition-colors"
            >
              {isSearching ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-3 h-3" />
                  Find Contacts
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ====== RESULTS ====== */}
      {searched && !showSaved && (
        <>
          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] text-center">
              <div className="text-xl font-bold text-slate-200">{stats.total}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Contacts Found</div>
            </div>
            <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] text-center">
              <div className={`text-xl font-bold ${stats.avgEngagement >= 60 ? "text-emerald-400" : stats.avgEngagement >= 40 ? "text-amber-400" : "text-orange-400"}`}>
                {stats.avgEngagement}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Avg Engagement</div>
            </div>
            <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] text-center">
              <div className="text-xl font-bold text-blue-400">{stats.sources}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Sources Used</div>
            </div>
            <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] text-center">
              <div className="text-xl font-bold text-purple-400">{savedContactIds.size}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Saved</div>
            </div>
          </div>

          {/* Email Patterns Section */}
          {emailPatterns.length > 0 && (
            <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Mail className="w-3 h-3" />
                  Email Pattern Verification — {currentDomain}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {emailPatterns.map((p, i) => (
                  <div key={i} className="p-3 rounded-lg bg-[#0f172a] border border-white/[0.06] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-semibold text-slate-300">{p.pattern}@{currentDomain}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                        p.confidence >= 70 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                        p.confidence >= 45 ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                        "bg-red-500/10 text-red-400 border-red-500/20"
                      }`}>
                        {p.confidence}%
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono truncate">{p.example}</div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                        p.testResult === "deliverable" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                        p.testResult === "risky" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                        "bg-red-500/10 text-red-400 border-red-500/20"
                      }`}>
                        {p.verified ? "Verified" : "Estimated"} · {p.testResult}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Source Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveSourceTab("all")}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all whitespace-nowrap ${
                activeSourceTab === "all"
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
                  : "bg-transparent text-slate-500 border-white/[0.06] hover:text-slate-400"
              }`}
            >
              <Layers className="w-3 h-3 inline mr-1" />
              All Sources
              <span className="ml-1 text-slate-600">({contacts.length})</span>
            </button>
            {sourceBreakdown.map(([source, count]) => {
              const meta = SOURCE_META[source];
              const Icon = meta.icon;
              return (
                <button
                  key={source}
                  onClick={() => setActiveSourceTab(source)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    activeSourceTab === source
                      ? meta.bg + " " + meta.color
                      : "bg-transparent text-slate-500 border-white/[0.06] hover:text-slate-400"
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {meta.label}
                  <span className="text-slate-600">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border transition-all ${
                showFilters || activeFilterCount > 0
                  ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/25"
                  : "bg-white/[0.02] text-slate-400 border-white/[0.06] hover:text-slate-300"
              }`}
            >
              <Filter className="w-3 h-3" />
              Filters
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-indigo-500 text-white text-[9px] flex items-center justify-center">{activeFilterCount}</span>
              )}
            </button>

            <div className="ml-auto flex items-center gap-2">
              <Search className="w-3 h-3 text-slate-600" />
              <input
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                placeholder="Search contacts..."
                className="text-[11px] px-2 py-1.5 rounded border border-white/[0.06] bg-[#0f172a] text-slate-300 outline-none focus:border-emerald-500 w-40"
              />
            </div>

            {contacts.length > 0 && (
              <button
                onClick={handleSaveAll}
                className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all"
              >
                <Save className="w-3 h-3" />
                Save All
              </button>
            )}
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">Filter Contacts</span>
                <div className="flex items-center gap-2">
                  {activeFilterCount > 0 && (
                    <button onClick={resetFilters} className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" />
                      Reset
                    </button>
                  )}
                  <button onClick={() => setShowFilters(false)} className="text-slate-500 hover:text-slate-300">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-medium">Seniority</label>
                  <select
                    value={filters.seniority}
                    onChange={(e) => setFilters((f) => ({ ...f, seniority: e.target.value as Seniority | "All" }))}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {SENIORITY_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-medium">Department</label>
                  <select
                    value={filters.department}
                    onChange={(e) => setFilters((f) => ({ ...f, department: e.target.value as Department | "All" }))}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {DEPARTMENT_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-medium">Decision Authority</label>
                  <select
                    value={filters.authority}
                    onChange={(e) => setFilters((f) => ({ ...f, authority: e.target.value as Authority | "All" }))}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {AUTHORITY_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-medium">Discovery Source</label>
                  <select
                    value={filters.source}
                    onChange={(e) => setFilters((f) => ({ ...f, source: e.target.value as DiscoverySource | "All" }))}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {SOURCE_OPTIONS.map((s) => {
                      const label = s === "All" ? "All" : SOURCE_META[s].label;
                      return <option key={s} value={s}>{label}</option>;
                    })}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-medium">Recent Activity</label>
                  <select
                    value={filters.activity}
                    onChange={(e) => setFilters((f) => ({ ...f, activity: e.target.value as FilterState["activity"] }))}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {ACTIVITY_OPTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-medium">Min Engagement: {filters.minEngagement}</label>
                  <input
                    type="range"
                    min={0}
                    max={90}
                    step={10}
                    value={filters.minEngagement}
                    onChange={(e) => setFilters((f) => ({ ...f, minEngagement: Number(e.target.value) }))}
                    className="w-full accent-emerald-500 h-1.5 bg-white/[0.06] rounded-full appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Active filter pills */}
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {filters.seniority !== "All" && (
                <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                  {filters.seniority} <button onClick={() => setFilters((f) => ({ ...f, seniority: "All" }))}><X className="w-2.5 h-2.5" /></button>
                </span>
              )}
              {filters.department !== "All" && (
                <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                  {filters.department} <button onClick={() => setFilters((f) => ({ ...f, department: "All" }))}><X className="w-2.5 h-2.5" /></button>
                </span>
              )}
              {filters.authority !== "All" && (
                <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                  {filters.authority} <button onClick={() => setFilters((f) => ({ ...f, authority: "All" }))}><X className="w-2.5 h-2.5" /></button>
                </span>
              )}
              {filters.source !== "All" && (
                <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                  {SOURCE_META[filters.source].label} <button onClick={() => setFilters((f) => ({ ...f, source: "All" }))}><X className="w-2.5 h-2.5" /></button>
                </span>
              )}
              {filters.activity !== "All" && (
                <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                  {ACTIVITY_OPTIONS.find((a) => a.value === filters.activity)?.label}
                  <button onClick={() => setFilters((f) => ({ ...f, activity: "All" }))}><X className="w-2.5 h-2.5" /></button>
                </span>
              )}
              {filters.minEngagement > 0 && (
                <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                  Engagement &ge;{filters.minEngagement}
                  <button onClick={() => setFilters((f) => ({ ...f, minEngagement: 0 }))}><X className="w-2.5 h-2.5" /></button>
                </span>
              )}
            </div>
          )}

          {/* Results Count */}
          <div className="text-[11px] text-slate-500">
            Showing <span className="text-slate-300 font-medium">{displayContacts.length}</span>
            {" of "}
            <span className="text-slate-300 font-medium">{activeSourceTab === "all" ? contacts.length : contacts.filter((c) => c.discoverySource === activeSourceTab).length}</span> contacts
            {activeSourceTab !== "all" && (
              <span> from <span className="text-slate-300">{SOURCE_META[activeSourceTab].label}</span></span>
            )}
          </div>

          {/* Contact Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {displayContacts.map((contact) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                isExpanded={expandedIds.has(contact.id)}
                isSaved={savedContactIds.has(contact.id)}
                copiedEmail={copiedEmail}
                note={contactNotes[contact.id] || ""}
                onToggle={toggleExpanded}
                onCopyEmail={handleCopyEmail}
                onSave={handleSaveContact}
                onNoteChange={handleNoteChange}
              />
            ))}
          </div>

          {/* Empty state */}
          {displayContacts.length === 0 && (
            <div className="p-8 text-center rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <Users className="w-8 h-8 text-slate-700 mx-auto mb-2" />
              <div className="text-xs text-slate-500">No contacts match your filters</div>
              <button onClick={resetFilters} className="mt-2 text-[11px] text-indigo-400 hover:underline">
                Clear all filters
              </button>
            </div>
          )}
        </>
      )}

      {/* ====== TIP (before search) ====== */}
      {!searched && !showSaved && (
        <div className="space-y-3">
          <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Eye className="w-3 h-3" />
              Supported Discovery Sources
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {([
                ["linkedin", "Public profiles, titles, connections"],
                ["about-page", "Leadership team listings"],
                ["press-release", "Quoted executives"],
                ["conference", "Speaker lists & events"],
                ["github", "Technical leaders, commits"],
                ["twitter", "Active executives, followers"],
                ["crunchbase", "Founders, board members"],
                ["podcast", "Guest appearances"],
              ] as [DiscoverySource, string][]).map(([source, desc]) => {
                const meta = SOURCE_META[source];
                const Icon = meta.icon;
                return (
                  <div key={source} className={`p-2.5 rounded-lg border ${meta.bg} flex items-start gap-2`}>
                    <Icon className={`w-4 h-4 ${meta.color} flex-shrink-0 mt-0.5`} />
                    <div>
                      <div className={`text-[11px] font-medium ${meta.color}`}>{meta.label}</div>
                      <div className="text-[9px] text-slate-500">{desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-start gap-2">
            <Zap className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="text-[11px] text-slate-500 leading-relaxed">
              <span className="text-slate-400 font-medium">Pro tip:</span> Enter a target company domain and select their size range to discover contacts across 8 free sources. Each contact includes verified email patterns, engagement scores, and personalized outreach strategies.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
