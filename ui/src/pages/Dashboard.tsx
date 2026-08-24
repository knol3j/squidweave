import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, TrendingUp, Megaphone, ArrowRight, Zap, Target, BarChart3, Clock, ChevronRight } from "lucide-react";

interface QuickAction { icon: React.ReactNode; label: string; path: string; color: string; }

export default function Dashboard() {
  const navigate = useNavigate();
  const [greeting, setGreeting] = useState("");
  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening");
  }, []);

  const quickActions: QuickAction[] = [
    { icon: <Megaphone className="w-5 h-5" />, label: "New Campaign", path: "/campaigns", color: "bg-blue-500/10 text-blue-400" },
    { icon: <Target className="w-5 h-5" />, label: "Prospecting", path: "/prospecting", color: "bg-purple-500/10 text-purple-400" },
    { icon: <Calendar className="w-5 h-5" />, label: "Schedule", path: "/appointments", color: "bg-green-500/10 text-green-400" },
    { icon: <BarChart3 className="w-5 h-5" />, label: "Analytics", path: "/analytics", color: "bg-orange-500/10 text-orange-400" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
              {greeting}, Commander
            </h1>
            <p className="text-slate-400 mt-1">Your marketing command center overview</p>
          </div>
          <Button onClick={() => navigate("/campaigns")} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500">
            <Zap className="w-4 h-4 mr-2" /> Quick Launch
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[{ label: "Active Campaigns", value: "12", change: "+3 this week", icon: <Megaphone className="w-5 h-5" />, color: "from-blue-500 to-cyan-500" },
            { label: "Total Leads", value: "2,847", change: "+18.5% vs last month", icon: <Users className="w-5 h-5" />, color: "from-purple-500 to-pink-500" },
            { label: "Conversion Rate", value: "24.6%", change: "+2.1% vs last month", icon: <TrendingUp className="w-5 h-5" />, color: "from-emerald-500 to-teal-500" },
            { label: "Revenue", value: "$48.2K", change: "+12.3% vs last month", icon: <BarChart3 className="w-5 h-5" />, color: "from-orange-500 to-amber-500" }].map((stat, i) => (
            <Card key={i} className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg bg-gradient-to-r ${stat.color} bg-opacity-10`}>{stat.icon}</div>
                </div>
                <div className="mt-4">
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-slate-400">{stat.label}</p>
                  <p className="text-xs text-emerald-400 mt-1">{stat.change}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader><CardTitle className="flex items-center gap-2"><Zap className="w-5 h-5 text-blue-400" /> Quick Actions</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              {quickActions.map((action, i) => (
                <button key={i} onClick={() => navigate(action.path)} className="flex items-center gap-3 p-4 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-all border border-slate-700/50 hover:border-slate-600">
                  <div className={`p-2 rounded-lg ${action.color}`}>{action.icon}</div>
                  <span className="font-medium">{action.label}</span>
                  <ArrowRight className="w-4 h-4 ml-auto text-slate-500" />
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5 text-purple-400" /> Recent Activity</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {["New campaign 'Summer Sale' created", "Lead converted: Acme Corp", "Email sequence sent to 234 leads", "A/B test completed: Variant B won"].map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/30">
                  <ChevronRight className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-slate-300">{item}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
