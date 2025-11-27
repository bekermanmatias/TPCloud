import { useState, useEffect, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import SilosTable from './components/SilosTable';
import LocationDetail from './components/LocationDetail';
import SiloDetailView from './components/SiloDetailView';
import { getSilos } from './services/api';

function App() {
  const [silos, setSilos] = useState([]);
  const [selectedSilo, setSelectedSilo] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  
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
    const interval = setInterval(() => {
      loadSilos();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadSilos = async () => {
    try {
      const data = await getSilos();
      // Debug: verificar que los datos incluyan latestData
      if (data.length > 0) {
        console.log('📊 Silos cargados:', data.length);
        const siloConDatos = data.find(s => s.latestData);
        if (siloConDatos) {
          console.log('✅ Silo con datos:', siloConDatos.name, siloConDatos.latestData.grainLevel);
        } else {
          console.log('⚠️ Ningún silo tiene datos aún. ¿Está corriendo el simulador?');
        }
      }
      setSilos(data);
      if (loading) {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error al cargar silos:', error);
      if (loading) {
        setLoading(false);
      }
    }
  };

  const handleSelectSilo = (silo) => {
    setSelectedSilo(silo);
    setCurrentView('silo-detail');
  };

  const handleSelectLocation = (locationId) => {
    const location = locations.find(loc => loc.id === locationId);
    if (location) {
      setSelectedLocation(location);
      setCurrentView('location-detail');
    }
  };

  const handleBackToDashboard = () => {
    setSelectedLocation(null);
    setSelectedSilo(null);
    setCurrentView('dashboard');
  };

  const renderContent = () => {
    // Vista de detalle de silo
    if (currentView === 'silo-detail' && selectedSilo) {
      return (
        <SiloDetailView
          silo={selectedSilo}
          onBack={handleBackToDashboard}
        />
      );
    }

    // Vista de detalle de ubicación
    if (currentView === 'location-detail' && selectedLocation) {
      return (
        <LocationDetail
          location={selectedLocation}
          silos={silos}
          onBack={handleBackToDashboard}
        />
      );
    }

    switch (currentView) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900 mb-2">Panel de Control</h1>
              <p className="text-gray-600">Vista general de todos los silos</p>
            </div>
            <SilosTable 
              silos={silos} 
              onSelectSilo={handleSelectSilo}
              onSelectLocation={handleSelectLocation}
            />
          </div>
        );
      
      case 'silos':
      case 'locations':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900 mb-2">Silos</h1>
              <p className="text-gray-600">Vista general de todos los silos</p>
            </div>
            <SilosTable 
              silos={silos} 
              onSelectSilo={handleSelectSilo}
              onSelectLocation={handleSelectLocation}
            />
          </div>
        );
      
      case 'reports':
        return (
          <div className="empty-state">
            <h2>Reportes</h2>
            <p>Funcionalidad de reportes próximamente disponible</p>
          </div>
        );
      
      case 'settings':
        return (
          <div className="empty-state">
            <h2>Cuentas</h2>
            <p>Gestión de cuentas próximamente disponible</p>
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
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />

      <main className="main-content-with-sidebar">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
