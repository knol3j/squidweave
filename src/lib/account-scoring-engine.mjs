/**
 * Account-level scoring.
 *
 * Aggregates a company and its people into one priority score so the decision
 * engine can order accounts rather than guessing. Everything here is derived from
 * data actually on file — no hardcoded per-source constants.
 *
 * The design rule: every component is a documented, bounded contribution with a
 * stated reason, and the sum is clamped to 0..1. A score the caller cannot
 * explain is not useful, so `components` records what each part contributed.
 *
 * What is deliberately NOT scored:
 *   - Anything not present in the database. A missing signal contributes 0; it
 *     does not get an assumed default. Assuming defaults is how a score ends up
 *     confident and meaningless.
 *   - Personal attributes. Seniority and role are used because they describe the
 *     job, which is a legitimate B2B targeting input.
 */

import { B2BStore } from "./b2b-store.mjs";

// Component weights. These are the only magic numbers in this file, declared once
// so a tuning change is a one-line edit and visible in review.
export const WEIGHTS = {
  // Confidence that the company record itself is real and corroborated.
  dataQuality: 0.2,
  // Can we actually reach anyone here? Drives everything downstream.
  contactability: 0.25,
  // Do we have a decision-maker, not just a generic inbox?
  decisionMakerReach: 0.25,
  // Is the company actively hiring (a real buying signal)?
  hiringSignal: 0.15,
  // Does the size band match a mid-market target?
  firmographicFit: 0.15,
};

// Employee bands. Larger companies are harder to close solo, very small ones
// have little budget, so the middle is the target. Score peaks at band index 2.
const EMPLOYEE_BANDS = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1001-5000", "5000+"];
const BAND_FIT = [0.3, 0.6, 1.0, 0.85, 0.6, 0.35, 0.2];

// Seniority ranking for "how close is this person to a buying decision".
const SENIORITY_RANK = {
  owner: 1.0,
  c_level: 0.95,
  vp: 0.8,
  manager: 0.55,
  board: 0.45,
  individual_contributor: 0.15,
  unknown: 0.05,
};

// Email states that mean an address is actually usable.
const REACHABLE = new Set(["verified"]);
// Usable but uncertain. Counts for something, not for everything.
const PLAUSIBLE = new Set(["permuted", "risky"]);

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}

/**
 * Band a score into hot / warm / cold for display and prioritisation.
 *
 * Lives here rather than in the UI so the thresholds are a property of the
 * scoring model, not of whichever surface renders it.
 *
 * @param {number} score
 * @returns {"hot" | "warm" | "cold"}
 */
export function bandForScore(score) {
  const value = Number(score);
  if (!Number.isFinite(value)) return "cold";
  if (value >= 0.65) return "hot";
  if (value >= 0.45) return "warm";
  return "cold";
}

/**
 * Score contactability: what fraction of a company's people have an address that
 * is verified or at least plausible, and how many people do we know at all.
 */
function scoreContactability(people) {
  if (people.length === 0) {
    return { value: 0, reason: "no people on file" };
  }

  let reachable = 0;
  let plausible = 0;
  for (const person of people) {
    if (!person.email) continue;
    if (REACHABLE.has(person.email_status)) reachable += 1;
    else if (PLAUSIBLE.has(person.email_status)) plausible += 1;
  }

  // Coverage is the primary signal: one verified address at a company of ten
  // people is not a reachable account.
  const coverage = clamp01((reachable + plausible * 0.5) / people.length);
  // Depth: knowing more people helps, with diminishing returns past five.
  const depth = clamp01(people.length / 5);
  const value = clamp01(coverage * 0.7 + depth * 0.3);

  return {
    value: round(value),
    reason: `${reachable} verified, ${plausible} plausible of ${people.length} people`,
  };
}

/** Score whether anyone senior enough to buy is on file. */
function scoreDecisionMakerReach(people) {
  if (people.length === 0) return { value: 0, reason: "no people on file" };

  let best = 0;
  let bestName = null;
  for (const person of people) {
    const rank = SENIORITY_RANK[person.seniority] ?? 0.05;
    if (rank > best) {
      best = rank;
      bestName = person.full_name;
    }
  }

  // A senior person with no reachable address is worth less than a mid-level one
  // we can actually email.
  const hasAddress = people.some(
    p => p.email && (REACHABLE.has(p.email_status) || PLAUSIBLE.has(p.email_status)),
  );
  const value = best * (hasAddress ? 1 : 0.5);

  return {
    value: round(clamp01(value)),
    reason: `top seniority ${best.toFixed(2)}${bestName ? ` (${bestName})` : ""}, ${hasAddress ? "reachable" : "no reachable address"}`,
  };
}

