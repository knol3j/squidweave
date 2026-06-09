/**
 * Investor Deck Store — parses, stores, and serves investor deck content
 * All data lives in localStorage. Zero external dependencies. Fully local.
 */

// ─── Types ───────────────────────────────────────────────────────────

export interface DeckSection {
  id: string;
  title: string;
  content: string;
  bullets: string[];
  order: number;
}

export interface InvestorDeck {
  version: string;
  parsedAt: string;
  rawText: string;
  sections: DeckSection[];
  // Extracted high-value fields for template substitution
  extracted: {
    companyName: string;
    tagline: string;
    problem: string;
    solution: string;
    marketSize: string;
    traction: string;
    revenue: string;
    growthRate: string;
    teamHighlights: string;
    fundingAsk: string;
    useOfFunds: string;
    moat: string;
    vision: string;
    customerCount: string;
   ARR: string;
    mrr: string;
    valuation: string;
    runway: string;
    burnRate: string;
    ltv: string;
    cac: string;
    paybackPeriod: string;
    nrr: string;
    logoCustomers: string[];
    keyMetrics: { label: string; value: string }[];
    competitors: string[];
    differentiators: string[];
  };
}

export interface DeckTemplateVar {
  key: string;
  label: string;
  value: string;
  category: "company" | "market" | "financial" | "team" | "product";
}

// ─── Storage ─────────────────────────────────────────────────────────

const STORAGE_KEY = "sw_investor_deck";
const RAW_KEY = "sw_investor_deck_raw";

export function saveDeck(deck: InvestorDeck): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(deck)); } catch { /* silent */ }
}

export function loadDeck(): InvestorDeck | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* silent */ }
  return null;
}

export function hasDeck(): boolean {
  return !!loadDeck();
}

export function clearDeck(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(RAW_KEY);
  } catch { /* silent */ }
}

// ─── Parser ──────────────────────────────────────────────────────────

/**
 * Parse raw text (from PDF extract, markdown, or typed input) into
 * a structured investor deck with all sections extracted.
 */
export function parseDeck(rawText: string): InvestorDeck {
  const sections = extractSections(rawText);
  const extracted = extractHighValueFields(sections, rawText);

  const deck: InvestorDeck = {
    version: "1.0",
    parsedAt: new Date().toISOString(),
    rawText,
    sections,
    extracted,
  };

  saveDeck(deck);
  try { localStorage.setItem(RAW_KEY, rawText); } catch { /* silent */ }
  return deck;
}

/**
 * Extract named sections from deck text using heading detection.
 */
function extractSections(text: string): DeckSection[] {
  const lines = text.split(/\n/);
  const sections: DeckSection[] = [];
  let current: { title: string; lines: string[]; bullets: string[] } | null = null;
  let order = 0;

  const headingPatterns = [
    /^(?:#{1,3}\s+)(.+)/i,                          // Markdown headings
    /^(\d+)[.):]\s*(.+)/i,                          // Numbered sections
    /^(problem|solution|market|traction|team|financials?|business model|go-to-market|competition|moat|vision|ask|funding|use of funds|highlights|summary|overview|about)\s*[:\-–]?\s*(.*)/i, // Named sections
    /^([A-Z][A-Z\s&]{2,})\s*[:\-–]?\s*(.*)/,       // ALL CAPS headings
  ];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let isHeading = false;
    let title = "";

    for (const pattern of headingPatterns) {
      const match = trimmed.match(pattern);
      if (match) {
        isHeading = true;
        title = (match[2] || match[1] || "").trim();
        break;
      }
    }

    if (isHeading && title) {
      if (current && current.lines.length > 0) {
        sections.push({
          id: `sec-${order}`,
          title: current.title,
          content: current.lines.join(" ").trim(),
          bullets: current.bullets,
          order,
        });
        order++;
      }
      current = { title, lines: [], bullets: [] };
    } else if (current) {
      current.lines.push(trimmed);
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || /^\d+[.)]/.test(trimmed)) {
        current.bullets.push(trimmed.replace(/^[-*\d.)\s]+/, "").trim());
      }
    }
  }

  if (current && current.lines.length > 0) {
    sections.push({
      id: `sec-${order}`,
      title: current.title,
      content: current.lines.join(" ").trim(),
      bullets: current.bullets,
      order,
    });
  }

  // If no sections found, create default sections from paragraphs
  if (sections.length === 0) {
    const paragraphs = text.split(/\n{2,}/).filter(p => p.trim().length > 20);
    const defaultTitles = ["Overview", "Problem & Solution", "Market & Traction", "Team & Financials", "Vision & Ask"];
    paragraphs.forEach((p, i) => {
      if (i < 5) {
        sections.push({
          id: `sec-${i}`,
          title: defaultTitles[i],
          content: p.trim(),
          bullets: p.split("\n").filter(l => l.trim().startsWith("- ")).map(l => l.replace(/^- /, "")),
          order: i,
        });
      }
    });
  }

  return sections;
}

