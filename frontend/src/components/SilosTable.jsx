import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Search, X, Plus, Pencil, Trash2 } from 'lucide-react';
import { getSiloHistory, createSilo, updateSilo, deleteSilo } from '../services/api';
import SiloFormModal from './SiloFormModal';

function SilosTable({ silos, loading, onSelectSilo, onSiloCreated, onSiloUpdated, onSiloDeleted }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [histories, setHistories] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSilo, setEditingSilo] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    const loadHistories = async () => {
      const promises = silos.map(async (silo) => {
        try {
          const history = await getSiloHistory(silo.id, { limit: 30, hours: 168 });
          return { siloId: silo.id, history };
        } catch {
          return { siloId: silo.id, history: [] };
        }
      });
      const results = await Promise.all(promises);
      const map = {};
      results.forEach(({ siloId, history }) => { map[siloId] = history; });
      setHistories(map);
    };
    if (silos.length > 0) {
      loadHistories();
      const interval = setInterval(loadHistories, 5000);
      return () => clearInterval(interval);
    }
  }, [silos]);

  const filteredSilos = useMemo(() => {
    if (!searchTerm.trim()) return silos;
    const term = searchTerm.toLowerCase();
    return silos.filter(
      (s) =>
        s.name?.toLowerCase().includes(term) ||
        s.location?.toLowerCase().includes(term) ||
        s.grainType?.toLowerCase().includes(term)
    );
  }, [silos, searchTerm]);

  const getStockColor = (p) => (p >= 30 ? 'bg-green-500' : 'bg-orange-500');

  const calculateStockDays = (silo) => {
    if (!silo.latestData) return { days: 0, dailyConsumption: 0 };
    const history = histories[silo.id] || [];
    if (history.length < 2) {
      const tons = silo.latestData.grainLevel?.tons ?? 0;
      return { days: tons ? Math.round(tons / 0.5) : 0, dailyConsumption: 500 };
    }
    const sorted = [...history].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const daysDiff = (new Date(last.timestamp) - new Date(first.timestamp)) / (1000 * 60 * 60 * 24);
    if (daysDiff <= 0) return { days: 0, dailyConsumption: 0 };
    const consumption = (first.grainLevel?.tons ?? 0) - (last.grainLevel?.tons ?? 0);
    const daily = Math.abs(consumption / daysDiff);
    const remaining = silo.latestData.grainLevel?.tons ?? 0;
    return { days: daily > 0 ? Math.round(remaining / daily) : 0, dailyConsumption: (daily * 1000).toFixed(0) };
  };

  const handleOpenCreate = () => {
    setEditingSilo(null);
    setSaveError('');
    setModalOpen(true);
  };

  const handleOpenEdit = (e, silo) => {
    e.stopPropagation();
    setEditingSilo(silo);
    setSaveError('');
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingSilo(null);
    setSaveError('');
  };

  const handleSave = async (data) => {
    setSaving(true);
    setSaveError('');
    try {
      if (editingSilo) {
        await updateSilo(editingSilo.id, data);
        onSiloUpdated?.();
      } else {
        await createSilo(data);
        onSiloCreated?.();
      }
      handleCloseModal();
    } catch (err) {
      console.error(err);
      setSaveError(err.response?.data?.error || err.message || 'Error al guardar el silo');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (e, silo) => {
    e.stopPropagation();
    setDeleteConfirm(silo.id);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteSilo(deleteConfirm);
      onSiloDeleted?.();
      setDeleteConfirm(null);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500">
        Cargando silos...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Input
            placeholder="Buscar por nombre, ubicación o producto"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-4 pr-10 h-11"
          />
          {searchTerm ? (
            <button type="button" onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          ) : (
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          )}
        </div>
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Agregar silo
        </Button>
      </div>

      <p className="text-sm text-gray-600">
        Total: <span className="font-semibold text-gray-900">{filteredSilos.length}</span> silos
      </p>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Peso</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Días stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase w-28">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSilos.map((silo) => {
                  const latestData = silo.latestData;
                  const stockDays = calculateStockDays(silo);
                  const stockPct = latestData ? latestData.grainLevel?.percentage ?? 0 : 0;
                  const weight = latestData ? latestData.grainLevel?.tons ?? 0 : 0;
                  const capacity = silo.capacity || 100;
                  const freeSpace = Math.max(0, capacity - weight);
                  const isDeleting = deleteConfirm === silo.id;

                  return (
                    <tr
                      key={silo.id}
                      onClick={() => onSelectSilo(silo)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🌾</span>
                          <span className="text-sm font-medium text-gray-900">{silo.name}</span>
                        </div>
                        {silo.location && <div className="text-xs text-gray-500 mt-0.5">{silo.location}</div>}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{silo.grainType || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm">
                        {weight.toFixed(2)} t
                        <span className="text-xs text-gray-500 block">({freeSpace.toFixed(2)} t libre)</span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {stockDays.days} d
                        {stockDays.dailyConsumption > 0 && <span className="text-xs text-gray-500 block">({stockDays.dailyConsumption} kg/día)</span>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium min-w-[3rem]">{stockPct.toFixed(1)}%</span>
                          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${getStockColor(stockPct)}`} style={{ width: `${Math.min(stockPct, 100)}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        {isDeleting ? (
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(null)}>No</Button>
                            <Button variant="destructive" size="sm" onClick={handleDeleteConfirm}>Sí, eliminar</Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={(e) => handleOpenEdit(e, silo)} title="Editar">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={(e) => handleDeleteClick(e, silo)} title="Eliminar" className="text-red-600 hover:text-red-700">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {filteredSilos.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            {silos.length === 0 ? 'No tienes silos. Agrega uno con el botón "Agregar silo".' : 'No hay resultados para la búsqueda.'}
          </CardContent>
        </Card>
      )}

      <SiloFormModal
        open={modalOpen}
        silo={editingSilo}
        onClose={handleCloseModal}
        onSave={handleSave}
        saving={saving}
        error={saveError}
      />
    </div>
  );
}

export default SilosTable;
