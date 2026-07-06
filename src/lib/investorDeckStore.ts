// Investor Deck Parsing & Storage Engine
// Parses raw investor deck text into structured sections and template variables.

const STORAGE_KEY = "sw_investor_deck_v2";

export interface DeckSection {
  id: string;
  title: string;
  content: string;
  order: number;
}

export interface TemplateVariable {
  key: string;
  value: string;
}

export interface InvestorDeck {
  rawText: string;
  sections: DeckSection[];
  extracted: {
    companyName: string;
    tagline: string;
    problem: string;
    solution: string;
    traction: string;
    market: string;
    businessModel: string;
    team: string;
    ask: string;
    vision: string;
    revenue: string;
    customerCount: string;
    growthRate: string;
  };
  parsedAt: string;
}

/**
 * Parse raw investor deck text into structured sections.
 * Uses heading detection and content segmentation.
 */
export function parseDeck(rawText: string): InvestorDeck {
  if (!rawText || rawText.trim().length === 0) {
    return createEmptyDeck();
  }

  const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);
  const sections: DeckSection[] = [];
  const extracted: InvestorDeck["extracted"] = {
    companyName: "",
    tagline: "",
    problem: "",
    solution: "",
    traction: "",
    market: "",
    businessModel: "",
    team: "",
    ask: "",
    vision: "",
    revenue: "",
    customerCount: "",
    growthRate: "",
  };

  // Common section heading patterns
  const headingPatterns = [
    /^#+\s+(.+)/i, // Markdown headings
    /^\d+\.\s*(.+)/i, // Numbered headings
    /^([A-Z][A-Za-z\s&]+):/, // Capitalized labels
    /^([A-Z][A-Za-z\s]+)$/i, // All-caps single lines
  ];

  let currentSection: DeckSection | null = null;
  let sectionOrder = 0;
  const sectionContent: string[] = [];

  for (const line of lines) {
    // Check if line is a heading
    let isHeading = false;
    let headingText = "";

    for (const pattern of headingPatterns) {
      const match = line.match(pattern);
      if (match) {
        isHeading = true;
        headingText = match[1].trim();
        break;
      }
    }

    if (isHeading) {
      // Save previous section
      if (currentSection) {
        sections.push({
          ...currentSection,
          content: sectionContent.join(" "),
        });
        sectionContent.length = 0;
      }
      currentSection = {
        id: `sec-${sectionOrder}`,
        title: headingText,
        content: "",
        order: sectionOrder++,
      };
    } else if (currentSection) {
      sectionContent.push(line);
    }
  }

  // Save final section
  if (currentSection && sectionContent.length > 0) {
    sections.push({
      ...currentSection,
      content: sectionContent.join(" "),
    });
  }

  // Extract key information from sections
  for (const section of sections) {
    const titleLower = section.title.toLowerCase();
    const content = section.content;

    if (titleLower.includes("company") || titleLower.includes("about")) {
      extracted.companyName = section.title.replace(/^(company|about)\s*:?\s*/i, "");
    }
    if (titleLower.includes("tagline") || titleLower.includes("one-liner")) {
      extracted.tagline = content.slice(0, 200);
    }
    if (titleLower.includes("problem") || titleLower.includes("pain")) {
      extracted.problem = content.slice(0, 500);
    }
    if (titleLower.includes("solution") || titleLower.includes("product")) {
      extracted.solution = content.slice(0, 500);
    }
    if (titleLower.includes("traction") || titleLower.includes("metrics")) {
      extracted.traction = content.slice(0, 300);
    }
    if (titleLower.includes("market") || titleLower.includes("opportunity")) {
      extracted.market = content.slice(0, 300);
    }
    if (titleLower.includes("business model") || titleLower.includes("revenue")) {
      extracted.businessModel = content.slice(0, 300);
    }
    if (titleLower.includes("team") || titleLower.includes("founders")) {
      extracted.team = content.slice(0, 300);
    }
    if (titleLower.includes("ask") || titleLower.includes("raising") || titleLower.includes("funding")) {
      extracted.ask = content.slice(0, 200);
    }
    if (titleLower.includes("vision") || titleLower.includes("future")) {
      extracted.vision = content.slice(0, 300);
    }
  }

  // Try to extract revenue and customer numbers from traction section
  if (extracted.traction) {
    const revenueMatch = extracted.traction.match(/\$?([\d,]+(?:\.\d+)?)\s*(M|K|million|thousand)?\s*(?:ARR|MRR|revenue)/i);
    if (revenueMatch) {
      extracted.revenue = `$${revenueMatch[1]}${revenueMatch[2] || ""}`;
    }
    const customerMatch = extracted.traction.match(/(\d+)\s*(?:customers?|users?|clients?|accounts?)/i);
    if (customerMatch) {
      extracted.customerCount = customerMatch[1];
    }
    const growthMatch = extracted.traction.match(/(\d+)%\s*(?:growth|increase|MoM|YoY)/i);
    if (growthMatch) {
      extracted.growthRate = `${growthMatch[1]}%`;
    }
  }

  const deck: InvestorDeck = {
    rawText,
    sections,
    extracted,
    parsedAt: new Date().toISOString(),
  };

  // Save to localStorage
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(deck));
  } catch { /* silent */ }

  return deck;
}

