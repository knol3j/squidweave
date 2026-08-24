import { useState, useEffect } from 'react';
import { api, type SmtpConfig } from '../lib/api';
import { Mail, Users, Plug, CreditCard, Bell, Check, Save, AlertCircle, Plus } from 'lucide-react';

const tabs = [
  { id: 'smtp', label: 'SMTP', icon: Mail },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'integrations', label: 'Integrations', icon: Plug },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'notifications', label: 'Notifications', icon: Bell },
] as const;

export default function Settings() {
  const [tab, setTab] = useState<typeof tabs[number]['id']>('smtp');
  const [smtp, setSmtp] = useState<SmtpConfig>({ host: 'smtp-relay.brevo.com', port: 587, user: '', pass: '', from: 'noreply@squidweave.io' });
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiConnected, setApiConnected] = useState(false);

  useEffect(() => {
    api.getSmtp()
      .then(config => { setSmtp(config); setApiConnected(true); })
      .catch(() => setApiConnected(false))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    try {
      await api.saveSmtp(smtp);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save SMTP:', err);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await api.testSmtp(smtp);
      setTestResult(result);
    } catch (err: any) {
      setTestResult({ success: false, message: err.message });
    }
    setTesting(false);
  };

  if (loading) return <div className="text-[#94A3B8] text-sm">Loading settings...</div>;

  return (
    <div className="flex gap-6 h-[calc(100vh-140px)]">
      <div className="w-48 shrink-0">
        {!apiConnected && (
          <div className="mb-3 p-2 bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded text-[10px] text-[#F59E0B]">
            <AlertCircle size={12} className="inline mr-1" />
            API offline. Changes saved locally.
          </div>
        )}
        <div className="space-y-1">
          {tabs.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${tab === t.id ? 'bg-[#00D4AA]/10 text-[#00D4AA]' : 'text-[#94A3B8] hover:bg-[#1A2235] hover:text-[#F1F5F9]'}`}>
                <Icon size={16} /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 bg-[#111827] border border-[#1E293B] rounded-lg p-6 overflow-auto">
        {tab === 'smtp' && (
          <div className="space-y-4 max-w-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#F1F5F9]">SMTP Configuration</h2>
              {apiConnected && <span className="px-2 py-0.5 bg-[#00D4AA]/10 text-[#00D4AA] rounded text-[10px]">API Connected</span>}
            </div>
            <p className="text-xs text-[#94A3B8]">Configure your email server for sending campaigns. We recommend Brevo (free 300 emails/day).</p>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs text-[#94A3B8] mb-1">Host</label><input value={smtp.host} onChange={e => setSmtp({ ...smtp, host: e.target.value })} className="w-full bg-[#0A0F1E] border border-[#1E293B] rounded-md px-3 py-2 text-sm text-[#F1F5F9] focus:outline-none focus:border-[#00D4AA]" /></div>
              <div><label className="block text-xs text-[#94A3B8] mb-1">Port</label><input type="number" value={smtp.port} onChange={e => setSmtp({ ...smtp, port: parseInt(e.target.value) || 587 })} className="w-full bg-[#0A0F1E] border border-[#1E293B] rounded-md px-3 py-2 text-sm text-[#F1F5F9] focus:outline-none focus:border-[#00D4AA]" /></div>
            </div>
            <div><label className="block text-xs text-[#94A3B8] mb-1">Username (Brevo SMTP key)</label><input value={smtp.user} onChange={e => setSmtp({ ...smtp, user: e.target.value })} placeholder="your-smtp-key@brevo.com" className="w-full bg-[#0A0F1E] border border-[#1E293B] rounded-md px-3 py-2 text-sm text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#00D4AA]" /></div>
            <div><label className="block text-xs text-[#94A3B8] mb-1">Password</label><input type="password" value={smtp.pass} onChange={e => setSmtp({ ...smtp, pass: e.target.value })} className="w-full bg-[#0A0F1E] border border-[#1E293B] rounded-md px-3 py-2 text-sm text-[#F1F5F9] focus:outline-none focus:border-[#00D4AA]" /></div>
            <div><label className="block text-xs text-[#94A3B8] mb-1">From Address</label><input value={smtp.from} onChange={e => setSmtp({ ...smtp, from: e.target.value })} className="w-full bg-[#0A0F1E] border border-[#1E293B] rounded-md px-3 py-2 text-sm text-[#F1F5F9] focus:outline-none focus:border-[#00D4AA]" /></div>
            <div className="flex items-center gap-2 pt-2">
              <button onClick={save} className="flex items-center gap-2 bg-[#00D4AA] hover:bg-[#00D4AA]/90 text-[#0A0F1E] px-4 py-2 rounded-md text-sm font-medium">
                <Save size={14} /> Save
              </button>
              <button onClick={testConnection} disabled={testing} className="flex items-center gap-2 px-4 py-2 bg-[#1A2235] rounded-md text-sm text-[#F1F5F9] disabled:opacity-50">
                {testing ? 'Testing...' : 'Test Connection'}
              </button>
            </div>
            {saved && <div className="flex items-center gap-1 text-xs text-[#10B981]"><Check size={14} /> Settings saved</div>}
            {testResult && (
              <div className={`flex items-center gap-1 text-xs ${testResult.success ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                {testResult.success ? <Check size={14} /> : <AlertCircle size={14} />}
                {testResult.message}
              </div>
            )}
            <div className="p-3 bg-[#0A0F1E] rounded border border-[#1E293B] mt-4">
              <p className="text-[10px] text-[#64748B] leading-relaxed">
                <strong className="text-[#94A3B8]">Brevo Setup:</strong> 1) Sign up at brevo.com → 2) Go to SMTP & API → 3) Create SMTP key → 4) Copy key as username → 5) Save & Test
              </p>
            </div>
          </div>
        )}

        {tab === 'team' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-[#F1F5F9]">Team Members</h2>
            <div className="space-y-2">
              {[{ name: 'You', email: 'admin@squidweave.io', role: 'Owner' }].map((m, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-[#0A0F1E] rounded-md">
                  <div className="w-8 h-8 rounded-full bg-[#00D4AA]/20 flex items-center justify-center text-[#00D4AA] text-xs font-bold">{m.name[0]}</div>
                  <div className="flex-1"><div className="text-sm text-[#F1F5F9]">{m.name}</div><div className="text-xs text-[#64748B]">{m.email}</div></div>
                  <span className="px-2 py-0.5 bg-[#1A2235] rounded text-xs text-[#94A3B8]">{m.role}</span>
                </div>
              ))}
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-[#1A2235] rounded-md text-sm text-[#F1F5F9]"><Plus size={14} /> Invite Member</button>
          </div>
        )}

        {tab === 'integrations' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-[#F1F5F9]">Integrations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { name: 'Brevo', desc: 'Email SMTP & marketing', status: apiConnected ? 'connected' : 'disconnected' },
                { name: 'SquidWeave Prospecting', desc: 'v8 lead engine import', status: apiConnected ? 'connected' : 'disconnected' },
                { name: 'Google Calendar', desc: 'Sync appointments', status: 'disconnected' },
              ].map(int => (
                <div key={int.name} className="flex items-center gap-3 p-4 bg-[#0A0F1E] rounded-md border border-[#1E293B]">
                  <div className="w-10 h-10 rounded bg-[#1A2235] flex items-center justify-center text-[#F1F5F9] font-bold text-xs">{int.name[0]}</div>
                  <div className="flex-1"><div className="text-sm text-[#F1F5F9]">{int.name}</div><div className="text-xs text-[#64748B]">{int.desc}</div></div>
                  {int.status === 'connected' ? <span className="flex items-center gap-1 text-xs text-[#10B981]"><Check size={12} /> Connected</span>
                    : <button className="px-3 py-1 bg-[#00D4AA] text-[#0A0F1E] rounded text-xs font-medium">Connect</button>}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'billing' && (
          <div className="space-y-4 max-w-lg">
            <h2 className="text-lg font-semibold text-[#F1F5F9]">Billing</h2>
            <div className="p-4 bg-[#0A0F1E] rounded-md border border-[#1E293B]">
              <div className="flex items-center justify-between mb-2"><span className="text-sm text-[#F1F5F9]">Current Plan</span><span className="px-2 py-0.5 bg-[#1A2235] rounded text-xs text-[#94A3B8]">Free (Self-Hosted)</span></div>
              <p className="text-xs text-[#64748B]">Unlimited contacts · Brevo free tier (300 emails/day) · Unlimited funnels</p>
            </div>
            <div className="space-y-3">
              <div><div className="flex justify-between text-xs mb-1"><span className="text-[#94A3B8]">Email Quota (Brevo)</span><span className="text-[#F1F5F9]">300/day</span></div><div className="h-1.5 bg-[#1E293B] rounded-full"><div className="h-1.5 bg-[#00D4AA] rounded-full" style={{width:'0%'}} /></div></div>
            </div>
          </div>
        )}

        {tab === 'notifications' && (
          <div className="space-y-4 max-w-lg">
            <h2 className="text-lg font-semibold text-[#F1F5F9]">Notifications</h2>
            <div className="space-y-2">
              {[
                { label: 'Email campaign sent', enabled: true },
                { label: 'New contact added', enabled: true },
                { label: 'Funnel milestone reached', enabled: false },
                { label: 'Team member invited', enabled: true },
              ].map(n => (
                <div key={n.label} className="flex items-center justify-between p-3 bg-[#0A0F1E] rounded-md">
                  <span className="text-sm text-[#F1F5F9]">{n.label}</span>
                  <div className={`w-10 h-5 rounded-full relative cursor-pointer ${n.enabled ? 'bg-[#00D4AA]' : 'bg-[#1E293B]'}`}><div className={`w-3 h-3 rounded-full bg-white absolute top-1 transition-all ${n.enabled ? 'right-1' : 'left-1'}`} /></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
