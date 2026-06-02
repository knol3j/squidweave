import { HashRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from '@/context/AppContext';
import Layout from '@/components/Layout';
import MissionControl from '@/pages/MissionControl';
import NeuralNet from '@/pages/NeuralNet';

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<MissionControl />} />
            <Route path="/neural" element={<NeuralNet />} />
          </Routes>
        </Layout>
      </HashRouter>
    </AppProvider>
  );
}
