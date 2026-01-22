import React from 'react';

interface DonutChartProps {
  data: {
    label: string;
    value: number;
    color: string;
  }[];
}

export const DonutChart: React.FC<DonutChartProps> = ({ data }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  // Calcular percentuais
  const segments = data.map((item) => ({
    ...item,
    percentage: total > 0 ? (item.value / total) * 100 : 0,
  }));

  // Calcular stroke-dasharray para cada segmento
  const circumference = 2 * Math.PI * 40; // raio = 40
  let offset = 0;

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="#f1f5f9"
          strokeWidth="12"
        />
        
        {/* Segments */}
        {segments.map((segment, index) => {
          const dashLength = (segment.percentage / 100) * circumference;
          const dashOffset = -offset;
          offset += dashLength;
          
          if (segment.percentage === 0) return null;
          
          return (
            <circle
              key={index}
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke={segment.color}
              strokeWidth="12"
              strokeDasharray={`${dashLength} ${circumference - dashLength}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
              style={{
                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))',
              }}
            />
          );
        })}
      </svg>
    </div>
  );
};

// Componente alternativo: Barras de saúde
interface HealthBarsProps {
  data: {
    label: string;
    value: number;
    color: string;
    bgColor: string;
  }[];
  total: number;
}

export const HealthBars: React.FC<HealthBarsProps> = ({ data, total }) => {
  return (
    <div className="w-full space-y-4">
      {data.map((item, index) => {
        const percentage = total > 0 ? (item.value / total) * 100 : 0;
        return (
          <div key={index} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div 
                  className="w-2.5 h-2.5 rounded-full" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm font-semibold text-slate-600">
                  {item.label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-slate-900">{item.value}</span>
                <span className="text-xs text-slate-400">
                  ({Math.round(percentage)}%)
                </span>
              </div>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: item.bgColor }}>
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{ 
                  width: `${percentage}%`,
                  backgroundColor: item.color,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
