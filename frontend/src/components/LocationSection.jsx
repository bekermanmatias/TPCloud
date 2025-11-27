import SiloWidget from './SiloWidget';
import { getSiloHistory } from '../services/api';
import { useState, useEffect } from 'react';

function LocationSection({ location, silos, selectedSilo, onSelectSilo }) {
  const locationSilos = silos.filter(silo => silo.locationId === location.id);
  const [histories, setHistories] = useState({});

  useEffect(() => {
    // Cargar historial para cada silo
    locationSilos.forEach(async (silo) => {
      try {
        const history = await getSiloHistory(silo.id, { limit: 30, hours: 168 }); // 7 días
        setHistories(prev => ({ ...prev, [silo.id]: history }));
      } catch (error) {
        console.error(`Error al cargar historial de ${silo.id}:`, error);
      }
    });
  }, [locationSilos]);

  if (locationSilos.length === 0) return null;

  return (
    <div className="location-section">
      <div className="location-header">
        <h2 className="location-name">{location.name}</h2>
        <span className="location-count">{locationSilos.length} silo{locationSilos.length > 1 ? 's' : ''}</span>
      </div>
      
      <div className="silos-widgets-grid">
        {locationSilos.map(silo => (
          <div 
            key={silo.id}
            className={`silo-widget-wrapper ${selectedSilo === silo.id ? 'selected' : ''}`}
            onClick={() => onSelectSilo(silo.id)}
          >
            <SiloWidget 
              silo={silo}
              history={histories[silo.id] || []}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default LocationSection;

