import React from 'react';

interface BarChartProps {
  data: {
    label: string;
    value: number;
  }[];
  maxValue?: number;
  color?: string;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  maxValue,
  color = '#5B5FF5',
}) => {
  const max = maxValue || 100;

  return (
    <div className="h-full flex flex-col justify-end">
      <div className="flex items-end justify-between gap-4 h-full px-4">
        {data.map((item, index) => (
          <div key={index} className="flex flex-col items-center flex-1 group h-full justify-end">
            <div className="w-full bg-slate-50 rounded-t-2xl relative h-full flex items-end overflow-hidden">
              <div 
                className="w-full rounded-t-2xl transition-all duration-1000 ease-out group-hover:brightness-110 relative"
                style={{ 
                  backgroundColor: color,
                  height: `${(item.value / max) * 100}%` 
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
              </div>
            </div>
            <div className="mt-3 text-center">
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 line-clamp-1 w-full">{item.label}</p>
              <p className="text-sm font-black text-slate-700 mt-1">{item.value}%</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
