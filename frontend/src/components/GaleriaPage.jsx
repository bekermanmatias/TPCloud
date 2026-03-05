import { useState, useEffect, useMemo } from 'react';
import { getGallery, deleteCapture, getSiloHistoryImageUrl } from '../services/api';
import {
  Trash2, Maximize2, X, Camera, Loader2, Folder,
  Thermometer, Droplets, Wind, Package, RefreshCw,
  ChevronDown, Filter
} from 'lucide-react';

// ── Lightbox ──────────────────────────────────────────────────────────────────
function Lightbox({ src, alt, onClose }) {
  useEffect(() => {
    const fn = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 bg-white/10 hover:bg-white/25 text-white rounded-full p-2 transition-colors"
      >
        <X className="h-5 w-5" />
      </button>
      <img
        src={src}
        alt={alt}
        className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-2xl object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getEstado(row) {
  const t  = row.temperature;
  const h  = row.humidity;
  const co = row.co2;
  if (t > 35 || h > 80 || co > 150) return { label: 'Crítico',  bg: 'bg-red-100',    text: 'text-red-700'    };
  if (t > 28 || h > 70 || co > 100) return { label: 'Atención', bg: 'bg-yellow-100', text: 'text-yellow-700' };
  return                                     { label: 'Normal',   bg: 'bg-green-100',  text: 'text-green-700'  };
}

function formatDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function GaleriaPage() {
  const [items, setItems]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [lightbox, setLightbox]   = useState(null);
  const [deleting, setDeleting]   = useState(null);

  // Filtros
  const [filterSilo, setFilterSilo]   = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterEstado, setFilterEstado] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await getGallery();
      setItems(data);
    } catch {
      /* silencioso */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Lista de silos únicos para el filtro
  const silos = useMemo(() => {
    const map = {};
    items.forEach(i => { if (i.silo_id) map[i.silo_id] = i.silo_name || i.silo_id; });
    return Object.entries(map);
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter(i => {
      if (filterSilo   && i.silo_id !== filterSilo) return false;
      if (filterSource && i.source  !== filterSource) return false;
      if (filterEstado) {
        const e = getEstado(i);
        if (e.label !== filterEstado) return false;
      }
      return true;
    });
  }, [items, filterSilo, filterSource, filterEstado]);

  const handleDelete = async (id) => {
    if (deleting === id) {
      try {
        await deleteCapture(id);
        setItems(prev => prev.filter(i => i.id !== id));
      } catch {
        /* silencioso */
      } finally {
        setDeleting(null);
      }
    } else {
      setDeleting(id);
    }
  };

  const clearFilters = () => {
    setFilterSilo('');
    setFilterSource('');
    setFilterEstado('');
  };
  const hasFilters = filterSilo || filterSource || filterEstado;

  return (
    <div className="space-y-6">
      {lightbox && (
        <Lightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />
      )}

      {/* Cabecera */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 mb-1">Galería</h1>
          <p className="text-gray-500 text-sm">
            Capturas guardadas desde el detalle de cada silo.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-gray-400" />

        {silos.length > 1 && (
          <select
            value={filterSilo}
            onChange={e => setFilterSilo(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-300"
          >
            <option value="">Todos los silos</option>
            {silos.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        )}

        <select
          value={filterSource}
          onChange={e => setFilterSource(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-300"
        >
          <option value="">Origen: todos</option>
          <option value="live">En vivo</option>
          <option value="historical">Historial</option>
        </select>

        <select
          value={filterEstado}
          onChange={e => setFilterEstado(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-300"
        >
          <option value="">Estado: todos</option>
          <option value="Normal">Normal</option>
          <option value="Atención">Atención</option>
          <option value="Crítico">Crítico</option>
        </select>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-orange-600 hover:text-orange-800 underline"
          >
            Limpiar filtros
          </button>
        )}

        <span className="ml-auto text-xs text-gray-400">
          {filtered.length} de {items.length} captura{items.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Contenido */}
      {loading && items.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-gray-400 gap-3">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Cargando galería…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-4">
          <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100">
            <Folder className="h-12 w-12 text-gray-300" />
          </div>
          <div className="text-center">
            <p className="font-medium text-gray-500">
              {items.length === 0 ? 'Aún no hay capturas guardadas' : 'Sin resultados con estos filtros'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {items.length === 0
                ? 'Guardá una captura desde la cámara en vivo o el historial visual de cualquier silo.'
                : 'Probá con otros filtros o limpiá la selección.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((item) => {
            const estado  = getEstado(item);
            const imgUrl  = getSiloHistoryImageUrl(item.image_path);
            const isDel   = deleting === item.id;
            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col"
              >
                {/* Imagen */}
                <div className="relative group aspect-video bg-gray-100">
                  {imgUrl ? (
                    <>
                      <img
                        src={imgUrl}
                        alt={`Captura ${formatDate(item.captured_at)}`}
                        className="w-full h-full object-cover"
                        onError={e => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextSibling.style.display = 'flex';
                        }}
                      />
                      <div className="hidden w-full h-full absolute inset-0 items-center justify-center text-gray-400 flex-col gap-1 text-xs bg-gray-100">
                        <Camera className="h-6 w-6" />
                        <span>Sin imagen</span>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 flex-col gap-1 text-xs">
                      <Camera className="h-8 w-8" />
                      <span>Sin imagen</span>
                    </div>
                  )}

                  {/* Botón pantalla completa */}
                  {imgUrl && (
                    <button
                      onClick={() => setLightbox({ src: imgUrl, alt: `Captura ${formatDate(item.captured_at)}` })}
                      className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/80 text-white rounded-md p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Ver en pantalla completa"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {/* Badge origen */}
                  <span className={`absolute bottom-2 left-2 text-[10px] font-medium px-1.5 py-0.5 rounded ${
                    item.source === 'historical'
                      ? 'bg-blue-700/80 text-white'
                      : 'bg-orange-600/80 text-white'
                  }`}>
                    {item.source === 'historical' ? 'Historial' : 'En vivo'}
                  </span>
                </div>

                {/* Datos */}
                <div className="p-3 flex flex-col gap-2 flex-1">
                  {/* Silo + fecha */}
                  <div>
                    <p className="text-sm font-semibold text-gray-800 truncate">{item.silo_name || item.silo_id}</p>
                    <p className="text-xs text-gray-400">{formatDate(item.captured_at)}</p>
                  </div>

                  {/* Estado */}
                  <span className={`self-start text-xs font-semibold px-2 py-0.5 rounded-full ${estado.bg} ${estado.text}`}>
                    {estado.label}
                  </span>

                  {/* Métricas */}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <Thermometer className="h-3 w-3 text-orange-400 shrink-0" />
                      <span>{item.temperature != null ? `${Number(item.temperature).toFixed(1)} °C` : '—'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Droplets className="h-3 w-3 text-blue-400 shrink-0" />
                      <span>{item.humidity != null ? `${Number(item.humidity).toFixed(1)} %` : '—'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Wind className="h-3 w-3 text-purple-400 shrink-0" />
                      <span>{item.co2 != null ? `${Math.round(item.co2)} ppm` : '—'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Package className="h-3 w-3 text-amber-500 shrink-0" />
                      <span>
                        {item.grain_level_percentage != null
                          ? `${Number(item.grain_level_percentage).toFixed(1)}%`
                          : '—'}
                        {item.grain_level_tons != null
                          ? ` · ${Number(item.grain_level_tons).toFixed(1)} t`
                          : ''}
                      </span>
                    </div>
                  </div>

                  {/* Botón eliminar */}
                  <div className="mt-auto pt-1 flex justify-end">
                    <button
                      onClick={() => handleDelete(item.id)}
                      className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-colors ${
                        isDel
                          ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                          : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                      }`}
                      title={isDel ? 'Confirmar eliminación' : 'Eliminar captura'}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {isDel ? 'Confirmar' : 'Eliminar'}
                    </button>
                    {isDel && (
                      <button
                        onClick={() => setDeleting(null)}
                        className="ml-1 text-xs text-gray-400 hover:text-gray-600 px-2 py-1"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
