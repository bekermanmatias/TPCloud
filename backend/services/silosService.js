// Servicio para manejar información de silos
// Por ahora usa almacenamiento en memoria, luego se integrará con PostgreSQL

let silosStore = new Map();

// Inicializar con silos de ejemplo en diferentes ubicaciones
if (silosStore.size === 0) {
  // Campo Norte
  silosStore.set('silo-001', {
    id: 'silo-001',
    name: 'Silo Principal',
    location: 'Campo Norte',
    locationId: 'campo-norte',
    capacity: 100, // toneladas
    height: 10, // metros
    diameter: 6, // metros
    grainType: 'Soja',
    latitude: -34.9215,
    longitude: -57.9545,
    createdAt: new Date().toISOString()
  });
  
  silosStore.set('silo-002', {
    id: 'silo-002',
    name: 'Silo Secundario',
    location: 'Campo Norte',
    locationId: 'campo-norte',
    capacity: 80,
    height: 9,
    diameter: 5.5,
    grainType: 'Maíz',
    latitude: -34.9220,
    longitude: -57.9550,
    createdAt: new Date().toISOString()
  });
  
  // Campo Sur
  silosStore.set('silo-003', {
    id: 'silo-003',
    name: 'Silo Sur 1',
    location: 'Campo Sur',
    locationId: 'campo-sur',
    capacity: 120,
    height: 11,
    diameter: 7,
    grainType: 'Trigo',
    latitude: -34.9300,
    longitude: -57.9600,
    createdAt: new Date().toISOString()
  });
  
  silosStore.set('silo-004', {
    id: 'silo-004',
    name: 'Silo Sur 2',
    location: 'Campo Sur',
    locationId: 'campo-sur',
    capacity: 90,
    height: 10,
    diameter: 6,
    grainType: 'Soja',
    latitude: -34.9305,
    longitude: -57.9605,
    createdAt: new Date().toISOString()
  });
  
  // Planta Industrial
  silosStore.set('silo-005', {
    id: 'silo-005',
    name: 'Silo Industrial 1',
    location: 'Planta Industrial',
    locationId: 'planta-industrial',
    capacity: 150,
    height: 12,
    diameter: 8,
    grainType: 'Soja',
    latitude: -34.9100,
    longitude: -57.9500,
    createdAt: new Date().toISOString()
  });
}

/**
 * Obtiene todos los silos
 * @returns {Array} Array de silos con sus últimos datos
 */
export async function getAllSilos() {
  const { getLatestData } = await import('./sensorDataService.js');
  
  const silos = Array.from(silosStore.values());
  
  // Agregar últimos datos a cada silo
  const silosWithData = await Promise.all(
    silos.map(async (silo) => {
      const latestData = await getLatestData(silo.id);
      return {
        ...silo,
        latestData: latestData || null
      };
    })
  );
  
  return silosWithData;
}

/**
 * Obtiene un silo por ID
 * @param {string} id - ID del silo
 * @returns {Object|null} Silo o null si no existe
 */
export async function getSiloById(id) {
  const silo = silosStore.get(id);
  
  if (!silo) {
    return null;
  }
  
  // Obtener último dato del silo
  const { getLatestData } = await import('./sensorDataService.js');
  const latestData = await getLatestData(id);
  
  return {
    ...silo,
    latestData: latestData || null
  };
}

/**
 * Obtiene historial de datos de un silo
 * @param {string} id - ID del silo
 * @param {Object} options - Opciones (limit, hours)
 * @returns {Array} Array de datos históricos
 */
export async function getSiloHistory(id, options = {}) {
  const { getSiloHistory } = await import('./sensorDataService.js');
  return await getSiloHistory(id, options);
}

/**
 * Crea un nuevo silo
 * @param {Object} siloData - Datos del silo
 * @returns {Object} Silo creado
 */
export async function createSilo(siloData) {
  const silo = {
    id: siloData.id || `silo-${Date.now()}`,
    name: siloData.name || 'Nuevo Silo',
    location: siloData.location || '',
    capacity: siloData.capacity || 100,
    height: siloData.height || 10,
    grainType: siloData.grainType || 'Soja',
    createdAt: new Date().toISOString()
  };
  
  silosStore.set(silo.id, silo);
  return silo;
}

