import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Sidebar from './components/Sidebar';
import MissionControl from './pages/MissionControl';
import NeuralNet from './pages/NeuralNet';
import Advertising from './pages/Advertising';

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Layout sidebar={<Sidebar />}>
            <MissionControl />
          </Layout>
        }
      />
      <Route
        path="/neural-net"
        element={
          <Layout sidebar={<Sidebar />}>
            <NeuralNet />
          </Layout>
        }
      />
      <Route
        path="/advertising"
        element={
          <Layout sidebar={<Sidebar />}>
            <Advertising />
          </Layout>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
