import { useState, useEffect } from "react";
import {
  Building2,
  Mail,
  Linkedin,
  MapPin,
  TrendingUp,
  Users,
  Calendar,
  Clock,
  Plus,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  MessageSquare,
  FileText,
  DollarSign,
  Target,
  Award,
  BarChart3,
  Search,
  Star,
  Briefcase,
  Globe,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────

export interface DecisionMaker {
  id: string;
  name: string;
  title: string;
  email: string;
  linkedin: string;
  contactStatus: "not-contacted" | "contacted" | "responded" | "meeting" | "passed" | "invested";
  bio: string;
  education: string;
  previousFirms: string[];
  notableInvestments: string[];
  personalityNotes: string;
}

export interface PortfolioCompany {
  name: string;
  stage: string;
  sector: string;
  valuation: string;
  yearInvested: number;
  isLead: boolean;
}

export interface ContactEvent {
  date: string;
  type: string;
  notes: string;
  participant: string;
  outcome: string;
}

export interface DealFlow {
  company: string;
  stage: string;
  amount: string;
  date: string;
  status: "evaluating" | "term-sheet" | "due-diligence" | "closed" | "passed";
  leadPartner: string;
}

export interface InvestorContact {
  id: string;
  name: string;
  type: "VC" | "Angel" | "PE" | "Strategic" | "Family Office" | "Growth Equity";
  location: string;
  checkSize: string;
  aum: string;
  thesis: string;
  focusAreas: string[];
  portfolioCompanies: number;
  decisionMakers: DecisionMaker[];
  portfolio: PortfolioCompany[];
  contactHistory: ContactEvent[];
  lastContact: string;
  founded: number;
  fundStage: string;
  website: string;
  crunchbaseUrl: string;
  signalRank: number;
  fundSize: string;
  avgInitialCheck: string;
  dealFlow: DealFlow[];
  coInvestors: string[];
  boardSeats: string[];
  reputationScore: number;
  speedToTermSheet: string;
  followOnRate: string;
  notableExits: { company: string; return: string; year: number }[];
}

// ─── Seed Data ───────────────────────────────────────────────────────

const SEED_INVESTORS: InvestorContact[] = [
  {
    id: "a16z",
    name: "Andreessen Horowitz",
    type: "VC",
    location: "Menlo Park, CA",
    checkSize: "$500K – $100M",
    aum: "$42B",
    thesis: "We back bold entrepreneurs building the future through technology. We invest across all stages from seed to growth, with deep expertise in software, bio, crypto, and AI. Our network of 100+ operating partners provides hands-on support.",
    focusAreas: ["Enterprise Software", "AI/ML", "Crypto/Web3", "Bio", "Fintech", "Consumer"],
    portfolioCompanies: 472,
    founded: 2009,
    fundStage: "Multi-Stage",
    website: "a16z.com",
    crunchbaseUrl: "crunchbase.com/organization/andreessen-horowitz",
    signalRank: 98,
    fundSize: "$9.2B (Fund VIII)",
    avgInitialCheck: "$3.2M",
    speedToTermSheet: "2-4 weeks",
    followOnRate: "87%",
    reputationScore: 9.6,
    decisionMakers: [
      { id: "a16z-1", name: "Marc Andreessen", title: "Co-Founder & General Partner", email: "marc@a16z.com", linkedin: "linkedin.com/in/marcandreessen", contactStatus: "contacted", bio: "Co-authored Mosaic, co-founded Netscape and Opsware. Board member at Meta.", education: "UIUC, Computer Science", previousFirms: ["Netscape", "Opsware", "Ning"], notableInvestments: ["Facebook", "Twitter", "Airbnb", "Coinbase"], personalityNotes: "Thinks in frameworks, responds to bold visions. Prefect concise memos over long decks." },
      { id: "a16z-2", name: "Ben Horowitz", title: "Co-Founder & General Partner", email: "ben@a16z.com", linkedin: "linkedin.com/in/benhorowitz", contactStatus: "not-contacted", bio: "Co-founded Loudcloud/Opsware (acquired by HP for $1.6B). Author of The Hard Thing About Hard Things.", education: "Columbia University, BA Computer Science", previousFirms: ["Loudcloud", "Opsware", "HP"], notableInvestments: ["GitHub", "Okta", "Databricks", "Figma"], personalityNotes: "Values operational excellence. Respects founders who have done their homework on GTM." },
      { id: "a16z-3", name: "Katherine Boyle", title: "General Partner", email: "katherine@a16z.com", linkedin: "linkedin.com/in/katherineboyle", contactStatus: "responded", bio: "Leads American Dynamism practice, focusing on companies supporting national interest.", education: "Georgetown University", previousFirms: ["Ribbit Capital", "Prelude Ventures"], notableInvestments: ["Shield AI", "Anduril", "Hadrian"], personalityNotes: "Passionate about defense tech and industrials. Very responsive to founders with technical depth." },
      { id: "a16z-4", name: "Martin Casado", title: "General Partner", email: "martin@a16z.com", linkedin: "linkedin.com/in/martincasado", contactStatus: "meeting", bio: "Founded Nicira (acquired by VMware for $1.26B). Pioneer of SDN.", education: "Stanford, PhD Computer Science", previousFirms: ["Nicira", "VMware"], notableInvestments: ["Astronomer", "HashiCorp", "Databricks"], personalityNotes: "Deep technical evaluator. Loves to dive into architecture. Meetings tend to be 90+ min technical deep-dives." },
      { id: "a16z-5", name: "Jennifer Li", title: "Partner, Growth", email: "jennifer@a16z.com", linkedin: "linkedin.com/in/jenniferli", contactStatus: "not-contacted", bio: "Leads growth-stage investments. Former product lead at Facebook.", education: "Stanford, MBA", previousFirms: ["Facebook", "Greylock"], notableInvestments: ["Stripe", "Instacart", "Roblox"], personalityNotes: "Metrics-driven. Always asks about CAC payback and net revenue retention within first 5 minutes." },
    ],
    portfolio: [
      { name: "Airbnb", stage: "Public", sector: "Travel", valuation: "$85B", yearInvested: 2009, isLead: false },
      { name: "Coinbase", stage: "Public", sector: "Crypto", valuation: "$48B", yearInvested: 2013, isLead: true },
      { name: "Databricks", stage: "Series I", sector: "Data/AI", valuation: "$43B", yearInvested: 2013, isLead: true },
      { name: "Figma", stage: "Acquired (Adobe)", sector: "Design", valuation: "$20B", yearInvested: 2015, isLead: false },
      { name: "Roblox", stage: "Public", sector: "Gaming", valuation: "$26B", yearInvested: 2017, isLead: false },
      { name: "Instacart", stage: "Public", sector: "Delivery", valuation: "$10B", yearInvested: 2014, isLead: false },
    ],
    contactHistory: [
      { date: "2025-01-15", type: "Warm Intro", notes: "Introduced through Katherine Boyle at defense tech meetup", participant: "Marc Andreessen", outcome: "Accepted, scheduled follow-up" },
      { date: "2025-01-08", type: "Email Outreach", notes: "Sent executive summary + 10-slide deck", participant: "Martin Casado", outcome: "Responded in 48hrs, requested technical deep-dive" },
      { date: "2024-12-20", type: "Coffee Chat", notes: "Informal catch-up at Menlo Park office", participant: "Ben Horowitz", outcome: "Positive, introduced to growth team" },
      { date: "2024-11-10", type: "Conference", notes: "Met at a16z Tech Week panel on AI infrastructure", participant: "Katherine Boyle", outcome: "Exchanged contacts, followed up same day" },
    ],
    lastContact: "Jan 15, 2025",
    dealFlow: [
      { company: "Nebula Compute", stage: "Series A", amount: "$12M", date: "2025-01-10", status: "evaluating", leadPartner: "Martin Casado" },
      { company: "CivicGrid", stage: "Seed", amount: "$3M", date: "2024-12-15", status: "term-sheet", leadPartner: "Katherine Boyle" },
    ],
    coInvestors: ["Sequoia Capital", "Greylock", "Benchmark", "Lightspeed"],
    boardSeats: ["Coinbase", "Databricks", "Airbnb", "Anduril"],
    notableExits: [
      { company: "Instagram", return: "52x", year: 2012 },
      { company: "Oculus VR", return: "13x", year: 2014 },
      { company: "GitHub", return: "10x", year: 2018 },
    ],
  },
  {
    id: "sequoia",
    name: "Sequoia Capital",
    type: "VC",
    location: "Menlo Park, CA",
    checkSize: "$1M – $500M",
    aum: "$85B",
    thesis: "We partner with the daring from idea to IPO and beyond. We invest early and stay committed for decades. The builders behind Apple, Google, Cisco, WhatsApp, Zoom, and Snowflake chose Sequoia.",
    focusAreas: ["AI/ML", "Enterprise", "Healthcare", "Consumer", "Fintech", "Climate"],
    portfolioCompanies: 612,
    founded: 1972,
    fundStage: "Multi-Stage",
    website: "sequoiacap.com",
    crunchbaseUrl: "crunchbase.com/organization/sequoia-capital",
    signalRank: 99,
    fundSize: "$8.8B (Global Equities)",
    avgInitialCheck: "$5.1M",
    speedToTermSheet: "1-2 weeks",
    followOnRate: "91%",
    reputationScore: 9.8,
    decisionMakers: [
      { id: "seq-1", name: "Roelof Botha", title: "Senior Steward & Partner", email: "roelof@sequoiacap.com", linkedin: "linkedin.com/in/roelofbotha", contactStatus: "contacted", bio: "Former CFO of PayPal. Led investments in YouTube, Instagram, Square, MongoDB.", education: "Stanford, MBA; Oxford, MSc", previousFirms: ["PayPal", "McKinsey"], notableInvestments: ["YouTube", "Instagram", "Square", "Nubank"], personalityNotes: "Extremely analytical. Prefers detailed financial models. Respects founders with accounting discipline." },
      { id: "seq-2", name: "Alfred Lin", title: "Partner", email: "alfred@sequoiacap.com", linkedin: "linkedin.com/in/alfredlin", contactStatus: "not-contacted", bio: "Former COO/CFO at Zappos. Led investments in Airbnb, DoorDash, Houzz.", education: "Stanford, MS Statistics; Harvard, BA", previousFirms: ["Zappos", "LinkExchange", "Tellme"], notableInvestments: ["Airbnb", "DoorDash", "Houzz", "Citadel"], personalityNotes: "Pattern matcher. Known for rapid yes/no decisions. Values customer obsession metrics." },
      { id: "seq-3", name: "Pat Grady", title: "Partner", email: "pat@sequoiacap.com", linkedin: "linkedin.com/in/patgrady", contactStatus: "responded", bio: "Leads AI/data infrastructure investments. Led Snowflake,ZoomInfo, and Klaviyo.", education: "Boston College, BS Finance", previousFirms: ["Summit Partners"], notableInvestments: ["Snowflake", "ZoomInfo", "Klaviyo", "Amplitude"], personalityNotes: "Data infrastructure expert. Always asks about TAM expansion potential and data moats." },
      { id: "seq-4", name: "Jess Lee", title: "Partner", email: "jess@sequoiacap.com", linkedin: "linkedin.com/in/jesslee", contactStatus: "not-contacted", bio: "Co-founder of Polyvore (acquired by Yahoo). Focus on consumer and AI applications.", education: "Stanford, BS Computer Science", previousFirms: ["Polyvore", "Yahoo", "Google"], notableInvestments: ["Figma", "Xyla", "LangChain"], personalityNotes: "Product visionary. Deeply cares about UX and design. Best approached with product demos, not decks." },
      { id: "seq-5", name: "Sonya Huang", title: "Partner", email: "sonya@sequoiacap.com", linkedin: "linkedin.com/in/sonyahuang", contactStatus: "meeting", bio: "Leads AI practice. Former PM at Google AI. Author of Generative AI market map.", education: "MIT, BS Computer Science", previousFirms: ["Google AI", "DeepMind"], notableInvestments: ["LangChain", "Harvey", " Cursor", "ElevenLabs"], personalityNotes: "The go-to AI expert at Sequoia. Stays on bleeding edge. Respects technical teams with research backgrounds." },
    ],
    portfolio: [
      { name: "Apple", stage: "Public", sector: "Consumer Tech", valuation: "$3.4T", yearInvested: 1978, isLead: false },
      { name: "Google", stage: "Public", sector: "Search/AI", valuation: "$2.1T", yearInvested: 1999, isLead: true },
      { name: "Snowflake", stage: "Public", sector: "Data", valuation: "$52B", yearInvested: 2012, isLead: true },
      { name: "Zoom", stage: "Public", sector: "Communication", valuation: "$9B", yearInvested: 2011, isLead: true },
      { name: "DoorDash", stage: "Public", sector: "Delivery", valuation: "$42B", yearInvested: 2013, isLead: true },
      { name: "Nvidia", stage: "Public", sector: "Semiconductors", valuation: "$3.2T", yearInvested: 1993, isLead: false },
    ],
    contactHistory: [
      { date: "2025-01-12", type: "Partner Meeting", notes: "45-min call with Pat Grady on data infrastructure thesis alignment", participant: "Pat Grady", outcome: "Requested follow-up with technical founder" },
      { date: "2025-01-03", type: "Warm Intro", notes: "Intro via former Sequoia portfolio founder", participant: "Sonya Huang", outcome: "Accepted, positive initial response" },
      { date: "2024-12-15", type: "Email Outreach", notes: "Sent cold email with traction metrics and team background", participant: "Roelof Botha", outcome: "48hr response, passed to AI team" },
      { date: "2024-11-28", type: "Conference", notes: "AI Summit San Francisco - met at Sequoia hosting dinner", participant: "Alfred Lin", outcome: "Brief chat, exchanged details" },
    ],
    lastContact: "Jan 12, 2025",
    dealFlow: [
      { company: "TensorWorks", stage: "Series A", amount: "$18M", date: "2025-01-14", status: "evaluating", leadPartner: "Sonya Huang" },
      { company: "DataVault AI", stage: "Seed", amount: "$4.5M", date: "2025-01-05", status: "term-sheet", leadPartner: "Pat Grady" },
    ],
    coInvestors: ["a16z", "Greylock", "Index Ventures", "Accel"],
    boardSeats: ["Google", "Snowflake", "Zoom", "DoorDash"],
    notableExits: [
      { company: "WhatsApp", return: "158x", year: 2014 },
      { company: "Instagram", return: "78x", year: 2012 },
      { company: "YouTube", return: "44x", year: 2006 },
    ],
  },
  {
    id: "benchmark",
    name: "Benchmark",
    type: "VC",
    location: "San Francisco, CA",
    checkSize: "$100K – $50M",
    aum: "$12B",
    thesis: "We take a concentrated, partner-led approach. Each partner makes only 1-2 new investments per year, giving founders our undivided attention. We believe in the power of small.",
    focusAreas: ["SaaS", "Marketplaces", "Infrastructure", "AI", "Developer Tools", "Fintech"],
    portfolioCompanies: 187,
    founded: 1995,
    fundStage: "Early Stage",
    website: "benchmark.com",
    crunchbaseUrl: "crunchbase.com/organization/benchmark",
    signalRank: 95,
    fundSize: "$425M (Benchmark XI)",
    avgInitialCheck: "$2.8M",
    speedToTermSheet: "3-5 days",
    followOnRate: "72%",
    reputationScore: 9.4,
    decisionMakers: [
      { id: "bm-1", name: "Peter Fenton", title: "General Partner", email: "peter@benchmark.com", linkedin: "linkedin.com/in/peterfenton", contactStatus: "contacted", bio: "Led investments in Twitter, Yelp, Snapchat, New Relic. Board member at Twitter.", education: "Stanford, BA; Oxford, MSc", previousFirms: ["Accel", "Bain"], notableInvestments: ["Twitter", "Yelp", "Snapchat", "Cockroach Labs"], personalityNotes: "Extremely founder-friendly. Known for rapid conviction. Makes decisions in first meeting." },
      { id: "bm-2", name: "Sarah Tavel", title: "General Partner", email: "sarah@benchmark.com", linkedin: "linkedin.com/in/sarahtavel", contactStatus: "not-contacted", bio: "First PM at Pinterest. Led investments in Chainalysis, Hipcamp, Zagat.", education: "Harvard, BA Philosophy", previousFirms: ["Pinterest", "Bessemer"], notableInvestments: ["Chainalysis", "Hipcamp", "Dollar Shave Club"], personalityNotes: "Product thinker. Great at identifying network effects. Prefers to see product before pitch." },
      { id: "bm-3", name: "Eric Vishria", title: "General Partner", email: "eric@benchmark.com", linkedin: "linkedin.com/in/ericvishria", contactStatus: "responded", bio: "Co-founder of Polychain (acquired by Yahoo). Focus on AI and enterprise.", education: "Stanford, BS Engineering", previousFirms: ["Yahoo", "Polychain"], notableInvestments: ["Confluent", "Datastax", "Amplitude"], personalityNotes: "Technical background. Likes to whiteboard architecture. Fast decision-maker." },
      { id: "bm-4", name: "Miles Grimshaw", title: "General Partner", email: "miles@benchmark.com", linkedin: "linkedin.com/in/milesgrimshaw", contactStatus: "not-contacted", bio: "Led Thrive Capital's expansion. Led investments in Airtable, GitLab, Segment.", education: "Harvard, BA", previousFirms: ["Thrive Capital", "Bain"], notableInvestments: ["Airtable", "GitLab", "Segment", "DigitalOcean"], personalityNotes: "Newer to Benchmark, brings growth-stage expertise. Very responsive to warm intros." },
    ],
    portfolio: [
      { name: "Twitter/X", stage: "Public", sector: "Social", valuation: "$95B", yearInvested: 2009, isLead: true },
      { name: "Snapchat", stage: "Public", sector: "Social", valuation: "$28B", yearInvested: 2012, isLead: true },
      { name: "WeWork", stage: "Restructured", sector: "Real Estate", valuation: "$450M", yearInvested: 2012, isLead: true },
      { name: "Cockroach Labs", stage: "Series F", sector: "Database", valuation: "$5B", yearInvested: 2015, isLead: true },
      { name: "Airtable", stage: "Series F", sector: "No-Code", valuation: "$11B", yearInvested: 2015, isLead: false },
    ],
    contactHistory: [
      { date: "2025-01-10", type: "First Meeting", notes: "30-min Zoom with Peter Fenton. Moved to term sheet discussion.", participant: "Peter Fenton", outcome: "Proceeding to second meeting" },
      { date: "2024-12-22", type: "Warm Intro", notes: "Intro through Cockroach Labs founder", participant: "Eric Vishria", outcome: "Accepted, scheduled for early Jan" },
      { date: "2024-11-15", type: "Cold Email", notes: "Sent concise email with traction summary", participant: "Sarah Tavel", outcome: "No response yet" },
    ],
    lastContact: "Jan 10, 2025",
    dealFlow: [
      { company: "PrismaDB", stage: "Seed", amount: "$2.5M", date: "2025-01-08", status: "term-sheet", leadPartner: "Peter Fenton" },
    ],
    coInvestors: ["Accel", "First Round", "Index Ventures"],
    boardSeats: ["Twitter/X", "Snapchat", "Cockroach Labs"],
    notableExits: [
      { company: "Twitter", return: "124x", year: 2013 },
      { company: "Snapchat", return: "68x", year: 2017 },
      { company: "Yelp", return: "42x", year: 2012 },
    ],
  },
  {
    id: "accel",
    name: "Accel",
    type: "VC",
    location: "Palo Alto, CA / London",
    checkSize: "$500K – $100M",
    aum: "$28B",
    thesis: "We partner with exceptional founders from inception through all stages of growth. With offices in Palo Alto and London, we have a global perspective on category-defining companies.",
    focusAreas: ["SaaS", "AI/ML", "Security", "Infrastructure", "Fintech", "Consumer"],
    portfolioCompanies: 521,
    founded: 1983,
    fundStage: "Multi-Stage",
    website: "accel.com",
    crunchbaseUrl: "crunchbase.com/organization/accel",
    signalRank: 94,
    fundSize: "$4B (Accel VI)",
    avgInitialCheck: "$2.1M",
    speedToTermSheet: "2-3 weeks",
    followOnRate: "83%",
    reputationScore: 9.3,
    decisionMakers: [
      { id: "ac-1", name: "Arun Mathew", title: "Partner", email: "arun@accel.com", linkedin: "linkedin.com/in/arunmathew", contactStatus: "contacted", bio: "Leads enterprise and security investments. Led CrowdStrike, Snyk, and 1Password.", education: "Stanford, MBA", previousFirms: ["Bessemer", "Goldman Sachs"], notableInvestments: ["CrowdStrike", "Snyk", "1Password", "Deel"], personalityNotes: "Security expert. Very methodical in evaluation. Loves to see security architecture diagrams." },
      { id: "ac-2", name: "Ping Li", title: "Partner", email: "ping@accel.com", linkedin: "linkedin.com/in/pingli", contactStatus: "not-contacted", bio: "Leads data and AI investments. Led Cloudera, Qlik, and Segment.", education: "MIT, BS; Stanford, MBA", previousFirms: ["HP", "McKinsey"], notableInvestments: ["Cloudera", "Segment", "Airbyte", "Preset"], personalityNotes: "Data stack expert. Always tracking the modern data stack evolution. Great network in data community." },
      { id: "ac-3", name: "Andrei Brasoveanu", title: "Partner", email: "andrei@accel.com", linkedin: "linkedin.com/in/andreibrasoveanu", contactStatus: "responded", bio: "London-based. Leads European investments. Focus on fintech and SaaS.", education: "LSE, MSc", previousFirms: ["Summit Partners"], notableInvestments: ["Monzo", "Sorare", "LottieFiles"], personalityNotes: "European market expert. Great for EU expansion strategy discussions. Very well-connected in London." },
    ],
    portfolio: [
      { name: "CrowdStrike", stage: "Public", sector: "Security", valuation: "$78B", yearInvested: 2013, isLead: true },
      { name: "Facebook", stage: "Public", sector: "Social", valuation: "$1.5T", yearInvested: 2005, isLead: true },
      { name: "Slack", stage: "Acquired (Salesforce)", sector: "Communication", valuation: "$27.7B", yearInvested: 2010, isLead: false },
      { name: "Snyk", stage: "Series G", sector: "Security", valuation: "$7.4B", yearInvested: 2018, isLead: true },
      { name: "1Password", stage: "Series C", sector: "Security", valuation: "$6.8B", yearInvested: 2019, isLead: false },
    ],
    contactHistory: [
      { date: "2025-01-11", type: "Follow-up Call", notes: "Discussed security market expansion thesis", participant: "Arun Mathew", outcome: "Positive, requested additional metrics" },
      { date: "2024-12-28", type: "Intro Call", notes: "Initial 20-min intro call", participant: "Ping Li", outcome: "Interested in data infrastructure angle" },
    ],
    lastContact: "Jan 11, 2025",
    dealFlow: [
      { company: "ShieldX", stage: "Series B", amount: "$22M", date: "2025-01-09", status: "evaluating", leadPartner: "Arun Mathew" },
    ],
    coInvestors: ["Sequoia", "a16z", "Greylock", "Kleiner Perkins"],
    boardSeats: ["CrowdStrike", "Snyk", "Monzo"],
    notableExits: [
      { company: "Facebook", return: "500x", year: 2012 },
      { company: "CrowdStrike", return: "89x", year: 2019 },
      { company: "Slack", return: "67x", year: 2019 },
    ],
  },
  {
    id: "greylock",
    name: "Greylock Partners",
    type: "VC",
    location: "Menlo Park, CA",
    checkSize: "$1M – $100M",
    aum: "$8.5B",
    thesis: "We invest in early-stage enterprise and consumer companies. We believe in building lasting relationships with founders, often investing before there is a product or even a company.",
    focusAreas: ["Enterprise Software", "AI/ML", "Marketplaces", "Infrastructure", "Fintech"],
    portfolioCompanies: 356,
    founded: 1965,
    fundStage: "Early Stage",
    website: "greylock.com",
    crunchbaseUrl: "crunchbase.com/organization/greylock",
    signalRank: 93,
    fundSize: "$1B (Greylock XVIII)",
    avgInitialCheck: "$4.2M",
    speedToTermSheet: "1-2 weeks",
    followOnRate: "79%",
    reputationScore: 9.2,
    decisionMakers: [
      { id: "gl-1", name: "Reid Hoffman", title: "Partner", email: "reid@greylock.com", linkedin: "linkedin.com/in/reidhoffman", contactStatus: "not-contacted", bio: "Co-founder LinkedIn, partner at Greylock. Board member at Microsoft. Author of Blitzscaling.", education: "Stanford, BA; Oxford, MSc Philosophy", previousFirms: ["LinkedIn", "PayPal", "Fujitsu"], notableInvestments: ["LinkedIn", "Facebook", "Airbnb", "Figma"], personalityNotes: "Network thinker. Values blitzscaling potential. Introduced through mutual connections works best." },
      { id: "gl-2", name: "Sarah Guo", title: "Founder, Conviction", email: "sarah@greylock.com", linkedin: "linkedin.com/in/sarahguo", contactStatus: "contacted", bio: "Former Greylock partner, now running her own fund Conviction. Expert in enterprise/AI.", education: "UPenn, BS Economics", previousFirms: ["Greylock", "Workday"], notableInvestments: ["Figma", "Neeva", "Adept AI"], personalityNotes: "AI-native investor. Incredibly sharp on product-market fit questions." },
      { id: "gl-3", name: "Jerry Chen", title: "Partner", email: "jerry@greylock.com", linkedin: "linkedin.com/in/jerrychen", contactStatus: "responded", bio: "Former VP Product at NVIDIA. Leads infrastructure and AI investments.", education: "Stanford, BS; MIT, MBA", previousFirms: ["NVIDIA", "Cisco"], notableInvestments: ["Palo Alto Networks", "Okta", "Rubrik"], personalityNotes: "Infrastructure visionary. Great at spotting platform shifts. Loves technical founders." },
    ],
    portfolio: [
      { name: "LinkedIn", stage: "Acquired (Microsoft)", sector: "Professional", valuation: "$26.2B", yearInvested: 2003, isLead: true },
      { name: "Workday", stage: "Public", sector: "Enterprise", valuation: "$58B", yearInvested: 2006, isLead: true },
      { name: "Palo Alto Networks", stage: "Public", sector: "Security", valuation: "$105B", yearInvested: 2005, isLead: false },
      { name: "Figma", stage: "Acquired (Adobe)", sector: "Design", valuation: "$20B", yearInvested: 2015, isLead: true },
      { name: "Okta", stage: "Public", sector: "Identity", valuation: "$14B", yearInvested: 2010, isLead: false },
    ],
    contactHistory: [
      { date: "2025-01-09", type: "Email Exchange", notes: "Discussed AI infrastructure thesis alignment", participant: "Jerry Chen", outcome: "Positive, will review materials" },
      { date: "2024-12-18", type: "Conference", notes: "Met at NeurIPS workshop dinner", participant: "Sarah Guo", outcome: "Exchanged contacts" },
    ],
    lastContact: "Jan 9, 2025",
    dealFlow: [
      { company: "AtlasML", stage: "Seed", amount: "$3.5M", date: "2025-01-06", status: "evaluating", leadPartner: "Jerry Chen" },
    ],
    coInvestors: ["Sequoia", "a16z", "Benchmark"],
    boardSeats: ["LinkedIn", "Workday", "Figma"],
    notableExits: [
      { company: "LinkedIn", return: "180x", year: 2016 },
      { company: "Facebook", return: "95x", year: 2012 },
      { company: "Instagram", return: "42x", year: 2012 },
    ],
  },
  {
    id: "lightspeed",
    name: "Lightspeed Venture Partners",
    type: "VC",
    location: "Menlo Park, CA",
    checkSize: "$500K – $200M",
    aum: "$25B",
    thesis: "We back exceptional founders and transformative companies from seed to scale. With a global footprint across consumer, enterprise, health, and deep tech, we invest early and stay for the long haul.",
    focusAreas: ["Consumer", "Enterprise", "Healthcare", "Fintech", "Gaming", "AI"],
    portfolioCompanies: 456,
    founded: 2000,
    fundStage: "Multi-Stage",
    website: "lsvp.com",
    crunchbaseUrl: "crunchbase.com/organization/lightspeed-venture-partners",
    signalRank: 92,
    fundSize: "$7.1B (Lightspeed XIV)",
    avgInitialCheck: "$3.8M",
    speedToTermSheet: "2-3 weeks",
    followOnRate: "81%",
    reputationScore: 9.1,
    decisionMakers: [
      { id: "ls-1", name: "Ravi Mhatre", title: "Founding Partner", email: "ravi@lsvp.com", linkedin: "linkedin.com/in/ravimhatre", contactStatus: "contacted", bio: "Founding partner. Led investments in Nutanix, AppDynamics, MuleSoft.", education: "Stanford, MBA; IIT Delhi", previousFirms: ["Bain", "Goldman Sachs"], notableInvestments: ["Nutanix", "AppDynamics", "MuleSoft", "Snap"], personalityNotes: "Deep enterprise DNA. Very experienced board member. Prefers businesses with clear enterprise GTM." },
      { id: "ls-2", name: "Bessemer " + "(Guru Chahal)", title: "Partner", email: "guru@lsvp.com", linkedin: "linkedin.com/in/guruchahal", contactStatus: "not-contacted", bio: "Led investments in Rubrik, Guardicore, and five AI unicorns.", education: "UC Berkeley, BS EECS", previousFirms: ["Floodgate", "Twitter"], notableInvestments: ["Rubrik", "Guardicore", "Cato Networks"], personalityNotes: "Security and infrastructure focused. Very technical. Loves to do reference calls with customers." },
      { id: "ls-3", name: "Nicole Quinn", title: "Partner", email: "nicole@lsvp.com", linkedin: "linkedin.com/in/nicolequinn", contactStatus: "responded", bio: "Leads consumer and brand investments. Led investments in Lady Gaga's Haus Labs.", education: "Oxford, BA", previousFirms: ["Goldman Sachs"], notableInvestments: ["Snap", "Gwyneth Paltrow's Goop", "Rothy's"], personalityNotes: "Consumer brand expert. Best for B2C pitches. Very visual, loves great product design." },
    ],
    portfolio: [
      { name: "Snap", stage: "Public", sector: "Social", valuation: "$28B", yearInvested: 2012, isLead: true },
      { name: "Affirm", stage: "Public", sector: "Fintech", valuation: "$12B", yearInvested: 2013, isLead: true },
      { name: "Nutanix", stage: "Public", sector: "Infrastructure", valuation: "$14B", yearInvested: 2010, isLead: true },
      { name: "AppDynamics", stage: "Acquired (Cisco)", sector: "Observability", valuation: "$3.7B", yearInvested: 2008, isLead: false },
      { name: "Rubrik", stage: "Public", sector: "Security", valuation: "$6.5B", yearInvested: 2015, isLead: false },
    ],
    contactHistory: [
      { date: "2025-01-13", type: "Pitch Meeting", notes: "Full partner presentation, 60 min", participant: "Ravi Mhatre", outcome: "Partner discussion pending" },
      { date: "2024-12-30", type: "Intro Call", notes: "Initial conversation with partner", participant: "Guru Chahal", outcome: "Requested data room access" },
    ],
    lastContact: "Jan 13, 2025",
    dealFlow: [
      { company: "OrbitOS", stage: "Series A", amount: "$15M", date: "2025-01-12", status: "evaluating", leadPartner: "Ravi Mhatre" },
    ],
    coInvestors: ["a16z", "Sequoia", "IVP"],
    boardSeats: ["Snap", "Nutanix", "Affirm"],
    notableExits: [
      { company: "MuleSoft", return: "45x", year: 2018 },
      { company: "AppDynamics", return: "38x", year: 2017 },
      { company: "Nutanix", return: "32x", year: 2016 },
    ],
  },
  {
    id: "foundersfund",
    name: "Founders Fund",
    type: "VC",
    location: "San Francisco, CA",
    checkSize: "$1M – $500M",
    aum: "$12B",
    thesis: "We invest in companies building the future that others think is impossible. We back science fiction becoming science fact: AI, space, biotech, defense, and next-generation computing.",
    focusAreas: ["AI", "Space", "Defense", "Biotech", "Crypto", "Frontier Tech"],
    portfolioCompanies: 198,
    founded: 2005,
    fundStage: "Multi-Stage",
    website: "foundersfund.com",
    crunchbaseUrl: "crunchbase.com/organization/founders-fund",
    signalRank: 94,
    fundSize: "$5.5B (FF VIII)",
    avgInitialCheck: "$5M",
    speedToTermSheet: "1-2 weeks",
    followOnRate: "68%",
    reputationScore: 9.0,
    decisionMakers: [
      { id: "ff-1", name: "Peter Thiel", title: "President", email: "peter@foundersfund.com", linkedin: "linkedin.com/in/peterthiel", contactStatus: "not-contacted", bio: "Co-founder PayPal, Palantir, first outside investor in Facebook. Zero to One author.", education: "Stanford, BA Philosophy; JD", previousFirms: ["PayPal", "Clarium Capital"], notableInvestments: ["Facebook", "Palantir", "SpaceX", "Anduril"], personalityNotes: "Contrarian thinker. Responds to unique, bold visions. Hates competition, loves monopolies." },
      { id: "ff-2", name: "Keith Rabois", title: "General Partner", email: "keith@foundersfund.com", linkedin: "linkedin.com/in/keithrabois", contactStatus: "contacted", bio: "Executive at PayPal, LinkedIn, Square, Opendoor. Known as one of the best operators in Silicon Valley.", education: "Stanford, BA; Harvard, JD", previousFirms: ["PayPal", "Square", "LinkedIn", "Opendoor"], notableInvestments: ["Opendoor", "DoorDash", "Stripe", "YouTube"], personalityNotes: "Operator at heart. Very direct feedback. Loves founders who ship fast and obsess over metrics." },
      { id: "ff-3", name: "Trae Stephens", title: "Partner", email: "trae@foundersfund.com", linkedin: "linkedin.com/in/traestephens", contactStatus: "responded", bio: "Co-founder of Anduril Industries. Leads defense and hard tech investments.", education: "Georgetown, BSFS", previousFirms: ["Anduril", "Palantir"], notableInvestments: ["Anduril", "Harpoon", "Epirus"], personalityNotes: "Defense tech champion. Very mission-driven. Best approached with national security angle." },
    ],
    portfolio: [
      { name: "SpaceX", stage: "Private", sector: "Space", valuation: "$350B", yearInvested: 2008, isLead: false },
      { name: "Palantir", stage: "Public", sector: "Data", valuation: "$165B", yearInvested: 2005, isLead: true },
      { name: "Anduril", stage: "Private", sector: "Defense", valuation: "$28B", yearInvested: 2017, isLead: true },
      { name: "Facebook", stage: "Public", sector: "Social", valuation: "$1.5T", yearInvested: 2004, isLead: false },
      { name: "Stripe", stage: "Private", sector: "Fintech", valuation: "$65B", yearInvested: 2011, isLead: false },
    ],
    contactHistory: [
      { date: "2025-01-14", type: "Response", notes: "Keith expressed interest after warm intro", participant: "Keith Rabois", outcome: "Scheduling next week" },
      { date: "2024-12-10", type: "Cold Outreach", notes: "Sent thesis paper + product demo video", participant: "Trae Stephens", outcome: "Responded with questions" },
    ],
    lastContact: "Jan 14, 2025",
    dealFlow: [
      { company: "Stellar Forge", stage: "Series B", amount: "$45M", date: "2025-01-11", status: "evaluating", leadPartner: "Trae Stephens" },
    ],
    coInvestors: ["a16z", "Sequoia", "General Catalyst"],
    boardSeats: ["Palantir", "Anduril", "SpaceX"],
    notableExits: [
      { company: "Facebook", return: "12,000x", year: 2012 },
      { company: "SpaceX", return: "350x", year: 2024 },
      { company: "Palantir", return: "200x", year: 2020 },
    ],
  },
  {
    id: "khosla",
    name: "Khosla Ventures",
    type: "VC",
    location: "Menlo Park, CA",
    checkSize: "$500K – $100M",
    aum: "$15B",
    thesis: "We invest in science and technology that matters. We back entrepreneurs solving large, important problems with breakthrough technologies in AI, climate, biology, and space.",
    focusAreas: ["AI", "Climate Tech", "Biotech", "Space", "Robotics", "Sustainability"],
    portfolioCompanies: 287,
    founded: 2004,
    fundStage: "Multi-Stage",
    website: "khoslaventures.com",
    crunchbaseUrl: "crunchbase.com/organization/khosla-ventures",
    signalRank: 90,
    fundSize: "$3.1B (KV XIV)",
    avgInitialCheck: "$2.5M",
    speedToTermSheet: "1-2 weeks",
    followOnRate: "74%",
    reputationScore: 8.9,
    decisionMakers: [
      { id: "kv-1", name: "Vinod Khosla", title: "Founder", email: "vinod@khoslaventures.com", linkedin: "linkedin.com/in/vinodkhosla", contactStatus: "not-contacted", bio: "Co-founded Sun Microsystems. Led investments in Impossible Foods, OpenAI, Commonwealth Fusion.", education: "CMU, MS; IIT Delhi, BTech; Stanford, MBA", previousFirms: ["Sun Microsystems", "Kleiner Perkins"], notableInvestments: ["Juniper", "Impossible Foods", "OpenAI", "Commonwealth Fusion"], personalityNotes: "Visionary who thinks in decades. Loves moonshots. Responds to world-changing ambition." },
      { id: "kv-2", name: "Sven Strohband", title: "Managing Director", email: "sven@khoslaventures.com", linkedin: "linkedin.com/in/svenstrohband", contactStatus: "contacted", bio: "Leads robotics and AI investments. Led OpenAI's first funding round.", education: "Stanford, PhD Robotics", previousFirms: ["MIT", "Willow Garage"], notableInvestments: ["OpenAI", "Luminous Computing", "Bright Machines"], personalityNotes: "Robotics and AI researcher. Deeply technical. Great at evaluating hard tech." },
      { id: "kv-3", name: "Kanu Gulati", title: "Partner", email: "kanu@khoslaventures.com", linkedin: "linkedin.com/in/kanugulati", contactStatus: "responded", bio: "Leads enterprise AI investments. Former product lead at Google.", education: "Stanford, MBA", previousFirms: ["Google", "McKinsey"], notableInvestments: ["Amplitude", "Cresta", "Observe.ai"], personalityNotes: "Product-led investor. Focuses on AI applied to enterprise workflows." },
    ],
    portfolio: [
      { name: "OpenAI", stage: "Private", sector: "AI", valuation: "$157B", yearInvested: 2015, isLead: true },
      { name: "DoorDash", stage: "Public", sector: "Delivery", valuation: "$42B", yearInvested: 2013, isLead: true },
      { name: "Square", stage: "Public", sector: "Fintech", valuation: "$42B", yearInvested: 2009, isLead: true },
      { name: "Impossible Foods", stage: "Private", sector: "Food Tech", valuation: "$7B", yearInvested: 2011, isLead: true },
      { name: "Commonwealth Fusion", stage: "Private", sector: "Energy", valuation: "$7.8B", yearInvested: 2018, isLead: true },
    ],
    contactHistory: [
      { date: "2025-01-07", type: "Email", notes: "Follow-up on AI infrastructure thesis", participant: "Kanu Gulati", outcome: "Positive, scheduling deep-dive" },
      { date: "2024-12-05", type: "Event", notes: "Khosla AI Summit - met Sven", participant: "Sven Strohband", outcome: "Exchanged contacts" },
    ],
    lastContact: "Jan 7, 2025",
    dealFlow: [
      { company: "Helios AI", stage: "Seed", amount: "$4M", date: "2025-01-08", status: "evaluating", leadPartner: "Kanu Gulati" },
    ],
    coInvestors: ["a16z", "Sequoia", "Founders Fund"],
    boardSeats: ["OpenAI", "DoorDash", "Square"],
    notableExits: [
      { company: "Square", return: "65x", year: 2015 },
      { company: "Ring", return: "45x", year: 2018 },
      { company: "Juniper", return: "28x", year: 1999 },
    ],
  },
  {
    id: "general-catalyst",
    name: "General Catalyst",
    type: "VC",
    location: "Cambridge, MA",
    checkSize: "$1M – $200M",
    aum: "$35B",
    thesis: "We invest in powerful, positive change that endures. We partner with founders from seed to growth, bringing the full weight of our network and platform to help them build iconic companies.",
    focusAreas: ["Healthcare", "Fintech", "Enterprise", "Climate", "Consumer", "Defense"],
    portfolioCompanies: 412,
    founded: 2000,
    fundStage: "Multi-Stage",
    website: "generalcatalyst.com",
    crunchbaseUrl: "crunchbase.com/organization/general-catalyst-partners",
    signalRank: 91,
    fundSize: "$8B",
    avgInitialCheck: "$4M",
    speedToTermSheet: "2-3 weeks",
    followOnRate: "78%",
    reputationScore: 9.0,
    decisionMakers: [
      { id: "gc-1", name: "Hemant Taneja", title: "CEO & Managing Director", email: "hemant@generalcatalyst.com", linkedin: "linkedin.com/in/hemanttaneja", contactStatus: "contacted", bio: "CEO of General Catalyst. Author of Unscaled. Led investments in Stripe, Snap, Airbnb.", education: "MIT, BS; Stanford, MS", previousFirms: ["Bain"], notableInvestments: ["Stripe", "Snap", "Airbnb", "Livongo"], personalityNotes: "Systems thinker. Very strategic. Loves founders who think about ecosystem-level change." },
      { id: "gc-2", name: "Katie Stanton", title: "Managing Partner", email: "katie@generalcatalyst.com", linkedin: "linkedin.com/in/katiestanton", contactStatus: "not-contacted", bio: "Former VP Global Media at Twitter. Leads health assurance initiatives.", education: "Stanford, BA; Johns Hopkins, MA", previousFirms: ["Twitter", "Google", "Yahoo", "White House"], notableInvestments: ["Livongo", "Color Health", "Mindstrong"], personalityNotes: "Mission-driven. Passionate about healthcare transformation. Great network in DC and healthcare." },
      { id: "gc-3", name: "Quentin Clark", title: "Managing Director", email: "quentin@generalcatalyst.com", linkedin: "linkedin.com/in/quentinclark", contactStatus: "responded", bio: "Former CTO at SAP. Leads enterprise AI investments.", education: "Stanford, BS CS", previousFirms: ["SAP", "Microsoft"], notableInvestments: ["Databricks", "Samsara", "DataRobot"], personalityNotes: "Enterprise tech veteran. Very practical. Great for B2B founders seeking enterprise GTM advice." },
    ],
    portfolio: [
      { name: "Stripe", stage: "Private", sector: "Fintech", valuation: "$65B", yearInvested: 2011, isLead: false },
      { name: "Airbnb", stage: "Public", sector: "Travel", valuation: "$85B", yearInvested: 2009, isLead: false },
      { name: "Snap", stage: "Public", sector: "Social", valuation: "$28B", yearInvested: 2012, isLead: false },
      { name: "Samsara", stage: "Public", sector: "IoT", valuation: "$28B", yearInvested: 2015, isLead: true },
      { name: "Livongo", stage: "Acquired (Teladoc)", sector: "Health", valuation: "$18.5B", yearInvested: 2014, isLead: true },
    ],
    contactHistory: [
      { date: "2025-01-06", type: "Call", notes: "Discussed enterprise AI go-to-market", participant: "Quentin Clark", outcome: "Interested, follow-up scheduled" },
      { date: "2024-12-12", type: "Event", notes: "GC Annual Summit", participant: "Hemant Taneja", outcome: "Brief introduction" },
    ],
    lastContact: "Jan 6, 2025",
    dealFlow: [
      { company: "Axiom Cloud", stage: "Series B", amount: "$30M", date: "2025-01-05", status: "evaluating", leadPartner: "Quentin Clark" },
    ],
    coInvestors: ["a16z", "Sequoia", "Greylock"],
    boardSeats: ["Stripe", "Samsara", "Livongo"],
    notableExits: [
      { company: "Livongo", return: "28x", year: 2020 },
      { company: "Snap", return: "25x", year: 2017 },
      { company: "Airbnb", return: "22x", year: 2020 },
    ],
  },
  {
    id: "bessemer",
    name: "Bessemer Venture Partners",
    type: "VC",
    location: "San Francisco, CA",
    checkSize: "$1M – $100M",
    aum: "$20B",
    thesis: "We partner with entrepreneurs to build enduring businesses. With 110+ years of history, we've invested in 145+ IPOs. We invest from seed to growth across cloud, consumer, healthcare, and deep tech.",
    focusAreas: ["Cloud/SaaS", "Consumer", "Healthcare", "Deep Tech", "Fintech", "Marketplaces"],
    portfolioCompanies: 389,
    founded: 1911,
    fundStage: "Multi-Stage",
    website: "bvp.com",
    crunchbaseUrl: "crunchbase.com/organization/bessemer-venture-partners",
    signalRank: 91,
    fundSize: "$5B (BVP XI)",
    avgInitialCheck: "$3.5M",
    speedToTermSheet: "2-4 weeks",
    followOnRate: "82%",
    reputationScore: 9.1,
    decisionMakers: [
      { id: "bvp-1", name: "Byron Deeter", title: "Partner", email: "byron@bvp.com", linkedin: "linkedin.com/in/byrondeter", contactStatus: "contacted", bio: "Created Bessemer's cloud investing practice. Led investments in Twilio, Shopify, ServiceTitan.", education: "UCLA, BA; Harvard, MBA", previousFirms: ["Bain", "Trulia"], notableInvestments: ["Twilio", "Shopify", "ServiceTitan", "Canva"], personalityNotes: "Cloud/SaaS legend. Created the 10 Laws of Cloud. Loves unit economics and net retention." },
      { id: "bvp-2", name: "Elliott Robinson", title: "Partner", email: "elliott@bvp.com", linkedin: "linkedin.com/in/elliotrobinson", contactStatus: "not-contacted", bio: "Leads growth investments. Board member at LinkedIn.", education: "Duke, BA; Stanford, MBA", previousFirms: ["Summit Partners", "McKinsey"], notableInvestments: ["LinkedIn", "Toast", "Gainsight"], personalityNotes: "Growth-stage expert. Focuses on expansion revenue and international growth." },
      { id: "bvp-3", name: "Mary D'Onofrio", title: "Partner", email: "mary@bvp.com", linkedin: "linkedin.com/in/marydonofrio", contactStatus: "responded", bio: "Created BVP's Atlas platform for cloud benchmarking. Expert in cloud metrics.", education: "Stanford, BA Economics", previousFirms: ["Goldman Sachs"], notableInvestments: ["HashiCorp", "Amplitude", "PagerDuty"], personalityNotes: "Data-obsessed. Created the Centaur ($100M ARR) milestone concept. Always benchmarking metrics." },
    ],
    portfolio: [
      { name: "Shopify", stage: "Public", sector: "E-commerce", valuation: "$110B", yearInvested: 2010, isLead: true },
      { name: "LinkedIn", stage: "Acquired (Microsoft)", sector: "Professional", valuation: "$26.2B", yearInvested: 2004, isLead: true },
      { name: "Twilio", stage: "Public", sector: "Communication", valuation: "$12B", yearInvested: 2010, isLead: true },
      { name: "Pinterest", stage: "Public", sector: "Social", valuation: "$18B", yearInvested: 2010, isLead: true },
      { name: "Toast", stage: "Public", sector: "Fintech", valuation: "$14B", yearInvested: 2015, isLead: false },
    ],
    contactHistory: [
      { date: "2025-01-05", type: "Meeting", notes: "Discussed SaaS metrics and cloud benchmarks", participant: "Mary D'Onofrio", outcome: "Positive, requested metrics dashboard" },
      { date: "2024-12-20", type: "Call", notes: "Initial call with Byron on cloud thesis", participant: "Byron Deeter", outcome: "Interested in Series A" },
    ],
    lastContact: "Jan 5, 2025",
    dealFlow: [
      { company: "CloudSync AI", stage: "Series A", amount: "$12M", date: "2025-01-04", status: "evaluating", leadPartner: "Byron Deeter" },
    ],
    coInvestors: ["Sequoia", "Accel", "IVP"],
    boardSeats: ["Shopify", "LinkedIn", "Twilio"],
    notableExits: [
      { company: "LinkedIn", return: "180x", year: 2016 },
      { company: "Shopify", return: "120x", year: 2015 },
      { company: "Twilio", return: "78x", year: 2016 },
    ],
  },
  {
    id: "ivp",
    name: "Insight Venture Partners",
    type: "Growth Equity",
    location: "New York, NY",
    checkSize: "$10M – $500M",
    aum: "$90B",
    thesis: "We are the leading global scale-up investor. We partner with high-growth technology companies, providing the capital, operational expertise, and strategic guidance needed to scale from $10M to $1B+ ARR.",
    focusAreas: ["Scale-Up Software", "Fintech", "Infrastructure", "Healthcare IT", "Cybersecurity", "Data"],
    portfolioCompanies: 512,
    founded: 1995,
    fundStage: "Growth",
    website: "insightpartners.com",
    crunchbaseUrl: "crunchbase.com/organization/insight-venture-partners",
    signalRank: 93,
    fundSize: "$20B (Insight XI)",
    avgInitialCheck: "$25M",
    speedToTermSheet: "2-4 weeks",
    followOnRate: "88%",
    reputationScore: 9.2,
    decisionMakers: [
      { id: "ivp-1", name: "Jeff Horing", title: "Co-Founder & Managing Director", email: "jeff@insightpartners.com", linkedin: "linkedin.com/in/jeffhoring", contactStatus: "contacted", bio: "Co-founded Insight in 1995. Led investments in Shopify, Twitter, Alibaba.", education: "UPenn, BS; Columbia, MBA", previousFirms: ["Bain Capital"], notableInvestments: ["Shopify", "Twitter", "Alibaba", "Qualtrics"], personalityNotes: "Growth equity pioneer. Very focused on unit economics and path to profitability." },
      { id: "ivp-2", name: "Deven Parekh", title: "Managing Director", email: "deven@insightpartners.com", linkedin: "linkedin.com/in/devenparekh", contactStatus: "responded", bio: "Board member at Twitter and Alibaba. Focus on fintech and marketplace investments.", education: "Carnegie Mellon, BS; Harvard, MBA", previousFirms: ["Bain", "Goldman Sachs"], notableInvestments: ["Twitter", "Alibaba", "Calm", "Udemy"], personalityNotes: "Global perspective. Excellent for international expansion strategy. Very analytical." },
      { id: "ivp-3", name: "Rachel Geller", title: "Principal", email: "rachel@insightpartners.com", linkedin: "linkedin.com/in/rachelgeller", contactStatus: "not-contacted", bio: "Leads Series A and B investments in AI infrastructure.", education: "MIT, BS; Stanford, MBA", previousFirms: ["Google", "Databricks"], notableInvestments: ["Weights & Biases", "Anyscale", "Tecton"], personalityNotes: "AI infrastructure expert. Very technical background. Loves MLOps and developer tools." },
    ],
    portfolio: [
      { name: "Shopify", stage: "Public", sector: "E-commerce", valuation: "$110B", yearInvested: 2013, isLead: false },
      { name: "Qualtrics", stage: "Acquired (Silver Lake)", sector: "Experience Mgmt", valuation: "$12.5B", yearInvested: 2012, isLead: true },
      { name: "Pluralsight", stage: "Public", sector: "EdTech", valuation: "$3.5B", yearInvested: 2014, isLead: true },
      { name: "DataDog", stage: "Public", sector: "Observability", valuation: "$42B", yearInvested: 2016, isLead: false },
      { name: "Calm", stage: "Private", sector: "Wellness", valuation: "$2B", yearInvested: 2018, isLead: true },
    ],
    contactHistory: [
      { date: "2025-01-08", type: "Meeting", notes: "Discussed growth metrics and expansion strategy", participant: "Jeff Horing", outcome: "Positive, moving to data room" },
      { date: "2024-12-28", type: "Call", notes: "Intro call with Deven", participant: "Deven Parekh", outcome: "Interested, scheduling follow-up" },
    ],
    lastContact: "Jan 8, 2025",
    dealFlow: [
      { company: "ScaleForce", stage: "Series C", amount: "$50M", date: "2025-01-07", status: "evaluating", leadPartner: "Jeff Horing" },
    ],
    coInvestors: ["a16z", "Accel", "Bessemer"],
    boardSeats: ["Shopify", "Qualtrics", "DataDog"],
    notableExits: [
      { company: "Twitter", return: "35x", year: 2013 },
      { company: "Shopify", return: "28x", year: 2015 },
      { company: "Qualtrics", return: "22x", year: 2021 },
    ],
  },
  {
    id: "firstround",
    name: "First Round Capital",
    type: "VC",
    location: "San Francisco, CA",
    checkSize: "$100K – $5M",
    aum: "$3.2B",
    thesis: "We're built to serve founders at the earliest stage. We wrote the first checks into Uber, Square, and Roblox. We provide unmatched community, platform, and founder support from day one.",
    focusAreas: ["Seed Stage", "AI", "Developer Tools", "Consumer", "Fintech", "Healthcare"],
    portfolioCompanies: 298,
    founded: 2004,
    fundStage: "Seed",
    website: "firstround.com",
    crunchbaseUrl: "crunchbase.com/organization/first-round-capital",
    signalRank: 90,
    fundSize: "$500M (FR XII)",
    avgInitialCheck: "$750K",
    speedToTermSheet: "3-7 days",
    followOnRate: "65%",
    reputationScore: 9.0,
    decisionMakers: [
      { id: "fr-1", name: "Josh Kopelman", title: "Founder & Partner", email: "josh@firstround.com", linkedin: "linkedin.com/in/joshkopelman", contactStatus: "contacted", bio: "Founded Half.com (acquired by eBay), TurnTide. Led investments in Uber, LinkedIn, Square.", education: "Wharton, BS", previousFirms: ["Half.com", "TurnTide", "Infonautics"], notableInvestments: ["Uber", "LinkedIn", "Square", "Roblox"], personalityNotes: "Speed demon. Known for making decisions in days. Loves scrappy founders with unique insights." },
      { id: "fr-2", name: "Hayley Barna", title: "Partner", email: "hayley@firstround.com", linkedin: "linkedin.com/in/hayleybarna", contactStatus: "not-contacted", bio: "Co-founder of Birchbox. Leads consumer and marketplace investments.", education: "Harvard, BA; Harvard, MBA", previousFirms: ["Birchbox", "McKinsey"], notableInvestments: ["Birchbox", "S inc.", "Swile"], personalityNotes: "Consumer product expert. Great eye for brand and distribution. Very supportive founder coach." },
      { id: "fr-3", name: "Teddy Citrin", title: "Partner", email: "teddy@firstround.com", linkedin: "linkedin.com/in/teddycitrin", contactStatus: "responded", bio: "Leads AI and developer tool investments. Former founder.", education: "MIT, BS CS", previousFirms: ["Google", "YC"], notableInvestments: ["Vercel", "Watershed", "Cursor"], personalityNotes: "Developer tools and AI-native companies. Very responsive. Loves product-led growth stories." },
    ],
    portfolio: [
      { name: "Uber", stage: "Public", sector: "Transportation", valuation: "$145B", yearInvested: 2010, isLead: true },
      { name: "Square/Block", stage: "Public", sector: "Fintech", valuation: "$42B", yearInvested: 2009, isLead: true },
      { name: "Roblox", stage: "Public", sector: "Gaming", valuation: "$26B", yearInvested: 2005, isLead: false },
      { name: "Notion", stage: "Private", sector: "Productivity", valuation: "$10B", yearInvested: 2019, isLead: false },
      { name: "Vercel", stage: "Private", sector: "Developer Tools", valuation: "$3.2B", yearInvested: 2020, isLead: true },
    ],
    contactHistory: [
      { date: "2025-01-04", type: "Meeting", notes: "Coffee meeting at First Round office", participant: "Josh Kopelman", outcome: "Positive, offered to intro to portfolio" },
      { date: "2024-12-15", type: "Email", notes: "Cold email with demo video", participant: "Teddy Citrin", outcome: "Responded in 24hrs" },
    ],
    lastContact: "Jan 4, 2025",
    dealFlow: [
      { company: "DevKit AI", stage: "Seed", amount: "$1.5M", date: "2025-01-02", status: "term-sheet", leadPartner: "Teddy Citrin" },
    ],
    coInvestors: ["Benchmark", "Accel", "a16z"],
    boardSeats: ["Uber", "Square", "Roblox"],
    notableExits: [
      { company: "Uber", return: "4,000x", year: 2019 },
      { company: "Square", return: "280x", year: 2015 },
      { company: "LinkedIn", return: "155x", year: 2016 },
    ],
  },
];

// ─── localStorage helpers ────────────────────────────────────────────

const STORAGE_KEY = "sw_investor_contacts";

function loadInvestors(): InvestorContact[] {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) return JSON.parse(s);
  } catch { /* silent */ }
  return SEED_INVESTORS;
}

