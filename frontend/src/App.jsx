import { useState, useEffect, useMemo } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import LocationSection from './components/LocationSection';
import { getSilos } from './services/api';

function App() {
  const [silos, setSilos] = useState([]);
  const [selectedSilo, setSelectedSilo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('silos');

  // Agrupar silos por ubicación
  const locations = useMemo(() => {
    const locationMap = new Map();
    
    silos.forEach(silo => {
      const locationId = silo.locationId || silo.location.toLowerCase().replace(/\s+/g, '-');
      const locationName = silo.location;
      
      if (!locationMap.has(locationId)) {
        locationMap.set(locationId, {
          id: locationId,
          name: locationName,
          silos: []
        });
      }
      
      locationMap.get(locationId).silos.push(silo);
    });
    
    return Array.from(locationMap.values());
  }, [silos]);

  useEffect(() => {
    loadSilos();
    
    // Actualizar datos cada 5 segundos
    const interval = setInterval(loadSilos, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadSilos = async () => {
    try {
      const data = await getSilos();
      setSilos(data);
      if (data.length > 0 && !selectedSilo) {
        setSelectedSilo(data[0].id);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error al cargar silos:', error);
      setLoading(false);
    }
  };

  const handleSelectSilo = (siloId) => {
    setSelectedSilo(siloId);
    setCurrentView('dashboard');
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return selectedSilo ? (
          <Dashboard siloId={selectedSilo} />
        ) : (
          <div className="empty-state">
            <h2>Dashboard</h2>
            <p>Selecciona un silo para ver su dashboard</p>
          </div>
        );
      
      case 'silos':
      case 'locations':
        return (
          <>
            <section className="locations-section">
              <div className="locations-header">
                <h2>Ubicaciones</h2>
                <div className="locations-summary">
                  <span>{locations.length} ubicación{locations.length > 1 ? 'es' : ''}</span>
                  <span>•</span>
                  <span>{silos.length} silo{silos.length > 1 ? 's' : ''} total</span>
                </div>
              </div>

              {locations.map(location => (
                <LocationSection
                  key={location.id}
                  location={location}
                  silos={silos}
                  selectedSilo={selectedSilo}
                  onSelectSilo={handleSelectSilo}
                />
              ))}
            </section>

            {selectedSilo && (
              <Dashboard siloId={selectedSilo} />
            )}
          </>
        );
      
      case 'reports':
        return (
          <div className="empty-state">
            <h2>Reportes</h2>
            <p>Funcionalidad de reportes próximamente disponible</p>
          </div>
        );
      
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <Navbar currentView={currentView} onViewChange={setCurrentView} />

      <main className="main-content">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
