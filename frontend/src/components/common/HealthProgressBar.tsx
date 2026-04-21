import React from 'react';
import type { HealthRangeResult } from '../../utils/healthRanges';

interface Props {
  evaluation: HealthRangeResult;
}

export const HealthProgressBar: React.FC<Props> = ({ evaluation }) => {
  const { status, progressPct, recommendation } = evaluation;

  // Determine pointer color based on status
  let pointerColor = 'text-[#4CAF82]';
  if (status === 'attention') pointerColor = 'text-amber-500';
  if (status === 'low' || status === 'high') pointerColor = 'text-[#EF5350]';

  return (
    <div className="w-full mt-4">
      {/* Rango de Barra */}
      <div className="relative h-2.5 w-full bg-[#E8EDF2] rounded-full overflow-hidden">
        {/* Usamos un background fijo con los gradientes. 
            Izquierda: Rojo bajo (Low), Centro: Verde (Normal), Derecha: Rojo alto (High) */}
        <div 
          className="absolute inset-0 w-full h-full"
          style={{
            background: 'linear-gradient(90deg, #EF5350 0%, #4CAF82 25%, #4CAF82 75%, #EF5350 100%)'
          }}
        />
      </div>

      {/* Indicador Flotante (Pip) */}
      <div 
        className="relative w-full h-4 -mt-4 mb-2 pointer-events-none"
      >
        <div 
          className="absolute top-1/2 -ml-2 -mt-1 drop-shadow-md transition-all duration-700 ease-out" 
          style={{ left: `${progressPct}%` }}
        >
          <i className={`fa-solid fa-caret-down text-xl ${pointerColor}`}></i>
        </div>
      </div>

      {/* Recomendación Textual */}
      <div className="mt-4 flex items-start gap-2 bg-[#F8FAFB] p-3 rounded-xl border border-[#E8EDF2]">
        <i className={`fa-solid ${
          status === 'normal' ? 'fa-circle-check text-[#4CAF82]' : 
          status === 'attention' ? 'fa-triangle-exclamation text-amber-500' :
          'fa-circle-xmark text-[#EF5350]'
        } mt-0.5`}></i>
        <p className="text-xs text-[#1A2B3C] font-medium leading-relaxed text-left flex-1">
          {recommendation}
        </p>
      </div>
    </div>
  );
};
