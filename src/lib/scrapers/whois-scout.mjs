export async function lookupWhois(domain) {
  const url = `https://rdap.org/domain/${domain}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!r.ok) return null;
  const d = await r.json();
  const events = d.events || [];
  const reg = d.entities?.find(e => e.roles?.includes('registrar'));
  return {
    domain,
    registrar: reg?.vcardArray?.[1]?.find(v => v[0] === 'fn')?.[3],
    created: events.find(e => e.eventAction === 'registration')?.eventDate,
    updated: events.find(e => e.eventAction === 'last update')?.eventDate,
    expires: events.find(e => e.eventAction === 'expiration')?.eventDate,
    raw: d
  };
}

export function parseDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}