/**
 * Extract high-value fields for template substitution.
 */
function extractHighValueFields(sections: DeckSection[], fullText: string): InvestorDeck["extracted"] {
  void sections;
  return {
    companyName: findPattern(fullText, [
      /(?:^|\n)([A-Z][A-Za-z0-9\s&]{2,30})(?:\s+(?:is\s+a|builds|helps|provides|offers|enables|creates|powers|develops))/,
      /(?:company|startup)\s*[:\-–]?\s*([A-Z][A-Za-z0-9\s&]{2,30})/i,
    ]) || "Your Company",

    tagline: findPattern(fullText, [
      /tagline\s*[:\-–]?\s*(.+?)(?:\n|$)/i,
      /one-liner\s*[:\-–]?\s*(.+?)(?:\n|$)/i,
    ]) || findFirstSentence(fullText) || "",

    problem: findSectionContent(sections, ["problem", "pain point", "challenge"]),
    solution: findSectionContent(sections, ["solution", "product", "platform", "offering"]),
    marketSize: findPattern(fullText, [
      /(?:tam|sam|som|market)\s*(?:size)?\s*[:\-–]?\s*\$?([\d,.]+\s*[MBTKmbtk]?\s*(?:billion|million|trillion|B|M|T)?)/i,
      /\$?([\d,.]+\s*[MBTKmbtk]?\s*(?:billion|million)\s*(?:market|tam|industry))/i,
    ]),

    traction: findSectionContent(sections, ["traction", "growth", "milestones", "progress"]),
    revenue: findPattern(fullText, [
      /(?:revenue|arr|annual)\s*[:\-–]?\s*\$?([\d,.]+\s*[MBTKmbtk]?\s*(?:billion|million|k)?)/i,
      /\$?([\d,.]+\s*[BMKbmkm]+)\s*(?:in\s*)?(?:revenue|arr)/i,
    ]),

    growthRate: findPattern(fullText, [
      /(\d{1,3}[%％])\s*(?:growth|m-o-m|q-o-q|y-o-y|monthly|quarterly|yearly)/i,
      /growing\s*(?:at|by)?\s*(\d{1,3}[%％])/i,
    ]),

    teamHighlights: findSectionContent(sections, ["team", "founders", "leadership"]),
    fundingAsk: findPattern(fullText, [
      /(?:raising|seeking|looking\s*for)\s*\$?([\d,.]+\s*[MBTKmbtk]?\s*(?:billion|million|k)?)/i,
      /(?:round|raise)\s*[:\-–]?\s*\$?([\d,.]+\s*[MBTKmbtkm]+)/i,
    ]),

    useOfFunds: findSectionContent(sections, ["use of funds", "allocation", "spend"]),
    moat: findSectionContent(sections, ["moat", "defensibility", "competitive advantage", "barrier"]),
    vision: findSectionContent(sections, ["vision", "future", "roadmap", "mission"]),
    customerCount: findPattern(fullText, [
      /(\d+[\d,]*)\s*(?:customers?|clients?|users?|companies?)/i,
      /(?:customers?|clients?)\s*[:\-–]?\s*(\d+[\d,kmb]*)/i,
    ]),

    ARR: findPattern(fullText, [
      /arr\s*[:\-–]?\s*\$?([\d,.]+\s*[MBTKmbkm]+)/i,
    ]),

    mrr: findPattern(fullText, [
      /mrr\s*[:\-–]?\s*\$?([\d,.]+\s*[MBTKmbkm]+)/i,
    ]),

    valuation: findPattern(fullText, [
      /(?:valuation|cap)\s*[:\-–]?\s*\$?([\d,.]+\s*[MBTKmbkm]+)/i,
      /\$?([\d,.]+\s*[MBTKmbkm]+)\s*(?:valuation|post-money|pre-money)/i,
    ]),

    runway: findPattern(fullText, [
      /(?:runway)\s*[:\-–]?\s*(\d+\s*(?:months?|years?|mos?))/i,
      /(\d+\s*(?:months?|mos?))\s*(?:of\s*)?(?:runway|cash)/i,
    ]),

    burnRate: findPattern(fullText, [
      /(?:burn)\s*[:\-–]?\s*\$?([\d,.]+\s*[MBTKmbkm]?\/\s*(?:month|mo|m))/i,
    ]),

    ltv: findPattern(fullText, [
      /(?:ltv|lifetime value)\s*[:\-–]?\s*\$?([\d,.]+\s*[MBTKmbkm]*)/i,
    ]),

    cac: findPattern(fullText, [
      /(?:cac|cost per acquisition)\s*[:\-–]?\s*\$?([\d,.]+\s*[MBTKmbkm]*)/i,
    ]),

    paybackPeriod: findPattern(fullText, [
      /(?:payback)\s*[:\-–]?\s*(\d+\s*(?:months?|days?))/i,
    ]),

    nrr: findPattern(fullText, [
      /(?:nrr|net revenue retention)\s*[:\-–]?\s*(\d{1,3}[%％])/i,
    ]),

    logoCustomers: extractList(fullText, [
      /(?:customers? include|trusted by|used by|powers|serves)\s*:?\s*(.+?)(?:\n|$)/i,
    ]),

    keyMetrics: extractKeyValuePairs(fullText),

    competitors: extractList(fullText, [
      /(?:competitors?|competition|landscape)\s*:?\s*(.+?)(?:\n|$)/i,
    ]),

    differentiators: extractList(fullText, [
      /(?:differentiators?|advantages?|why us|why we're different)\s*:?\s*(.+?)(?:\n|$)/i,
    ]),
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────

function findPattern(text: string, patterns: RegExp[]): string {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) return match[1].trim();
  }
  return "";
}

function findFirstSentence(text: string): string {
  const match = text.match(/^([^.!?]{10,150}[.!?])/);
  return match ? match[1].trim() : "";
}

function findSectionContent(sections: DeckSection[], keywords: string[]): string {
  for (const section of sections) {
    const title = section.title.toLowerCase();
    if (keywords.some(kw => title.includes(kw))) {
      return section.content.slice(0, 500);
    }
  }
  // Fallback: search in all content
  const allContent = sections.map(s => s.content).join(" ");
  for (const kw of keywords) {
    const idx = allContent.toLowerCase().indexOf(kw);
    if (idx >= 0) {
      return allContent.slice(idx, idx + 500);
    }
  }
  return "";
}

function extractList(text: string, patterns: RegExp[]): string[] {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1]
        .split(/[,;|&]/)
        .map(s => s.trim())
        .filter(s => s.length > 1 && s.length < 50);
    }
  }
  return [];
}

