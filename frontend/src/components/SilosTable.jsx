import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import {
  Search, X, Plus, Pencil, Trash2,
  ArrowUpDown, ArrowUp, ArrowDown,
  Wifi, WifiOff, Filter,
} from 'lucide-react';
import { getSiloHistory, createSilo, updateSilo, deleteSilo } from '../services/api';
import SiloFormModal from './SiloFormModal';
import { GRAIN_TYPES } from '../constants/grainDensities';

// ── helpers ────────────────────────────────────────────────────────────────────
const getEstado = (latestData) => {
  if (!latestData) return { label: 'Sin datos', color: 'text-gray-500', bg: 'bg-gray-100' };
  const temp = latestData.temperature?.average ?? 0;
  const hum  = latestData.humidity ?? 0;
  const gas  = latestData.gases?.co2 ?? 0;
  if ((temp > 30 && hum > 65 && gas > 100) || gas > 150)
    return { label: 'Crítico',  color: 'text-red-700',   bg: 'bg-red-100'   };
  if (temp > 28 || hum > 70 || gas > 100)
    return { label: 'Atención', color: 'text-amber-700', bg: 'bg-amber-100' };
  return { label: 'Normal', color: 'text-green-700', bg: 'bg-green-100' };
};

const estadoOrder = { 'Crítico': 0, 'Atención': 1, 'Normal': 2, 'Sin datos': 3 };
const getStockColor = (p) => (p >= 60 ? 'bg-green-500' : p >= 30 ? 'bg-amber-400' : 'bg-red-500');

// Cabecera de columna ordenable
function SortHeader({ label, field, sortBy, sortDir, onSort }) {
  const active = sortBy === field;
  return (
    <button
      className="flex items-center gap-1 group select-none hover:text-gray-800 transition-colors"
      onClick={() => onSort(field)}
    >
      {label}
      {active
        ? sortDir === 'asc'
          ? <ArrowUp className="h-3 w-3 text-orange-500" />
          : <ArrowDown className="h-3 w-3 text-orange-500" />
        : <ArrowUpDown className="h-3 w-3 opacity-30 group-hover:opacity-60" />}
    </button>
  );
}

