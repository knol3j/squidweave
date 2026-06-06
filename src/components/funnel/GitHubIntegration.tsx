import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Github,
  Book,
  Star,
  GitFork,
  FolderOpen,
  FileCode,
  ChevronRight,
  ChevronLeft,
  Folder,
  FileText,
  BarChart3,
  Code,
  LogOut,
  Lock,
  Globe,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { githubService } from "@/services/githubService";
import type { GitHubRepo, GitHubFile, GitHubUser } from "@/services/githubService";

/* ─── Language colours ─── */
const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  Go: "#00ADD8",
  Rust: "#dea584",
  Java: "#b07219",
  "C++": "#f34b7d",
  C: "#555555",
  "C#": "#178600",
  Ruby: "#701516",
  PHP: "#4F5D95",
  Swift: "#ffac45",
  Kotlin: "#A97BFF",
  Shell: "#89e051",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Vue: "#41b883",
  Dart: "#00B4AB",
  Elixir: "#6e4a7e",
  Haskell: "#5e5086",
  Scala: "#c22d40",
  R: "#198CE7",
  Julia: "#a270ba",
  null: "#8b949e",
};

function getLangColor(lang: string | null): string {
  return LANG_COLORS[lang || "null"] || "#8b949e";
}

/* ─── Simple syntax highlighter ─── */
const KEYWORDS = [
  "const", "let", "var", "function", "return", "if", "else", "for",
  "while", "import", "export", "from", "class", "extends", "new",
  "try", "catch", "throw", "async", "await", "yield", "default",
  "switch", "case", "break", "continue", "typeof", "instanceof",
  "interface", "type", "enum", "namespace", "module", "declare",
  "public", "private", "protected", "readonly", "static", "void",
  "number", "string", "boolean", "any", "unknown", "never",
  "def", "class", "if", "else", "elif", "for", "while", "return",
  "import", "from", "as", "try", "except", "with", "lambda",
  "True", "False", "None", "and", "or", "not", "in", "is",
  "package", "func", "struct", "interface", "map", "range",
  "go", "chan", "select", "defer", "panic", "recover",
  "impl", "fn", "let", "mut", "use", "mod", "pub", "match",
  "where", "trait", "dyn", "Option", "Result", "Some", "None",
  "Ok", "Err",
];

const KEYWORD_SET = new Set(KEYWORDS);

function highlightCode(code: string, langHint: string): string {
  const lines = code.split("\n");
  return lines
    .map((line) => {
      let highlighted = "";
      let i = 0;
      while (i < line.length) {
        /* single-line comment */
        if (
          (line[i] === "/" && line[i + 1] === "/") ||
          (line[i] === "#" && langHint === "py") ||
          line.startsWith("--", i)
        ) {
          highlighted += `<span class="text-slate-500">${escapeHtml(line.slice(i))}</span>`;
          break;
        }
        /* multi-line comment start */
        if (line[i] === "/" && line[i + 1] === "*") {
          const end = line.indexOf("*/", i + 2);
          if (end !== -1) {
            highlighted += `<span class="text-slate-500">${escapeHtml(line.slice(i, end + 2))}</span>`;
            i = end + 2;
            continue;
          }
        }
        /* string literal */
        if (line[i] === '"' || line[i] === "'" || line[i] === "`") {
          const quote = line[i];
          let j = i + 1;
          while (j < line.length && line[j] !== quote) {
            if (line[j] === "\\") j += 2;
            else j++;
          }
          if (j < line.length) j++;
          highlighted += `<span class="text-emerald-400">${escapeHtml(line.slice(i, j))}</span>`;
          i = j;
          continue;
        }
        /* number */
        if (/\d/.test(line[i])) {
          let j = i;
          while (j < line.length && (/\d/.test(line[j]) || line[j] === ".")) j++;
          highlighted += `<span class="text-amber-400">${escapeHtml(line.slice(i, j))}</span>`;
          i = j;
          continue;
        }
        /* identifier / keyword */
        if (/[a-zA-Z_$]/.test(line[i])) {
          let j = i;
          while (j < line.length && /[a-zA-Z0-9_$]/.test(line[j])) j++;
          const word = line.slice(i, j);
          if (KEYWORD_SET.has(word)) {
            highlighted += `<span class="text-indigo-400">${word}</span>`;
          } else {
            highlighted += escapeHtml(word);
          }
          i = j;
          continue;
        }
        /* punctuation */
        if (/[{}()\[\];,.<>+=\-*/!&|?:@]/.test(line[i])) {
          highlighted += `<span class="text-slate-400">${escapeHtml(line[i])}</span>`;
          i++;
          continue;
        }
        /* whitespace / other */
        highlighted += escapeHtml(line[i]);
        i++;
      }
      return highlighted;
    })
    .join("\n");
}