/** Hiring activity is a genuine buying signal; it comes from the job-board scout. */
function scoreHiringSignal(company) {
  const stack = company.tech_stack || [];
  const openRoles = stack.filter(t => t.startsWith("hiring:")).length;
  if (openRoles === 0) {
    return { value: 0, reason: "no open roles observed" };
  }
  // Sales and marketing hiring is the strongest signal for an outreach tool.
  const goToMarket = stack.filter(
    t => t.startsWith("hiring:") && /sales|marketing|gtm|revenue|customer|account|success|growth/i.test(t),
  ).length;
  const volume = clamp01(openRoles / 15);
  const relevance = clamp01(goToMarket / Math.max(1, openRoles));
  const value = clamp01(volume * 0.4 + relevance * 0.6);

  return {
    value: round(value),
    reason: `${openRoles} open roles, ${goToMarket} in sales/marketing`,
  };
}

/** Firmographic fit against a mid-market target. */
function scoreFirmographicFit(company) {
  const band = company.employee_range;
  if (!band) return { value: 0, reason: "employee range unknown" };
  const index = EMPLOYEE_BANDS.indexOf(band);
  if (index === -1) return { value: 0, reason: `unrecognized band "${band}"` };
  return { value: BAND_FIT[index], reason: `band ${band}` };
}

/** Data quality is the stored confidence, already computed from provenance. */
function scoreDataQuality(company, sourceCount = null) {
  // Provenance lives in `company_sources`, not on the company row, so the reason
  // must be passed in rather than reading `source_urls`, which only carries the
  // URLs the caller happened to supply.
  const sources = sourceCount ?? (company.source_urls || []).length;
  return {
    value: clamp01(Number(company.confidence) || 0),
    reason: `${sources} source(s) on file, confidence ${company.confidence}`,
  };
}

/**
 * Compute the score for one company. Writes to `account_scores` so the value is
 * queryable and sortable in SQL rather than recomputed on every read.
 *
 * @returns {Promise<{companyId: string, score: number, components: object}>}
 */
export function scoreCompany(store, company, people, sourceCount = null) {
  const contactability = scoreContactability(people);
  const decisionMaker = scoreDecisionMakerReach(people);
  const hiring = scoreHiringSignal(company);
  const firmographic = scoreFirmographicFit(company);
  const dataQuality = scoreDataQuality(company, sourceCount);

  const components = {
    dataQuality,
    contactability,
    decisionMakerReach: decisionMaker,
    hiringSignal: hiring,
    firmographicFit: firmographic,
  };

  const score =
    dataQuality.value * WEIGHTS.dataQuality +
    contactability.value * WEIGHTS.contactability +
    decisionMaker.value * WEIGHTS.decisionMakerReach +
    hiring.value * WEIGHTS.hiringSignal +
    firmographic.value * WEIGHTS.firmographicFit;

  return {
    companyId: company.id,
    domain: company.domain,
    score: round(clamp01(score)),
    band: bandForScore(score),
    components,
    modelVersion: 1,
  };
}

/**
 * Score every company in the database and persist the result.
 *
 * @param {B2BStore} store
 * @returns {Promise<{scored: number, results: object[]}>}
 */
export async function scoreAllCompanies(store) {
  const companies = await store.listCompanies({ limit: 10000 });
  const results = [];
  const skipped = [];

  for (const company of companies) {
    const people = await store.listPeople({ companyId: company.id, limit: 500 });
    const sourceCount = await store.countCompanySources(company.id);
    const result = scoreCompany(store, company, people, sourceCount);
    try {
      await store.upsertAccountScore(result);
    } catch (error) {
      // A company deleted between listing it and writing its score would abort the
      // whole run on a foreign key violation. Skip it and report it instead: one
      // vanishing row should not cost every other score.
      if (error.code === "23503") {
        skipped.push({ domain: company.domain, reason: "company deleted during scoring" });
        continue;
      }
      throw error;
    }
    results.push(result);
  }

  results.sort((a, b) => b.score - a.score);
  return { scored: results.length, results, skipped };
}
/**
 * Rank companies best-first. This is the "sorting" the decision engine needs:
 * a deterministic, explainable order rather than an arbitrary one.
 *
 * @param {B2BStore} store
 * @param {object} [options] { limit?: number, minScore?: number }
 */
export async function rankCompanies(store, options = {}) {
  const limit = options.limit || 50;
  const minScore = options.minScore ?? 0;
  const rows = await store._queryAll(
    `select s.score, s.components, s.company_id, c.domain, c.name, c.employee_range, c.industry
     from account_scores s join companies c on c.id = s.company_id
     where s.score >= $1
     order by s.score desc, c.domain asc
     limit $2`,
    [minScore, limit],
  );
  // `band` is a derived property of the score, so add it here rather than making
  // every caller recompute the thresholds.
  return rows.map(row => ({
    ...row,
    companyId: row.company_id,
    band: bandForScore(Number(row.score)),
  }));
}