function extractKeyValuePairs(text: string): { label: string; value: string }[] {
  const pairs: { label: string; value: string }[] = [];
  const pattern = /(?:^|\n)\s*[-•]\s*([A-Za-z][A-Za-z\s]{2,20}?)\s*[:\-–]\s*([^\n]{1,50})/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    pairs.push({ label: match[1].trim(), value: match[2].trim() });
  }
  return pairs.slice(0, 12);
}

// ─── Template Variables ──────────────────────────────────────────────

/**
 * Get all template variables from the deck for email substitution.
 */
export function getTemplateVars(deck?: InvestorDeck | null): DeckTemplateVar[] {
  const d = deck || loadDeck();
  if (!d) return [];
  const e = d.extracted;

  const vars: DeckTemplateVar[] = [
    { key: "{{companyName}}", label: "Company Name", value: e.companyName, category: "company" },
    { key: "{{tagline}}", label: "Tagline", value: e.tagline, category: "company" },
    { key: "{{problem}}", label: "Problem", value: e.problem.slice(0, 200), category: "product" },
    { key: "{{solution}}", label: "Solution", value: e.solution.slice(0, 200), category: "product" },
    { key: "{{marketSize}}", label: "Market Size", value: e.marketSize, category: "market" },
    { key: "{{traction}}", label: "Traction", value: e.traction.slice(0, 200), category: "market" },
    { key: "{{revenue}}", label: "Revenue", value: e.revenue, category: "financial" },
    { key: "{{growthRate}}", label: "Growth Rate", value: e.growthRate, category: "financial" },
    { key: "{{teamHighlights}}", label: "Team", value: e.teamHighlights.slice(0, 200), category: "team" },
    { key: "{{fundingAsk}}", label: "Funding Ask", value: e.fundingAsk, category: "financial" },
    { key: "{{useOfFunds}}", label: "Use of Funds", value: e.useOfFunds.slice(0, 200), category: "financial" },
    { key: "{{moat}}", label: "Moat", value: e.moat.slice(0, 200), category: "product" },
    { key: "{{vision}}", label: "Vision", value: e.vision.slice(0, 200), category: "company" },
    { key: "{{customerCount}}", label: "Customer Count", value: e.customerCount, category: "market" },
    { key: "{{ARR}}", label: "ARR", value: e.ARR, category: "financial" },
    { key: "{{mrr}}", label: "MRR", value: e.mrr, category: "financial" },
    { key: "{{valuation}}", label: "Valuation", value: e.valuation, category: "financial" },
    { key: "{{runway}}", label: "Runway", value: e.runway, category: "financial" },
    { key: "{{burnRate}}", label: "Burn Rate", value: e.burnRate, category: "financial" },
    { key: "{{ltv}}", label: "LTV", value: e.ltv, category: "financial" },
    { key: "{{cac}}", label: "CAC", value: e.cac, category: "financial" },
    { key: "{{paybackPeriod}}", label: "Payback", value: e.paybackPeriod, category: "financial" },
    { key: "{{nrr}}", label: "NRR", value: e.nrr, category: "financial" },
  ];
  return vars.filter(v => v.value);
}

