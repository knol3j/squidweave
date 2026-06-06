/**
 * CodeOverview — Complete codebase overview dashboard
 * Shows architecture, language breakdown, file tree, dependencies, README, and metrics.
 */
import { useMemo } from "react";
import {
  Layers,
  FileCode,
  Languages,
  Package,
  AlignLeft,
  FolderOpen,
  ChevronRight,
  FileText,
} from "lucide-react";
import type { GitHubFile } from "@/services/githubService";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CodeOverviewProps {
  repoName: string;
  languages: Record<string, number>;
  files: GitHubFile[];
  readme: string;
  fileContent?: string;
}

interface StatBoxProps {
  label: string;
  value: string | number;
  icon?: React.ComponentType<{ className?: string }>;
}

interface FileTreeNode {
  name: string;
  path: string;
  type: "file" | "dir";
  children: FileTreeNode[];
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const languageColors: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f7df1e",
  Python: "#3572A5",
  Java: "#b07219",
  Go: "#00ADD8",
  Rust: "#dea584",
  "C++": "#f34b7d",
  Ruby: "#701516",
  PHP: "#4F5D95",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Shell: "#89e051",
};

const INDENT_PX = 12;

/* ------------------------------------------------------------------ */
/*  Helper functions                                                   */
/* ------------------------------------------------------------------ */

function parseDependencies(files: GitHubFile[]): string[] {
  const deps = new Set<string>();
  files.forEach((f) => {
    if (f.name === "package.json") deps.add("npm packages");
    if (f.name === "requirements.txt") deps.add("pip packages");
    if (f.name === "Cargo.toml") deps.add("cargo crates");
    if (f.name === "go.mod") deps.add("go modules");
    if (f.name === "pom.xml") deps.add("maven packages");
    if (f.name === "build.gradle") deps.add("gradle packages");
  });
  return Array.from(deps);
}

function countFunctions(content: string): number {
  const matches = content.match(
    /\b(function|const|let|var)\s+\w+\s*[=:]\s*(async\s*)?\(/g
  );
  return matches?.length ?? 0;
}

function countImports(content: string): number {
  const matches = content.match(/\b(import|require)\b/g);
  return matches?.length ?? 0;
}

function estimateComplexity(content: string): string {
  const nesting = (content.match(/\b(if|for|while|switch)\b/g) ?? []).length;
  if (nesting > 20) return "High";
  if (nesting > 10) return "Medium";
  return "Low";
}

function buildFileTree(files: GitHubFile[]): FileTreeNode[] {
  const root: FileTreeNode[] = [];
  const map = new Map<string, FileTreeNode>();

  files.forEach((file) => {
    const parts = file.path.split("/");
    let current = root;
    let accumulatedPath = "";

    parts.forEach((part, idx) => {
      accumulatedPath = accumulatedPath ? `${accumulatedPath}/${part}` : part;
      const isLast = idx === parts.length - 1;
      const existing = current.find((n) => n.name === part);

      if (existing) {
        if (isLast) return;
        current = existing.children;
      } else {
        const node: FileTreeNode = {
          name: part,
          path: accumulatedPath,
          type: isLast && file.type === "file" ? "file" : "dir",
          children: [],
        };
        map.set(accumulatedPath, node);
        current.push(node);
        if (!isLast) {
          current = node.children;
        }
      }
    });
  });

  return root;
}

function sortTree(nodes: FileTreeNode[]): FileTreeNode[] {
  return nodes
    .sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === "dir" ? -1 : 1;
    })
    .map((n) => ({ ...n, children: sortTree(n.children) }));
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function StatBox({ label, value, icon: Icon }: StatBoxProps) {
  return (
    <div className="p-3 rounded-lg border border-white/[0.06] bg-white/[0.03]">
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon className="w-3.5 h-3.5 text-slate-500" />}
        <span className="text-[10px] text-slate-500 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="text-lg font-bold text-slate-100">{value}</div>
    </div>
  );
}

