import React, { useState, useEffect, useCallback } from "react";
import {
  Github, Search, Folder, FileCode, Star, GitFork, Eye, ExternalLink,
  Code2, Braces, FileText, Lock, Unlock, ChevronRight, ChevronDown,
  RefreshCw, AlertTriangle, Check, X, KeyRound, BookOpen, Terminal,
  Clock, GitBranch, GitCommit, GitPullRequest, Bug, Layers, Sparkles,
  Zap, Shield, Copy, CheckCheck
} from "lucide-react";
import { useApp } from "../../context/AppContext";

/* ================================================================== */
/*  TYPES                                                              */
/* ================================================================== */

interface GitHubConfig {
  pat: string;
  owner: string;
  repo: string;
  isAuthenticated: boolean;
}

interface RepoInfo {
  name: string;
  description: string;
  stars: number;
  forks: number;
  watchers: number;
  language: string;
  isPrivate: boolean;
  defaultBranch: string;
  topics: string[];
  updatedAt: string;
  openIssues: number;
  size: number;
  license: string;
}

interface FileNode {
  name: string;
  path: string;
  type: "file" | "dir";
  size?: number;
  children?: FileNode[];
  expanded?: boolean;
  content?: string;
  sha?: string;
}

interface Commit {
  sha: string;
  message: string;
  author: string;
  date: string;
  additions: number;
  deletions: number;
  url: string;
}

interface PullRequest {
  number: number;
  title: string;
  author: string;
  state: "open" | "closed" | "merged";
  createdAt: string;
  updatedAt: string;
  url: string;
}

interface Issue {
  number: number;
  title: string;
  state: "open" | "closed";
  author: string;
  labels: string[];
  createdAt: string;
  url: string;
}

/* ================================================================== */
/*  LOCALSTORAGE                                                       */
/* ================================================================== */

const STORAGE_KEY = "squidweave_github_config";

function loadConfig(): GitHubConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) { const c = JSON.parse(raw); return { ...c, isAuthenticated: !!c.pat }; }
  } catch { /* ignore */ }
  return { pat: "", owner: "", repo: "", isAuthenticated: false };
}
function saveConfig(c: GitHubConfig) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ pat: c.pat, owner: c.owner, repo: c.repo, isAuthenticated: c.isAuthenticated })); } catch { /* ignore */ }
}

/* ================================================================== */
/*  GITHUB API HELPERS                                                  */
/* ================================================================== */

async function githubFetch(path: string, pat: string) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: { Authorization: `token ${pat}`, Accept: "application/vnd.github.v3+json", "User-Agent": "squidweave-app" },
  });
  if (!res.ok) { const err = await res.text(); throw new Error(err); }
  return res.json();
}

async function fetchRepoInfo(config: GitHubConfig): Promise<RepoInfo> {
  const data = await githubFetch(`/repos/${config.owner}/${config.repo}`, config.pat);
  return {
    name: data.name,
    description: data.description || "",
    stars: data.stargazers_count,
    forks: data.forks_count,
    watchers: data.watchers_count,
    language: data.language || "Unknown",
    isPrivate: data.private,
    defaultBranch: data.default_branch,
    topics: data.topics || [],
    updatedAt: data.updated_at,
    openIssues: data.open_issues_count,
    size: data.size,
    license: data.license?.name || "No license",
  };
}

async function fetchFileTree(config: GitHubConfig, path = ""): Promise<FileNode[]> {
  const items = await githubFetch(`/repos/${config.owner}/${config.repo}/contents/${path}`, config.pat);
  const result: FileNode[] = [];
  for (const item of items) {
    const node: FileNode = { name: item.name, path: item.path, type: item.type === "dir" ? "dir" : "file", size: item.size, sha: item.sha, expanded: false };
    if (item.type === "dir") { try { node.children = await fetchFileTree(config, item.path); } catch { node.children = []; } }
    else if (item.type === "file" && item.size < 500000) { /* lazy load content */ }
    result.push(node);
  }
  return result;
}