function saveInvestors(data: InvestorContact[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ─── Deal Flow Status Badge ──────────────────────────────────────────

function DealStatusBadge({ status }: { status: DealFlow["status"] }) {
  const config: Record<DealFlow["status"], { label: string; classes: string }> = {
    "evaluating": { label: "Evaluating", classes: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
    "term-sheet": { label: "Term Sheet", classes: "bg-sky-500/10 text-sky-400 border-sky-500/20" },
    "due-diligence": { label: "Due Diligence", classes: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
    "closed": { label: "Closed", classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    "passed": { label: "Passed", classes: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
  };
  const c = config[status];
  return (
    <span className={`inline-flex items-center text-[10px] px-2 py-0.5 rounded-full border ${c.classes} font-medium`}>
      {c.label}
    </span>
  );
}

// ─── Signal Rank Bar ─────────────────────────────────────────────────

function SignalRankBar({ rank }: { rank: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all"
          style={{ width: `${rank}%` }}
        />
      </div>
      <span className="text-[10px] font-semibold text-amber-400 w-6 text-right">{rank}</span>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export default function InvestorContactSheets() {
  const [investors, setInvestors] = useState<InvestorContact[]>(loadInvestors);
  const [selectedInvestor, setSelectedInvestor] = useState<InvestorContact | null>(null);
  const [newNote, setNewNote] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    thesis: true,
    decisionMakers: true,
    portfolio: true,
    contactHistory: true,
    dealFlow: true,
    notableExits: true,
  });

  // Persist to localStorage
  useEffect(() => { saveInvestors(investors); }, [investors]);

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const addNote = () => {
    if (!newNote.trim() || !selectedInvestor) return;
    const updated: InvestorContact = {
      ...selectedInvestor,
      contactHistory: [
        { date: new Date().toISOString().split("T")[0], type: "Note", notes: newNote, participant: "You", outcome: "Added" },
        ...selectedInvestor.contactHistory,
      ],
      lastContact: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    };
    setSelectedInvestor(updated);
    setInvestors(prev => prev.map(inv => inv.id === updated.id ? updated : inv));
    setNewNote("");
  };

  const updateDMStatus = (dmId: string, newStatus: DecisionMaker["contactStatus"]) => {
    if (!selectedInvestor) return;
    const updated: InvestorContact = {
      ...selectedInvestor,
      decisionMakers: selectedInvestor.decisionMakers.map(dm =>
        dm.id === dmId ? { ...dm, contactStatus: newStatus } : dm
      ),
    };
    setSelectedInvestor(updated);
    setInvestors(prev => prev.map(inv => inv.id === updated.id ? updated : inv));
  };

  const filteredInvestors = investors.filter(inv => {
    const matchesSearch = !searchQuery ||
      inv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.focusAreas.some(fa => fa.toLowerCase().includes(searchQuery.toLowerCase())) ||
      inv.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || inv.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-400" />
            Investor Firm Directory
          </h2>
          <p className="text-[10px] text-slate-500 mt-0.5">{filteredInvestors.length} firms · {investors.reduce((acc, i) => acc + i.decisionMakers.length, 0)} contacts · {investors.reduce((acc, i) => acc + i.portfolioCompanies, 0)} portfolio companies</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3 h-3 text-slate-500 absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search firms..."
              className="text-[11px] pl-6 pr-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-slate-200 placeholder:text-slate-600 outline-none focus:border-amber-500/30 w-44"
            />
          </div>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="text-[11px] px-2 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-slate-200 outline-none focus:border-amber-500/30"
          >
            <option value="all">All Types</option>
            <option value="VC">VC</option>
            <option value="Angel">Angel</option>
            <option value="PE">PE</option>
            <option value="Strategic">Strategic</option>
            <option value="Family Office">Family Office</option>
          </select>
        </div>
      </div>

      {/* Section 1: Investor Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredInvestors.map(inv => (
          <div
            key={inv.id}
            className={`p-4 rounded-xl border transition-all cursor-pointer ${
              selectedInvestor?.id === inv.id
                ? "border-amber-500/30 bg-amber-500/[0.04]"
                : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
            }`}
            onClick={() => setSelectedInvestor(inv)}
          >
            <div className="flex items-center gap-3 mb-2.5">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center text-sm font-bold text-amber-300 shrink-0">
                {inv.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-200 truncate">{inv.name}</div>
                <div className="text-[10px] text-slate-500">{inv.type} · {inv.location} · Est. {inv.founded}</div>
              </div>
              <div className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-medium shrink-0">
                {inv.checkSize}
              </div>
            </div>

            <div className="flex flex-wrap gap-1 mb-2.5">
              {inv.focusAreas.slice(0, 4).map(fa => (
                <span key={fa} className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-400">{fa}</span>
              ))}
              {inv.focusAreas.length > 4 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-500">+{inv.focusAreas.length - 4}</span>
              )}
            </div>

            <div className="flex justify-between text-[10px] text-slate-500 mb-2">
              <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{inv.portfolioCompanies} portfolio</span>
              <span className="flex items-center gap-1"><Users className="w-3 h-3" />{inv.decisionMakers.length} contacts</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{inv.lastContact}</span>
            </div>

            <SignalRankBar rank={inv.signalRank} />
          </div>
        ))}
      </div>

      {/* Section 2: Selected Investor Detail */}
      {selectedInvestor && (
        <div className="p-4 rounded-xl border border-amber-500/15 bg-amber-500/[0.03] space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/30 to-orange-500/30 flex items-center justify-center text-lg font-bold text-amber-200">
                {selectedInvestor.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-100">{selectedInvestor.name}</div>
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <span>{selectedInvestor.type}</span>
                  <span>·</span>
                  <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{selectedInvestor.location}</span>
                  <span>·</span>
                  <span>AUM {selectedInvestor.aum}</span>
                  <span>·</span>
                  <span>Fund: {selectedInvestor.fundSize}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right mr-2">
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span className="text-xs font-semibold text-amber-400">{selectedInvestor.reputationScore}</span>
                </div>
                <div className="text-[9px] text-slate-500">Reputation</div>
              </div>
              <button
                onClick={() => setSelectedInvestor(null)}
                className="text-[10px] px-2 py-1 rounded-lg border border-white/[0.08] text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] transition-colors"
              >
                Close
              </button>
            </div>
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Signal Rank", value: `${selectedInvestor.signalRank}/100`, icon: BarChart3 },
              { label: "Avg Initial", value: selectedInvestor.avgInitialCheck, icon: DollarSign },
              { label: "Term Sheet", value: selectedInvestor.speedToTermSheet, icon: Clock },
              { label: "Follow-On", value: selectedInvestor.followOnRate, icon: TrendingUp },
            ].map(stat => (
              <div key={stat.label} className="p-2 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                <div className="text-[9px] text-slate-500 mb-0.5 flex items-center gap-1"><stat.icon className="w-3 h-3" />{stat.label}</div>
                <div className="text-xs font-semibold text-slate-200">{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Co-Investors */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Users className="w-3 h-3 text-slate-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Co-Investors</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {selectedInvestor.coInvestors.map(ci => (
                <span key={ci} className="text-[10px] px-2 py-1 rounded-lg border border-white/[0.06] bg-white/[0.03] text-slate-300">{ci}</span>
              ))}
            </div>
          </div>

          {/* Investment Thesis */}
          <div>
            <button onClick={() => toggleSection("thesis")} className="flex items-center gap-1.5 mb-1.5 w-full">
              {expandedSections.thesis ? <ChevronDown className="w-3 h-3 text-slate-500" /> : <ChevronUp className="w-3 h-3 text-slate-500" />}
              <FileText className="w-3 h-3 text-slate-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Investment Thesis</span>
            </button>
            {expandedSections.thesis && (
              <div className="text-xs text-slate-300 leading-relaxed pl-4">{selectedInvestor.thesis}</div>
            )}
          </div>

          {/* Decision Makers Table */}
          <div>
            <button onClick={() => toggleSection("decisionMakers")} className="flex items-center gap-1.5 mb-2 w-full">
              {expandedSections.decisionMakers ? <ChevronDown className="w-3 h-3 text-slate-500" /> : <ChevronUp className="w-3 h-3 text-slate-500" />}
              <Users className="w-3 h-3 text-slate-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Decision Makers ({selectedInvestor.decisionMakers.length})</span>
            </button>
            {expandedSections.decisionMakers && (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] text-slate-600">
                      <th className="pb-1.5 font-medium">Name</th>
                      <th className="pb-1.5 font-medium">Title</th>
                      <th className="pb-1.5 font-medium">Contact</th>
                      <th className="pb-1.5 font-medium">Status</th>
                      <th className="pb-1.5 font-medium">Notable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvestor.decisionMakers.map(dm => (
                      <tr key={dm.id} className="border-t border-white/[0.06]">
                        <td className="py-2">
                          <div className="text-xs font-medium text-slate-200">{dm.name}</div>
                          <div className="text-[9px] text-slate-500">{dm.education}</div>
                        </td>
                        <td className="py-2 text-xs text-slate-400">{dm.title}</td>
                        <td className="py-2">
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3 h-3 text-sky-400/70" />
                            <span className="text-[10px] text-sky-400">{dm.email}</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Linkedin className="w-3 h-3 text-sky-400/70" />
                            <a href={`https://${dm.linkedin}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-sky-400 hover:underline flex items-center gap-0.5">
                              LinkedIn <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>
                        </td>
                        <td className="py-2">
                          <select
                            value={dm.contactStatus}
                            onChange={e => updateDMStatus(dm.id, e.target.value as DecisionMaker["contactStatus"])}
                            className="text-[10px] px-1.5 py-0.5 rounded border border-white/[0.08] bg-[#0f172a] text-slate-300 outline-none"
                          >
                            <option value="not-contacted">Not Contacted</option>
                            <option value="contacted">Contacted</option>
                            <option value="responded">Responded</option>
                            <option value="meeting">Meeting</option>
                            <option value="passed">Passed</option>
                            <option value="invested">Invested</option>
                          </select>
                        </td>
                        <td className="py-2">
                          <div className="text-[9px] text-slate-400 max-w-[140px] truncate" title={dm.notableInvestments.join(", ")}>
                            {dm.notableInvestments.slice(0, 2).join(", ")}{dm.notableInvestments.length > 2 && "+"}
                          </div>
                          <div className="text-[9px] text-slate-600 mt-0.5 italic line-clamp-2 max-w-[140px]" title={dm.personalityNotes}>
                            &ldquo;{dm.personalityNotes}&rdquo;
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Portfolio Companies */}
          <div>
            <button onClick={() => toggleSection("portfolio")} className="flex items-center gap-1.5 mb-2 w-full">
              {expandedSections.portfolio ? <ChevronDown className="w-3 h-3 text-slate-500" /> : <ChevronUp className="w-3 h-3 text-slate-500" />}
              <Briefcase className="w-3 h-3 text-slate-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Portfolio ({selectedInvestor.portfolio.length})</span>
            </button>
            {expandedSections.portfolio && (
              <div className="flex flex-wrap gap-1.5">
                {selectedInvestor.portfolio.map(co => (
                  <span
                    key={co.name}
                    className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] text-slate-300"
                    title={`${co.sector} · ${co.valuation} · ${co.yearInvested}`}
                  >
                    {co.name}
                    <span className="text-slate-500">·</span>
                    <span className="text-slate-400">{co.stage}</span>
                    {co.isLead && <Award className="w-3 h-3 text-amber-400" />}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Deal Flow */}
          <div>
            <button onClick={() => toggleSection("dealFlow")} className="flex items-center gap-1.5 mb-2 w-full">
              {expandedSections.dealFlow ? <ChevronDown className="w-3 h-3 text-slate-500" /> : <ChevronUp className="w-3 h-3 text-slate-500" />}
              <Target className="w-3 h-3 text-slate-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Active Deal Flow ({selectedInvestor.dealFlow.length})</span>
            </button>
            {expandedSections.dealFlow && (
              <div className="space-y-1.5">
                {selectedInvestor.dealFlow.map((df, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      <span className="text-xs font-medium text-slate-200">{df.company}</span>
                      <span className="text-[10px] text-slate-500">{df.stage}</span>
                      <span className="text-[10px] text-emerald-400">{df.amount}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-slate-500">{df.leadPartner}</span>
                      <DealStatusBadge status={df.status} />
                      <span className="text-[9px] text-slate-600">{df.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notable Exits */}
          <div>
            <button onClick={() => toggleSection("notableExits")} className="flex items-center gap-1.5 mb-2 w-full">
              {expandedSections.notableExits ? <ChevronDown className="w-3 h-3 text-slate-500" /> : <ChevronUp className="w-3 h-3 text-slate-500" />}
              <TrendingUp className="w-3 h-3 text-slate-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Notable Exits</span>
            </button>
            {expandedSections.notableExits && (
              <div className="flex flex-wrap gap-2">
                {selectedInvestor.notableExits.map(exit => (
                  <span key={exit.company} className="text-[10px] px-2 py-1 rounded-lg border border-emerald-500/15 bg-emerald-500/[0.05] text-emerald-300">
                    {exit.company} <span className="text-emerald-500">· {exit.return}x</span> <span className="text-slate-500">({exit.year})</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Contact History */}
          <div>
            <button onClick={() => toggleSection("contactHistory")} className="flex items-center gap-1.5 mb-2 w-full">
              {expandedSections.contactHistory ? <ChevronDown className="w-3 h-3 text-slate-500" /> : <ChevronUp className="w-3 h-3 text-slate-500" />}
              <Calendar className="w-3 h-3 text-slate-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Contact History</span>
            </button>
            {expandedSections.contactHistory && (
              <div className="space-y-1.5">
                {selectedInvestor.contactHistory.map((ch, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg border border-white/[0.04] bg-white/[0.02]">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400">{ch.date}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-300">{ch.type}</span>
                        <span className="text-[10px] text-amber-400/70">{ch.participant}</span>
                      </div>
                      <div className="text-xs text-slate-300 mt-0.5">{ch.notes}</div>
                      <div className="text-[9px] text-slate-500 mt-0.5">Outcome: {ch.outcome}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Contact Note */}
          <div className="flex gap-2">
            <MessageSquare className="w-4 h-4 text-slate-500 shrink-0 mt-1.5" />
            <input
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addNote()}
              placeholder="Add contact note..."
              className="flex-1 text-xs px-3 py-2 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 placeholder:text-slate-600 outline-none focus:border-amber-500/30"
            />
            <button
              onClick={addNote}
              className="text-xs px-4 py-2 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-400 transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
          </div>

          {/* Links */}
          <div className="flex items-center gap-3 pt-2 border-t border-white/[0.06]">
            <a
              href={`https://${selectedInvestor.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] flex items-center gap-1 text-sky-400 hover:text-sky-300 transition-colors"
            >
              <Globe className="w-3 h-3" />{selectedInvestor.website}<ExternalLink className="w-2.5 h-2.5" />
            </a>
            <a
              href={`https://${selectedInvestor.crunchbaseUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] flex items-center gap-1 text-sky-400 hover:text-sky-300 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />Crunchbase<ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
