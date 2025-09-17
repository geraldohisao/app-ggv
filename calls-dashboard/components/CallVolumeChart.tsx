import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';

interface CallData {
  date: string;
  total: number;
  answered: number;
  missed: number;
  answeredRate: number; // 0-100
}

interface CallVolumeChartProps {
  selectedPeriod: number;
  onDateClick?: (date: string) => void;
  startDate?: string;
  endDate?: string;
  selectedSdrEmail?: string | null; // novo filtro
}

// Função para buscar dados reais de chamadas via RPC (evita RLS/timezone)
async function fetchCallVolumeData(days: number = 14, _startDate?: string, _endDate?: string, selectedSdrEmail?: string | null): Promise<CallData[]> {
  if (!supabase) {
    console.log('⚠️ Supabase não inicializado');
    return [];
  }

  try {
    console.log('🔍 fetchCallVolumeData via RPC get_calls_with_filters:', { days });

    // Calcular período
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));
    const startISO = start.toISOString();
    const endISO = end.toISOString();

    // Buscar chamadas no período usando a MESMA função da lista
    const { data, error } = await supabase.rpc('get_calls_with_filters', {
      p_sdr: selectedSdrEmail || null,
      p_status: null,
      p_type: null,
      p_start_date: startISO,
      p_end_date: endISO,
      p_limit: 10000,
      p_offset: 0,
      p_sort_by: 'created_at',
      p_min_duration: null,
      p_max_duration: null,
      p_min_score: null
    });

    if (error) {
      console.error('❌ Erro RPC get_calls_with_filters:', error);
      return [];
    }

    // Helper para chave local YYYY-MM-DD
    const toLocalKey = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    // Inicializar mapa de datas
    const grouped = new Map<string, { total: number; answered: number; missed: number }>();
    const cursor = new Date(start);
    while (cursor <= end) {
      grouped.set(toLocalKey(cursor), { total: 0, answered: 0, missed: 0 });
      cursor.setDate(cursor.getDate() + 1);
    }

    (data || []).forEach((row: any) => {
      const key = toLocalKey(new Date(row.created_at));
      const current = grouped.get(key);
      if (!current) return;
      current.total += 1;
      if (row.status_voip === 'normal_clearing') current.answered += 1; else current.missed += 1;
    });

    const result: CallData[] = Array.from(grouped.entries()).map(([date, c]) => {
      const answeredRate = c.total > 0 ? Math.round((c.answered / c.total) * 100) : 0;
      return { date, total: c.total, answered: c.answered, missed: c.missed, answeredRate };
    }).sort((a, b) => a.date.localeCompare(b.date));

    console.log('📊 Dados (RPC get_calls_with_filters) processados:', result);
    return result;

  } catch (error) {
    console.error('❌ Erro geral ao buscar dados (RPC):', error);
    return [];
  }
}

