/**
 * CodeParser — Drag-and-drop code analysis dashboard
 * Analyzes uploaded / local code files and extracts insights.
 */
import { useState, useCallback, useRef } from "react";
import {
  Upload,
  FileCode,
  AlertTriangle,
  CheckCircle,
  Trash2,
  Code,
  BarChart3,
  List,
  Search,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { ParsedFile, CodeMetrics, TodoItem } from "@/services/githubService";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const EXT_TO_LANG: Record<string, string> = {
  ts: "TypeScript",
  tsx: "TypeScript",
  js: "JavaScript",
  jsx: "JavaScript",
  py: "Python",
  go: "Go",
  rs: "Rust",
  java: "Java",
  rb: "Ruby",
  php: "PHP",
  html: "HTML",
  css: "CSS",
  scss: "SCSS",
  json: "JSON",
  md: "Markdown",
  yaml: "YAML",
  yml: "YAML",
  sh: "Shell",
  sql: "SQL",
  c: "C",
  cpp: "C++",
  h: "C",
  cs: "C#",
  swift: "Swift",
  kt: "Kotlin",
};

const CHART_COLORS = [
  "#6366f1",
  "#06b6d4",
  "#f59e0b",
  "#10b981",
  "#f43f5e",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#64748b",
];

const LS_KEY = "squidweave_codeparser_files";
const LS_METRICS = "squidweave_codeparser_metrics";
const LS_TODOS = "squidweave_codeparser_todos";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function detectLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TO_LANG[ext] ?? "Unknown";
}

function computeComplexity(content: string): number {
  return (content.match(/\b(if|for|while|switch)\b/g) ?? []).length;
}

function getComplexityLabel(score: number): string {
  if (score > 20) return "High";
  if (score > 10) return "Medium";
  return "Low";
}

function getComplexityColor(score: number): string {
  if (score > 20) return "text-rose-400";
  if (score > 10) return "text-amber-400";
  return "text-emerald-400";
}

