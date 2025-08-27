import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';

interface CallData {
  date: string;
  answered: number;
  missed: number;
}

interface CallVolumeChartProps {
  selectedPeriod: number;
  onDateClick?: (date: string) => void;
  startDate?: string;
  endDate?: string;
}

// Função para buscar dados reais de chamadas
async function fetchCallVolumeData(days: number = 14, startDate?: string, endDate?: string): Promise<CallData[]> {
  if (!supabase) {
    console.log('⚠️ Supabase não inicializado');
    return [];
  }

  try {
    console.log('🔍 Buscando dados de volume de chamadas:', { days, startDate, endDate });

    // Se temos datas específicas, usar elas
    let query = supabase
      .from('calls')
      .select('created_at, status')
      .order('created_at', { ascending: true });

    if (startDate && endDate) {
      query = query
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59');
    } else {
      // Usar período padrão
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);
      query = query
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Erro ao buscar dados de chamadas:', error);
      return [];
    }

    console.log('✅ Dados de chamadas carregados:', data?.length || 0);

    // Agrupar por data
    const groupedData = new Map<string, { answered: number; missed: number }>();

    data?.forEach((call: any) => {
      const date = new Date(call.created_at).toISOString().split('T')[0];
      const isAnswered = call.status !== 'missed';
      
      if (!groupedData.has(date)) {
        groupedData.set(date, { answered: 0, missed: 0 });
      }
      
      const current = groupedData.get(date)!;
      if (isAnswered) {
        current.answered++;
      } else {
        current.missed++;
      }
    });

    // Converter para array e ordenar por data
    const result: CallData[] = Array.from(groupedData.entries())
      .map(([date, counts]) => ({
        date,
        answered: counts.answered,
        missed: counts.missed
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    console.log('📊 Dados processados:', result);
    return result;

  } catch (error) {
    console.error('❌ Erro geral ao buscar dados:', error);
    return [];
  }
}

// Simple SVG line chart without external libs
export default function CallVolumeChart({ selectedPeriod, onDateClick, startDate, endDate }: CallVolumeChartProps) {
  const [data, setData] = useState<CallData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    content: string;
  }>({
    visible: false,
    x: 0,
    y: 0,
    content: ''
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const callData = await fetchCallVolumeData(selectedPeriod, startDate, endDate);
        setData(callData);
      } catch (err: any) {
        console.error('❌ Erro ao carregar dados:', err);
        setError(err?.message || 'Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedPeriod, startDate, endDate]);

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="mb-3">
          <h3 className="font-semibold text-slate-800">Volume de Chamadas por Dia</h3>
        </div>
        <div className="flex items-center justify-center h-60">
          <div className="text-slate-500">Carregando dados...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="mb-3">
          <h3 className="font-semibold text-slate-800">Volume de Chamadas por Dia</h3>
        </div>
        <div className="flex items-center justify-center h-60">
          <div className="text-red-500">Erro: {error}</div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="mb-3">
          <h3 className="font-semibold text-slate-800">Volume de Chamadas por Dia</h3>
        </div>
        <div className="flex items-center justify-center h-60">
          <div className="text-slate-500">Nenhum dado disponível</div>
        </div>
      </div>
    );
  }

  // Dimensões responsivas
  const containerWidth = typeof window !== 'undefined' ? Math.min(window.innerWidth - 40, 1200) : 800;
  const width = containerWidth;
  const height = 300;
  const margin = { top: 20, right: 30, bottom: 40, left: 60 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // Calcular escalas
  const maxValue = Math.max(...data.map(d => Math.max(d.answered, d.missed)));
  const yScale = (value: number) => chartHeight - (value / maxValue) * chartHeight;
  const xScale = (index: number) => (index / (data.length - 1)) * chartWidth;

  // Gerar pontos para as linhas
  const answeredPoints = data.map((d, i) => `${xScale(i)},${yScale(d.answered)}`).join(' ');
  const missedPoints = data.map((d, i) => `${xScale(i)},${yScale(d.missed)}`).join(' ');

  // Função para formatar data
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit' 
    });
  };

  // Função para lidar com hover
  const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left - margin.left;
    const index = Math.round((x / chartWidth) * (data.length - 1));
    
    if (index >= 0 && index < data.length) {
      const point = data[index];
      setTooltip({
        visible: true,
        x: event.clientX,
        y: event.clientY - 10,
        content: `${formatDate(point.date)}
Atendidas: ${point.answered}
Perdidas: ${point.missed}
Total: ${point.answered + point.missed}`
      });
    } else {
      setTooltip(prev => ({ ...prev, visible: false }));
    }
  };

  // Função para lidar com clique
  const handleClick = (event: React.MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left - margin.left;
    const index = Math.round((x / chartWidth) * (data.length - 1));
    
    if (index >= 0 && index < data.length && onDateClick) {
      onDateClick(data[index].date);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="mb-3">
        <h3 className="font-semibold text-slate-800">Volume de Chamadas por Dia</h3>
        <p className="text-sm text-slate-500">Clique em um ponto para filtrar por data</p>
      </div>
      
      <div className="relative w-full overflow-x-auto">
        <svg
          width={width}
          height={height}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(prev => ({ ...prev, visible: false }))}
          onClick={handleClick}
          className="cursor-pointer"
          style={{ minWidth: '100%' }}
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((tick, i) => (
            <g key={i}>
              <line
                x1={0}
                y1={margin.top + tick * chartHeight}
                x2={chartWidth}
                y2={margin.top + tick * chartHeight}
                stroke="#e2e8f0"
                strokeWidth="1"
              />
              <text
                x={-10}
                y={margin.top + tick * chartHeight + 4}
                textAnchor="end"
                fontSize="12"
                fill="#64748b"
              >
                {Math.round(maxValue * (1 - tick))}
              </text>
            </g>
          ))}

          {/* X-axis labels */}
          {data.map((d, i) => (
            <text
              key={i}
              x={margin.left + xScale(i)}
              y={height - 10}
              textAnchor="middle"
              fontSize="10"
              fill="#64748b"
              transform={`rotate(-45 ${margin.left + xScale(i)} ${height - 10})`}
            >
              {formatDate(d.date)}
            </text>
          ))}

          {/* Lines */}
          <g transform={`translate(${margin.left}, ${margin.top})`}>
            {/* Answered calls line */}
            <polyline
              points={answeredPoints}
              fill="none"
              stroke="#10b981"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            
            {/* Missed calls line */}
            <polyline
              points={missedPoints}
              fill="none"
              stroke="#ef4444"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data points */}
            {data.map((d, i) => (
              <g key={i}>
                <circle
                  cx={xScale(i)}
                  cy={yScale(d.answered)}
                  r="4"
                  fill="#10b981"
                  className="hover:r-6 transition-all duration-200"
                />
                <circle
                  cx={xScale(i)}
                  cy={yScale(d.missed)}
                  r="4"
                  fill="#ef4444"
                  className="hover:r-6 transition-all duration-200"
                />
              </g>
            ))}
          </g>

          {/* Legend */}
          <g transform={`translate(${margin.left}, ${margin.top - 10})`}>
            <circle cx="0" cy="0" r="4" fill="#10b981" />
            <text x="10" y="4" fontSize="12" fill="#374151">Atendidas</text>
            <circle cx="80" cy="0" r="4" fill="#ef4444" />
            <text x="90" y="4" fontSize="12" fill="#374151">Perdidas</text>
          </g>
        </svg>

        {/* Tooltip */}
        {tooltip.visible && (
          <div
            className="absolute bg-slate-800 text-white p-2 rounded text-xs pointer-events-none z-10"
            style={{
              left: tooltip.x + 10,
              top: tooltip.y - 10,
              transform: 'translateY(-100%)'
            }}
          >
            <pre className="whitespace-pre-line">{tooltip.content}</pre>
          </div>
        )}
      </div>
    </div>
  );
}


