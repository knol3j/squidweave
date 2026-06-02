import { HashRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from '@/context/AppContext';
import Layout from '@/components/Layout';
import MissionControl from '@/pages/MissionControl';

function NeuralStub() {
  return (
    <div className="flex-1 flex items-center justify-center text-[#94a3b8]">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold text-[#e2e8f0]">Neural Net Demo</h1>
        <p className="text-sm">Coming Soon</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<MissionControl />} />
            <Route path="/neural" element={<NeuralStub />} />
          </Routes>
        </Layout>
      </HashRouter>
    </AppProvider>
  );
}
