import { useMemo } from 'react';
import Plot from 'react-plotly.js';

/**
 * Resolución de la grilla. 120 puntos por lado para que el contorno
 * circular quede suave y no aparezca como un polígono.
 */
const GRID_POINTS = 120;

/**
 * Escala de color topográfica: amarillo claro (suelo/vacío) → naranja → rojo oscuro (pico/máximo nivel).
 */
const COLORSCALE = [
  [0,    '#FFD700'],
  [0.12, '#FFB800'],
  [0.3,  '#FF9500'],
  [0.55, '#FF5500'],
  [0.8,  '#CC2200'],
  [1,    '#7B0000'],
];

/**
 * MapaCalorSilo
 *
 * Renderiza un mapa de calor topográfico 2D (vista cenital) que simula
 * la montaña de granos dentro del silo usando física básica (Ángulo de Reposo).
 *
 * @param {number} distanciaVacia  cm desde el techo al centro del grano (sensor ultrasónico)
 * @param {number} alturaSilo      Altura total del silo en cm (default 1000)
 * @param {number} radioSilo       Radio del silo en cm (default 250)
 * @param {number} anguloReposo    Ángulo de reposo del grano en grados (default 30 → soja)
 */
export default function MapaCalorSilo({
  distanciaVacia = 0,
  alturaSilo = 1000,
  radioSilo = 250,
  anguloReposo = 30,
}) {
  const { zMatrix, xArr, yArr, zCentro } = useMemo(() => {
    // Eje X e Y simétricos centrados en el origen, con paso uniforme
    const xArr = Array.from(
      { length: GRID_POINTS },
      (_, i) => -radioSilo + (i / (GRID_POINTS - 1)) * radioSilo * 2
    );
    const yArr = [...xArr];

    // Altura del pico en el centro: diferencia entre la altura total y el espacio vacío medido
    const zCentro = Math.max(0, alturaSilo - distanciaVacia);
    const tanReposo = Math.tan((anguloReposo * Math.PI) / 180);

    // Para cada punto (xi, yi) calculamos la altura del grano según el modelo de cono
    const zMatrix = yArr.map((yi) =>
      xArr.map((xi) => {
        const r = Math.sqrt(xi * xi + yi * yi);
        // Fuera del círculo del silo → null para que Plotly deje el área vacía
        if (r > radioSilo) return null;
        // Z = Z_centro - (r × tan(ángulo_reposo)), mínimo 0 (no puede haber altura negativa)
        return Math.max(0, zCentro - r * tanReposo);
      })
    );

    return { zMatrix, xArr, yArr, zCentro };
  }, [distanciaVacia, alturaSilo, radioSilo, anguloReposo]);

  const porcentajeLlenado = alturaSilo > 0
    ? Math.round(Math.min(100, (zCentro / alturaSilo) * 100))
    : 0;

  const isEmpty = zCentro <= 0;

  return (
    <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-gray-900">
      <Plot
        data={[{
          z: zMatrix,
          x: xArr,
          y: yArr,
          // heatmap maneja null nativo sin crashear (contour falla en makeCrossings con nulls)
          type: 'heatmap',
          colorscale: COLORSCALE,
          zmin: 0,
          zmax: Math.max(alturaSilo, 1),
          showscale: false,
          // 'best' interpola colores entre celdas → mismo aspecto suave que contour+heatmap
          zsmooth: 'best',
        }]}
        layout={{
          autosize: true,
          margin: { l: 0, r: 0, t: 0, b: 0, pad: 0 },
          xaxis: {
            visible: false,
            showgrid: false,
            zeroline: false,
            fixedrange: true,
          },
          // scaleanchor garantiza que el silo se vea redondo, no elíptico
          yaxis: {
            visible: false,
            showgrid: false,
            zeroline: false,
            scaleanchor: 'x',
            fixedrange: true,
          },
          paper_bgcolor: 'transparent',
          plot_bgcolor: 'transparent',
        }}
        config={{ displayModeBar: false, responsive: true }}
        style={{ width: '100%', height: '100%' }}
        useResizeHandler
      />

      {/* Badge de porcentaje — esquina superior izquierda */}
      <div className="absolute top-1.5 left-1.5 bg-black/65 backdrop-blur-sm text-white text-xs font-semibold px-2 py-1 rounded-md leading-none">
        {isEmpty ? '—' : `${porcentajeLlenado} %`}
      </div>

      {/* Badge de ángulo de reposo — esquina inferior derecha */}
      <div className="absolute bottom-1.5 right-1.5 bg-black/65 backdrop-blur-sm text-gray-300 text-[10px] px-1.5 py-0.5 rounded">
        α {anguloReposo}°
      </div>

      {/* Overlay cuando el silo está vacío */}
      {isEmpty && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-gray-400 text-sm font-medium">Silo vacío</p>
          <p className="text-gray-600 text-xs mt-0.5">Sin grano detectado</p>
        </div>
      )}
    </div>
  );
}
