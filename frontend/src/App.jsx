import { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import AuthPage from './components/AuthPage';
import Sidebar from './components/Sidebar';
import SilosTable from './components/SilosTable';
import SiloDetailView from './components/SiloDetailView';
import { getSilos } from './services/api';

function App() {
  const { isAuthenticated } = useAuth();
  const [silos, setSilos] = useState([]);
  const [selectedSilo, setSelectedSilo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');

  useEffect(() => {
    if (!isAuthenticated) return;
    loadSilos();
    const interval = setInterval(loadSilos, 5000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const loadSilos = async () => {
    try {
      const data = await getSilos();
      setSilos(data);
    } catch (error) {
      console.error('Error al cargar silos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSilo = (silo) => {
    setSelectedSilo(silo);
    setCurrentView('silo-detail');
  };

  const handleBackToDashboard = () => {
    setSelectedSilo(null);
    setCurrentView('dashboard');
  };

  const handleSiloCreatedOrUpdated = () => {
    loadSilos();
  };

  const handleSiloDeleted = () => {
    setSelectedSilo(null);
    setCurrentView('dashboard');
    loadSilos();
  };

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  if (currentView === 'silo-detail' && selectedSilo) {
    return (
      <div className="app">
        <Sidebar currentView={currentView} onViewChange={setCurrentView} />
        <main className="main-content-with-sidebar">
          <SiloDetailView silo={selectedSilo} onBack={handleBackToDashboard} />
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      <main className="main-content-with-sidebar">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">Panel de Control</h1>
            <p className="text-gray-600">Tus silos</p>
          </div>
          <SilosTable
            silos={silos}
            loading={loading}
            onSelectSilo={handleSelectSilo}
            onSiloCreated={handleSiloCreatedOrUpdated}
            onSiloUpdated={handleSiloCreatedOrUpdated}
            onSiloDeleted={handleSiloDeleted}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
