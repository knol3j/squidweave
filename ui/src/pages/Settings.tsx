import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bell, Server, LogOut } from "lucide-react";
import {
  clearAuthCredentials,
  getApiBase,
  resetToRailway,
} from "@/services/dataService";

export default function SettingsPage() {
  const [notifications, setNotifications] = useState(true);
  const [backend, setBackend] = useState<string>(() => {
    try {
      return getApiBase();
    } catch {
      return "";
    }
  });

  function handleSignOut() {
    clearAuthCredentials();
    window.location.reload();
  }

  function handleResetBackend() {
    resetToRailway();
    setBackend(getApiBase());
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Connection and session preferences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Server className="w-5 h-5" /> Backend
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Connected API</Label>
            <p className="text-sm text-muted-foreground break-all">{backend}</p>
          </div>
          <Button variant="outline" onClick={handleResetBackend}>
            Reset to default backend
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="w-5 h-5" /> Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Email notifications</p>
              <p className="text-sm text-muted-foreground">
                Receive updates via email
              </p>
            </div>
            <Switch checked={notifications} onCheckedChange={setNotifications} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <LogOut className="w-5 h-5" /> Session
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Sign out of this SquidWeave session.
          </p>
          <Button variant="outline" onClick={handleSignOut}>
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
