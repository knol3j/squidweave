import { useState } from "react";
import {
  Activity,
  Linkedin,
  Twitter,
  Newspaper,
  Zap,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Heart,
  Eye,
  ChevronDown,
  ChevronUp,
  Clock,
  DollarSign,
  MapPin,
  UserPlus,
  Rocket,
  Target,
  Minus,
  Search,
  Star,
  ThumbsUp,
  Repeat2,
  Reply,
  Globe,
  Flame,
  ShoppingCart,
  Award,
  AlertTriangle,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────

export interface LinkedInPost {
  id: string;
  author: string;
  authorRole: string;
  authorCompany: string;
  content: string;
  likes: number;
  comments: number;
  shares: number;
  timestamp: string;
  type: "post" | "article" | "poll" | "video";
  sentiment: "positive" | "neutral" | "negative";
  hashtags: string[];
  isPromoted: boolean;
  engagement: number;
}

export interface TwitterMention {
  id: string;
  author: string;
  authorHandle: string;
  authorFollowers: number;
  content: string;
  likes: number;
  retweets: number;
  replies: number;
  timestamp: string;
  sentiment: "positive" | "neutral" | "negative";
  isVerified: boolean;
  isReply: boolean;
  relatedCompanies: string[];
}

export interface CompanyNews {
  id: string;
  title: string;
  source: string;
  summary: string;
  url: string;
  publishedAt: string;
  category: "funding" | "hiring" | "product" | "partnership" | "acquisition" | "leadership" | "expansion";
  companies: string[];
  relevanceScore: number;
}

export interface IntentSignal {
  id: string;
  type: "hiring" | "funding" | "expansion" | "tech_stack" | "partnership" | "pain_point";
  company: string;
  description: string;
  confidence: number;
  detectedAt: string;
  source: string;
  suggestedAction: string;
  matchedProductArea: string;
  estimatedDealSize: string;
}

export interface ProspectProfile {
  id: string;
  name: string;
  role: string;
  company: string;
  linkedinUrl: string;
  twitterHandle: string;
  recentPosts: LinkedInPost[];
  engagementScore: number;
  lastActive: string;
  interests: string[];
  intentScore: number;
}

export interface SocialIntelState {
  prospects: ProspectProfile[];
  twitterMentions: TwitterMention[];
  companyNews: CompanyNews[];
  intentSignals: IntentSignal[];
  trackedCompanies: string[];
  trackedKeywords: string[];
  lastUpdated: string;
}

// ─── Seed Data ───────────────────────────────────────────────────────

const SEED_STATE: SocialIntelState = {
  prospects: [
    {
      id: "p1",
      name: "Sarah Chen",
      role: "VP of Engineering",
      company: "TechFlow Inc",
      linkedinUrl: "linkedin.com/in/sarahchen",
      twitterHandle: "@sarahchen_eng",
      engagementScore: 87,
      lastActive: "2 hours ago",
      interests: ["AI Infrastructure", "Kubernetes", "Developer Tools", "Platform Engineering"],
      intentScore: 92,
      recentPosts: [
        { id: "lp1", author: "Sarah Chen", authorRole: "VP of Engineering", authorCompany: "TechFlow Inc", content: "Just finished migrating our entire microservices stack to Kubernetes. The complexity of managing 200+ services is real. Looking for better observability solutions - what's everyone using for distributed tracing?", likes: 234, comments: 67, shares: 12, timestamp: "2025-01-15T10:30:00Z", type: "post", sentiment: "neutral", hashtags: ["#Kubernetes", "#DevOps", "#Microservices"], isPromoted: false, engagement: 8.5 },
        { id: "lp2", author: "Sarah Chen", authorRole: "VP of Engineering", authorCompany: "TechFlow Inc", content: "Excited to announce that TechFlow just raised our Series C! This milestone is a testament to the incredible engineering team we've built. We're scaling our platform team and hiring senior infrastructure engineers.", likes: 892, comments: 145, shares: 89, timestamp: "2025-01-10T14:00:00Z", type: "post", sentiment: "positive", hashtags: ["#Fundraising", "#Hiring", "#SeriesC"], isPromoted: false, engagement: 12.3 },
        { id: "lp3", author: "Sarah Chen", authorRole: "VP of Engineering", authorCompany: "TechFlow Inc", content: "Published a deep-dive on our platform engineering journey. 3 years, 10x growth, and the lessons we learned about building developer platforms at scale.", likes: 567, comments: 89, shares: 156, timestamp: "2025-01-05T09:15:00Z", type: "article", sentiment: "positive", hashtags: ["#PlatformEngineering", "#TechBlog", "#Leadership"], isPromoted: false, engagement: 15.1 },
      ],
    },
    {
      id: "p2",
      name: "Marcus Johnson",
      role: "CTO",
      company: "DataSphere AI",
      linkedinUrl: "linkedin.com/in/marcusjohnson",
      twitterHandle: "@mjohnson_cto",
      engagementScore: 74,
      lastActive: "5 hours ago",
      interests: ["Machine Learning", "Data Pipelines", "MLOps", "AI Safety"],
      intentScore: 78,
      recentPosts: [
        { id: "lp4", author: "Marcus Johnson", authorRole: "CTO", authorCompany: "DataSphere AI", content: "Our ML pipeline processing 10M+ inferences/day is hitting scaling bottlenecks. Current tooling isn't cutting it. Evaluating new MLOps platforms - anyone have experience with end-to-end pipeline orchestration?", likes: 178, comments: 93, shares: 8, timestamp: "2025-01-14T16:45:00Z", type: "post", sentiment: "neutral", hashtags: ["#MLOps", "#MachineLearning", "#Scaling"], isPromoted: false, engagement: 6.2 },
        { id: "lp5", author: "Marcus Johnson", authorRole: "CTO", authorCompany: "DataSphere AI", content: "DataSphere is expanding to APAC! Looking for engineering leaders in Singapore and Tokyo to build out our regional data centers and ML infrastructure.", likes: 445, comments: 112, shares: 67, timestamp: "2025-01-08T11:20:00Z", type: "post", sentiment: "positive", hashtags: ["#Expansion", "#APAC", "#Hiring", "#AI"], isPromoted: false, engagement: 9.8 },
      ],
    },
    {
      id: "p3",
      name: "Elena Rodriguez",
      role: "Head of Growth",
      company: "ScaleUp SaaS",
      linkedinUrl: "linkedin.com/in/elenarodriguez",
      twitterHandle: "@elenar_growth",
      engagementScore: 91,
      lastActive: "1 hour ago",
      interests: ["Growth Marketing", "PLG", "SaaS Metrics", "Customer Acquisition"],
      intentScore: 85,
      recentPosts: [
        { id: "lp6", author: "Elena Rodriguez", authorRole: "Head of Growth", authorCompany: "ScaleUp SaaS", content: "Our PLG motion just hit $50M ARR! The key insight: in-product onboarding isn't just UX, it's your #1 growth channel. We're now looking to add outbound to complement our product-led acquisition. What's working for PLG + Sales hybrid models?", likes: 1234, comments: 234, shares: 345, timestamp: "2025-01-15T08:00:00Z", type: "post", sentiment: "positive", hashtags: ["#PLG", "#SaaS", "#Growth", "#ProductLed"], isPromoted: false, engagement: 18.7 },
        { id: "lp7", author: "Elena Rodriguez", authorRole: "Head of Growth", authorCompany: "ScaleUp SaaS", content: "Hiring alert: Looking for a Senior Growth Engineer who can bridge the gap between marketing ops and engineering. If you know Segment, Hightouch, AND can write Python - I want to talk to you.", likes: 678, comments: 198, shares: 234, timestamp: "2025-01-12T13:30:00Z", type: "post", sentiment: "positive", hashtags: ["#Hiring", "#GrowthEngineering", "#Martech"], isPromoted: false, engagement: 14.2 },
      ],
    },
    {
      id: "p4",
      name: "David Park",
      role: "VP of Sales",
      company: "CloudNative Co",
      linkedinUrl: "linkedin.com/in/davidpark",
      twitterHandle: "@dpark_sales",
      engagementScore: 63,
      lastActive: "1 day ago",
      interests: ["Enterprise Sales", "Cloud Infrastructure", "Sales Enablement", "Revenue Ops"],
      intentScore: 71,
      recentPosts: [
        { id: "lp8", author: "David Park", authorRole: "VP of Sales", authorCompany: "CloudNative Co", content: "Enterprise deals are getting longer and more complex. We're seeing 40% longer sales cycles YoY. Investing heavily in sales enablement and demo automation. Any recommendations for interactive demo platforms?", likes: 89, comments: 45, shares: 6, timestamp: "2025-01-13T15:00:00Z", type: "post", sentiment: "negative", hashtags: ["#EnterpriseSales", "#SalesEnablement", "#SaaS"], isPromoted: false, engagement: 4.1 },
      ],
    },
  ],
  twitterMentions: [
    { id: "tm1", author: "Alex Rivera", authorHandle: "@arivera_tech", authorFollowers: 45200, content: "Just evaluated @SquidWeave alongside 5 other outreach platforms. The AI personalization is genuinely next-level. Competitors are still doing mail-merge with {{first_name}}. Game changer for our SDR team.", likes: 234, retweets: 89, replies: 45, timestamp: "2025-01-15T12:00:00Z", sentiment: "positive", isVerified: true, isReply: false, relatedCompanies: ["SquidWeave", "Salesforce", "HubSpot"] },
    { id: "tm2", author: "TechCrunch", authorHandle: "@TechCrunch", authorFollowers: 10200000, content: "The AI outreach space is heating up. New entrants like @SquidWeave are challenging incumbents with agentic workflows that go beyond basic sequencing. Market map dropping tomorrow.", likes: 1203, retweets: 567, replies: 234, timestamp: "2025-01-15T09:30:00Z", sentiment: "positive", isVerified: true, isReply: false, relatedCompanies: ["SquidWeave", "Apollo", "Outreach"] },
    { id: "tm3", author: "StartupGrind", authorHandle: "@startupgrind", authorFollowers: 234000, content: "Founders: stop sending generic cold emails. Tools like @SquidWeave are making hyper-personalized outreach accessible to everyone. Your prospects can smell template from a mile away.", likes: 567, retweets: 234, replies: 89, timestamp: "2025-01-14T18:00:00Z", sentiment: "positive", isVerified: true, isReply: false, relatedCompanies: ["SquidWeave"] },
    { id: "tm4", author: "SalesHacker", authorHandle: "@saleshacker", authorFollowers: 189000, content: "Reviewed the latest batch of sales engagement tools. @SquidWeave's funding pipeline feature is genuinely innovative - auto-discovers investors, warms intros, tracks deal flow. Not seen this elsewhere.", likes: 445, retweets: 178, replies: 67, timestamp: "2025-01-14T14:00:00Z", sentiment: "positive", isVerified: true, isReply: false, relatedCompanies: ["SquidWeave", "Crunchbase", "PitchBook"] },
    { id: "tm5", author: "VC Daily", authorHandle: "@vcdaily", authorFollowers: 89000, content: "How top VCs are using AI to source deals now. Interesting trend: funds using @SquidWeave-type platforms to track founder activity signals before they even pitch. The inbound model is being disrupted.", likes: 892, retweets: 445, replies: 156, timestamp: "2025-01-13T10:00:00Z", sentiment: "neutral", isVerified: false, isReply: false, relatedCompanies: ["SquidWeave", "a16z", "Sequoia"] },
    { id: "tm6", author: "DevOps Weekly", authorHandle: "@devopsweekly", authorFollowers: 156000, content: "Engineering leaders: if you're still managing outreach campaigns manually, you're leaving money on the table. Saw a demo of @SquidWeave's social intelligence module - tracks LinkedIn activity, intent signals, competitive mentions. Wild.", likes: 334, retweets: 123, replies: 56, timestamp: "2025-01-12T16:00:00Z", sentiment: "positive", isVerified: true, isReply: false, relatedCompanies: ["SquidWeave", "LinkedIn", "SalesNav"] },
    { id: "tm7", author: "Jason Lemkin", authorHandle: "@jasonlk", authorFollowers: 534000, content: "SaaS founders: your outbound strategy needs to evolve. The spray-and-pray era is over. Modern tools (tested @SquidWeave recently) use AI to research, personalize, and sequence at scale. Response rates 3x higher than traditional tools in our test.", likes: 1567, retweets: 678, replies: 234, timestamp: "2025-01-11T20:00:00Z", sentiment: "positive", isVerified: true, isReply: false, relatedCompanies: ["SquidWeave", "SaaStr"] },
    { id: "tm8", author: "GTM Insider", authorHandle: "@gtminsider", authorFollowers: 67000, content: "Competitive take: @SquidWeave vs Apollo vs Outreach. Each has strengths. SquidWeave wins on AI personalization and investor relations. Apollo on data breadth. Outreach on enterprise workflow. Choose based on your GTM motion.", likes: 223, retweets: 89, replies: 78, timestamp: "2025-01-10T11:00:00Z", sentiment: "neutral", isVerified: false, isReply: false, relatedCompanies: ["SquidWeave", "Apollo", "Outreach", "Salesloft"] },
  ],
  companyNews: [
    { id: "cn1", title: "TechFlow Inc Raises $85M Series C Led by Sequoia Capital", source: "TechCrunch", summary: "TechFlow, the AI infrastructure platform, announced an $85M Series C led by Sequoia Capital. The company plans to use funds to expand its platform engineering team and accelerate international expansion into APAC and EMEA.", url: "techcrunch.com/2025/01/10/techflow-series-c", publishedAt: "2025-01-10T14:00:00Z", category: "funding", companies: ["TechFlow Inc", "Sequoia Capital"], relevanceScore: 95 },
    { id: "cn2", title: "DataSphere AI Announces European Expansion with New London HQ", source: "VentureBeat", summary: "DataSphere AI is opening a new headquarters in London as part of its EMEA expansion strategy. The company plans to hire 50+ ML engineers and data scientists in the next 6 months.", url: "venturebeat.com/2025/01/14/datasphere-europe", publishedAt: "2025-01-14T10:00:00Z", category: "expansion", companies: ["DataSphere AI"], relevanceScore: 88 },
    { id: "cn3", title: "ScaleUp SaaS Launches New AI-Powered Revenue Intelligence Module", source: "SaaS Industry", summary: "ScaleUp SaaS announced a major product update featuring AI-powered revenue intelligence, predictive churn scoring, and automated expansion revenue identification. CEO says this is their biggest release since launch.", url: "saasindustry.com/2025/01/13/scaleup-ai-module", publishedAt: "2025-01-13T09:00:00Z", category: "product", companies: ["ScaleUp SaaS"], relevanceScore: 82 },
    { id: "cn4", title: "CloudNative Co Acquires Kubernetes Startup ContainerX for $120M", source: "The Information", summary: "CloudNative Co has acquired ContainerX, a Kubernetes management startup, for $120M in cash and stock. The acquisition adds 40 engineers and strengthens CloudNative's container platform offering.", url: "theinformation.com/2025/01/12/cloudnative-containerx", publishedAt: "2025-01-12T16:00:00Z", category: "acquisition", companies: ["CloudNative Co", "ContainerX"], relevanceScore: 79 },
    { id: "cn5", title: "TechFlow Inc Hiring: 50+ Open Engineering Roles", source: "LinkedIn News", summary: "Following their Series C, TechFlow has posted 50+ new engineering roles including Senior Platform Engineers, DevOps Leads, and SREs. The company is specifically looking for experience with distributed systems and observability platforms.", url: "linkedin.com/news/2025/01/techflow-hiring", publishedAt: "2025-01-11T08:00:00Z", category: "hiring", companies: ["TechFlow Inc"], relevanceScore: 91 },
    { id: "cn6", title: "DataSphere AI Partners with Snowflake for Joint ML Platform", source: "Data Engineering Weekly", summary: "DataSphere AI and Snowflake announced a strategic partnership to build a joint ML operations platform. The integration will allow Snowflake customers to deploy DataSphere models directly within their data warehouse.", url: "dataengweekly.com/2025/01/09/datasphere-snowflake", publishedAt: "2025-01-09T12:00:00Z", category: "partnership", companies: ["DataSphere AI", "Snowflake"], relevanceScore: 76 },
    { id: "cn7", title: "ScaleUp SaaS Hires Former HubSpot CMO as Chief Growth Officer", source: "Business Insider", summary: "ScaleUp SaaS announced the hiring of former HubSpot CMO as their new Chief Growth Officer. This signals a shift toward enterprise go-to-market as the company approaches $100M ARR.", url: "businessinsider.com/2025/01/08/scaleup-cgo", publishedAt: "2025-01-08T14:00:00Z", category: "leadership", companies: ["ScaleUp SaaS", "HubSpot"], relevanceScore: 84 },
    { id: "cn8", title: "CloudNative Co Reports 150% YoY Revenue Growth in Q4 Earnings", source: "Bloomberg", summary: "CloudNative Co beat analyst expectations with 150% YoY revenue growth in Q4. The company cited strong enterprise demand for Kubernetes management and cloud migration services.", url: "bloomberg.com/2025/01/07/cloudnative-earnings", publishedAt: "2025-01-07T20:00:00Z", category: "funding", companies: ["CloudNative Co"], relevanceScore: 72 },
  ],
  intentSignals: [
    { id: "is1", type: "hiring", company: "TechFlow Inc", description: "Posted 12 job listings for 'Outbound Platform Engineers' and 'Sales Development Representatives' with experience in sales engagement tools. Looking for teams familiar with AI-powered outreach.", confidence: 94, detectedAt: "2025-01-15T08:00:00Z", source: "LinkedIn Jobs", suggestedAction: "Reach out to VP Engineering with case study on sales team productivity", matchedProductArea: "AI Outreach Platform", estimatedDealSize: "$50K-100K/year" },
    { id: "is2", type: "funding", company: "DataSphere AI", description: "Announced Series B funding of $45M with stated intent to 'scale go-to-market operations and invest in customer acquisition technology.' Hiring 3 sales operations roles.", confidence: 89, detectedAt: "2025-01-14T12:00:00Z", source: "Press Release", suggestedAction: "Introduce via warm intro from mutual investor connection", matchedProductArea: "GTM Automation", estimatedDealSize: "$30K-60K/year" },
    { id: "is3", type: "expansion", company: "ScaleUp SaaS", description: "Opening new office in Austin, TX. Hiring 20+ sales and customer success roles. Recent LinkedIn posts indicate they're evaluating new sales tech stack for the expansion.", confidence: 86, detectedAt: "2025-01-13T15:00:00Z", source: "LinkedIn + Company Blog", suggestedAction: "Send personalized outreach to Head of Growth with Austin market insights", matchedProductArea: "Multi-Region Outreach", estimatedDealSize: "$40K-80K/year" },
    { id: "is4", type: "tech_stack", company: "CloudNative Co", description: "Engineering leadership posting about 'evaluating new outbound and prospecting tools' and asking for recommendations on 'AI-powered sales engagement.' Multiple team members engaging with sales tech content.", confidence: 91, detectedAt: "2025-01-15T10:00:00Z", source: "LinkedIn Activity", suggestedAction: "Connect with CTO who asked for tool recommendations - offer demo", matchedProductArea: "AI Sales Engagement", estimatedDealSize: "$60K-120K/year" },
    { id: "is5", type: "pain_point", company: "TechFlow Inc", description: "VP Engineering posted about 'complexity of managing 200+ microservices' and seeking 'better observability solutions.' Comments show frustration with current tooling limitations.", confidence: 82, detectedAt: "2025-01-15T10:30:00Z", source: "LinkedIn Post", suggestedAction: "Comment on post with relevant insights, then follow up with personalized email", matchedProductArea: "Infrastructure Monitoring", estimatedDealSize: "$25K-50K/year" },
    { id: "is6", type: "partnership", company: "DataSphere AI", description: "New partnership with Snowflake creates opportunity for joint go-to-market. DataSphere's sales team will need new outreach capabilities to target Snowflake's enterprise customer base.", confidence: 78, detectedAt: "2025-01-09T14:00:00Z", source: "Partnership Announcement", suggestedAction: "Reach out to Head of Partnerships with joint GTM playbook template", matchedProductArea: "Partner Outreach", estimatedDealSize: "$20K-40K/year" },
    { id: "is7", type: "hiring", company: "ScaleUp SaaS", description: "Hiring 'Growth Engineer' who knows Segment, Hightouch, and Python. This signals investment in data-driven growth and marketing operations tooling.", confidence: 85, detectedAt: "2025-01-12T13:30:00Z", source: "LinkedIn Job Post", suggestedAction: "Connect with Head of Growth about data integration capabilities", matchedProductArea: "Growth Data Platform", estimatedDealSize: "$35K-70K/year" },
    { id: "is8", type: "funding", company: "CloudNative Co", description: "Strong Q4 earnings (150% YoY growth) with plans to 'accelerate customer acquisition.' Company is likely increasing sales and marketing spend significantly in Q1.", confidence: 80, detectedAt: "2025-01-07T22:00:00Z", source: "Earnings Report", suggestedAction: "Time outreach to coincide with their budget planning cycle", matchedProductArea: "Enterprise Sales Platform", estimatedDealSize: "$80K-150K/year" },
  ],
  trackedCompanies: ["TechFlow Inc", "DataSphere AI", "ScaleUp SaaS", "CloudNative Co", "Vertex Labs"],
  trackedKeywords: ["AI outreach", "sales engagement", "prospecting tools", "cold email", "SDR automation"],
  lastUpdated: "2025-01-15T12:00:00Z",
};

// ─── localStorage helpers ────────────────────────────────────────────

function loadState(): SocialIntelState {
  try {
    const s = localStorage.getItem("sw_social_intel");
    if (s) return JSON.parse(s);
  } catch { /* silent */ }
  return SEED_STATE;
}

// ─── Helper Components ───────────────────────────────────────────────

function SentimentBadge({ sentiment }: { sentiment: "positive" | "neutral" | "negative" }) {
  const config = {
    positive: { classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: TrendingUp },
    neutral: { classes: "bg-slate-500/10 text-slate-400 border-slate-500/20", icon: Minus },
    negative: { classes: "bg-rose-500/10 text-rose-400 border-rose-500/20", icon: TrendingDown },
  };
  const c = config[sentiment];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium ${c.classes}`}>
      <c.icon className="w-3 h-3" />
      {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
    </span>
  );
}

function CategoryBadge({ category }: { category: CompanyNews["category"] }) {
  const config: Record<string, { classes: string; icon: typeof DollarSign }> = {
    funding: { classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: DollarSign },
    hiring: { classes: "bg-sky-500/10 text-sky-400 border-sky-500/20", icon: UserPlus },
    product: { classes: "bg-violet-500/10 text-violet-400 border-violet-500/20", icon: Rocket },
    partnership: { classes: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: Globe },
    acquisition: { classes: "bg-orange-500/10 text-orange-400 border-orange-500/20", icon: ShoppingCart },
    leadership: { classes: "bg-pink-500/10 text-pink-400 border-pink-500/20", icon: Award },
    expansion: { classes: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20", icon: MapPin },
  };
  const c = config[category];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium ${c.classes}`}>
      <c.icon className="w-3 h-3" />
      {category.charAt(0).toUpperCase() + category.slice(1)}
    </span>
  );
}

