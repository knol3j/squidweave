import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Target, Plus, Search, Mail, Linkedin, Globe, Star } from "lucide-react";

interface Lead { id: number; company: string; contact: string; email: string; score: number; source: string; }

export default function Prospecting() {
  const [leads] = useState<Lead[]>([
    { id: 1, company: "TechCorp Inc", contact: "John Doe", email: "john@techcorp.com", score: 92, source: "LinkedIn" },
    { id: 2, company: "StartupXYZ", contact: "Jane Smith", email: "jane@startupxyz.com", score: 87, source: "Website" },
    { id: 3, company: "BigEnterprise", contact: "Bob Johnson", email: "bob@bigenterprise.com", score: 78, source: "Referral" },
  ]);
  const [search, setSearch] = useState("");

  const filtered = leads.filter(l => l.company.toLowerCase().includes(search.toLowerCase()) || l.contact.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Prospecting</h1>
            <p className="text-slate-400 mt-1">Find and qualify new leads</p>
          </div>
          <Button className="bg-gradient-to-r from-blue-600 to-purple-600"><Plus className="w-4 h-4 mr-2" /> Add Lead</Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <Input placeholder="Search leads..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-slate-900/50 border-slate-700" />
        </div>

        <div className="grid gap-4">
          {filtered.map(lead => (
            <Card key={lead.id} className="bg-slate-900/50 border-slate-700/50">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center font-bold">{lead.company[0]}</div>
                  <div>
                    <p className="font-medium">{lead.company}</p>
                    <p className="text-sm text-slate-400">{lead.contact} · {lead.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {lead.source === 'LinkedIn' && <Linkedin className="w-3 h-3 text-blue-400" />}
                      {lead.source === 'Website' && <Globe className="w-3 h-3 text-emerald-400" />}
                      {lead.source === 'Referral' && <Mail className="w-3 h-3 text-purple-400" />}
                      <span className="text-xs text-slate-400">{lead.source}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span className="font-bold">{lead.score}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
