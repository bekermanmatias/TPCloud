import SiloCard from './SiloCard';

function LocationSection({ location, silos, selectedSilo, onSelectSilo }) {
  const locationSilos = silos.filter(silo => silo.locationId === location.id);

  if (locationSilos.length === 0) return null;

  return (
    <div className="location-section">
      <div className="location-header">
        <h2 className="location-name">{location.name}</h2>
        <span className="location-count">{locationSilos.length} silo{locationSilos.length > 1 ? 's' : ''}</span>
      </div>
      
      <div className="silos-grid">
        {locationSilos.map(silo => (
          <SiloCard
            key={silo.id}
            silo={silo}
            isSelected={selectedSilo === silo.id}
            onClick={() => onSelectSilo(silo.id)}
          />
        ))}
      </div>
    </div>
  );
}

export default LocationSection;

