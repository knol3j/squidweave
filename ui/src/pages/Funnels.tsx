import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ArrowRight, Users, MousePointer, ShoppingCart, CheckCircle } from "lucide-react";

export default function Funnels() {
  const stages = [
    { name: "Awareness", count: 12400, color: "from-blue-500 to-cyan-500", icon: <Users className="w-5 h-5" /> },
    { name: "Interest", count: 6200, color: "from-purple-500 to-pink-500", icon: <MousePointer className="w-5 h-5" /> },
    { name: "Consideration", count: 3100, color: "from-orange-500 to-amber-500", icon: <ShoppingCart className="w-5 h-5" /> },
    { name: "Conversion", count: 1240, color: "from-emerald-500 to-teal-500", icon: <CheckCircle className="w-5 h-5" /> },
  ];

  const performances = [
    { name: "Landing Page → Sign Up", rate: "24.5%" },
    { name: "Email Open → Click", rate: "18.2%" },
    { name: "Ad Click → Purchase", rate: "3.8%" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Funnels</h1>
            <p className="text-slate-400 mt-1">Visualize and optimize your conversion funnels</p>
          </div>
          <Button className="bg-gradient-to-r from-blue-600 to-purple-600"><Plus className="w-4 h-4 mr-2" /> New Funnel</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {stages.map((stage, i) => (
            <Card key={i} className="bg-slate-900/50 border-slate-700/50">
              <CardContent className="p-6 text-center">
                <div className={`w-12 h-12 mx-auto rounded-full bg-gradient-to-r ${stage.color} flex items-center justify-center mb-3`}>{stage.icon}</div>
                <p className="text-2xl font-bold">{stage.count.toLocaleString()}</p>
                <p className="text-sm text-slate-400">{stage.name}</p>
                {i < stages.length - 1 && <ArrowRight className="w-5 h-5 mx-auto mt-3 text-slate-600" />}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader><CardTitle>Funnel Performance</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {performances.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30">
                  <span>{item.name}</span>
                  <span className="font-bold text-emerald-400">{item.rate}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
