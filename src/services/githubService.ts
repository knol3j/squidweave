/* ─── Types ─── */
export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  updated_at: string;
  default_branch: string;
  size: number;
  private: boolean;
}

export interface GitHubFile {
  name: string;
  path: string;
  type: "file" | "dir";
  size: number;
  sha: string;
  download_url: string | null;
}

export interface RepoAnalysis {
  languages: Record<string, number>;
  totalFiles: number;
  totalLines: number;
  dependencies: string[];
  fileTree: GitHubFile[];
  readme: string;
  topContributors: string[];
}

export interface ParsedFile {
  name: string;
  path: string;
  language: string;
  lines: number;
  functions: number;
  classes: number;
  imports: number;
  todos: number;
  content: string;
}

export interface CodeMetrics {
  files: number;
  lines: number;
  functions: number;
  classes: number;
  imports: number;
  complexity: number;
}

export interface TodoItem {
  file: string;
  line: number;
  text: string;
  type: "TODO" | "FIXME" | "HACK" | "XXX";
}

export interface GitHubUser {
  login: string;
  avatar_url: string;
}

/* ─── API base ─── */
const GITHUB_API = "https://api.github.com";

/* ─── PAT helpers ─── */
function getPAT(): string | null {
  try {
    return localStorage.getItem("github_pat");
  } catch {
    return null;
  }
}

function getHeaders(): Record<string, string> {
  const pat = getPAT();
  return pat
    ? {
        Authorization: `token ${pat}`,
        Accept: "application/vnd.github.v3+json",
      }
    : { Accept: "application/vnd.github.v3+json" };
}

/* ─── Service ─── */
export const githubService = {
  setPAT(pat: string) {
    localStorage.setItem("github_pat", pat);
  },

  clearPAT() {
    localStorage.removeItem("github_pat");
  },

  hasPAT() {
    return !!getPAT();
  },

  async verifyPat(): Promise<GitHubUser> {
    const res = await fetch(`${GITHUB_API}/user`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Invalid PAT");
    return res.json();
  },

  async listRepos(page = 1): Promise<GitHubRepo[]> {
    const res = await fetch(
      `${GITHUB_API}/user/repos?sort=updated&per_page=30&page=${page}`,
      { headers: getHeaders() }
    );
    if (!res.ok) throw new Error("Failed to list repos");
    const data = await res.json();
    return data.map((r: any) => ({
      id: r.id,
      name: r.name,
      full_name: r.full_name,
      description: r.description,
      language: r.language,
      stars: r.stargazers_count,
      forks: r.forks_count,
      updated_at: r.updated_at,
      default_branch: r.default_branch,
      size: r.size,
      private: r.private,
    }));
  },

  async getRepoTree(
    owner: string,
    repo: string,
    path = "",
    branch = "master"
  ): Promise<GitHubFile[]> {
    const res = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
      { headers: getHeaders() }
    );
    if (!res.ok) throw new Error("Failed to get tree");
    const data = await res.json();
    return Array.isArray(data)
      ? data.map((f: any) => ({
          name: f.name,
          path: f.path,
          type: f.type === "dir" ? "dir" : "file",
          size: f.size || 0,
          sha: f.sha,
          download_url: f.download_url,
        }))
      : [];
  },

  async getFileContent(
    owner: string,
    repo: string,
    path: string,
    branch = "master"
  ): Promise<string> {
    const res = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
      { headers: getHeaders() }
    );
    if (!res.ok) throw new Error("Failed to get file");
    const data = await res.json();
    return data.content ? atob(data.content.replace(/\n/g, "")) : "";
  },

  async getLanguages(
    owner: string,
    repo: string
  ): Promise<Record<string, number>> {
    const res = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/languages`,
      { headers: getHeaders() }
    );
    if (!res.ok) return {};
    return res.json();
  },

  async getReadme(owner: string, repo: string): Promise<string> {
    const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/readme`, {
      headers: getHeaders(),
    });
    if (!res.ok) return "";
    const data = await res.json();
    return data.content ? atob(data.content.replace(/\n/g, "")) : "";
  },

  async getContributors(owner: string, repo: string): Promise<string[]> {
    const res = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/contributors?per_page=5`,
      { headers: getHeaders() }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data)
      ? data.map((c: any) => c.login).filter(Boolean)
      : [];
  },
};