// ── componente principal ───────────────────────────────────────────────────────
function SilosTable({ silos, loading, onSelectSilo, onSiloCreated, onSiloUpdated, onSiloDeleted }) {
  const [searchTerm,    setSearchTerm]    = useState('');
  const [filterEstado,  setFilterEstado]  = useState('');
  const [filterGrano,   setFilterGrano]   = useState('');
  const [filterStock,   setFilterStock]   = useState('');  // '' | 'low' | 'mid' | 'high'
  const [filterConex,   setFilterConex]   = useState('');  // '' | 'online' | 'offline'
  const [sortBy,        setSortBy]        = useState('name');
  const [sortDir,       setSortDir]       = useState('asc');

  const [histories,   setHistories]   = useState({});
  const [modalOpen,   setModalOpen]   = useState(false);
  const [editingSilo, setEditingSilo] = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [saveError,   setSaveError]   = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // ── cargar historial para calcular días de stock ────────────────────────────
  useEffect(() => {
    if (!silos.length) return;
    const load = async () => {
      const results = await Promise.all(
        silos.map(async (s) => {
          try {
            const h = await getSiloHistory(s.id, { limit: 30, hours: 168 });
            return { siloId: s.id, history: h };
          } catch { return { siloId: s.id, history: [] }; }
        })
      );
      const map = {};
      results.forEach(({ siloId, history }) => { map[siloId] = history; });
      setHistories(map);
    };
    load();
    const iv = setInterval(load, 10_000);
    return () => clearInterval(iv);
  }, [silos]);

  // ── sort handler ───────────────────────────────────────────────────────────
  const handleSort = (field) => {
    if (sortBy === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(field); setSortDir('asc'); }
  };

  // ── filtrado + ordenamiento ─────────────────────────────────────────────────
  const processed = useMemo(() => {
    const now = Date.now();

    let list = silos.map((s) => {
      const ld       = s.latestData;
      const estado   = getEstado(ld);
      const stockPct = ld?.grainLevel?.percentage ?? 0;
      const weight   = ld?.grainLevel?.tons ?? 0;
      const lastTs   = ld?.timestamp ? new Date(ld.timestamp).getTime() : 0;
      const online   = lastTs > 0 && (now - lastTs) / 60_000 < 30;
      return { ...s, _estado: estado, _stockPct: stockPct, _weight: weight, _lastTs: lastTs, _online: online };
    });

    // búsqueda de texto
    if (searchTerm.trim()) {
      const t = searchTerm.toLowerCase();
      list = list.filter(
        (s) => s.name?.toLowerCase().includes(t) ||
               s.location?.toLowerCase().includes(t) ||
               s.grainType?.toLowerCase().includes(t)
      );
    }

    // filtros
    if (filterEstado)  list = list.filter((s) => s._estado.label === filterEstado);
    if (filterGrano)   list = list.filter((s) => s.grainType === filterGrano);
    if (filterConex === 'online')  list = list.filter((s) =>  s._online);
    if (filterConex === 'offline') list = list.filter((s) => !s._online);
    if (filterStock === 'low')  list = list.filter((s) => s._stockPct <  30);
    if (filterStock === 'mid')  list = list.filter((s) => s._stockPct >= 30 && s._stockPct < 70);
    if (filterStock === 'high') list = list.filter((s) => s._stockPct >= 70);

    // ordenamiento
    list = [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'name':    cmp = (a.name ?? '').localeCompare(b.name ?? ''); break;
        case 'stock':   cmp = a._stockPct - b._stockPct; break;
        case 'weight':  cmp = a._weight - b._weight; break;
        case 'estado':  cmp = estadoOrder[a._estado.label] - estadoOrder[b._estado.label]; break;
        case 'lastRead':cmp = a._lastTs - b._lastTs; break;
        case 'grain':   cmp = (a.grainType ?? '').localeCompare(b.grainType ?? ''); break;
        default: break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [silos, searchTerm, filterEstado, filterGrano, filterStock, filterConex, sortBy, sortDir]);

  const activeFilters = [filterEstado, filterGrano, filterStock, filterConex].filter(Boolean).length;

  const clearFilters = () => {
    setFilterEstado('');
    setFilterGrano('');
    setFilterStock('');
    setFilterConex('');
    setSearchTerm('');
  };

  const calculateStockDays = (silo) => {
    if (!silo.latestData) return { days: 0, dailyConsumption: 0 };
    const history = histories[silo.id] || [];
    if (history.length < 2) {
      const tons = silo.latestData.grainLevel?.tons ?? 0;
      return { days: tons ? Math.round(tons / 0.5) : 0, dailyConsumption: 500 };
    }
    const sorted = [...history].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const first = sorted[0]; const last = sorted[sorted.length - 1];
    const daysDiff = (new Date(last.timestamp) - new Date(first.timestamp)) / 86_400_000;
    if (daysDiff <= 0) return { days: 0, dailyConsumption: 0 };
    const consumption = (first.grainLevel?.tons ?? 0) - (last.grainLevel?.tons ?? 0);
    const daily = Math.abs(consumption / daysDiff);
    const remaining = silo.latestData.grainLevel?.tons ?? 0;
    return { days: daily > 0 ? Math.round(remaining / daily) : 0, dailyConsumption: (daily * 1000).toFixed(0) };
  };

  // ── modal handlers ─────────────────────────────────────────────────────────
  const handleOpenCreate  = () => { setEditingSilo(null); setSaveError(''); setModalOpen(true); };
  const handleOpenEdit    = (e, silo) => { e.stopPropagation(); setEditingSilo(silo); setSaveError(''); setModalOpen(true); };
  const handleCloseModal  = () => { setModalOpen(false); setEditingSilo(null); setSaveError(''); };

  const handleSave = async (data) => {
    setSaving(true); setSaveError('');
    try {
      if (editingSilo) { await updateSilo(editingSilo.id, data); onSiloUpdated?.(); }
      else             { await createSilo(data);                   onSiloCreated?.(); }
      handleCloseModal();
    } catch (err) {
      setSaveError(err.response?.data?.error || err.message || 'Error al guardar el silo');
    } finally { setSaving(false); }
  };

  const handleDeleteClick   = (e, silo) => { e.stopPropagation(); setDeleteConfirm(silo.id); };
  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    try { await deleteSilo(deleteConfirm); onSiloDeleted?.(); setDeleteConfirm(null); }
    catch (err) { console.error(err); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-12 text-gray-500">Cargando silos…</div>
  );

  return (
    <div className="space-y-4">
      {/* ── Búsqueda + botón nuevo ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Input
            placeholder="Buscar por nombre, ubicación o producto…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-4 pr-10 h-10"
          />
          {searchTerm
            ? <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
            : <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />}
        </div>
        <Button onClick={handleOpenCreate} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" /> Agregar silo
        </Button>
      </div>

      {/* ── Filtros ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 text-xs text-gray-500 font-medium shrink-0">
          <Filter className="h-3.5 w-3.5" /> Filtrar:
        </span>

        {/* Estado */}
        {['Normal', 'Atención', 'Crítico'].map((e) => (
          <button
            key={e}
            onClick={() => setFilterEstado(filterEstado === e ? '' : e)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
              filterEstado === e
                ? e === 'Crítico'  ? 'bg-red-100 border-red-400 text-red-700'
                : e === 'Atención' ? 'bg-amber-100 border-amber-400 text-amber-700'
                :                    'bg-green-100 border-green-400 text-green-700'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
            }`}
          >{e}</button>
        ))}

        {/* Conexión */}
        <button
          onClick={() => setFilterConex(filterConex === 'online' ? '' : 'online')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
            filterConex === 'online' ? 'bg-green-100 border-green-400 text-green-700' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
          }`}
        ><Wifi className="h-3 w-3" /> En línea</button>
        <button
          onClick={() => setFilterConex(filterConex === 'offline' ? '' : 'offline')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
            filterConex === 'offline' ? 'bg-gray-200 border-gray-400 text-gray-700' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
          }`}
        ><WifiOff className="h-3 w-3" /> Sin señal</button>

        {/* Nivel de stock */}
        {[
          { key: 'low',  label: '< 30%',  cls: 'bg-red-100 border-red-400 text-red-700'     },
          { key: 'mid',  label: '30-70%', cls: 'bg-amber-100 border-amber-400 text-amber-700' },
          { key: 'high', label: '> 70%',  cls: 'bg-green-100 border-green-400 text-green-700' },
        ].map(({ key, label, cls }) => (
          <button
            key={key}
            onClick={() => setFilterStock(filterStock === key ? '' : key)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
              filterStock === key ? cls : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
            }`}
          >Stock {label}</button>
        ))}

        {/* Tipo de grano */}
        <select
          value={filterGrano}
          onChange={(e) => setFilterGrano(e.target.value)}
          className="h-7 px-2 text-xs border border-gray-200 rounded-full bg-white text-gray-600 hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-orange-300 cursor-pointer"
        >
          <option value="">Todos los granos</option>
          {GRAIN_TYPES.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>

        {/* Limpiar filtros */}
        {activeFilters > 0 && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border border-orange-300 bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors"
          >
            <X className="h-3 w-3" /> Limpiar ({activeFilters})
          </button>
        )}
      </div>

      {/* Contador */}
      <p className="text-sm text-gray-500">
        Mostrando <span className="font-semibold text-gray-800">{processed.length}</span> de{' '}
        <span className="font-semibold text-gray-800">{silos.length}</span> silos
      </p>

      {/* ── Tabla ────────────────────────────────────────────────────────────── */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    <SortHeader label="Nombre"   field="name"    sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    <SortHeader label="Producto" field="grain"   sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    <SortHeader label="Peso"     field="weight"  sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Días stock
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    <SortHeader label="Stock %"  field="stock"   sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    <SortHeader label="Estado"   field="estado"  sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    <SortHeader label="Última lectura" field="lastRead" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase w-24">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {processed.map((silo) => {
                  const ld         = silo.latestData;
                  const stockDays  = calculateStockDays(silo);
                  const stockPct   = silo._stockPct;
                  const weight     = silo._weight;
                  const capacity   = silo.capacity || 100;
                  const freeSpace  = Math.max(0, capacity - weight);
                  const isDeleting = deleteConfirm === silo.id;
                  const estado     = silo._estado;
                  const online     = silo._online;
                  const lastTs     = silo._lastTs;

                  return (
                    <tr
                      key={silo.id}
                      onClick={() => onSelectSilo(silo)}
                      className="hover:bg-orange-50/40 cursor-pointer transition-colors"
                    >
                      {/* Nombre */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="text-base">🌾</span>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{silo.name}</p>
                            {silo.location && <p className="text-xs text-gray-400">{silo.location}</p>}
                          </div>
                        </div>
                      </td>

                      {/* Producto */}
                      <td className="px-5 py-3.5 text-sm text-gray-700">{silo.grainType || '—'}</td>

                      {/* Peso */}
                      <td className="px-5 py-3.5 text-sm">
                        <span className="font-medium">{weight.toFixed(2)} t</span>
                        <span className="text-xs text-gray-400 block">{freeSpace.toFixed(1)} t libre</span>
                      </td>

                      {/* Días stock */}
                      <td className="px-5 py-3.5 text-sm">
                        {stockDays.days > 0
                          ? <><span className="font-medium">{stockDays.days} d</span>
                              {stockDays.dailyConsumption > 0 && <span className="text-xs text-gray-400 block">{stockDays.dailyConsumption} kg/día</span>}</>
                          : <span className="text-gray-400">—</span>}
                      </td>

                      {/* Stock % */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium w-10">{stockPct.toFixed(1)}%</span>
                          <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${getStockColor(stockPct)}`}
                              style={{ width: `${Math.min(stockPct, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${estado.bg} ${estado.color}`}>
                          {estado.label}
                        </span>
                      </td>

                      {/* Última lectura */}
                      <td className="px-5 py-3.5 text-xs text-gray-500">
                        {lastTs > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-green-500' : 'bg-gray-400'}`} />
                            <span>{new Date(lastTs).toLocaleString('es-AR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}</span>
                          </div>
                        ) : <span className="text-gray-300">Sin datos</span>}
                      </td>

                      {/* Acciones */}
                      <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        {isDeleting ? (
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(null)}>No</Button>
                            <Button variant="destructive" size="sm" onClick={handleDeleteConfirm}>Eliminar</Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={(e) => handleOpenEdit(e, silo)} title="Editar">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={(e) => handleDeleteClick(e, silo)} title="Eliminar" className="text-red-500 hover:text-red-700">
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

      {processed.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            {silos.length === 0
              ? 'No tenés silos. Agregá uno con el botón "Agregar silo".'
              : 'No hay resultados para los filtros aplicados.'}
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
