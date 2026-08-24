import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Users, MousePointer, Eye, DollarSign } from "lucide-react";

export default function Analytics() {
  const metrics = [
    { label: "Page Views", value: "124.5K", change: "+12.3%", icon: <Eye className="w-5 h-5" />, color: "from-blue-500 to-cyan-500" },
    { label: "Unique Visitors", value: "45.2K", change: "+8.7%", icon: <Users className="w-5 h-5" />, color: "from-purple-500 to-pink-500" },
    { label: "Bounce Rate", value: "34.2%", change: "-2.1%", icon: <TrendingUp className="w-5 h-5" />, color: "from-orange-500 to-amber-500" },
    { label: "Avg. Session", value: "4m 32s", change: "+15.4%", icon: <BarChart3 className="w-5 h-5" />, color: "from-emerald-500 to-teal-500" },
    { label: "Conversion Rate", value: "3.8%", change: "+0.6%", icon: <MousePointer className="w-5 h-5" />, color: "from-rose-500 to-red-500" },
    { label: "Revenue", value: "$48.2K", change: "+22.1%", icon: <DollarSign className="w-5 h-5" />, color: "from-indigo-500 to-violet-500" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Analytics</h1>
          <p className="text-slate-400 mt-1">Track your marketing performance</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {metrics.map((m, i) => (
            <Card key={i} className="bg-slate-900/50 border-slate-700/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2 rounded-lg bg-gradient-to-r ${m.color}`}>{m.icon}</div>
                  <span className="text-sm text-emerald-400">{m.change}</span>
                </div>
                <p className="text-2xl font-bold">{m.value}</p>
                <p className="text-sm text-slate-400">{m.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader><CardTitle>Traffic Sources</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[{ source: "Organic Search", value: 45, color: "bg-blue-500" }, { source: "Direct", value: 25, color: "bg-purple-500" }, { source: "Social Media", value: 18, color: "bg-pink-500" }, { source: "Referral", value: 8, color: "bg-emerald-500" }, { source: "Email", value: 4, color: "bg-orange-500" }].map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1"><span>{item.source}</span><span>{item.value}%</span></div>
                  <div className="w-full h-2 bg-slate-800 rounded-full"><div className={`h-2 rounded-full ${item.color}`} style={{ width: `${item.value}%` }} /></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
