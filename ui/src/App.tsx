import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import CRM from './pages/CRM';
import Campaigns from './pages/Campaigns';
import Funnels from './pages/Funnels';
import Appointments from './pages/Appointments';
import Analytics from './pages/Analytics';
import Prospecting from './pages/Prospecting';
import Advertising from './pages/Advertising';
import Settings from './pages/Settings';

export default function App() {
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
