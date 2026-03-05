import { useState, useEffect, useMemo } from 'react';
import { Routes, Route, useNavigate, useParams, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AuthPage from './components/AuthPage';
import Sidebar from './components/Sidebar';
import SilosTable from './components/SilosTable';
import SiloDetailView from './components/SiloDetailView';
import SiloSummaryCard from './components/SiloSummaryCard';
import GlobalAlertsPanel from './components/GlobalAlertsPanel';
import ConfiguracionPage from './components/ConfiguracionPage';
import { getSilos, getSiloById, getActiveAlerts } from './services/api';
import { Warehouse, Wifi, AlertTriangle, Package, Map, BarChart3, Clock } from 'lucide-react';

// ── Layout compartido (sidebar + contenido) ────────────────────────────────
function AppLayout({ children }) {
  return (
    <div className="app">
      <Sidebar />
      <main className="main-content-with-sidebar">
        {children}
      </main>
    </div>
  );
}

// ── Página "Próximamente" genérica ────────────────────────────────────────
function ProximamentePage({ icon: Icon, titulo, descripcion }) {
  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-5">
        <div className="p-5 rounded-2xl bg-orange-50 border border-orange-100">
          <Icon className="h-14 w-14 text-orange-300" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 mb-2">{titulo}</h1>
          <p className="text-gray-500 text-sm max-w-xs">{descripcion}</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 text-gray-500 text-sm font-medium">
          <Clock className="h-4 w-4" />
          Próximamente…
        </div>
      </div>
    </AppLayout>
  );
}

