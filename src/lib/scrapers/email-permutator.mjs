import dns from 'node:dns/promises';

const PATTERNS = ['first', 'last', 'first.last', 'flast', 'firstl', 'first_last', 'f.last', 'last.first'];

export function permuteEmail(first, last, domain) {
  const emails = [];
  const f = first?.toLowerCase().trim() || '';
  const l = last?.toLowerCase().trim() || '';
  for (const pattern of PATTERNS) {
    emails.push(
      pattern.replace('first', f).replace('last', l).replace('flast', f[0] + l).replace('firstl', f + l[0]) + `@${domain}`
    );
  }
  return [...new Set(emails)];
}

export async function validateDomain(domain) {
  try {
    const mx = await dns.resolveMx(domain);
    return mx.length > 0;
  } catch { return false; }
}

export function extractFromPage(html, domain) {
  const re = new RegExp(`[a-z0-9._%+\\-]+@${domain.replace(/\./g, '\\.')}`, 'gi');
  return [...new Set(html.match(re) || [])];
}