function IntentTypeBadge({ type }: { type: IntentSignal["type"] }) {
  const config: Record<string, { classes: string; icon: typeof Zap }> = {
    hiring: { classes: "bg-sky-500/10 text-sky-400 border-sky-500/20", icon: UserPlus },
    funding: { classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: DollarSign },
    expansion: { classes: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20", icon: MapPin },
    tech_stack: { classes: "bg-violet-500/10 text-violet-400 border-violet-500/20", icon: Target },
    partnership: { classes: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: Globe },
    pain_point: { classes: "bg-rose-500/10 text-rose-400 border-rose-500/20", icon: AlertTriangle },
  };
  const c = config[type];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium ${c.classes}`}>
      <c.icon className="w-3 h-3" />
      {type === "tech_stack" ? "Tech Stack" : type === "pain_point" ? "Pain Point" : type.charAt(0).toUpperCase() + type.slice(1)}
    </span>
  );
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            confidence >= 90 ? "bg-emerald-500" : confidence >= 75 ? "bg-sky-500" : confidence >= 60 ? "bg-amber-500" : "bg-rose-500"
          }`}
          style={{ width: `${confidence}%` }}
        />
      </div>
      <span className={`text-[10px] font-medium w-8 text-right ${
        confidence >= 90 ? "text-emerald-400" : confidence >= 75 ? "text-sky-400" : confidence >= 60 ? "text-amber-400" : "text-rose-400"
      }`}>{confidence}%</span>
    </div>
  );
}

function EngagementBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={`w-1.5 h-3 rounded-sm ${i < Math.round(score / 20) ? "bg-amber-400" : "bg-white/[0.06]"}`} />
        ))}
      </div>
      <span className="text-[10px] text-slate-500">{score}/100</span>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export default function SocialIntelligence() {
  const [data] = useState<SocialIntelState>(loadState);
  const [activeTab, setActiveTab] = useState<"linkedin" | "twitter" | "news" | "intent">("linkedin");
  const [selectedProspect, setSelectedProspect] = useState<ProspectProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSignals, setExpandedSignals] = useState<Record<string, boolean>>({});

  const toggleSignal = (id: string) => {
    setExpandedSignals(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredProspects = data.prospects.filter(p => {
    const matchesSearch = !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.interests.some(i => i.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  const filteredNews = data.companyNews.filter(n => {
    const matchesSearch = !searchQuery ||
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.companies.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  const filteredMentions = data.twitterMentions.filter(m => {
    const matchesSearch = !searchQuery ||
      m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.author.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const filteredSignals = data.intentSignals.filter(s => {
    const matchesSearch = !searchQuery ||
      s.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const tabs = [
    { id: "linkedin" as const, label: "LinkedIn", icon: Linkedin, count: data.prospects.reduce((acc, p) => acc + p.recentPosts.length, 0) },
    { id: "twitter" as const, label: "Twitter/X", icon: Twitter, count: data.twitterMentions.length },
    { id: "news" as const, label: "Company News", icon: Newspaper, count: data.companyNews.length },
    { id: "intent" as const, label: "Intent Signals", icon: Zap, count: data.intentSignals.length },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Activity className="w-4 h-4 text-violet-400" />
            Social Intelligence
          </h2>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Tracking {data.trackedCompanies.length} companies · {data.trackedKeywords.length} keywords · Last updated: {new Date(data.lastUpdated).toLocaleTimeString()}
          </p>
        </div>
        <div className="relative">
          <Search className="w-3 h-3 text-slate-500 absolute left-2 top-1/2 -translate-y-1/2" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="text-[11px] pl-6 pr-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-slate-200 placeholder:text-slate-600 outline-none focus:border-violet-500/30 w-40"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl border border-white/[0.06] bg-white/[0.02]">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSelectedProspect(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 text-[11px] font-medium py-2 rounded-lg transition-all ${
              activeTab === tab.id
                ? "bg-violet-500/15 text-violet-300 border border-violet-500/20"
                : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.06] text-slate-400">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* ─── LinkedIn Tab ─────────────────────────────── */}
      {activeTab === "linkedin" && (
        <div className="space-y-3">
          {!selectedProspect ? (
            <>
              {/* Prospect cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredProspects.map(prospect => (
                  <div
                    key={prospect.id}
                    className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] cursor-pointer transition-all"
                    onClick={() => setSelectedProspect(prospect)}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center text-sm font-bold text-violet-300">
                        {prospect.name.split(" ").map(n => n[0]).join("")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-slate-200">{prospect.name}</div>
                        <div className="text-[10px] text-slate-500">{prospect.role} at {prospect.company}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[9px] text-slate-500">Intent Score</div>
                        <div className={`text-xs font-bold ${prospect.intentScore >= 85 ? "text-emerald-400" : prospect.intentScore >= 70 ? "text-sky-400" : "text-amber-400"}`}>
                          {prospect.intentScore}
                        </div>
                      </div>
                    </div>

                    <EngagementBar score={prospect.engagementScore} />

                    <div className="flex flex-wrap gap-1 mt-2.5 mb-2.5">
                      {prospect.interests.slice(0, 3).map(i => (
                        <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-400">{i}</span>
                      ))}
                    </div>

                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{prospect.recentPosts.length} posts tracked</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{prospect.lastActive}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* All recent posts */}
              <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                <div className="flex items-center gap-1.5 mb-3">
                  <Linkedin className="w-4 h-4 text-sky-400" />
                  <span className="text-xs font-semibold text-slate-200">Recent LinkedIn Activity</span>
                </div>
                <div className="space-y-3">
                  {data.prospects.flatMap(p => p.recentPosts).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 8).map(post => (
                    <div key={post.id} className="p-3 rounded-lg border border-white/[0.04] bg-white/[0.02]">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-medium text-slate-200">{post.author}</span>
                        <span className="text-[10px] text-slate-500">{post.authorRole} · {post.authorCompany}</span>
                        <SentimentBadge sentiment={post.sentiment} />
                      </div>
                      <div className="text-xs text-slate-300 leading-relaxed mb-2 line-clamp-3">{post.content}</div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-500">
                        <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{post.likes.toLocaleString()}</span>
                        <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{post.comments}</span>
                        <span className="flex items-center gap-1"><Repeat2 className="w-3 h-3" />{post.shares}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(post.timestamp).toLocaleDateString()}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {post.hashtags.map(h => (
                          <span key={h} className="text-[9px] text-sky-400/70">{h}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* Selected Prospect Detail */
            <div className="p-4 rounded-xl border border-violet-500/15 bg-violet-500/[0.03] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/30 to-purple-500/30 flex items-center justify-center text-lg font-bold text-violet-200">
                    {selectedProspect.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-100">{selectedProspect.name}</div>
                    <div className="text-xs text-slate-500">{selectedProspect.role} · {selectedProspect.company}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-slate-500">Active {selectedProspect.lastActive}</span>
                      <span className="text-[10px] text-violet-400">Intent: {selectedProspect.intentScore}/100</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedProspect(null)}
                  className="text-[10px] px-2 py-1 rounded-lg border border-white/[0.08] text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] transition-colors"
                >
                  Back
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {selectedProspect.interests.map(i => (
                  <span key={i} className="text-[10px] px-2 py-1 rounded-lg border border-white/[0.06] bg-white/[0.03] text-slate-300">{i}</span>
                ))}
              </div>

              <div className="space-y-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Recent Posts ({selectedProspect.recentPosts.length})</div>
                {selectedProspect.recentPosts.map(post => (
                  <div key={post.id} className="p-3 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-400 capitalize">{post.type}</span>
                      <SentimentBadge sentiment={post.sentiment} />
                      <span className="text-[10px] text-slate-500">{new Date(post.timestamp).toLocaleDateString()}</span>
                    </div>
                    <div className="text-xs text-slate-300 leading-relaxed mb-2">{post.content}</div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-500">
                      <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{post.likes.toLocaleString()}</span>
                      <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{post.comments}</span>
                      <span className="flex items-center gap-1"><Repeat2 className="w-3 h-3" />{post.shares}</span>
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" />Eng: {post.engagement}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Twitter/X Tab ────────────────────────────── */}
      {activeTab === "twitter" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex flex-wrap gap-1">
              {data.trackedKeywords.map(kw => (
                <span key={kw} className="text-[9px] px-2 py-1 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/15">{kw}</span>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            {filteredMentions.map(mention => (
              <div key={mention.id} className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500/20 to-blue-500/20 flex items-center justify-center text-xs font-bold text-sky-300 shrink-0">
                    {mention.author.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-xs font-semibold text-slate-200">{mention.author}</span>
                      {mention.isVerified && <Star className="w-3 h-3 text-sky-400 fill-sky-400" />}
                      <span className="text-[10px] text-slate-500">{mention.authorHandle}</span>
                      <span className="text-[10px] text-slate-600">· {mention.authorFollowers.toLocaleString()} followers</span>
                    </div>
                    <div className="text-xs text-slate-300 leading-relaxed mb-2">{mention.content}</div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-3 text-[10px] text-slate-500">
                        <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{mention.likes}</span>
                        <span className="flex items-center gap-1"><Repeat2 className="w-3 h-3" />{mention.retweets}</span>
                        <span className="flex items-center gap-1"><Reply className="w-3 h-3" />{mention.replies}</span>
                      </div>
                      <SentimentBadge sentiment={mention.sentiment} />
                      <span className="text-[10px] text-slate-600">{new Date(mention.timestamp).toLocaleDateString()}</span>
                    </div>
                    {mention.relatedCompanies.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {mention.relatedCompanies.map(co => (
                          <span key={co} className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-400">{co}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Company News Tab ─────────────────────────── */}
      {activeTab === "news" && (
        <div className="space-y-2.5">
          {filteredNews.map(news => (
            <div key={news.id} className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-all cursor-pointer">
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  news.category === "funding" ? "bg-emerald-500/10" :
                  news.category === "hiring" ? "bg-sky-500/10" :
                  news.category === "product" ? "bg-violet-500/10" :
                  news.category === "acquisition" ? "bg-orange-500/10" :
                  news.category === "partnership" ? "bg-amber-500/10" :
                  news.category === "leadership" ? "bg-pink-500/10" : "bg-cyan-500/10"
                }`}>
                  <Newspaper className={`w-4 h-4 ${
                    news.category === "funding" ? "text-emerald-400" :
                    news.category === "hiring" ? "text-sky-400" :
                    news.category === "product" ? "text-violet-400" :
                    news.category === "acquisition" ? "text-orange-400" :
                    news.category === "partnership" ? "text-amber-400" :
                    news.category === "leadership" ? "text-pink-400" : "text-cyan-400"
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <CategoryBadge category={news.category} />
                    <span className="text-[10px] text-slate-500">{news.source}</span>
                    <span className="text-[10px] text-slate-600">{new Date(news.publishedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="text-xs font-semibold text-slate-200 mb-1 leading-snug">{news.title}</div>
                  <div className="text-[10px] text-slate-400 leading-relaxed line-clamp-2 mb-2">{news.summary}</div>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                      {news.companies.map(co => (
                        <span key={co} className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-400">{co}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-1">
                      <Target className="w-3 h-3 text-slate-600" />
                      <span className="text-[10px] text-slate-500">{news.relevanceScore}% relevant</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Intent Signals Tab ───────────────────────── */}
      {activeTab === "intent" && (
        <div className="space-y-3">
          {/* Intent summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { label: "Hiring Signals", count: data.intentSignals.filter(s => s.type === "hiring").length, icon: UserPlus, color: "sky" },
              { label: "Funding Signals", count: data.intentSignals.filter(s => s.type === "funding").length, icon: DollarSign, color: "emerald" },
              { label: "Expansion", count: data.intentSignals.filter(s => s.type === "expansion").length, icon: MapPin, color: "cyan" },
              { label: "Tech Stack", count: data.intentSignals.filter(s => s.type === "tech_stack").length, icon: Target, color: "violet" },
            ].map(stat => (
              <div key={stat.label} className="p-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                <div className="flex items-center gap-1.5 mb-1">
                  <stat.icon className={`w-3.5 h-3.5 text-${stat.color}-400`} />
                  <span className="text-[9px] text-slate-500">{stat.label}</span>
                </div>
                <div className={`text-lg font-bold text-${stat.color}-400`}>{stat.count}</div>
              </div>
            ))}
          </div>

          {/* Signals list */}
          <div className="space-y-2.5">
            {filteredSignals.map(signal => (
              <div key={signal.id} className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    signal.type === "hiring" ? "bg-sky-500/10" :
                    signal.type === "funding" ? "bg-emerald-500/10" :
                    signal.type === "expansion" ? "bg-cyan-500/10" :
                    signal.type === "tech_stack" ? "bg-violet-500/10" :
                    signal.type === "partnership" ? "bg-amber-500/10" : "bg-rose-500/10"
                  }`}>
                    <Zap className={`w-4 h-4 ${
                      signal.type === "hiring" ? "text-sky-400" :
                      signal.type === "funding" ? "text-emerald-400" :
                      signal.type === "expansion" ? "text-cyan-400" :
                      signal.type === "tech_stack" ? "text-violet-400" :
                      signal.type === "partnership" ? "text-amber-400" : "text-rose-400"
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-slate-200">{signal.company}</span>
                      <IntentTypeBadge type={signal.type} />
                      <span className="text-[10px] text-slate-600">{new Date(signal.detectedAt).toLocaleDateString()}</span>
                    </div>

                    <div className="text-xs text-slate-300 leading-relaxed mb-2">{signal.description}</div>

                    <ConfidenceBar confidence={signal.confidence} />

                    <button
                      onClick={() => toggleSignal(signal.id)}
                      className="flex items-center gap-1 mt-2 text-[10px] text-violet-400 hover:text-violet-300 transition-colors"
                    >
                      {expandedSignals[signal.id] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {expandedSignals[signal.id] ? "Hide details" : "Show details"}
                    </button>

                    {expandedSignals[signal.id] && (
                      <div className="mt-2 space-y-1.5 p-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                        <div className="flex items-start gap-1.5">
                          <Target className="w-3 h-3 text-slate-500 mt-0.5 shrink-0" />
                          <div>
                            <span className="text-[9px] text-slate-500">Matched Product Area</span>
                            <div className="text-[10px] text-slate-300">{signal.matchedProductArea}</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <DollarSign className="w-3 h-3 text-slate-500 mt-0.5 shrink-0" />
                          <div>
                            <span className="text-[9px] text-slate-500">Estimated Deal Size</span>
                            <div className="text-[10px] text-emerald-400 font-medium">{signal.estimatedDealSize}</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <Flame className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                          <div>
                            <span className="text-[9px] text-slate-500">Suggested Action</span>
                            <div className="text-[10px] text-amber-300">{signal.suggestedAction}</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <Globe className="w-3 h-3 text-slate-500 mt-0.5 shrink-0" />
                          <div>
                            <span className="text-[9px] text-slate-500">Source</span>
                            <div className="text-[10px] text-slate-400">{signal.source}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


