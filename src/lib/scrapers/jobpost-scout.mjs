const BOARDS = {
  lever: 'https://jobs.lever.co/',
  greenhouse: 'https://boards.greenhouse.io/',
  workable: 'https://apply.workable.com/',
  ashby: 'https://jobs.ashbyhq.com/'
};

export async function findJobs(company) {
  const found = [];
  const slug = company.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const [name, base] of Object.entries(BOARDS)) {
    try {
      const r = await fetch(`${base}${slug}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(5000)
      });
      if (r.ok) {
        const t = await r.text();
        const roles = [...t.matchAll(/>([^<]*(?:engineer|developer|manager|director|lead|head|vp)[^<]*)</gi)]
          .map(m => m[1]?.trim()).filter(Boolean);
        if (roles.length > 0) {
          found.push({
            board: name, url: r.url, roles: roles.slice(0, 10),
            hiringCount: roles.length,
            hasEngineering: roles.some(r => /engineer|developer|architect/i.test(r)),
            hasSales: roles.some(r => /sales|sdr|ae|account/i.test(r)),
            hasMarketing: roles.some(r => /marketing|growth|demand/i.test(r))
          });
        }
      }
    } catch (e) { /* ignore */ }
    await new Promise(r => setTimeout(r, 500));
  }
  return found;
}