async function fetchFileContent(config: GitHubConfig, path: string): Promise<string> {
  const data = await githubFetch(`/repos/${config.owner}/${config.repo}/contents/${path}`, config.pat);
  if (data.content) return atob(data.content.replace(/\n/g, ""));
  return "/* Binary or large file */";
}

async function fetchCommits(config: GitHubConfig, page = 1): Promise<Commit[]> {
  const items = await githubFetch(`/repos/${config.owner}/${config.repo}/commits?per_page=20&page=${page}`, config.pat);
  return items.map((c: Record<string, unknown>) => ({
    sha: c.sha as string,
    message: (c.commit as Record<string, unknown>)?.message as string || "",
    author: ((c.commit as Record<string, unknown>)?.author as Record<string, unknown>)?.name as string || "Unknown",
    date: ((c.commit as Record<string, unknown>)?.author as Record<string, unknown>)?.date as string || "",
    additions: 0, deletions: 0,
    url: c.html_url as string,
  }));
}

async function fetchPullRequests(config: GitHubConfig): Promise<PullRequest[]> {
  const items = await githubFetch(`/repos/${config.owner}/${config.repo}/pulls?state=all&per_page=20`, config.pat);
  return items.map((pr: Record<string, unknown>) => ({
    number: pr.number as number,
    title: pr.title as string,
    author: (pr.user as Record<string, unknown>)?.login as string || "",
    state: pr.state as string === "closed" && pr.merged_at ? "merged" : pr.state as "open" | "closed" | "merged",
    createdAt: pr.created_at as string,
    updatedAt: pr.updated_at as string,
    url: pr.html_url as string,
  }));
}

async function fetchIssues(config: GitHubConfig): Promise<Issue[]> {
  const items = await githubFetch(`/repos/${config.owner}/${config.repo}/issues?state=all&per_page=20`, config.pat);
  return items.map((issue: Record<string, unknown>) => ({
    number: issue.number as number,
    title: issue.title as string,
    state: issue.state as "open" | "closed",
    author: (issue.user as Record<string, unknown>)?.login as string || "",
    labels: (issue.labels as Array<Record<string, unknown>>)?.map((l) => l.name as string) || [],
    createdAt: issue.created_at as string,
    url: issue.html_url as string,
  }));
}

/* ================================================================== */
/*  MINI COMPONENTS                                                    */
/* ================================================================== */

function FileIcon({ name, type }: { name: string; type: string }) {
  if (type === "dir") return <Folder className="w-4 h-4 text-amber-400 flex-shrink-0" />;
  if (name.endsWith(".tsx") || name.endsWith(".ts")) return <FileCode className="w-4 h-4 text-blue-400 flex-shrink-0" />;
  if (name.endsWith(".js") || name.endsWith(".jsx")) return <Braces className="w-4 h-4 text-yellow-400 flex-shrink-0" />;
  if (name.endsWith(".css") || name.endsWith(".scss")) return <Sparkles className="w-4 h-4 text-pink-400 flex-shrink-0" />;
  if (name.endsWith(".md")) return <BookOpen className="w-4 h-4 text-slate-400 flex-shrink-0" />;
  if (name.endsWith(".json")) return <Terminal className="w-4 h-4 text-emerald-400 flex-shrink-0" />;
  return <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" />;
}

