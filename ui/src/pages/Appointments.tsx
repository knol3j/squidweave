import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Plus, Video, MapPin } from "lucide-react";

interface Appointment { id: number; title: string; date: string; time: string; type: "video" | "in-person"; client: string; }

export default function Appointments() {
  const [appointments] = useState<Appointment[]>([
    { id: 1, title: "Discovery Call", date: "2024-08-25", time: "10:00 AM", type: "video", client: "Acme Corp" },
    { id: 2, title: "Strategy Review", date: "2024-08-25", time: "2:00 PM", type: "in-person", client: "TechStart Inc" },
    { id: 3, title: "Campaign Kickoff", date: "2024-08-26", time: "11:00 AM", type: "video", client: "GrowthLabs" },
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Appointments</h1>
            <p className="text-slate-400 mt-1">Schedule and manage client meetings</p>
          </div>
          <Button className="bg-gradient-to-r from-blue-600 to-purple-600"><Plus className="w-4 h-4 mr-2" /> Book Appointment</Button>
        </div>

        <div className="grid gap-4">
          {appointments.map(appt => (
            <Card key={appt.id} className="bg-slate-900/50 border-slate-700/50">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-medium">{appt.title}</p>
                    <p className="text-sm text-slate-400">with {appt.client}</p>
                    <div className="flex items-center gap-3 mt-1 text-sm text-slate-400">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {appt.time}</span>
                      <span className="flex items-center gap-1">{appt.type === 'video' ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />} {appt.type === 'video' ? 'Video Call' : 'In Person'}</span>
                    </div>
                  </div>
                </div>
                <span className="text-sm text-slate-400">{appt.date}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