function createEmptyDeck(): InvestorDeck {
  return {
    rawText: "",
    sections: [],
    extracted: {
      companyName: "",
      tagline: "",
      problem: "",
      solution: "",
      traction: "",
      market: "",
      businessModel: "",
      team: "",
      ask: "",
      vision: "",
      revenue: "",
      customerCount: "",
      growthRate: "",
    },
    parsedAt: new Date().toISOString(),
  };
}

/**
 * Load the saved investor deck from localStorage.
 */
export function loadDeck(): InvestorDeck | null {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) {
      const data = JSON.parse(s) as InvestorDeck;
      // Validate structure
      if (data.sections && data.extracted) return data;
    }
  } catch { /* silent */ }
  return null;
}

/**
 * Clear the saved investor deck.
 */
export function clearDeck(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* silent */ }
}

/**
 * Get a human-readable summary of the deck.
 */
export function getDeckSummary(deck: InvestorDeck): string {
  const e = deck.extracted;
  const parts: string[] = [];
  if (e.companyName) parts.push(`Company: ${e.companyName}`);
  if (e.tagline) parts.push(`Tagline: ${e.tagline}`);
  if (e.problem) parts.push(`Problem: ${e.problem.slice(0, 120)}...`);
  if (e.solution) parts.push(`Solution: ${e.solution.slice(0, 120)}...`);
  if (e.traction) parts.push(`Traction: ${e.traction.slice(0, 120)}...`);
  if (e.market) parts.push(`Market: ${e.market.slice(0, 100)}...`);
  if (e.ask) parts.push(`Ask: ${e.ask.slice(0, 100)}...`);
  return parts.join("\n\n") || "No summary available.";
}

/**
 * Get template variables from the deck for email composition.
 */
export function getTemplateVars(deck: InvestorDeck): TemplateVariable[] {
  const e = deck.extracted;
  const vars: TemplateVariable[] = [
    { key: "{{companyName}}", value: e.companyName },
    { key: "{{tagline}}", value: e.tagline },
    { key: "{{problem}}", value: e.problem.slice(0, 200) },
    { key: "{{solution}}", value: e.solution.slice(0, 200) },
    { key: "{{traction}}", value: e.traction.slice(0, 150) },
    { key: "{{market}}", value: e.market.slice(0, 150) },
    { key: "{{businessModel}}", value: e.businessModel.slice(0, 150) },
    { key: "{{team}}", value: e.team.slice(0, 150) },
    { key: "{{ask}}", value: e.ask },
    { key: "{{vision}}", value: e.vision.slice(0, 200) },
    { key: "{{revenue}}", value: e.revenue },
    { key: "{{customerCount}}", value: e.customerCount },
    { key: "{{growthRate}}", value: e.growthRate },
  ];
  return vars.filter((v) => v.value && v.value.length > 0);
}