function extractTodos(file: ParsedFile): TodoItem[] {
  const items: TodoItem[] = [];
  const lines = file.content.split("\n");
  const todoRegex = /(TODO|FIXME|HACK|XXX)/g;
  lines.forEach((line: string, idx: number) => {
    let m: RegExpExecArray | null;
    while ((m = todoRegex.exec(line)) !== null) {
      items.push({
        file: file.name,
        line: idx + 1,
        text: line.trim().slice(0, 120),
        type: m[1] as TodoItem["type"],
      });
    }
  });
  return items;
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* ignore quota errors */
  }
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function MetricCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  accent: string;
}) {
  return (
    <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center"
        style={{ background: `${accent}15` }}
      >
        <Icon className="w-5 h-5" style={{ color: accent }} />
      </div>
      <div>
        <div className="text-lg font-bold text-slate-100">{value}</div>
        <div className="text-[10px] text-slate-500 uppercase tracking-wider">
          {label}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function CodeParser() {
  const [parsedFiles, setParsedFiles] = useState<ParsedFile[]>(() =>
    loadFromStorage<ParsedFile[]>(LS_KEY, [])
  );
  const [isDragging, setIsDragging] = useState(false);
  const [totalMetrics, setTotalMetrics] = useState<CodeMetrics>(() =>
    loadFromStorage<CodeMetrics>(LS_METRICS, {
      files: 0,
      lines: 0,
      functions: 0,
      classes: 0,
      imports: 0,
      complexity: 0,
    })
  );
  const [todos, setTodos] = useState<TodoItem[]>(() =>
    loadFromStorage<TodoItem[]>(LS_TODOS, [])
  );
  const [activeTab, setActiveTab] = useState<"files" | "chart" | "todos">("files");
  const [searchFilter, setSearchFilter] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ---- file parsing ---- */
  const parseFile = async (file: globalThis.File): Promise<ParsedFile> => {
    const content = await file.text();
    const funcMatches =
      content.match(/\b(function|=>)\b/g) ?? [];
    const classMatches = content.match(/\bclass\b/g) ?? [];
    const importMatches = content.match(/\b(import|require)\b/g) ?? [];
    const todoMatches = content.match(/TODO|FIXME|HACK|XXX/g) ?? [];

    return {
      name: file.name,
      path: file.webkitRelativePath || file.name,
      language: detectLanguage(file.name),
      lines: content.split("\n").length,
      functions: funcMatches.length,
      classes: classMatches.length,
      imports: importMatches.length,
      todos: todoMatches.length,
      content: content,
    };
  };

  const processFiles = useCallback(
    async (fileList: globalThis.File[]) => {
      const codeFiles = fileList.filter(
        (f: globalThis.File) => !f.name.startsWith(".") && f.size < 5_000_000
      );
      const parsed = await Promise.all(codeFiles.map((f: globalThis.File) => parseFile(f)));

      setParsedFiles((prev: ParsedFile[]) => {
        const merged = [...prev];
        parsed.forEach((p: ParsedFile) => {
          const idx = merged.findIndex((m: ParsedFile) => m.path === p.path);
          if (idx >= 0) merged[idx] = p;
          else merged.push(p);
        });
        saveToStorage(LS_KEY, merged);
        return merged;
      });

      /* compute aggregate metrics */
      setTotalMetrics((prev: CodeMetrics) => {
        const next: CodeMetrics = {
          files: parsed.length + prev.files,
          lines: parsed.reduce((a: number, f: ParsedFile) => a + f.lines, 0) + prev.lines,
          functions: parsed.reduce((a: number, f: ParsedFile) => a + f.functions, 0) + prev.functions,
          classes: parsed.reduce((a: number, f: ParsedFile) => a + f.classes, 0) + prev.classes,
          imports: parsed.reduce((a: number, f: ParsedFile) => a + f.imports, 0) + prev.imports,
          complexity:
            parsed.reduce((a: number, f: ParsedFile) => a + computeComplexity(f.content), 0) +
            prev.complexity,
        };
        saveToStorage(LS_METRICS, next);
        return next;
      });

      /* extract todos */
      const newTodos = parsed.flatMap((f: ParsedFile) => extractTodos(f));
      setTodos((prev: TodoItem[]) => {
        const merged = [...prev, ...newTodos];
        saveToStorage(LS_TODOS, merged);
        return merged;
      });
    },
    []
  );

  /* ---- directory traversal ---- */
  const traverseDirectory = async (
    entry: FileSystemEntry
  ): Promise<globalThis.File[]> => {
    const files: globalThis.File[] = [];
    if (entry.isFile) {
      const file = await new Promise<globalThis.File>((resolve) => {
        (entry as FileSystemFileEntry).file(resolve);
      });
      files.push(file);
    } else if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      const entries = await new Promise<FileSystemEntry[]>((resolve) => {
        reader.readEntries(resolve);
      });
      for (const child of entries) {
        const childFiles = await traverseDirectory(child);
        files.push(...childFiles);
      }
    }
    return files;
  };

  /* ---- drag handlers ---- */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const items = e.dataTransfer.items;
      const allFiles: globalThis.File[] = [];

      for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry();
        if (entry) {
          const files = await traverseDirectory(entry);
          allFiles.push(...files);
        }
      }

      await processFiles(allFiles);
    },
    [processFiles]
  );

  /* ---- file input handler ---- */
  const handleFileInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length > 0) await processFiles(files);
      e.target.value = "";
    },
    [processFiles]
  );

  /* ---- clear all ---- */
  const handleClear = useCallback(() => {
    setParsedFiles([]);
    setTotalMetrics({ files: 0, lines: 0, functions: 0, classes: 0, imports: 0, complexity: 0 });
    setTodos([]);
    localStorage.removeItem(LS_KEY);
    localStorage.removeItem(LS_METRICS);
    localStorage.removeItem(LS_TODOS);
  }, []);

  /* ---- computed ---- */
  const avgComplexity =
    totalMetrics.files > 0
      ? Math.round(totalMetrics.complexity / totalMetrics.files)
      : 0;

  const filteredFiles = parsedFiles.filter((f: ParsedFile) =>
    f.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const langDistribution = useMemoLangDist(parsedFiles);

  /* ---- render ---- */
  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 p-4">
      {/* ---- Header ---- */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Code className="w-5 h-5 text-indigo-400" />
          <div>
            <div className="text-sm font-semibold text-slate-100">
              Code Parser
            </div>
            <div className="text-[10px] text-slate-500">
              Drag & drop files or folders to analyze
            </div>
          </div>
        </div>
        {parsedFiles.length > 0 && (
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-rose-400 transition-colors px-2 py-1 rounded border border-white/[0.06] hover:border-rose-400/30"
          >
            <Trash2 className="w-3 h-3" />
            Clear All
          </button>
        )}
      </div>

      {/* ---- Drop Zone ---- */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative p-8 rounded-xl border-2 border-dashed cursor-pointer
          flex flex-col items-center justify-center gap-3
          transition-all duration-200
          ${
            isDragging
              ? "border-indigo-400/50 bg-indigo-400/5"
              : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.04]"
          }
        `}
      >
        <Upload
          className={`w-8 h-8 transition-colors ${
            isDragging ? "text-indigo-400" : "text-slate-600"
          }`}
        />
        <div className="text-center">
          <div className="text-sm text-slate-300 font-medium">
            {isDragging ? "Drop files here" : "Drop code files or folder here"}
          </div>
          <div className="text-[10px] text-slate-600 mt-1">
            Supports: .ts .tsx .js .jsx .py .go .rs .java and more
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          /* @ts-expect-error webkitdirectory is non-standard */
          webkitdirectory=""
          directory=""
          className="hidden"
          onChange={handleFileInput}
        />
      </div>

      {/* ---- Summary Metrics ---- */}
      {parsedFiles.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard
            label="Total Files"
            value={totalMetrics.files}
            icon={FileCode}
            accent="#6366f1"
          />
          <MetricCard
            label="Total Lines"
            value={totalMetrics.lines.toLocaleString()}
            icon={BarChart3}
            accent="#06b6d4"
          />
          <MetricCard
            label="Avg Complexity"
            value={avgComplexity}
            icon={AlertTriangle}
            accent="#f59e0b"
          />
          <MetricCard
            label="Total TODOs"
            value={todos.length}
            icon={CheckCircle}
            accent="#10b981"
          />
        </div>
      )}

      {/* ---- Tabs ---- */}
      {parsedFiles.length > 0 && (
        <div className="flex gap-1 p-1 rounded-lg border border-white/[0.06] bg-white/[0.02] w-fit">
          {[
            { key: "files" as const, label: "Files", icon: List },
            { key: "chart" as const, label: "Languages", icon: BarChart3 },
            { key: "todos" as const, label: "TODOs", icon: AlertTriangle },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all
                ${
                  activeTab === tab.key
                    ? "bg-indigo-500/20 text-indigo-300"
                    : "text-slate-500 hover:text-slate-300"
                }
              `}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* ---- Tab: Files Table ---- */}
      {activeTab === "files" && parsedFiles.length > 0 && (
        <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <div className="flex items-center gap-2 mb-3">
            <Search className="w-3.5 h-3.5 text-slate-600" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter files..."
              className="flex-1 bg-transparent text-xs text-slate-200 placeholder:text-slate-700 outline-none"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-slate-500 border-b border-white/[0.06]">
                  <th className="text-left py-2 px-2 font-medium">Name</th>
                  <th className="text-left py-2 px-2 font-medium">Language</th>
                  <th className="text-right py-2 px-2 font-medium">Lines</th>
                  <th className="text-right py-2 px-2 font-medium">Fns</th>
                  <th className="text-right py-2 px-2 font-medium">Classes</th>
                  <th className="text-right py-2 px-2 font-medium">Complexity</th>
                  <th className="text-right py-2 px-2 font-medium">TODOs</th>
                </tr>
              </thead>
              <tbody>
                {filteredFiles.map((f: ParsedFile) => {
                  const comp = computeComplexity(f.content);
                  return (
                    <tr
                      key={f.path}
                      className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-2 px-2 text-slate-300 font-mono truncate max-w-[200px]">
                        {f.name}
                      </td>
                      <td className="py-2 px-2">
                        <span className="px-1.5 py-0.5 rounded text-[9px] border border-white/[0.08] bg-white/[0.04] text-slate-400">
                          {f.language}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right text-slate-400">
                        {f.lines.toLocaleString()}
                      </td>
                      <td className="py-2 px-2 text-right text-slate-400">
                        {f.functions}
                      </td>
                      <td className="py-2 px-2 text-right text-slate-400">
                        {f.classes}
                      </td>
                      <td
                        className={`py-2 px-2 text-right font-medium ${getComplexityColor(comp)}`}
                      >
                        {getComplexityLabel(comp)} ({comp})
                      </td>
                      <td className="py-2 px-2 text-right">
                        {f.todos > 0 ? (
                          <span className="text-amber-400">{f.todos}</span>
                        ) : (
                          <span className="text-slate-600">0</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredFiles.length === 0 && (
            <div className="text-center py-6 text-slate-600 text-xs">
              No files match your filter
            </div>
          )}
        </div>
      )}

      {/* ---- Tab: Language Distribution ---- */}
      {activeTab === "chart" && parsedFiles.length > 0 && (
        <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Language Distribution
          </div>
          {langDistribution.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={langDistribution}>
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#64748b", fontSize: 10 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#64748b", fontSize: 10 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0f172a",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "8px",
                      fontSize: "11px",
                      color: "#cbd5e1",
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {langDistribution.map((_entry: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-6 text-slate-600 text-xs">
              No language data available
            </div>
          )}
        </div>
      )}

      {/* ---- Tab: TODO Finder ---- */}
      {activeTab === "todos" && (
        <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            TODO / FIXME Finder
          </div>
          {todos.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
              {todos.map((todo: TodoItem, idx: number) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-2.5 rounded-lg border border-white/[0.04] bg-white/[0.02]"
                >
                  <span
                    className={`
                    mt-0.5 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase
                    ${
                      todo.type === "TODO"
                        ? "bg-amber-500/15 text-amber-400"
                        : todo.type === "FIXME"
                          ? "bg-rose-500/15 text-rose-400"
                          : todo.type === "HACK"
                            ? "bg-orange-500/15 text-orange-400"
                            : "bg-slate-500/15 text-slate-400"
                    }
                  `}
                  >
                    {todo.type}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-slate-500 mb-0.5">
                      {todo.file}:{todo.line}
                    </div>
                    <div className="text-[11px] text-slate-300 font-mono truncate">
                      {todo.text}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-600 text-xs">
              No TODOs, FIXMEs, HACKs, or XXXs found
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Custom hook for language distribution (avoids warnings)            */
/* ------------------------------------------------------------------ */

function useMemoLangDist(
  files: ParsedFile[]
): { name: string; count: number }[] {
  const map = new Map<string, number>();
  files.forEach((f: ParsedFile) => {
    map.set(f.language, (map.get(f.language) ?? 0) + 1);
  });
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}
