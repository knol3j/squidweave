const GITHUB_API = 'https://api.github.com';
const HEADERS = {
  Accept: 'application/vnd.github.v3+json',
  'User-Agent': 'SquidWeave-Prospector/1.0'
};

export async function searchRepos(query, max = 50) {
  const all = [];
  for (let page = 1; page <= Math.ceil(max / 30); page++) {
    const params = new URLSearchParams();
    params.set('q', query);
    params.set('sort', 'updated');
    params.set('order', 'desc');
    params.set('per_page', '30');
    params.set('page', String(page));
    const url = `${GITHUB_API}/search/repositories?${params.toString()}`;
    const r = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(15000) });
    if (!r.ok) {
      console.warn(`GitHub API error: ${r.status} — ${await r.text().catch(()=>'')}`);
      break;
    }
    const d = await r.json();
    all.push(...(d.items || []));
    if ((d.items || []).length < 30) break;
    await sleep(1200);
  }
  return all.slice(0, max);
}

export async function getOrg(org) {
  const r = await fetch(`${GITHUB_API}/orgs/${org}`, { headers: HEADERS, signal: AbortSignal.timeout(10000) });
  if (!r.ok) return null;
  return r.json();
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

export function extractCompanyFromRepo(repo) {
  const owner = repo.owner;
  if (!owner || owner.type !== 'Organization') return null;
  const org = owner.login;
  const homepage = repo.homepage || '';
  if (!homepage && repo.stargazers_count < 5) return null;
  return {
    name: org,
    org,
    repo: repo.name,
    url: repo.html_url,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    language: repo.language,
    description: repo.description,
    updated: repo.updated_at,
    created: repo.created_at,
    topics: repo.topics || [],
    homepage
  };
}
