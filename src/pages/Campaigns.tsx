import { useState } from 'react';
import { useStore } from '../store/useStore';
import StatusBadge from '../components/StatusBadge';
import { api } from '../lib/api';
import { Plus, Send, Mail, AlertCircle, Check, Loader2 } from 'lucide-react';

export default function Campaigns() {
  const { campaigns, addCampaign, contacts } = useStore();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{success?: boolean; message?: string} | null>(null);

  const [form, setForm] = useState({
    name: '',
    subject: '',
    type: 'email' as const,
    status: 'draft' as const,
    body: '',
    sendToAll: true,
  });

  const handleCreate = () => {
    addCampaign({
      name: form.name,
      subject: form.subject,
      type: form.type,
      status: form.status,
      recipients: 0,
      openRate: 0,
      clickRate: 0,
      lastSent: new Date().toISOString(),
    });
    setForm({ name: '', subject: '', type: 'email', status: 'draft', body: '', sendToAll: true });
    setDrawerOpen(false);
  };

  const handleSend = async (campaign: any) => {
    setSending(true);
    setSendResult(null);
    try {
      const to = contacts.filter(c => c.email).map(c => c.email);
      if (to.length === 0) {
        setSendResult({ success: false, message: 'No contacts with email addresses' });
        setSending(false);
        return;
      }
      const result = await api.sendCampaign({
        subject: campaign.subject,
        body: campaign.body || '<p>' + campaign.subject + '</p>',
        to,
        fromName: 'SquidWeave',
        fromEmail: 'noreply@squidweave.io',
      });
      setSendResult({
        success: true,
        message: `Sent to ${result.sent} of ${to.length} contacts`
      });
    } catch (err: any) {
      setSendResult({ success: false, message: err.message });
    }
    setSending(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#F1F5F9]">Campaigns</h1>
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-2 bg-[#00D4AA] hover:bg-[#00D4AA]/90 text-[#0A0F1E] px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          <Plus size={16} /> New Campaign
        </button>
      </div>

      {sendResult && (
        <div className={`flex items-center gap-2 p-3 rounded-md text-sm ${sendResult.success ? 'bg-[#10B981]/10 text-[#10B981]' : 'bg-[#EF4444]/10 text-[#EF4444]'}`}>
          {sendResult.success ? <Check size={16} /> : <AlertCircle size={16} />}
          {sendResult.message}
        </div>
      )}

      <div className="bg-[#111827] border border-[#1E293B] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1E293B] bg-[#0A0F1E]">
              <th className="text-left py-3 px-4 text-[#64748B] font-medium text-xs">Name</th>
              <th className="text-left py-3 px-4 text-[#64748B] font-medium text-xs">Subject</th>
              <th className="text-left py-3 px-4 text-[#64748B] font-medium text-xs">Type</th>
              <th className="text-left py-3 px-4 text-[#64748B] font-medium text-xs">Status</th>
              <th className="text-left py-3 px-4 text-[#64748B] font-medium text-xs">Sent</th>
              <th className="text-left py-3 px-4 text-[#64748B] font-medium text-xs">Open Rate</th>
              <th className="text-left py-3 px-4 text-[#64748B] font-medium text-xs">Click Rate</th>
              <th className="text-left py-3 px-4 text-[#64748B] font-medium text-xs">Actions</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.id} className="border-b border-[#1E293B] hover:bg-[#1A2235]">
                <td className="py-3 px-4 text-[#F1F5F9] font-medium">{c.name}</td>
                <td className="py-3 px-4 text-[#94A3B8]">{c.subject}</td>
                <td className="py-3 px-4"><span className="capitalize text-[#94A3B8]">{c.type}</span></td>
                <td className="py-3 px-4"><StatusBadge status={c.status} /></td>
                <td className="py-3 px-4 text-[#94A3B8]">{c.recipients}</td>
                <td className="py-3 px-4 text-[#94A3B8]">{c.openRate}%</td>
                <td className="py-3 px-4 text-[#94A3B8]">{c.clickRate}%</td>
                <td className="py-3 px-4">
                  <button
                    onClick={() => handleSend(c)}
                    disabled={sending}
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#00D4AA] hover:bg-[#00D4AA]/90 text-[#0A0F1E] rounded text-xs font-medium disabled:opacity-50"
                  >
                    {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                    Send
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
          <div className="relative w-[400px] max-w-full bg-[#111827] border-l border-[#1E293B] h-full overflow-auto p-6">
            <h2 className="text-lg font-semibold text-[#F1F5F9] mb-4">New Campaign</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-[#94A3B8] mb-1">Campaign Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-[#0A0F1E] border border-[#1E293B] rounded-md px-3 py-2 text-sm text-[#F1F5F9] focus:outline-none focus:border-[#00D4AA]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#94A3B8] mb-1">Subject Line</label>
                <input
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="w-full bg-[#0A0F1E] border border-[#1E293B] rounded-md px-3 py-2 text-sm text-[#F1F5F9] focus:outline-none focus:border-[#00D4AA]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#94A3B8] mb-1">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                  className="w-full bg-[#0A0F1E] border border-[#1E293B] rounded-md px-3 py-2 text-sm text-[#F1F5F9] focus:outline-none focus:border-[#00D4AA]"
                >
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#94A3B8] mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                  className="w-full bg-[#0A0F1E] border border-[#1E293B] rounded-md px-3 py-2 text-sm text-[#F1F5F9] focus:outline-none focus:border-[#00D4AA]"
                >
                  <option value="draft">Draft</option>
                  <option value="scheduled">Scheduled</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#94A3B8] mb-1">Email Body (HTML)</label>
                <textarea
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  rows={6}
                  placeholder="<p>Your email content here...</p>"
                  className="w-full bg-[#0A0F1E] border border-[#1E293B] rounded-md px-3 py-2 text-sm text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#00D4AA] font-mono text-xs"
                />
              </div>
              <div className="pt-2">
                <button
                  onClick={handleCreate}
                  className="w-full flex items-center justify-center gap-2 bg-[#00D4AA] hover:bg-[#00D4AA]/90 text-[#0A0F1E] px-4 py-2 rounded-md text-sm font-medium"
                >
                  <Plus size={16} /> Create Campaign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
