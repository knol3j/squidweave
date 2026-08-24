import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Plus, TrendingUp, Users, Eye, MousePointer } from "lucide-react";

interface Campaign { id: number; name: string; status: "active" | "paused" | "draft"; impressions: number; clicks: number; conversions: number; budget: string; spend: string; }

export default function Campaigns() {
  const [campaigns] = useState<Campaign[]>([
    { id: 1, name: "Summer Sale 2024", status: "active", impressions: 45200, clicks: 1840, conversions: 92, budget: "$5,000", spend: "$3,240" },
    { id: 2, name: "Retargeting - Cart Abandoners", status: "active", impressions: 28300, clicks: 1240, conversions: 68, budget: "$3,000", spend: "$1,890" },
    { id: 3, name: "Lookalike - Top Customers", status: "paused", impressions: 15600, clicks: 620, conversions: 31, budget: "$4,000", spend: "$980" },
    { id: 4, name: "Email Nurture Sequence", status: "draft", impressions: 0, clicks: 0, conversions: 0, budget: "N/A", spend: "$0" },
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Campaigns</h1>
            <p className="text-slate-400 mt-1">Manage your marketing campaigns</p>
          </div>
          <Button className="bg-gradient-to-r from-blue-600 to-purple-600"><Plus className="w-4 h-4 mr-2" /> New Campaign</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[{ label: "Active Campaigns", value: "12", icon: <Megaphone className="w-5 h-5" />, color: "from-blue-500 to-cyan-500" },
            { label: "Total Impressions", value: "89.1K", icon: <Eye className="w-5 h-5" />, color: "from-purple-500 to-pink-500" },
            { label: "CTR", value: "4.2%", icon: <MousePointer className="w-5 h-5" />, color: "from-emerald-500 to-teal-500" }].map((stat, i) => (
            <Card key={i} className="bg-slate-900/50 border-slate-700/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-gradient-to-r ${stat.color}`}>{stat.icon}</div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-slate-400">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          {campaigns.map(c => (
            <Card key={c.id} className="bg-slate-900/50 border-slate-700/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">{c.name}</h3>
                    <Badge className={c.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : c.status === 'paused' ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-500/10 text-slate-400'}>{c.status}</Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-400">Budget: {c.budget}</p>
                    <p className="text-sm text-slate-400">Spend: {c.spend}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div><p className="text-xl font-bold">{c.impressions.toLocaleString()}</p><p className="text-xs text-slate-400">Impressions</p></div>
                  <div><p className="text-xl font-bold">{c.clicks.toLocaleString()}</p><p className="text-xs text-slate-400">Clicks</p></div>
                  <div><p className="text-xl font-bold">{c.conversions}</p><p className="text-xs text-slate-400">Conversions</p></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
