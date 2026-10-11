import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import CRM from './pages/CRM';
import Campaigns from './pages/Campaigns';
import Funnels from './pages/Funnels';
import Appointments from './pages/Appointments';
import Analytics from './pages/Analytics';
import Prospecting from './pages/Prospecting';
import Advertising from './pages/Advertising';
import Settings from "@/pages/Settings";
import Login from "@/pages/Login";
import { hasAuthCredentials, getAuthEventName } from "@/services/dataService";

export default function App() {
  const [authed, setAuthed] = useState(() => hasAuthCredentials());

  useEffect(() => {
    const sync = () => setAuthed(hasAuthCredentials());
    sync();
    window.addEventListener(getAuthEventName(), sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(getAuthEventName(), sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (!authed) return <Login />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/crm" element={<CRM />} />
        <Route path="/campaigns" element={<Campaigns />} />
        <Route path="/funnels" element={<Funnels />} />
        <Route path="/appointments" element={<Appointments />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/prospecting" element={<Prospecting />} />
        <Route path="/advertising" element={<Advertising />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
