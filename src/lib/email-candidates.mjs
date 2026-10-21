/**
 * Email candidate generation.
 *
 * Fills in a plausible work address for a person who has none, and records that
 * the address was GUESSED rather than discovered. A permuted address is a
 * hypothesis, not a fact, so it goes into the database with
 * `email_status = 'permuted'` and low confidence, and only the verification
 * queue may promote it to 'verified'.
 *
 * The existing email-permutator.mjs already generates the pattern list; this
 * module adds the part that was missing: a record of which pattern was used, so
 * a verified address at the same company can confirm or refute the guess later.
 */
// permuteEmail is the pre-existing pattern generator. detectPattern lives in the
// verifier, since confirming a pattern is a verification concern, not a scraping one.
import { permuteEmail } from "./scrapers/email-permutator.mjs";
import { detectPattern } from "./email-verifier.mjs";

// Order matters. These are roughly the most common corporate conventions first,
// so the first candidate is the most likely one and the verification queue
// spends its probes on the best guesses.
export const PATTERN_ORDER = [
  "first.last",
  "first",
  "flast",
  "first_last",
  "f.last",
  "firstl",
  "last",
  "last.first",
];

export function buildPattern(first, last, domain, pattern) {
  const f = String(first || "").toLowerCase().trim();
  const l = String(last || "").toLowerCase().trim();
  if (!f || !l) return null;
  const map = {
    "first.last": `${f}.${l}`,
    first: f,
    flast: `${f[0]}${l}`,
    first_last: `${f}_${l}`,
    "f.last": `${f[0]}.${l}`,
    firstl: `${f}${l[0]}`,
    last: l,
    "last.first": `${l}.${f}`,
  };
  const local = map[pattern];
  return local ? `${local}@${domain}` : null;
}

/**
 * Build the ordered candidate list for one person.
 *
 * @param {{firstName?: string, lastName?: string, fullName?: string, companyDomain: string}} person
 * @returns {{email: string, pattern: string}[]}
 */
export function candidatesFor(person) {
  let first = person.firstName;
  let last = person.lastName;
  // Scouts emit fullName only; split it so the pattern builder can work.
  if ((!first || !last) && person.fullName) {
    const parts = String(person.fullName).trim().split(/\s+/);
    if (parts.length >= 2) {
      first = first || parts[0];
      last = last || parts[parts.length - 1];
    }
  }
  const domain = person.companyDomain;
  if (!first || !last || !domain) return [];

  const out = [];
  for (const pattern of PATTERN_ORDER) {
    const email = buildPattern(first, last, domain, pattern);
    if (email) out.push({ email, pattern });
  }
  return out;
}

export { permuteEmail, detectPattern };