function escapeHtml(text: string): string {
  const div = typeof document !== "undefined" ? document.createElement("div") : null;
  if (div) {
    div.textContent = text;
    return div.innerHTML;
  }
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ─── File icon by extension ─── */
function getFileIcon(name: string) {
  if (name.endsWith(".ts") || name.endsWith(".tsx"))
    return <FileCode className="w-3.5 h-3.5 text-sky-400 shrink-0" />;
  if (name.endsWith(".js") || name.endsWith(".jsx"))
    return <FileCode className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
  if (name.endsWith(".css") || name.endsWith(".scss"))
    return <FileCode className="w-3.5 h-3.5 text-pink-400 shrink-0" />;
  if (name.endsWith(".json"))
    return <FileCode className="w-3.5 h-3.5 text-yellow-400 shrink-0" />;
  if (name.endsWith(".md") || name.endsWith(".mdx"))
    return <FileText className="w-3.5 h-3.5 text-slate-300 shrink-0" />;
  if (name.endsWith(".py"))
    return <FileCode className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
  if (name.endsWith(".go"))
    return <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />;
  if (name.endsWith(".rs"))
    return <FileCode className="w-3.5 h-3.5 text-orange-400 shrink-0" />;
  return <FileCode className="w-3.5 h-3.5 text-slate-500 shrink-0" />;
}

/* ─── Language hint from filename ─── */
function langFromFilename(name: string): string {
  if (name.endsWith(".ts") || name.endsWith(".tsx")) return "ts";
  if (name.endsWith(".js") || name.endsWith(".jsx")) return "js";
  if (name.endsWith(".py")) return "py";
  if (name.endsWith(".go")) return "go";
  if (name.endsWith(".rs")) return "rs";
  if (name.endsWith(".java")) return "java";
  if (name.endsWith(".cpp") || name.endsWith(".cc")) return "cpp";
  return "";
}

/* ─── Analysis: parse package.json / requirements.txt for deps ─── */
function extractDeps(files: GitHubFile[]): string[] {
  const deps: string[] = [];
  files.forEach((f) => {
    if (f.name === "package.json") deps.push("npm");
    if (f.name === "requirements.txt" || f.name === "pyproject.toml")
      deps.push("pip");
    if (f.name === "Cargo.toml") deps.push("cargo");
    if (f.name === "go.mod") deps.push("go modules");
    if (f.name === "Gemfile") deps.push("bundler");
    if (f.name === "composer.json") deps.push("composer");
    if (f.name === "pom.xml" || f.name === "build.gradle")
      deps.push("maven/gradle");
    if (f.name === "Dockerfile") deps.push("docker");
  });
  return [...new Set(deps)];
}

/* ─── Language bar component ─── */
function LanguageBar({
  languages,
}: {
  languages: Record<string, number>;
}) {
  const total = useMemo(
    () => Object.values(languages).reduce((s, v) => s + v, 0),
    [languages]
  );
  const entries = useMemo(
    () =>
      Object.entries(languages)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8),
    [languages]
  );
  if (total === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex h-2 rounded-full overflow-hidden bg-white/[0.04]">
        {entries.map(([lang, bytes]) => (
          <div
            key={lang}
            style={{
              width: `${(bytes / total) * 100}%`,
              backgroundColor: getLangColor(lang),
            }}
            title={`${lang}: ${((bytes / total) * 100).toFixed(1)}%`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        {entries.map(([lang, bytes]) => (
          <div key={lang} className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: getLangColor(lang) }}
            />
            <span className="text-[10px] text-slate-400">{lang}</span>
            <span className="text-[10px] text-slate-600">
              {((bytes / total) * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main Component ─── */
export default function GitHubIntegration() {
  const [pat, setPat] = useState("");
  const [authed, setAuthed] = useState(false);
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [files, setFiles] = useState<GitHubFile[]>([]);
  const [currentPath, setCurrentPath] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<GitHubFile | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"repos" | "code" | "analysis">("repos");
  const [languages, setLanguages] = useState<Record<string, number>>({});
  const [readme, setReadme] = useState("");
  const [repoPage, setRepoPage] = useState(1);
  const [hasMoreRepos, setHasMoreRepos] = useState(false);

  /* Check existing auth on mount */
  useEffect(() => {
    if (githubService.hasPAT()) verifyAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verifyAuth = useCallback(async () => {
    setLoading(true);
    try {
      const u = await githubService.verifyPat();
      setUser(u);
      setAuthed(true);
      const r = await githubService.listRepos(1);
      setRepos(r);
      setHasMoreRepos(r.length === 30);
      setRepoPage(1);
    } catch {
      setAuthed(false);
      setUser(null);
    }
    setLoading(false);
  }, []);

  const login = useCallback(async () => {
    if (!pat.trim()) return;
    githubService.setPAT(pat.trim());
    await verifyAuth();
  }, [pat, verifyAuth]);

  const logout = useCallback(() => {
    githubService.clearPAT();
    setAuthed(false);
    setUser(null);
    setRepos([]);
    setSelectedRepo(null);
    setFiles([]);
    setCurrentPath("");
    setFileContent("");
    setSelectedFile(null);
    setTab("repos");
    setLanguages({});
    setReadme("");
    setPat("");
  }, []);

  const loadMoreRepos = useCallback(async () => {
    const nextPage = repoPage + 1;
    setLoading(true);
    try {
      const r = await githubService.listRepos(nextPage);
      setRepos((prev) => [...prev, ...r]);
      setHasMoreRepos(r.length === 30);
      setRepoPage(nextPage);
    } catch {
      /* silently fail */
    }
    setLoading(false);
  }, [repoPage]);

  const openRepo = useCallback(async (repo: GitHubRepo) => {
    setSelectedRepo(repo);
    setCurrentPath("");
    setFileContent("");
    setSelectedFile(null);
    setTab("code");
    setLoading(true);
    const [owner, name] = repo.full_name.split("/");
    try {
      const [tree, langs, readmeContent] = await Promise.all([
        githubService.getRepoTree(owner, name, "", repo.default_branch),
        githubService.getLanguages(owner, name),
        githubService.getReadme(owner, name),
      ]);
      setFiles(tree);
      setLanguages(langs);
      setReadme(readmeContent);
    } catch {
      setFiles([]);
    }
    setLoading(false);
  }, []);

  const navigate = useCallback(
    async (file: GitHubFile) => {
      if (!selectedRepo) return;
      const [owner, name] = selectedRepo.full_name.split("/");
      if (file.type === "dir") {
        setCurrentPath(file.path);
        setLoading(true);
        try {
          const tree = await githubService.getRepoTree(
            owner,
            name,
            file.path,
            selectedRepo.default_branch
          );
          setFiles(tree);
        } catch {
          setFiles([]);
        }
        setLoading(false);
      } else {
        setSelectedFile(file);
        setLoading(true);
        try {
          const content = await githubService.getFileContent(
            owner,
            name,
            file.path,
            selectedRepo.default_branch
          );
          setFileContent(content);
        } catch {
          setFileContent("// Failed to load file");
        }
        setLoading(false);
      }
    },
    [selectedRepo]
  );

  const navigateUp = useCallback(async () => {
    if (!selectedRepo) return;
    const parentPath = currentPath.includes("/")
      ? currentPath.split("/").slice(0, -1).join("/")
      : "";
    setCurrentPath(parentPath);
    setLoading(true);
    const [owner, name] = selectedRepo.full_name.split("/");
    try {
      const tree = await githubService.getRepoTree(
        owner,
        name,
        parentPath,
        selectedRepo.default_branch
      );
      setFiles(tree);
    } catch {
      setFiles([]);
    }
    setLoading(false);
  }, [selectedRepo, currentPath]);

  /* ─── Sort files: dirs first ─── */
  const sortedFiles = useMemo(() => {
    return [...files].sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === "dir" ? -1 : 1;
    });
  }, [files]);

  /* ─── Analysis data ─── */
  const totalBytes = useMemo(
    () => Object.values(languages).reduce((s, v) => s + v, 0),
    [languages]
  );

  const depManagers = useMemo(() => extractDeps(files), [files]);

  const highlighted = useMemo(() => {
    if (!fileContent || !selectedFile) return "";
    return highlightCode(fileContent, langFromFilename(selectedFile.name));
  }, [fileContent, selectedFile]);

  /* ═══════════ RENDER ═══════════ */

  /* ─── Auth Screen ─── */
  if (!authed) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02]">
            <Github className="w-7 h-7 text-slate-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-200 mb-1">
              Connect to GitHub
            </div>
            <div className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              Enter a Personal Access Token with{" "}
              <code className="text-amber-400 font-mono text-[10px]">repo</code>{" "}
              scope to browse your codebases.
            </div>
            <a
              href="https://github.com/settings/tokens/new"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 mt-2 transition-colors"
            >
              Generate a token <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="flex gap-2 max-w-sm mx-auto">
            <input
              type="password"
              value={pat}
              onChange={(e) => setPat(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && login()}
              placeholder="ghp_xxxxxxxx"
              className="flex-1 text-xs px-3 py-2.5 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-600"
            />
            <button
              onClick={login}
              disabled={loading || !pat.trim()}
              className="text-xs px-4 py-2.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-medium disabled:opacity-40 disabled:hover:bg-indigo-500 transition-colors shrink-0"
            >
              {loading ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" /> Connecting
                </span>
              ) : (
                "Connect"
              )}
            </button>
          </div>
          <div className="text-[10px] text-slate-600">
            Your token is stored only in your browser&apos;s localStorage.
          </div>
        </div>
      </div>
    );
  }

  /* ─── Authenticated view ─── */
  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          {user?.avatar_url && (
            <img
              src={user.avatar_url}
              alt={user.login}
              className="w-7 h-7 rounded-full border border-white/[0.1]"
            />
          )}
          <div>
            <div className="text-xs font-medium text-slate-200">
              {user?.login}
            </div>
            <div className="text-[10px] text-slate-500">
              {repos.length} repositories
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedRepo && (
            <div className="flex items-center gap-1.5 mr-2">
              <Book className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[11px] text-slate-300 font-medium">
                {selectedRepo.name}
              </span>
              {selectedRepo.private ? (
                <Lock className="w-3 h-3 text-amber-400" />
              ) : (
                <Globe className="w-3 h-3 text-emerald-400" />
              )}
            </div>
          )}
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-red-400 px-2 py-1.5 rounded-md hover:bg-white/[0.04] transition-colors"
          >
            <LogOut className="w-3 h-3" /> Disconnect
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="shrink-0 flex gap-1 px-4 py-2 border-b border-white/[0.06]">
        <button
          onClick={() => setTab("repos")}
          className={`flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg transition-colors ${
            tab === "repos"
              ? "bg-indigo-500/10 text-indigo-400 font-medium"
              : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]"
          }`}
        >
          <Book className="w-3.5 h-3.5" /> Repositories
        </button>
        {selectedRepo && (
          <>
            <button
              onClick={() => setTab("code")}
              className={`flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg transition-colors ${
                tab === "code"
                  ? "bg-indigo-500/10 text-indigo-400 font-medium"
                  : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]"
              }`}
            >
              <Code className="w-3.5 h-3.5" /> Code
            </button>
            <button
              onClick={() => setTab("analysis")}
              className={`flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg transition-colors ${
                tab === "analysis"
                  ? "bg-indigo-500/10 text-indigo-400 font-medium"
                  : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" /> Analysis
            </button>
          </>
        )}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto min-h-0">
        {tab === "repos" && (
          <div className="p-4 space-y-3">
            {/* Search / filter placeholder */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {repos.map((repo) => (
                <div
                  key={repo.id}
                  className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] cursor-pointer transition-all group"
                  onClick={() => openRepo(repo)}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Book className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                    <span className="text-xs font-medium text-slate-200 truncate">
                      {repo.name}
                    </span>
                    {repo.private && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-medium shrink-0">
                        Private
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 mb-2 line-clamp-1">
                    {repo.description || "No description"}
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      {repo.stars}
                    </span>
                    <span className="flex items-center gap-1">
                      <GitFork className="w-3 h-3" />
                      {repo.forks}
                    </span>
                    {repo.language && (
                      <span className="flex items-center gap-1">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{
                            backgroundColor: getLangColor(repo.language),
                          }}
                        />
                        {repo.language}
                      </span>
                    )}
                    <span className="text-slate-600 ml-auto">
                      {new Date(repo.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {hasMoreRepos && (
              <div className="flex justify-center py-2">
                <button
                  onClick={loadMoreRepos}
                  disabled={loading}
                  className="text-[11px] text-slate-500 hover:text-slate-300 px-4 py-2 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors disabled:opacity-40"
                >
                  {loading ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3 h-3 animate-spin" /> Loading
                    </span>
                  ) : (
                    "Load more"
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {tab === "code" && selectedRepo && (
          <div className="flex h-full min-h-0">
            {/* File tree */}
            <div className="w-56 shrink-0 border-r border-white/[0.06] flex flex-col min-h-0">
              {/* Breadcrumb */}
              <div className="shrink-0 flex items-center gap-1 px-3 py-2 border-b border-white/[0.06] text-[10px] text-slate-500">
                <button
                  onClick={() => {
                    setCurrentPath("");
                    openRepo(selectedRepo);
                  }}
                  className="hover:text-indigo-400 transition-colors"
                >
                  {selectedRepo.name}
                </button>
                {currentPath && (
                  <>
                    <ChevronRight className="w-3 h-3" />
                    <span className="text-slate-400 truncate max-w-[80px]">
                      {currentPath.split("/").pop()}
                    </span>
                  </>
                )}
              </div>
              {/* File list */}
              <div className="flex-1 overflow-auto p-1">
                {currentPath && (
                  <button
                    onClick={navigateUp}
                    className="w-full flex items-center gap-2 px-2 py-1 rounded-lg text-[11px] text-slate-400 hover:bg-white/[0.04] hover:text-slate-200 transition-colors"
                  >
                    <ChevronLeft className="w-3 h-3" /> ..
                  </button>
                )}
                {sortedFiles.map((file) => (
                  <button
                    key={file.sha}
                    onClick={() => navigate(file)}
                    className={`w-full flex items-center gap-2 px-2 py-1 rounded-lg text-[11px] transition-colors ${
                      selectedFile?.path === file.path
                        ? "bg-indigo-500/10 text-indigo-400"
                        : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                    }`}
                  >
                    {file.type === "dir" ? (
                      <FolderOpen className="w-3.5 h-3.5 text-amber-400/70 shrink-0" />
                    ) : (
                      getFileIcon(file.name)
                    )}
                    <span className="truncate text-left">{file.name}</span>
                    {file.type === "file" && file.size > 0 && (
                      <span className="text-[9px] text-slate-600 ml-auto shrink-0">
                        {(file.size / 1024).toFixed(1)}k
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Code viewer */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {selectedFile ? (
                <>
                  {/* File header */}
                  <div className="shrink-0 flex items-center gap-2 px-4 py-2 border-b border-white/[0.06]">
                    <FileCode className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-[11px] text-slate-300 font-medium">
                      {selectedFile.name}
                    </span>
                    <span className="text-[10px] text-slate-600 ml-auto">
                      {fileContent.split("\n").length} lines
                    </span>
                  </div>
                  {/* Code content */}
                  <div className="flex-1 overflow-auto">
                    {loading ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-5 h-5 text-slate-600 animate-spin" />
                      </div>
                    ) : (
                      <pre className="text-[11px] leading-5 p-4">
                        <code>
                          {highlighted
                            .split("\n")
                            .map((line, i) => (
                              <div key={i} className="flex">
                                <span className="w-8 shrink-0 text-right text-slate-700 select-none mr-4">
                                  {i + 1}
                                </span>
                                <span
                                  dangerouslySetInnerHTML={{ __html: line }}
                                />
                              </div>
                            ))}
                        </code>
                      </pre>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
                  <Folder className="w-10 h-10 mb-3 text-slate-700" />
                  <span className="text-xs">
                    Select a file to view its contents
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "analysis" && selectedRepo && (
          <div className="p-4 space-y-4">
            {/* Language breakdown */}
            <div className="p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
                  Language Breakdown
                </span>
              </div>
              {totalBytes > 0 ? (
                <LanguageBar languages={languages} />
              ) : (
                <div className="text-[11px] text-slate-600 py-2">
                  No language data available.
                </div>
              )}
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] flex flex-col gap-1">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                  Total Files
                </span>
                <span className="text-lg font-bold text-slate-100">
                  {files.filter((f) => f.type === "file").length}
                </span>
              </div>
              <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] flex flex-col gap-1">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                  Size
                </span>
                <span className="text-lg font-bold text-slate-100">
                  {selectedRepo.size > 1024
                    ? `${(selectedRepo.size / 1024).toFixed(1)} MB`
                    : `${selectedRepo.size} KB`}
                </span>
              </div>
              <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] flex flex-col gap-1">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                  Stars
                </span>
                <span className="text-lg font-bold text-slate-100">
                  {selectedRepo.stars}
                </span>
              </div>
              <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] flex flex-col gap-1">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                  Forks
                </span>
                <span className="text-lg font-bold text-slate-100">
                  {selectedRepo.forks}
                </span>
              </div>
            </div>

            {/* Dependencies detected */}
            {depManagers.length > 0 && (
              <div className="p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                <div className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400 mb-3">
                  Package Managers Detected
                </div>
                <div className="flex flex-wrap gap-2">
                  {depManagers.map((dep) => (
                    <span
                      key={dep}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 font-medium"
                    >
                      {dep}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* README preview */}
            {readme && (
              <div className="p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                <div className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400 mb-3">
                  README
                </div>
                <pre className="text-[11px] text-slate-400 whitespace-pre-wrap leading-relaxed max-h-80 overflow-auto">
                  {readme}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