// ── Tarjeta de estadística ────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-4 shadow-sm`}>
      <div className={`p-2.5 rounded-lg ${accent}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
        {sub && <p className="text-[11px] text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

// ── Vista: panel de control (/) ───────────────────────────────────────────
function DashboardPage({ silos, loading, onSilosChange }) {
  const navigate = useNavigate();
  const [alerts,  setAlerts]  = useState([]);

  // Cargar alertas activas del usuario (polling)
  useEffect(() => {
    const load = async () => {
      try { setAlerts(await getActiveAlerts()); } catch { /* silencioso */ }
    };
    load();
    const iv = setInterval(load, 30_000);
    return () => clearInterval(iv);
  }, []);

  // Estadísticas globales
  const stats = useMemo(() => {
    const now = Date.now();
    const online    = silos.filter((s) => {
      const ts = s.latestData?.timestamp;
      return ts && (now - new Date(ts).getTime()) / 60_000 < 30;
    }).length;
    const totalTons = silos.reduce((acc, s) => acc + (s.latestData?.grainLevel?.tons ?? 0), 0);
    const activeAlerts = alerts.filter((a) => !a.acknowledged_at).length;
    return { total: silos.length, online, totalTons, activeAlerts };
  }, [silos, alerts]);

  // Mapa siloId → cantidad de alertas activas
  const alertCountBySilo = useMemo(() => {
    const map = {};
    alerts.filter((a) => !a.acknowledged_at).forEach((a) => {
      map[a.silo_id] = (map[a.silo_id] || 0) + 1;
    });
    return map;
  }, [alerts]);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Encabezado */}
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 mb-1">Panel de Control</h1>
          <p className="text-gray-500 text-sm">Resumen general de tus silos</p>
        </div>

        {/* Tarjetas de estadísticas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Warehouse}     label="Silos totales"     value={stats.total}                  accent="bg-gray-500"        />
          <StatCard icon={Wifi}          label="En línea"          value={stats.online}                 accent="bg-green-500"       sub={`${stats.total - stats.online} sin señal`} />
          <StatCard icon={AlertTriangle} label="Alertas activas"   value={stats.activeAlerts}           accent={stats.activeAlerts > 0 ? 'bg-red-500' : 'bg-gray-400'} />
          <StatCard icon={Package}       label="Toneladas totales" value={`${stats.totalTons.toFixed(1)} t`} accent="bg-orange-400" />
        </div>

        {/* Contenido principal: silos (izq) + alertas (der) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* ── Silos (2/3) ───────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">Tus silos</h2>
              <button
                onClick={() => navigate('/silos')}
                className="text-xs text-orange-500 hover:text-orange-600 hover:underline font-medium"
              >
                Ver todos →
              </button>
            </div>

            {loading && (
              <div className="text-sm text-gray-400 py-6 text-center">Cargando silos…</div>
            )}

            {!loading && silos.length === 0 && (
              <div className="rounded-xl border border-dashed border-gray-200 py-12 text-center text-gray-400">
                <Warehouse className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Aún no tenés silos registrados.</p>
                <button
                  onClick={() => navigate('/silos')}
                  className="mt-2 text-xs text-orange-500 hover:underline"
                >
                  Agregar silo →
                </button>
              </div>
            )}

            {!loading && silos.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {silos.map((silo) => (
                  <SiloSummaryCard
                    key={silo.id}
                    silo={silo}
                    alertCount={alertCountBySilo[silo.id] || 0}
                    onClick={() => navigate(`/silo/${silo.id}`)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Panel de alertas (1/3) ─────────────────────────────────────── */}
          <div className="lg:col-span-1 lg:sticky lg:top-4" style={{ minHeight: '420px' }}>
            <GlobalAlertsPanel silos={silos} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

// ── Vista: gestión de silos (/silos) ──────────────────────────────────────
function SilosPage({ silos, loading, onSilosChange }) {
  const navigate = useNavigate();
  const total    = silos.length;
  const online   = silos.filter((s) => {
    const ts = s.latestData?.timestamp;
    return ts && (Date.now() - new Date(ts).getTime()) / 60_000 < 30;
  }).length;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Encabezado */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 mb-1">Silos</h1>
            <p className="text-gray-500 text-sm">
              {total} silo{total !== 1 ? 's' : ''} registrado{total !== 1 ? 's' : ''}
              {total > 0 && (
                <span className="ml-3">
                  <span className="inline-flex items-center gap-1 text-green-600">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block" />
                    {online} en línea
                  </span>
                  {total - online > 0 && (
                    <span className="inline-flex items-center gap-1 text-gray-400 ml-3">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full inline-block" />
                      {total - online} sin señal
                    </span>
                  )}
                </span>
              )}
            </p>
          </div>
        </div>

        <SilosTable
          silos={silos}
          loading={loading}
          onSelectSilo={(silo) => navigate(`/silo/${silo.id}`)}
          onSiloCreated={onSilosChange}
          onSiloUpdated={onSilosChange}
          onSiloDeleted={onSilosChange}
        />
      </div>
    </AppLayout>
  );
}

// ── Vista: detalle de silo (/silo/:id) ────────────────────────────────────
function SiloDetailPage({ silos, onSiloUpdated }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [silo, setSilo] = useState(() => silos.find((s) => s.id === id) || null);
  const [notFound, setNotFound] = useState(false);

  // Cargar el silo si no estaba en la lista (acceso directo por URL)
  useEffect(() => {
    if (silo) return;
    getSiloById(id)
      .then((data) => {
        if (data) setSilo(data);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true));
  }, [id]);

  // Mantener el silo sincronizado cuando la lista principal se refresca
  useEffect(() => {
    const updated = silos.find((s) => s.id === id);
    if (updated) setSilo(updated);
  }, [silos, id]);

  if (notFound) return <Navigate to="/" replace />;
  if (!silo) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-24 text-gray-400">Cargando silo…</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <SiloDetailView
        silo={silo}
        onBack={() => navigate('/')}
        onSiloUpdated={(updated) => {
          setSilo(updated);
          onSiloUpdated?.();
        }}
      />
    </AppLayout>
  );
}

// ── Raíz ──────────────────────────────────────────────────────────────────
function App() {
  const { isAuthenticated } = useAuth();
  const [silos, setSilos] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadSilos = async () => {
    try {
      const data = await getSilos();
      setSilos(data);
    } catch (err) {
      console.error('Error al cargar silos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    loadSilos();
    const interval = setInterval(loadSilos, 5000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  if (!isAuthenticated) return <AuthPage />;

  return (
    <Routes>
      <Route
        path="/"
        element={
          <DashboardPage
            silos={silos}
            loading={loading}
            onSilosChange={loadSilos}
          />
        }
      />
      <Route
        path="/silos"
        element={
          <SilosPage
            silos={silos}
            loading={loading}
            onSilosChange={loadSilos}
          />
        }
      />
      <Route
        path="/silo/:id"
        element={
          <SiloDetailPage
            silos={silos}
            onSiloUpdated={loadSilos}
          />
        }
      />
      <Route
        path="/mapa"
        element={
          <ProximamentePage
            icon={Map}
            titulo="Mapa de silos"
            descripcion="Visualizá la ubicación geográfica de todos tus silos en un mapa interactivo."
          />
        }
      />
      <Route
        path="/reportes"
        element={
          <ProximamentePage
            icon={BarChart3}
            titulo="Reportes"
            descripcion="Generá informes detallados de temperatura, stock, alertas y consumo por períodos."
          />
        }
      />
      <Route
        path="/configuracion"
        element={
          <AppLayout>
            <ConfiguracionPage />
          </AppLayout>
        }
      />
      {/* Cualquier ruta desconocida → dashboard */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
