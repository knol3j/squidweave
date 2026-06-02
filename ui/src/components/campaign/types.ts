// Shared types for campaign subcomponents
export type IntakeDraft = {
  clientName: string;
  brandName: string;
  clientNeed: string;
  audience: string;
  offer: string;
  markets: string;
  channel: string;
  brandVoice: string;
  differentiators: string;
  constraints: string;
  successDefinition: string;
  successMetrics: string;
  researchObjectives: string;
};

export type ResearchDraft = {
  source: string;
  targetId: string;
  company: string;
  contactName: string;
  title: string;
  segment: string;
  region: string;
  preferredChannel: string;
  channels: string;
  fitScore: string;
  intentScore: string;
  recencyScore: string;
  estimatedReach: string;
  sourceUrl: string;
  evidence: string;
  notes: string;
};

export type ContactImportDraft = {
  source: string;
  rows: string;
};

export type FundingImportDraft = {
  rows: string;
};