function FileTree({ nodes, level = 0, onToggle, onOpen, config }: { nodes: FileNode[]; level?: number; onToggle: (path: string) => void; onOpen: (node: FileNode) => void; config: GitHubConfig }) {
  return (
    <div className="space-y-0.5">
      {nodes.map((node) => (
        <div key={node.path}>
          <div className={`flex items-center gap-1.5 py-1 px-2 rounded cursor-pointer hover:bg-white/[0.03] transition-colors ${level > 0 ? "ml-4" : ""}`} onClick={() => node.type === "dir" ? onToggle(node.path) : onOpen(node)}>
            {node.type === "dir" && (node.expanded ? <ChevronDown className="w-3 h-3 text-slate-600" /> : <ChevronRight className="w-3 h-3 text-slate-600" />)}
            <FileIcon name={node.name} type={node.type} />
            <span className="text-[11px] text-slate-400 truncate">{node.name}</span>
            {node.size !== undefined && node.type === "file" && <span className="text-[9px] text-slate-600 ml-auto">{(node.size / 1024).toFixed(1)} KB</span>}
          </div>
          {node.type === "dir" && node.expanded && node.children && <FileTree nodes={node.children} level={level + 1} onToggle={onToggle} onOpen={onOpen} config={config} />}
        </div>
      ))}
    </div>
  );
}

function CodeViewer({ content, filename }: { content: string; filename: string }) {
  const [copied, setCopied] = useState(false);
  const lines = content.split("\n");
  const lang = filename.endsWith(".tsx") || filename.endsWith(".ts") ? "typescript" : filename.endsWith(".js") || filename.endsWith(".jsx") ? "javascript" : filename.endsWith(".css") ? "css" : filename.endsWith(".json") ? "json" : filename.endsWith(".md") ? "markdown" : "";

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  };

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0a0e1a] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center gap-2"><Code2 className="w-3.5 h-3.5 text-indigo-400" /><span className="text-[11px] text-slate-300">{filename}</span><span className="text-[9px] text-slate-600">{lines.length} lines</span></div>
        <button onClick={handleCopy} className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1">{copied ? <><CheckCheck className="w-3 h-3 text-emerald-400" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}</button>
      </div>
      <div className="overflow-x-auto max-h-[60vh]">
        <table className="w-full"><tbody>
          {lines.map((line, i) => (
            <tr key={i} className="hover:bg-white/[0.02]"><td className="text-[10px] text-slate-700 text-right pr-3 py-0.5 pl-3 select-none w-10 flex-shrink-0 border-r border-white/[0.04]">{i + 1}</td><td className="text-[11px] text-slate-300 pl-3 py-0.5 whitespace-pre font-mono">{line}</td></tr>
          ))}
        </tbody></table>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  AUTHENTICATION PANEL                                               */
/* ================================================================== */

