import { useMemo } from 'react';

export const SiloVisual = ({ percentage }) => {
  // Aseguramos que el porcentaje esté entre 0 y 100
  const fillHeight = Math.min(Math.max(percentage, 0), 100);
  
  // Generar ID único para el clipPath
  const clipId = useMemo(() => `siloClip-${Math.random().toString(36).substr(2, 9)}`, []);

  return (
    <div className="relative w-16 h-32 mx-auto">
      <svg
        viewBox="0 0 100 200"
        className="w-full h-full drop-shadow-sm"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Definición de la máscara (La forma del silo) */}
        <defs>
          <clipPath id={clipId}>
            <path d="M10,20 Q50,0 90,20 V170 L50,195 L10,170 Z" />
          </clipPath>
        </defs>

        {/* Fondo del Silo (Gris vacío) */}
        <path
          d="M10,20 Q50,0 90,20 V170 L50,195 L10,170 Z"
          className="fill-slate-100 stroke-slate-300 stroke-2"
        />

        {/* El Líquido (Nivel de llenado) */}
        <g clipPath={`url(#${clipId})`}>
          <rect
            x="0"
            y={200 - (fillHeight * 2)} // Calculo invertido para subir desde abajo
            width="100"
            height="200"
            className="fill-green-500 transition-all duration-1000 ease-in-out" // Animación suave
          />
        </g>

        {/* Borde del Silo (Encima de todo para que quede prolijo) */}
        <path
          d="M10,20 Q50,0 90,20 V170 L50,195 L10,170 Z"
          className="fill-none stroke-slate-400 stroke-2"
        />
      </svg>
      
      {/* Texto del porcentaje superpuesto (Opcional, estilo Insylo) */}
      <div className="absolute top-1/2 left-0 right-0 text-center font-bold text-xs text-slate-600">
        {percentage.toFixed(0)}%
      </div>
    </div>
  );
};

