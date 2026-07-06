const STORAGE_KEY = "sw_github_token";

export interface GitHubRepo {
  name: string;
  description: string;
  stars: number;
  language: string;
  updatedAt: string;
  url: string;
}

export interface GitHubCommit {
  sha: string;
  message: string;
  author: string;
  date: string;
  additions: number;
  deletions: number;
}

export interface GitHubFile {
  path: string;
  content: string;
  size: number;
  type: "file" | "directory";
}

function getToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveToken(token: string) {
  try {
    localStorage.setItem(STORAGE_KEY, token);
  } catch { /* silent */ }
}

function apiCall(endpoint: string) {
  const token = getToken();
  if (!token) return Promise.reject(new Error("No GitHub token"));

  return fetch(`https://api.github.com${endpoint}`, {
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github.v3+json",
    },
  }).then(async (res) => {
    if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
    return res.json();
  });
}

export async function searchRepos(query: string): Promise<GitHubRepo[]> {
  const data = await apiCall(`/search/repositories?q=${encodeURIComponent(query)}&sort=stars&per_page=10`);
  return (data.items || []).map((r: any) => ({
    name: r.full_name,
    description: r.description || "",
    stars: r.stargazers_count,
    language: r.language || "Unknown",
    updatedAt: r.updated_at,
    url: r.html_url,
  }));
}

export async function getRepoCommits(owner: string, repo: string): Promise<GitHubCommit[]> {
  const data = await apiCall(`/repos/${owner}/${repo}/commits?per_page=20`);
  return (data || []).map((c: any) => ({
    sha: c.sha?.slice(0, 7) || "",
    message: c.commit?.message || "",
    author: c.commit?.author?.name || "",
    date: c.commit?.author?.date || "",
    additions: 0,
    deletions: 0,
  }));
}

export async function getRepoFiles(owner: string, repo: string, path = ""): Promise<GitHubFile[]> {
  const data = await apiCall(`/repos/${owner}/${repo}/contents/${path}`);
  return (Array.isArray(data) ? data : []).map((f: any) => ({
    path: f.path,
    content: f.type === "file" ? "" : "",
    size: f.size || 0,
    type: f.type === "dir" ? "directory" : "file",
  }));
}

export async function getFileContent(owner: string, repo: string, path: string): Promise<string> {
  const data = await apiCall(`/repos/${owner}/${repo}/contents/${path}`);
  if (data.content) {
    return atob(data.content.replace(/\n/g, ""));
  }
  return "";
}

export function isGitHubConfigured(): boolean {
  return !!getToken();
}

export function clearToken() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch { /* silent */ }
}