function AuthPanel({ config, onUpdate }: { config: GitHubConfig; onUpdate: (c: GitHubConfig) => void }) {
  const [pat, setPat] = useState(config.pat);
  const [owner, setOwner] = useState(config.owner);
  const [repo, setRepo] = useState(config.repo);
  const [error, setError] = useState("");
  const [testing, setTesting] = useState(false);

  const handleAuth = async () => {
    if (!pat.trim()) { setError("Personal Access Token is required"); return; }
    setTesting(true); setError("");
    try {
      await githubFetch("/user", pat);
      const newConfig = { pat, owner, repo, isAuthenticated: true };
      onUpdate(newConfig);
      saveConfig(newConfig);
    } catch { setError("Invalid token or network error. Check your PAT has 'repo' scope."); }
    finally { setTesting(false); }
  };

  const handleDisconnect = () => {
    const newConfig = { pat: "", owner: "", repo: "", isAuthenticated: false };
    onUpdate(newConfig);
    saveConfig(newConfig);
    setPat(""); setOwner(""); setRepo("");
  };

  return (
    <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-3">
      <div className="flex items-center gap-2"><KeyRound className="w-4 h-4 text-indigo-400" /><span className="text-xs font-bold uppercase tracking-wider text-slate-400">GitHub Authentication</span></div>
      {config.isAuthenticated ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[11px] text-emerald-400"><Check className="w-3 h-3" /> Authenticated</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded bg-white/[0.02] border border-white/[0.04]"><div className="text-[9px] text-slate-600">Owner</div><div className="text-[11px] text-slate-300">{config.owner}</div></div>
            <div className="p-2 rounded bg-white/[0.02] border border-white/[0.04]"><div className="text-[9px] text-slate-600">Repo</div><div className="text-[11px] text-slate-300">{config.repo}</div></div>
          </div>
          <button onClick={handleDisconnect} className="text-[10px] px-3 py-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors">Disconnect</button>
        </div>
      ) : (
        <div className="space-y-2">
          <div>
            <label className="text-[10px] text-slate-500 font-medium">Personal Access Token</label>
            <input type="password" value={pat} onChange={(e) => setPat(e.target.value)} placeholder="ghp_xxxxxxxxxxxx" className="w-full text-xs px-3 py-2 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-indigo-500 mt-1" />
            <p className="text-[10px] text-slate-600 mt-1">Create a PAT at GitHub → Settings → Developer settings → Personal access tokens</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-[10px] text-slate-500 font-medium">Owner</label><input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="e.g. facebook" className="w-full text-xs px-3 py-2 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-indigo-500 mt-1" /></div>
            <div><label className="text-[10px] text-slate-500 font-medium">Repository</label><input value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="e.g. react" className="w-full text-xs px-3 py-2 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-indigo-500 mt-1" /></div>
          </div>
          {error && <div className="text-[11px] text-red-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{error}</div>}
          <button onClick={() => void handleAuth()} disabled={testing} className="text-xs px-4 py-2 rounded-lg bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition-colors flex items-center gap-1.5 disabled:opacity-50"><Shield className="w-3 h-3" />{testing ? "Verifying..." : "Connect"}</button>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  MAIN COMPONENT                                                     */
/* ================================================================== */

type SubTab = "repo" | "code" | "commits" | "prs" | "issues";

export default function GitHubIntegration() {
  const { state } = useApp();
  const [config, setConfig] = useState<GitHubConfig>(loadConfig);
  const [activeTab, setActiveTab] = useState<SubTab>("repo");
  const [repoInfo, setRepoInfo] = useState<RepoInfo | null>(null);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [commits, setCommits] = useState<Commit[]>([]);
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* Load repo data when authenticated */
  useEffect(() => {
    if (config.isAuthenticated && config.owner && config.repo) {
      void loadRepoData();
    }
  }, [config.isAuthenticated, config.owner, config.repo]);

  const loadRepoData = async () => {
    setLoading(true); setError("");
    try {
      const [info, tree, cmts, prs, iss] = await Promise.all([
        fetchRepoInfo(config),
        fetchFileTree(config),
        fetchCommits(config),
        fetchPullRequests(config),
        fetchIssues(config),
      ]);
      setRepoInfo(info);
      setFileTree(tree);
      setCommits(cmts);
      setPullRequests(prs);
      setIssues(iss);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load repository data");
    } finally {
      setLoading(false);
    }
  };

  const toggleDir = (path: string) => {
    const updateTree = (nodes: FileNode[]): FileNode[] =>
      nodes.map((n) => {
        if (n.path === path) return { ...n, expanded: !n.expanded };
        if (n.children) return { ...n, children: updateTree(n.children) };
        return n;
      });
    setFileTree(updateTree(fileTree));
  };

  const openFile = async (node: FileNode) => {
    if (!node.type || node.type === "dir") return;
    setSelectedFile(node);
    try { const content = await fetchFileContent(config, node.path); setFileContent(content); }
    catch { setFileContent("/* Failed to load file content */"); }
  };

  if (!config.isAuthenticated) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center"><Github className="w-4 h-4 text-indigo-400" /></div><div><h2 className="text-sm font-bold text-slate-100">GitHub Integration</h2><p className="text-[11px] text-slate-500">Connect your GitHub repository for code insights</p></div></div>
        <AuthPanel config={config} onUpdate={setConfig} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center"><Github className="w-4 h-4 text-indigo-400" /></div>
          <div><h2 className="text-sm font-bold text-slate-100">{config.owner}/{config.repo}</h2><p className="text-[11px] text-slate-500">{repoInfo?.description || "GitHub repository browser"}</p></div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => void loadRepoData()} disabled={loading} className="text-[10px] px-2 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-slate-400 hover:text-slate-300 transition-colors flex items-center gap-1 disabled:opacity-50"><RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />{loading ? "Loading..." : "Refresh"}</button>
          <AuthPanel config={config} onUpdate={setConfig} />
        </div>
      </div>

      {error && <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/[0.03] text-[11px] text-red-400 flex items-center gap-2"><AlertTriangle className="w-4 h-4 flex-shrink-0" />{error}</div>}

      {/* Repo Stats */}
      {repoInfo && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]"><div className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-amber-400" /><span className="text-[10px] text-slate-500">Stars</span></div><div className="text-lg font-bold text-slate-200 mt-1">{repoInfo.stars.toLocaleString()}</div></div>
          <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]"><div className="flex items-center gap-1.5"><GitFork className="w-3.5 h-3.5 text-indigo-400" /><span className="text-[10px] text-slate-500">Forks</span></div><div className="text-lg font-bold text-slate-200 mt-1">{repoInfo.forks.toLocaleString()}</div></div>
          <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]"><div className="flex items-center gap-1.5"><Bug className="w-3.5 h-3.5 text-red-400" /><span className="text-[10px] text-slate-500">Issues</span></div><div className="text-lg font-bold text-slate-200 mt-1">{repoInfo.openIssues.toLocaleString()}</div></div>
          <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]"><div className="flex items-center gap-1.5"><Code2 className="w-3.5 h-3.5 text-emerald-400" /><span className="text-[10px] text-slate-500">Language</span></div><div className="text-lg font-bold text-slate-200 mt-1">{repoInfo.language}</div></div>
        </div>
      )}

      {/* Sub Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {(["repo", "code", "commits", "prs", "issues"] as SubTab[]).map((tab) => {
          const labels: Record<SubTab, string> = { repo: "Repository", code: "Code Browser", commits: "Commits", prs: "Pull Requests", issues: "Issues" };
          const icons: Record<SubTab, React.ElementType> = { repo: BookOpen, code: Code2, commits: GitCommit, prs: GitPullRequest, issues: Bug };
          const Icon = icons[tab];
          return <button key={tab} onClick={() => setActiveTab(tab)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all whitespace-nowrap ${activeTab === tab ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/25" : "bg-transparent text-slate-500 border-white/[0.06] hover:text-slate-400"}`}><Icon className="w-3 h-3" />{labels[tab]}</button>;
        })}
      </div>

      {/* Repo Tab */}
      {activeTab === "repo" && repoInfo && (
        <div className="space-y-3">
          <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
            <div className="flex items-center gap-2 mb-3"><BookOpen className="w-4 h-4 text-indigo-400" /><span className="text-xs font-bold uppercase tracking-wider text-slate-400">Repository Details</span></div>
            <div className="grid grid-cols-2 gap-3 text-[11px]">
              <div className="p-2 rounded bg-white/[0.02]"><div className="text-slate-600">Default Branch</div><div className="text-slate-300">{repoInfo.defaultBranch}</div></div>
              <div className="p-2 rounded bg-white/[0.02]"><div className="text-slate-600">License</div><div className="text-slate-300">{repoInfo.license}</div></div>
              <div className="p-2 rounded bg-white/[0.02]"><div className="text-slate-600">Size</div><div className="text-slate-300">{(repoInfo.size / 1024).toFixed(1)} MB</div></div>
              <div className="p-2 rounded bg-white/[0.02]"><div className="text-slate-600">Visibility</div><div className="text-slate-300 flex items-center gap-1">{repoInfo.isPrivate ? <><Lock className="w-3 h-3" /> Private</> : <><Unlock className="w-3 h-3" /> Public</>}</div></div>
            </div>
            {repoInfo.topics.length > 0 && <div className="mt-3 flex flex-wrap gap-1">{repoInfo.topics.map((t) => <span key={t} className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">{t}</span>)}</div>}
            <div className="mt-3 text-[10px] text-slate-600">Last updated: {new Date(repoInfo.updatedAt).toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* Code Tab */}
      {activeTab === "code" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-1 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] max-h-[60vh] overflow-y-auto custom-scrollbar">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2"><Folder className="w-3 h-3" /> File Tree</div>
            <FileTree nodes={fileTree} onToggle={toggleDir} onOpen={openFile} config={config} />
          </div>
          <div className="lg:col-span-2">
            {selectedFile ? <CodeViewer content={fileContent} filename={selectedFile.name} /> : <div className="p-8 rounded-xl border border-white/[0.06] bg-white/[0.02] text-center"><Code2 className="w-8 h-8 text-slate-700 mx-auto mb-3" /><p className="text-xs text-slate-500">Select a file from the tree to view its contents</p></div>}
          </div>
        </div>
      )}

      {/* Commits Tab */}
      {activeTab === "commits" && (
        <div className="space-y-2">
          {commits.length === 0 ? <div className="p-8 text-center"><GitCommit className="w-8 h-8 text-slate-700 mx-auto mb-3" /><p className="text-xs text-slate-500">No commits found</p></div> : commits.map((c) => (
            <div key={c.sha} className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <div className="flex items-start gap-3">
                <GitCommit className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-slate-200 font-medium">{c.message}</div>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{c.author}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(c.date).toLocaleDateString()}</span>
                    <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300"><ExternalLink className="w-3 h-3" /></a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PRs Tab */}
      {activeTab === "prs" && (
        <div className="space-y-2">
          {pullRequests.length === 0 ? <div className="p-8 text-center"><GitPullRequest className="w-8 h-8 text-slate-700 mx-auto mb-3" /><p className="text-xs text-slate-500">No pull requests found</p></div> : pullRequests.map((pr) => (
            <div key={pr.number} className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <div className="flex items-start gap-3">
                <GitPullRequest className={`w-4 h-4 flex-shrink-0 mt-0.5 ${pr.state === "open" ? "text-emerald-400" : pr.state === "merged" ? "text-purple-400" : "text-red-400"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2"><span className="text-xs text-slate-200 font-medium">#{pr.number} {pr.title}</span><span className={`px-1.5 py-0.5 rounded text-[9px] border ${pr.state === "open" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : pr.state === "merged" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>{pr.state}</span></div>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500">
                    <span><Users className="w-3 h-3 inline mr-1" />{pr.author}</span>
                    <span><Clock className="w-3 h-3 inline mr-1" />{new Date(pr.createdAt).toLocaleDateString()}</span>
                    <a href={pr.url} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300"><ExternalLink className="w-3 h-3" /></a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Issues Tab */}
      {activeTab === "issues" && (
        <div className="space-y-2">
          {issues.length === 0 ? <div className="p-8 text-center"><Bug className="w-8 h-8 text-slate-700 mx-auto mb-3" /><p className="text-xs text-slate-500">No issues found</p></div> : issues.map((issue) => (
            <div key={issue.number} className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <div className="flex items-start gap-3">
                <Bug className={`w-4 h-4 flex-shrink-0 mt-0.5 ${issue.state === "open" ? "text-emerald-400" : "text-red-400"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2"><span className="text-xs text-slate-200 font-medium">#{issue.number} {issue.title}</span><span className={`px-1.5 py-0.5 rounded text-[9px] border ${issue.state === "open" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>{issue.state}</span></div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {issue.labels.map((l) => <span key={l} className="px-1.5 py-0.5 rounded text-[9px] bg-white/[0.04] text-slate-500 border border-white/[0.06]">{l}</span>)}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500">
                    <span><Users className="w-3 h-3 inline mr-1" />{issue.author}</span>
                    <span><Clock className="w-3 h-3 inline mr-1" />{new Date(issue.createdAt).toLocaleDateString()}</span>
                    <a href={issue.url} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300"><ExternalLink className="w-3 h-3" /></a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
