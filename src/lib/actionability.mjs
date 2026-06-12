const VERIFIED_RESEARCH_STATUSES = new Set(["verified", "user-confirmed", "source-verified"]);

function text(value) {
  return String(value || "").trim();
}

function hasUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function researchSourceUrl(record = {}) {
  return record.sourceUrl || record.url || record.metadata?.sourceUrl || record.metadata?.url || "";
}

function evidenceItems(record = {}) {
  const evidence = record.metadata?.evidence || record.evidence || [];
  if (Array.isArray(evidence)) {
    return evidence.map(text).filter(Boolean);
  }
  return text(evidence) ? [text(evidence)] : [];
}

function validScore(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0.55;
}

function confirmedResearch(record = {}) {
  const status = text(record.verificationStatus || record.metadata?.verificationStatus).toLowerCase();
  return VERIFIED_RESEARCH_STATUSES.has(status);
}

export function getResearchActionability(record = {}, campaign = {}) {
  const missing = [];
  const issues = [];
  const warnings = [];
  const confirmed = confirmedResearch(record);
  const sourceUrl = researchSourceUrl(record);
  const evidence = evidenceItems(record);

  if (!text(record.company)) issues.push("missing_company");
  if (!text(record.targetId)) issues.push("missing_target_id");
  if (!hasUrl(sourceUrl)) issues.push("missing_source_url");
  if (!confirmed && evidence.length < 1) issues.push("missing_evidence");
  if (!confirmed && ![record.fitScore, record.intentScore, record.recencyScore].some(validScore)) issues.push("weak_scoring");
  if (!text(record.segment)) warnings.push("missing_segment");
  if (!text(record.region)) warnings.push("missing_region");
  if (!text(record.preferredChannel) && !(Array.isArray(record.channels) && record.channels.length)) warnings.push("missing_channel");

  if (!confirmed) missing.push("verified_research");
  if (!text(record.company)) missing.push("company");
  if (!text(record.targetId)) missing.push("target_id");
  if (!text(record.segment)) missing.push("segment");
  if (!text(record.region)) missing.push("region");
  if (!text(record.preferredChannel) && !(Array.isArray(record.channels) && record.channels.length)) missing.push("channel");
  if (!sourceUrl && evidence.length === 0) missing.push("source_or_evidence");

  return {
    id: record.id || null,
    targetId: record.targetId || null,
    company: record.company || "",
    source: record.source || "",
    sourceUrl: sourceUrl || null,
    confirmed,
    status: confirmed && issues.length === 0 ? "verified" : "needs-review",
    actionable: missing.length === 0,
    actionabilityScore: Number(Math.max(0, 1 - missing.length * 0.16).toFixed(2)),
    missingActionFields: missing,
    issues,
    warnings,
  };
}

export function isActionableResearchRecord(record = {}, campaign = {}) {
  return getResearchActionability(record, campaign).actionable;
}

export function getContactActionability(contact = {}) {
  const missing = [];
  const route = text(contact.email) || text(contact.linkedinUrl) || text(contact.phone);
  const sourceUrl = text(contact.sourceUrl) || text(contact.linkedinUrl);
  if (!text(contact.company)) missing.push("company");
  if (!text(contact.fullName) && !text(contact.firstName) && !text(contact.role) && !text(contact.title)) missing.push("identity");
  if (!text(contact.role) && !text(contact.title)) missing.push("title_or_role");
  if (!route) missing.push("contact_route");
  if (contact.complianceStatus !== "reviewed") missing.push("compliance_review");
  if (!["verified", "phone-route-present", "linkedin-route-present"].includes(text(contact.verificationStatus))) missing.push("verified_route");
  if (!sourceUrl && !(Array.isArray(contact.evidence) && contact.evidence.length)) missing.push("source_or_evidence");

  return {
    id: contact.id || null,
    actionable: missing.length === 0,
    missingActionFields: missing,
    route: text(contact.email) ? "email" : text(contact.linkedinUrl) ? "linkedin" : text(contact.phone) ? "phone" : null,
  };
}

export function isActionableContact(contact = {}) {
  return getContactActionability(contact).actionable;
}

export function getInvestorActionability(investor = {}) {
  const missing = [];
  const scoreValues = [investor.thesisMatch, investor.stageMatch, investor.checkSizeMatch].map(Number);
  const strongFit = scoreValues.filter(value => Number.isFinite(value) && value >= 0.65).length >= 2;
  const route = text(investor.email) || text(investor.warmIntroPath) || (text(investor.partnerName) && (text(investor.domain) || text(investor.website)));

  if (!text(investor.fundName)) missing.push("fund_name");
  if (!strongFit) missing.push("investment_fit");
  if (!route) missing.push("investor_route");

  return {
    id: investor.id || null,
    actionable: missing.length === 0,
    missingActionFields: missing,
    route: text(investor.email) ? "email" : text(investor.warmIntroPath) ? "warm_intro" : route ? "partner_domain" : null,
  };
}

export function isActionableInvestor(investor = {}) {
  return getInvestorActionability(investor).actionable;
}

function buildQuestions({ campaign, records, checks }) {
  const issueSet = new Set(checks.flatMap(check => [...check.issues, ...check.warnings, ...check.missingActionFields]));
  const company = text(campaign.clientName || campaign.name || campaign.businessName) || "this company";
  const questions = [{
    id: "official_domain",
    question: `What is the official website or domain agents should use as the source of truth for ${company}?`,
    reason: "Company identity must be anchored before agents trust scraped or inferred results.",
  }];
  if (!records.length || issueSet.has("missing_evidence") || issueSet.has("missing_source_url") || issueSet.has("source_or_evidence")) {
    questions.push({
      id: "trusted_sources",
      question: "Which source URLs, documents, or profiles should agents treat as authoritative?",
      reason: "Initial research includes claims without enough cited evidence.",
    });
  }
  if (issueSet.has("segment") || issueSet.has("region") || issueSet.has("channel") || issueSet.has("weak_scoring")) {
    questions.push({
      id: "ideal_customer",
      question: "Which segment, role, region, and channel should agents prioritize or exclude?",
      reason: "Downstream targeting needs explicit ICP boundaries before it can produce usable targets.",
    });
  }
  questions.push({
    id: "claim_review",
    question: "Which claims from the initial research are true, uncertain, or wrong?",
    reason: "Operator feedback prevents bad assumptions from becoming targets, pitches, or outreach.",
  });
  return questions;
}

export function buildResearchVerificationGate({ campaign = {}, records = [], minimumVerified = 1 } = {}) {
  const checks = records.map(record => getResearchActionability(record, campaign));
  const verified = checks.filter(check => check.status === "verified");
  const actionable = checks.filter(check => check.actionable);
  const needsReview = checks.filter(check => check.status !== "verified" || !check.actionable);
  const ready = actionable.length >= minimumVerified && needsReview.length === 0;

  return {
    campaignId: campaign?.id || records[0]?.campaignId || null,
    ready,
    status: ready ? "verified" : records.length === 0 ? "needs_questions" : "insufficient_evidence",
    blockingStage: ready ? null : "research-verification",
    blockingReason: ready
      ? null
      : records.length === 0
        ? "No company research has been collected yet."
        : "Initial research needs source verification, operator confirmation, and actionable ICP fields before downstream work.",
    totalRecords: records.length,
    verifiedCount: verified.length,
    actionableCount: actionable.length,
    needsReviewCount: needsReview.length,
    questions: ready ? [] : buildQuestions({ campaign, records, checks }),
    checks,
  };
}
