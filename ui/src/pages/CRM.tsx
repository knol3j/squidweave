import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Plus, Search, Mail, Phone, MoreHorizontal } from "lucide-react";

interface Contact { id: number; name: string; email: string; phone: string; status: string; lastContact: string; }

export default function CRM() {
  const [contacts, setContacts] = useState<Contact[]>([
    { id: 1, name: "Alice Johnson", email: "alice@example.com", phone: "+1 555-0101", status: "Active", lastContact: "2 hours ago" },
    { id: 2, name: "Bob Smith", email: "bob@example.com", phone: "+1 555-0102", status: "Lead", lastContact: "1 day ago" },
    { id: 3, name: "Carol White", email: "carol@example.com", phone: "+1 555-0103", status: "Customer", lastContact: "3 days ago" },
  ]);
  const [search, setSearch] = useState("");

  const filtered = contacts.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">CRM</h1>
            <p className="text-slate-400 mt-1">Manage your contacts and leads</p>
          </div>
          <Button className="bg-gradient-to-r from-blue-600 to-purple-600"><Plus className="w-4 h-4 mr-2" /> Add Contact</Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <Input placeholder="Search contacts..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-slate-900/50 border-slate-700" />
        </div>

        <div className="grid gap-4">
          {filtered.map(contact => (
            <Card key={contact.id} className="bg-slate-900/50 border-slate-700/50">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center font-bold">{contact.name[0]}</div>
                  <div>
                    <p className="font-medium">{contact.name}</p>
                    <div className="flex items-center gap-3 text-sm text-slate-400">
                      <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {contact.email}</span>
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {contact.phone}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${contact.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' : contact.status === 'Lead' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>{contact.status}</span>
                  <Button variant="ghost" size="sm"><MoreHorizontal className="w-4 h-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
