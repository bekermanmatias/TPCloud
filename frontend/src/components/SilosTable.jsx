import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { SelectTrigger } from './ui/select';
import { Search, Download, Filter, X } from 'lucide-react';
import { Button } from './ui/button';
import { getSiloHistory } from '../services/api';

function SilosTable({ silos, onSelectSilo, onSelectLocation, selectedSilo }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterByLocation, setFilterByLocation] = useState('all');
  const [groupByLocation, setGroupByLocation] = useState(true);
  const [histories, setHistories] = useState({});
  
  // Filtros preparados para implementación futura
  const [filterByCustomer, setFilterByCustomer] = useState('all');
  const [filterByStatus, setFilterByStatus] = useState('all');

  // Cargar historial para cada silo
  useEffect(() => {
    const loadHistories = async () => {
      const historyPromises = silos.map(async (silo) => {
        try {
          const history = await getSiloHistory(silo.id, { limit: 30, hours: 168 }); // 7 días
          return { siloId: silo.id, history };
        } catch (error) {
          console.error(`Error al cargar historial de ${silo.id}:`, error);
          return { siloId: silo.id, history: [] };
        }
      });

      const results = await Promise.all(historyPromises);
      const historyMap = {};
      results.forEach(({ siloId, history }) => {
        historyMap[siloId] = history;
      });
      setHistories(historyMap);
    };

    if (silos.length > 0) {
      loadHistories();
      // Actualizar cada 5 segundos
      const interval = setInterval(loadHistories, 5000);
      return () => clearInterval(interval);
    }
  }, [silos]);

  // Agrupar silos por ubicación
  const groupedSilos = useMemo(() => {
    const groups = new Map();
    
    silos.forEach(silo => {
      const locationId = silo.locationId || silo.location.toLowerCase().replace(/\s+/g, '-');
      const locationName = silo.location;
      
      if (!groups.has(locationId)) {
        groups.set(locationId, {
          id: locationId,
          name: locationName,
          silos: []
        });
      }
      
      groups.get(locationId).silos.push(silo);
    });
    
    return Array.from(groups.values());
  }, [silos]);

  // Filtrar y buscar silos
  const filteredGroups = useMemo(() => {
    let filtered = groupedSilos;

    // Filtrar por ubicación
    if (filterByLocation !== 'all') {
      filtered = filtered.filter(group => group.id === filterByLocation);
    }

    // Buscar por nombre, ubicación o tipo de grano
    if (searchTerm) {
      filtered = filtered.map(group => ({
        ...group,
        silos: group.silos.filter(silo => 
          silo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          silo.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (silo.grainType && silo.grainType.toLowerCase().includes(searchTerm.toLowerCase()))
        )
      })).filter(group => group.silos.length > 0);
    }

    return filtered;
  }, [groupedSilos, filterByLocation, searchTerm]);

  // Calcular totales
  const totals = useMemo(() => {
    const allSilos = filteredGroups.flatMap(group => group.silos);
    const uniqueLocations = new Set(allSilos.map(s => s.location));
    return {
      locations: uniqueLocations.size,
      silos: allSilos.length
    };
  }, [filteredGroups]);

  const getStockColor = (percentage) => {
    if (percentage >= 60) return 'bg-green-500';
    if (percentage >= 30) return 'bg-green-500'; // Verde también para 30-59%
    return 'bg-orange-500'; // Naranja solo para <30%
  };

  const calculateStockDays = (silo) => {
    if (!silo.latestData) return { days: 0, dailyConsumption: 0 };
    
    const history = histories[silo.id] || [];
    if (history.length < 2) {
      // Si no hay suficiente historial, usar valores por defecto
      const tons = silo.latestData.grainLevel.tons;
      if (tons === 0) return { days: 0, dailyConsumption: 0 };
      
      // Consumo promedio estimado basado en el tipo de grano
      const estimatedDailyConsumption = 0.5; // toneladas/día
      return {
        days: Math.round(tons / estimatedDailyConsumption),
        dailyConsumption: (estimatedDailyConsumption * 1000).toFixed(0)
      };
    }

    // Calcular consumo diario basado en el historial
    const sortedHistory = [...history].sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );
    
    const first = sortedHistory[0];
    const last = sortedHistory[sortedHistory.length - 1];
    
    const timeDiff = new Date(last.timestamp) - new Date(first.timestamp);
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
    
    if (daysDiff <= 0) {
      const tons = silo.latestData.grainLevel.tons;
      const estimatedDailyConsumption = 0.5;
      return {
        days: Math.round(tons / estimatedDailyConsumption),
        dailyConsumption: (estimatedDailyConsumption * 1000).toFixed(0)
      };
    }
    
    const consumption = first.grainLevel.tons - last.grainLevel.tons;
    const dailyConsumption = Math.abs(consumption / daysDiff);
    
    if (dailyConsumption <= 0) {
      return { days: 0, dailyConsumption: 0 };
    }
    
    const remaining = silo.latestData.grainLevel.tons;
    const daysRemaining = remaining / dailyConsumption;
    
    return {
      days: Math.round(daysRemaining),
      dailyConsumption: (dailyConsumption * 1000).toFixed(0) // convertir a kg/día
    };
  };

  return (
    <div className="space-y-6">
      {/* Header con filtros y búsqueda */}
      <div className="flex flex-col gap-4">
        {/* Primera fila: Búsqueda y filtros superiores */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex-1 w-full sm:max-w-md">
            <div className="relative">
              <Input
                placeholder="Buscar por Granja, Silo o Producto"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-4 pr-10 h-11 text-base border-gray-300 focus:border-yellow focus:ring-yellow"
              />
              {searchTerm ? (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : (
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              )}
            </div>
          </div>

          {/* Filtros superiores a la derecha */}
          <div className="flex gap-3 items-center">
            <SelectTrigger
              value={filterByCustomer}
              onChange={(e) => setFilterByCustomer(e.target.value)}
              className="w-[180px]"
            >
              <option value="all">Filtrar por cliente</option>
              <option value="customer1">Cliente 1</option>
              <option value="customer2">Cliente 2</option>
            </SelectTrigger>

            <SelectTrigger
              value={filterByStatus}
              onChange={(e) => setFilterByStatus(e.target.value)}
              className="w-[150px]"
            >
              <option value="all">Filtrar por estado</option>
              <option value="normal">Normal</option>
              <option value="warning">Advertencia</option>
              <option value="critical">Crítico</option>
            </SelectTrigger>
          </div>
        </div>

        {/* Segunda fila: Checkbox y botón de exportar */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="groupByLocation"
              checked={groupByLocation}
              onChange={(e) => setGroupByLocation(e.target.checked)}
              className="w-4 h-4 text-yellow border-gray-300 rounded focus:ring-yellow"
            />
            <label htmlFor="groupByLocation" className="text-sm text-gray-600 cursor-pointer">
              Agrupar por área de alimentación
            </label>
          </div>

          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Resumen */}
      <div className="text-sm text-gray-600">
        Total Granjas: <span className="font-semibold text-gray-900">{totals.locations}</span>{' '}
        Total Silos: <span className="font-semibold text-gray-900">{totals.silos}</span>
      </div>

      {/* Tabla de silos */}
      <div className="space-y-6">
        {filteredGroups.map((group) => (
          <Card key={group.id} className="overflow-hidden">
            <CardHeader className="bg-gray-50 border-b">
              <div 
                className="flex items-center gap-3 cursor-pointer hover:bg-gray-100 -m-6 p-6 rounded-t-lg transition-colors"
                onClick={() => onSelectLocation && onSelectLocation(group.id)}
              >
                <div className="h-8 w-8 rounded bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-600 text-sm">🏢</span>
                </div>
                <div>
                  <CardTitle className="text-lg text-blue-600">
                    {group.name} ({group.silos.length} silos)
                  </CardTitle>
                  <p className="text-sm text-gray-500 mt-1">{group.name}</p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nombre del Silo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Producto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Peso
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Días de Stock
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stock
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {group.silos.map((silo) => {
                      const latestData = silo.latestData;
                      
                      // Debug para verificar datos
                      if (!latestData && silo.id === 'silo-001') {
                        console.log('⚠️ Silo sin datos:', silo.name, silo);
                      }
                      
                      const stockDays = calculateStockDays(silo);
                      const stockPercentage = latestData ? latestData.grainLevel.percentage : 0;
                      const weight = latestData ? latestData.grainLevel.tons : 0;
                      const capacity = silo.capacity || 100;
                      const freeSpace = Math.max(0, capacity - weight);
                      
                      // Obtener densidad del grano (por defecto 640 kg/m³)
                      const density = 640; // kg/m³

                      return (
                        <tr
                          key={silo.id}
                          onClick={() => onSelectSilo(silo)}
                          className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                            selectedSilo === silo.id ? 'bg-yellow-light' : ''
                          }`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="h-6 w-6 rounded bg-gray-200 flex items-center justify-center">
                                <span className="text-xs">🌾</span>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">{silo.name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {silo.grainType || 'N/A'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {density} kg/m³
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {weight > 0 ? weight.toFixed(2) : '0.00'} t
                            </div>
                            <div className="text-xs text-gray-500">
                              ({freeSpace.toFixed(2)} t libre)
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {stockDays.days} d
                            </div>
                            {stockDays.dailyConsumption > 0 && (
                              <div className="text-xs text-gray-500">
                                ({stockDays.dailyConsumption} kg/día)
                              </div>
                            )}
                            {stockDays.dailyConsumption === 0 && weight === 0 && (
                              <div className="text-xs text-gray-400">
                                (0 kg/día)
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="text-sm font-medium text-gray-900 min-w-[70px]">
                                {stockPercentage.toFixed(2)}%
                              </div>
                              <div className="flex-1 max-w-[200px]">
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                  <div
                                    className={`h-2.5 rounded-full ${getStockColor(stockPercentage)}`}
                                    style={{ width: `${Math.min(stockPercentage, 100)}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredGroups.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">No se encontraron silos</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default SilosTable;

