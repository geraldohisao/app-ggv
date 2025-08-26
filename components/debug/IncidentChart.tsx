import React from 'react';

interface IncidentData {
  date: string;
  count: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface IncidentChartProps {
  data: IncidentData[];
  title?: string;
}

export const IncidentChart: React.FC<IncidentChartProps> = ({ data, title = 'Tendência de Incidentes' }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
        <p className="text-gray-500">Nenhum dado disponível para exibir</p>
      </div>
    );
  }

  const maxCount = Math.max(...data.map(d => d.count));
  const maxBarHeight = 120; // pixels

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="font-semibold text-gray-800 mb-4">{title}</h3>
      
      <div className="flex items-end justify-between h-32 gap-2">
        {data.map((item, index) => {
          const barHeight = maxCount > 0 ? (item.count / maxCount) * maxBarHeight : 0;
          
          return (
            <div key={index} className="flex flex-col items-center flex-1">
              <div className="text-xs text-gray-600 mb-1">{item.count}</div>
              <div
                className={`w-full rounded-t ${getSeverityColor(item.severity)} transition-all duration-300 hover:opacity-80`}
                style={{ height: `${barHeight}px` }}
                title={`${item.count} incidentes em ${formatDate(item.date)}`}
              />
              <div className="text-xs text-gray-500 mt-1 transform -rotate-45 origin-left">
                {formatDate(item.date)}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 flex justify-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-500 rounded"></div>
          <span>Crítico</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-orange-500 rounded"></div>
          <span>Alto</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-yellow-500 rounded"></div>
          <span>Médio</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span>Baixo</span>
        </div>
      </div>
    </div>
  );
};

export default IncidentChart;