/**
 * Fill template string with deck variables + contact variables.
 */
export function fillTemplate(
  template: string,
  deck?: InvestorDeck | null,
  contactVars?: Record<string, string>
): string {
  let result = template;
  const vars = getTemplateVars(deck);
  for (const v of vars) {
    result = result.split(v.key).join(v.value || v.key);
  }
  if (contactVars) {
    for (const [key, value] of Object.entries(contactVars)) {
      result = result.split(`{{${key}}}`).join(value || `{{${key}}}`);
    }
  }
  return result;
}

/**
 * Get a summary paragraph of the deck for quick reference.
 */
export function getDeckSummary(deck?: InvestorDeck | null): string {
  const d = deck || loadDeck();
  if (!d) return "No investor deck uploaded yet.";
  const e = d.extracted;
  const parts: string[] = [];
  if (e.companyName) parts.push(`${e.companyName}`);
  if (e.tagline) parts.push(`— ${e.tagline}`);
  if (e.problem) parts.push(`Solves: ${e.problem.slice(0, 120)}...`);
  if (e.marketSize) parts.push(`Market: ${e.marketSize}`);
  if (e.revenue || e.ARR) parts.push(`Revenue: ${e.revenue || e.ARR}`);
  if (e.growthRate) parts.push(`Growth: ${e.growthRate}`);
  if (e.fundingAsk) parts.push(`Raising: ${e.fundingAsk}`);
  return parts.join("\n");
}