// Simple SVG line chart without external libs
export default function CallVolumeChart({ selectedPeriod, onDateClick, startDate, endDate, selectedSdrEmail }: CallVolumeChartProps) {
  const [data, setData] = useState<CallData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Debug: verificar parâmetros recebidos (apenas quando necessário)
  // console.log('📊 CallVolumeChart recebeu parâmetros:', { selectedPeriod, startDate, endDate });
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
      
      // Debug: logs apenas quando necessário
      // console.log('🔄 CallVolumeChart useEffect disparado');
      
      try {
        const callData = await fetchCallVolumeData(selectedPeriod, startDate, endDate, selectedSdrEmail);
        console.log('📊 Dados retornados pela função:', callData);
        setData(callData);
      } catch (err: any) {
        console.error('❌ Erro ao carregar dados:', err);
        setError(err?.message || 'Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedPeriod, startDate, endDate, selectedSdrEmail]);

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

  // Dimensões responsivas: usar largura do contêiner
  const width = typeof window !== 'undefined' ? Math.min(window.innerWidth - 80, 1400) : 800;
  const height = 300;
  const margin = { top: 20, right: 30, bottom: 40, left: 60 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // Calcular escalas
  const maxCount = Math.max(...data.map(d => Math.max(d.total, d.answered, d.missed)), 1);
  const yScaleCount = (value: number) => chartHeight - (value / maxCount) * chartHeight;
  const yScaleRate = (percent: number) => chartHeight - (percent / 100) * chartHeight;
  const xScale = (index: number) => (data.length <= 1 ? 0 : (index / (data.length - 1)) * chartWidth);

  // Gerar pontos para as linhas
  const totalPoints = data.map((d, i) => `${xScale(i)},${yScaleCount(d.total)}`).join(' ');
  const answeredPoints = data.map((d, i) => `${xScale(i)},${yScaleCount(d.answered)}`).join(' ');
  const missedPoints = data.map((d, i) => `${xScale(i)},${yScaleCount(d.missed)}`).join(' ');
  const ratePoints = data.map((d, i) => `${xScale(i)},${yScaleRate(d.answeredRate)}`).join(' ');

  // Função para formatar data
  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}`;
  };

  // Função para lidar com hover
  const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    // Largura real em pixels do chart (considerando margens)
    const chartWidthPx = Math.max(1, rect.width - margin.left - margin.right);
    // Posição X dentro da área do chart, clamp para [0, chartWidthPx]
    const xInChart = Math.min(Math.max(event.clientX - rect.left - margin.left, 0), chartWidthPx);
    // Índice proporcional ao comprimento do array
    const index = Math.round((xInChart / chartWidthPx) * (data.length - 1));

    if (index >= 0 && index < data.length) {
      const point = data[index];
      const total = point.total;
      const answeredRate = point.answeredRate;
      
      // Calcular posição do tooltip para não sair da tela
      const tooltipWidth = 200;
      const tooltipHeight = 120;
      let tooltipX = event.clientX + 15;
      let tooltipY = event.clientY - 10;
      
      // Ajustar se sair da direita da tela
      if (tooltipX + tooltipWidth > window.innerWidth) {
        tooltipX = event.clientX - tooltipWidth - 15;
      }
      
      // Ajustar se sair do topo da tela
      if (tooltipY - tooltipHeight < 0) {
        tooltipY = event.clientY + 20;
      }
      
      setTooltip({
        visible: true,
        x: tooltipX,
        y: tooltipY,
        content: `${formatDate(point.date)}
📞 Total: ${total} chamadas
✅ Atendidas: ${point.answered} (${answeredRate}%)
❌ Não Atendidas: ${point.missed}
📊 Taxa de Atendimento: ${answeredRate}%`
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

  // Determinar título baseado nos filtros - FORÇADO
  const isSpecificDateForTitle = !!(startDate && endDate);
  console.log('🏷️ Determinando título:', { startDate, endDate, isSpecificDateForTitle });
  
  // Título dinâmico baseado no tipo de dados
  const chartTitle = isSpecificDateForTitle 
    ? `Volume de Chamadas - ${new Date(startDate + 'T00:00:00').toLocaleDateString('pt-BR')}`
    : `Volume de Chamadas - Últimos ${selectedPeriod} dia${selectedPeriod > 1 ? 's' : ''}`;
    
  console.log('🏷️ Título definido:', chartTitle);

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="mb-3">
        <h3 className="font-semibold text-slate-800">{chartTitle}</h3>
        <p className="text-sm text-slate-500">
          {isSpecificDateForTitle 
            ? 'Dados desta data específica' 
            : 'Clique em um ponto para filtrar por data • Passe o mouse para ver detalhes'
          }
        </p>
      </div>
      
      <div className="relative w-full overflow-visible">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          height={height}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(prev => ({ ...prev, visible: false }))}
          onClick={handleClick}
          className="cursor-pointer"
          style={{ width: '100%' }}
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
                {Math.round(maxCount * (1 - tick))}
              </text>
            </g>
          ))}

          {/* Right Y-axis for % */}
          {[0, 0.25, 0.5, 0.75, 1].map((tick, i) => (
            <g key={`r${i}`} transform={`translate(${chartWidth + margin.left + 10},0)`}>
              <text
                x={0}
                y={margin.top + tick * chartHeight + 4}
                textAnchor="start"
                fontSize="12"
                fill="#7c3aed"
              >
                {Math.round(100 * (1 - tick))}%
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
            {/* Total calls line */}
            <polyline
              points={totalPoints}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
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

            {/* Answer rate line (%), using right axis */}
            <polyline
              points={ratePoints}
              fill="none"
              stroke="#7c3aed"
              strokeDasharray="6 6"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data points com hover melhorado */}
            {data.map((d, i) => (
              <g key={i}>
                {/* Área invisível maior para facilitar hover */}
                <circle
                  cx={xScale(i)}
                  cy={yScaleCount(Math.max(d.total, d.answered, d.missed))}
                  r="15"
                  fill="transparent"
                  className="cursor-pointer"
                />
                
                {/* Ponto do total */}
                <circle
                  cx={xScale(i)}
                  cy={yScaleCount(d.total)}
                  r="4"
                  fill="#3b82f6"
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="hover:r-6 transition-all duration-200 cursor-pointer drop-shadow-sm"
                />
                
                {/* Ponto das atendidas */}
                <circle
                  cx={xScale(i)}
                  cy={yScaleCount(d.answered)}
                  r="5"
                  fill="#10b981"
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="hover:r-7 transition-all duration-200 cursor-pointer drop-shadow-sm"
                />
                
                {/* Ponto das não atendidas */}
                <circle
                  cx={xScale(i)}
                  cy={yScaleCount(d.missed)}
                  r="5"
                  fill="#ef4444"
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="hover:r-7 transition-all duration-200 cursor-pointer drop-shadow-sm"
                />
              </g>
            ))}
          </g>

          {/* Legend */}
          <g transform={`translate(${margin.left}, ${margin.top - 10})`}>
            <circle cx="0" cy="0" r="4" fill="#3b82f6" />
            <text x="10" y="4" fontSize="12" fill="#374151">Total</text>
            <circle cx="60" cy="0" r="4" fill="#10b981" />
            <text x="70" y="4" fontSize="12" fill="#374151">Atendidas</text>
            <circle cx="160" cy="0" r="4" fill="#ef4444" />
            <text x="170" y="4" fontSize="12" fill="#374151">Não Atendidas</text>
            <rect x="280" y="-6" width="12" height="2" fill="#7c3aed" />
            <text x="300" y="4" fontSize="12" fill="#374151">% Atendimento (eixo direito)</text>
          </g>
        </svg>

        {/* Tooltip melhorado */}
        {tooltip.visible && (
          <div
            className="fixed bg-slate-900 text-white p-3 rounded-lg shadow-xl border border-slate-700 pointer-events-none z-50 max-w-xs"
            style={{
              left: tooltip.x,
              top: tooltip.y,
              transform: 'translateY(-100%)'
            }}
          >
            <div className="text-sm font-medium mb-1 text-slate-100">
              {tooltip.content.split('\n')[0]}
            </div>
            <div className="space-y-1 text-xs">
              {tooltip.content.split('\n').slice(1).map((line, i) => (
                <div key={i} className="flex items-center gap-1 text-slate-200">
                  {line}
                </div>
              ))}
            </div>
            {/* Seta do tooltip */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2">
              <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


