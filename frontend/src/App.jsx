import { useState } from 'react';
import Sidebar from './components/Sidebar';
import CardGrid from './components/CardGrid';
import CardEditor from './components/CardEditor';
import StatusIndicator from './components/StatusIndicator';
import GeneratePage from './pages/GeneratePage';
import SimulatePage from './pages/SimulatePage';
import AnalyticsPage from './pages/AnalyticsPage';
import useSimulationStatus from './hooks/useSimulationStatus';

const tabs = ['Generate', 'Simulate', 'Analytics'];

export default function App() {
  const [activeTab, setActiveTab] = useState('Generate');
  const status = useSimulationStatus('demo-session');

  const page = {
    Generate: <GeneratePage />,
    Simulate: <SimulatePage />,
    Analytics: <AnalyticsPage />,
  }[activeTab];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: 16 }}>
        <nav style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          {tabs.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}>{tab}</button>
          ))}
        </nav>
        <StatusIndicator status={status} />
        <h2>{activeTab}</h2>
        {page}
        <CardGrid />
      </main>
      <CardEditor />
    </div>
  );
}
