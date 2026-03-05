/**
 * @param {{ estado: import('../types/siloEstadoIoT').SiloEstadoIoT }} props
 */
export default function SiloEstadoIoT({ estado }) {
  const { temperatura, humedad, gas, nivel, fotoSiloUrl } = estado;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="text-sm text-gray-500">Temperatura</div>
        <div className="mt-1 text-2xl font-semibold text-gray-900">{temperatura.toFixed(1)}°C</div>
      </div>

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="text-sm text-gray-500">Humedad</div>
        <div className="mt-1 text-2xl font-semibold text-gray-900">{humedad.toFixed(1)}%</div>
      </div>

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="text-sm text-gray-500">Gas</div>
        <div className="mt-1 text-2xl font-semibold text-gray-900">{Number.isFinite(gas) ? gas : 0} ppm</div>
      </div>

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="text-sm text-gray-500">Nivel</div>
        <div className="mt-1 text-2xl font-semibold text-gray-900">{Number.isFinite(nivel) ? nivel : 0}%</div>
      </div>

      <div className="rounded-xl border bg-white p-4 shadow-sm lg:col-span-2">
        <div className="text-sm text-gray-500">Imagen del silo</div>
        <div className="mt-3 overflow-hidden rounded-lg bg-gray-100">
          <img src={fotoSiloUrl} alt="Foto del silo" className="h-64 w-full object-cover" loading="lazy" />
        </div>
      </div>
    </div>
  );
}