function FileTreeNodeView({
  node,
  depth,
}: {
  node: FileTreeNode;
  depth: number;
}) {
  const isDir = node.type === "dir";
  return (
    <div>
      <div
        className="flex items-center gap-1.5 py-0.5 hover:bg-white/[0.03] rounded px-1 transition-colors"
        style={{ paddingLeft: `${depth * INDENT_PX + 4}px` }}
      >
        {isDir ? (
          <>
            <ChevronRight className="w-3 h-3 text-slate-600" />
            <FolderOpen className="w-3.5 h-3.5 text-indigo-400/70" />
          </>
        ) : (
          <>
            <span className="w-3" />
            <FileText className="w-3.5 h-3.5 text-slate-500" />
          </>
        )}
        <span
          className={
            isDir
              ? "text-slate-300 font-medium"
              : "text-slate-400"
          }
        >
          {node.name}
        </span>
      </div>
      {isDir &&
        node.children.map((child) => (
          <FileTreeNodeView key={child.path} node={child} depth={depth + 1} />
        ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function CodeOverview({
  repoName,
  languages,
  files,
  readme,
  fileContent,
}: CodeOverviewProps) {
  /* ---- computed values ---- */
  const totalFiles = files.filter((f) => f.type === "file").length;
  const totalBytes = useMemo(
    () => Object.values(languages).reduce((a, b) => a + b, 0),
    [languages]
  );
  const languageCount = Object.keys(languages).length;
  const dependencies = useMemo(() => parseDependencies(files), [files]);
  const totalLines = useMemo(
    () => files.reduce((acc, f) => acc + (f.size ?? 0), 0),
    [files]
  );

  const fileTree = useMemo(() => {
    const tree = buildFileTree(files);
    return sortTree(tree);
  }, [files]);

  /* ---- stats for file content ---- */
  const fileLines = fileContent ? fileContent.split("\n").length : 0;
  const fileFunctions = fileContent ? countFunctions(fileContent) : 0;
  const fileImports = fileContent ? countImports(fileContent) : 0;
  const fileComplexity = fileContent ? estimateComplexity(fileContent) : "Low";

  /* ---- render ---- */
  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 p-4">
      {/* ---- 1. Architecture Header ---- */}
      <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center gap-3 mb-3">
          <Layers className="w-5 h-5 text-indigo-400" />
          <div>
            <div className="text-sm font-semibold text-slate-100">{repoName}</div>
            <div className="text-[10px] text-slate-500">Codebase Overview</div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatBox label="Total Files" value={totalFiles} icon={FileCode} />
          <StatBox label="Languages" value={languageCount} icon={Languages} />
          <StatBox label="Dependencies" value={dependencies.length} icon={Package} />
          <StatBox label="Code Lines" value={totalLines.toLocaleString()} icon={AlignLeft} />
        </div>
      </div>

      {/* ---- 2. Language Breakdown ---- */}
      <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          Language Breakdown
        </div>
        <div className="space-y-2">
          {Object.entries(languages)
            .sort((a, b) => b[1] - a[1])
            .map(([lang, bytes]) => {
              const pct =
                totalBytes > 0 ? Math.round((bytes / totalBytes) * 100) : 0;
              return (
                <div key={lang} className="flex items-center gap-3">
                  <span className="w-16 text-[10px] text-slate-400 text-right">
                    {lang}
                  </span>
                  <div className="flex-1 h-4 rounded bg-white/[0.04] overflow-hidden">
                    <div
                      className="h-full rounded flex items-center px-2 text-[9px] text-slate-200"
                      style={{
                        width: `${Math.max(pct, 1)}%`,
                        background: languageColors[lang] ?? "#6366f1",
                      }}
                    >
                      {pct}%
                    </div>
                  </div>
                  <span className="w-14 text-[10px] text-slate-500">
                    {(bytes / 1024).toFixed(0)}KB
                  </span>
                </div>
              );
            })}
        </div>
      </div>

      {/* ---- 3. File Structure (tree view) ---- */}
      <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          Directory Structure
        </div>
        <div className="font-mono text-xs max-h-80 overflow-y-auto custom-scrollbar">
          {fileTree.map((node) => (
            <FileTreeNodeView key={node.path} node={node} depth={0} />
          ))}
          {fileTree.length === 0 && (
            <div className="text-slate-600 text-xs py-2">No files found</div>
          )}
        </div>
      </div>

      {/* ---- 4. Detected Dependencies ---- */}
      <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          Dependencies
        </div>
        {dependencies.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {dependencies.map((dep) => (
              <span
                key={dep}
                className="text-[10px] px-2 py-1 rounded-lg border border-white/[0.08] bg-white/[0.04] text-slate-300"
              >
                {dep}
              </span>
            ))}
          </div>
        ) : (
          <div className="text-[10px] text-slate-600">
            No dependency files detected (package.json, requirements.txt, etc.)
          </div>
        )}
      </div>

      {/* ---- 5. README Preview ---- */}
      <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          README
        </div>
        {readme ? (
          <div className="text-xs text-slate-300 whitespace-pre-wrap max-h-60 overflow-y-auto custom-scrollbar leading-relaxed">
            {readme.slice(0, 2000)}
            {readme.length > 2000 && (
              <span className="text-slate-500"> ... (truncated)</span>
            )}
          </div>
        ) : (
          <div className="text-[10px] text-slate-600">
            No README found in repository
          </div>
        )}
      </div>

      {/* ---- 6. Code Quality Metrics (if fileContent provided) ---- */}
      {fileContent && (
        <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            File Metrics
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <StatBox label="Lines" value={fileLines} />
            <StatBox label="Functions" value={fileFunctions} />
            <StatBox label="Imports" value={fileImports} />
            <StatBox label="Complexity" value={fileComplexity} />
          </div>
        </div>
      )}
    </div>
  );
}
