import { useState } from 'react';
import { api } from '../lib/api';
import { useStore } from '../store/useStore';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { Search, Upload, Plus, ExternalLink, Loader2, AlertCircle, Check } from 'lucide-react';

const mockProspects = [
  { id: 'p1', name: 'CryptoVentures Inc', domain: 'cryptoventures.io', score: 18, emails: ['founder@cryptoventures.io'], hiring: true, source: 'GitHub' },
  { id: 'p2', name: 'AI Dynamics', domain: 'aidynamics.tech', score: 15, emails: ['hello@aidynamics.tech'], hiring: false, source: 'LinkedIn' },
  { id: 'p3', name: 'BlockForge Labs', domain: 'blockforge.dev', score: 12, emails: ['team@blockforge.dev'], hiring: true, source: 'GitHub' },
  { id: 'p4', name: 'DataStream AI', domain: 'datastream.ai', score: 9, emails: ['info@datastream.ai'], hiring: false, source: 'Crunchbase' },
  { id: 'p5', name: 'Quantum Ledger', domain: 'quantumledger.org', score: 20, emails: ['ceo@quantumledger.org'], hiring: true, source: 'GitHub' },
];

export default function Prospecting() {
  const { addContact } = useStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(mockProspects);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success?: boolean; message?: string } | null>(null);
  const [fileData, setFileData] = useState<any[] | null>(null);

  const runQuery = () => {
    setResults(mockProspects.filter(p => p.name.toLowerCase().includes(query.toLowerCase()) || p.domain.includes(query)));
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    try {
      const data = JSON.parse(text);
      const items = Array.isArray(data) ? data : data.results || data.companies || [];
      setFileData(items);
      setResults(items.map((r: any, i: number) => ({
        id: `file_${i}`,
        name: r.companyName || r.name || r.domain || `Prospect ${i + 1}`,
        domain: r.domain || '',
        score: r.fundamentalScore || r.score || 0,
        emails: r.founderEmails || r.emails || [r.email || ''],
        hiring: r.isHiring || r.hiring || false,
        source: r.source || 'import',
      })));
      setImportResult({ success: true, message: `Loaded ${items.length} prospects from file` });
    } catch {
      setImportResult({ success: false, message: 'Invalid JSON file' });
    }
  };

  const handleImportToCRM = async () => {
    if (results.length === 0) return;
    setImporting(true);
    setImportResult(null);
    try {
      // Try API import first
      const rawData = fileData || results;
      const apiResult = await api.importProspects(rawData);
      setImportResult({ success: true, message: `Imported ${apiResult.imported} prospects to CRM via API` });

      // Also add to local store
      rawData.forEach((r: any) => {
        addContact({
          name: r.companyName || r.name || r.domain || 'Unknown',
          email: r.founderEmails?.[0] || r.emails?.[0] || r.email || '',
          phone: r.phone || '',
          tags: (r.isHiring || r.hiring) ? ['hiring', 'prospect'] : ['prospect'],
          stage: 'Lead',
          dealValue: (r.fundamentalScore || r.score || 0) * 100,
          lastActivity: new Date().toISOString(),
        });
      });
    } catch (err: any) {
      // Fallback: add to local store only
      results.forEach(r => {
        addContact({
          name: r.name || r.domain || 'Unknown',
          email: r.emails[0] || '',
          phone: '',
          tags: r.hiring ? ['hiring', 'prospect'] : ['prospect'],
          stage: 'Lead',
          dealValue: r.score * 100,
          lastActivity: new Date().toISOString(),
        });
      });
      setImportResult({ success: true, message: `Added ${results.length} prospects to local CRM` });
    }
    setImporting(false);
  };

  const scoreColor = (s: number) => s >= 15 ? 'text-[#10B981]' : s >= 10 ? 'text-[#F59E0B]' : 'text-[#EF4444]';

  return (
    <div className="space-y-6">
      <div className="bg-[#111827] border border-[#1E293B] border-dashed rounded-lg p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-[#1A2235] flex items-center justify-center mx-auto mb-3">
          <Upload size={20} className="text-[#64748B]" />
        </div>
        <h3 className="text-sm font-medium text-[#F1F5F9] mb-1">Import Prospects</h3>
        <p className="text-xs text-[#64748B] mb-3">Upload JSON/CSV from SquidWeave prospecting engine</p>
        <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#1A2235] hover:bg-[#252d3d] rounded-md text-xs text-[#F1F5F9] cursor-pointer">
          <Upload size={14} /> Select File
          <input type="file" accept=".json,.csv" onChange={handleFileImport} className="hidden" />
        </label>
      </div>

      {importResult && (
        <div className={`flex items-center gap-2 p-3 rounded-md text-sm ${importResult.success ? 'bg-[#10B981]/10 text-[#10B981]' : 'bg-[#EF4444]/10 text-[#EF4444]'}`}>
          {importResult.success ? <Check size={16} /> : <AlertCircle size={16} />}
          {importResult.message}
        </div>
      )}

      <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-4">
        <h3 className="text-sm font-semibold text-[#F1F5F9] mb-3">Lead Finder</h3>
        <div className="flex gap-2">
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Keyword, domain, or industry..." className="flex-1 bg-[#0A0F1E] border border-[#1E293B] rounded-md px-3 py-2 text-sm text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#00D4AA]" />
          <button onClick={runQuery} className="flex items-center gap-2 bg-[#00D4AA] hover:bg-[#00D4AA]/90 text-[#0A0F1E] px-4 py-2 rounded-md text-sm font-medium">
            <Search size={16} /> Search
          </button>
        </div>
      </div>

      <div className="bg-[#111827] border border-[#1E293B] rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E293B]">
          <h3 className="text-sm font-semibold text-[#F1F5F9]">Results ({results.length})</h3>
          <button
            onClick={handleImportToCRM}
            disabled={importing || results.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#00D4AA] hover:bg-[#00D4AA]/90 text-[#0A0F1E] rounded-md text-xs font-medium disabled:opacity-50"
          >
            {importing ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            Import to CRM
          </button>
        </div>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-[#1E293B] bg-[#0A0F1E]">
            <th className="text-left py-2.5 px-4 text-[#64748B] font-medium text-xs">Name</th>
            <th className="text-left py-2.5 px-4 text-[#64748B] font-medium text-xs">Domain</th>
            <th className="text-left py-2.5 px-4 text-[#64748B] font-medium text-xs">Score</th>
            <th className="text-left py-2.5 px-4 text-[#64748B] font-medium text-xs">Emails</th>
            <th className="text-left py-2.5 px-4 text-[#64748B] font-medium text-xs">Hiring</th>
            <th className="text-left py-2.5 px-4 text-[#64748B] font-medium text-xs">Source</th>
          </tr></thead>
          <tbody>
            {results.map(p => (
              <tr key={p.id} className="border-b border-[#1E293B] hover:bg-[#1A2235]">
                <td className="py-2.5 px-4 text-[#F1F5F9] font-medium">{p.name}</td>
                <td className="py-2.5 px-4"><a href={`https://${p.domain}`} target="_blank" rel="noreferrer" className="text-[#3B82F6] hover:underline text-xs flex items-center gap-1">{p.domain}<ExternalLink size={10} /></a></td>
                <td className={`py-2.5 px-4 font-mono font-bold text-sm ${scoreColor(p.score)}`}>{p.score}</td>
                <td className="py-2.5 px-4 text-[#94A3B8] text-xs">{p.emails[0]}</td>
                <td className="py-2.5 px-4">{p.hiring ? <StatusBadge status="Active" /> : <span className="text-[#64748B] text-xs">-</span>}</td>
                <td className="py-2.5 px-4 text-[#94A3B8] text-xs">{p.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {results.length === 0 && <EmptyState title="No prospects found" subtitle="Try a different search query or import from a file." />}
      </div>
    </div>
  );
}
