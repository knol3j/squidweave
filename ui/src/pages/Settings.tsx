import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings, Bell, Shield, CreditCard, User } from "lucide-react";

export default function SettingsPage() {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Settings</h1>
          <p className="text-slate-400 mt-1">Manage your account and preferences</p>
        </div>

        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader><CardTitle className="flex items-center gap-2"><User className="w-5 h-5 text-blue-400" /> Profile</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>First Name</Label><Input defaultValue="John" className="bg-slate-800 border-slate-700" /></div>
              <div className="space-y-2"><Label>Last Name</Label><Input defaultValue="Doe" className="bg-slate-800 border-slate-700" /></div>
            </div>
            <div className="space-y-2"><Label>Email</Label><Input defaultValue="john@example.com" className="bg-slate-800 border-slate-700" /></div>
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600">Save Changes</Button>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5 text-purple-400" /> Notifications</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div><p className="font-medium">Email Notifications</p><p className="text-sm text-slate-400">Receive updates via email</p></div>
              <Switch checked={notifications} onCheckedChange={setNotifications} />
            </div>
            <div className="flex items-center justify-between">
              <div><p className="font-medium">Dark Mode</p><p className="text-sm text-slate-400">Use dark theme</p></div>
              <Switch checked={darkMode} onCheckedChange={setDarkMode} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5 text-emerald-400" /> Billing</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-slate-400">Current plan: <span className="text-white font-medium">Growth ($49/mo)</span></p>
            <Button variant="outline" className="mt-4 border-slate-600">Manage Subscription</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
