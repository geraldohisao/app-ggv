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
      .select('created_at, status_voip')
      .order('created_at', { ascending: true });

    if (startDate && endDate) {
      // Para data específica, filtrar do início ao fim do dia
      const startDateTime = startDate + 'T00:00:00';
      const endDateTime = endDate + 'T23:59:59';
      
      console.log('📅 Filtrando por data específica:', { startDateTime, endDateTime });
      
      query = query
        .gte('created_at', startDateTime)
        .lte('created_at', endDateTime);
    } else {
      // Usar período padrão
      const endDateObj = new Date();
      const startDateObj = new Date();
      startDateObj.setDate(endDateObj.getDate() - days);
      
      console.log('📊 Filtrando por período:', { 
        days, 
        start: startDateObj.toISOString(), 
        end: endDateObj.toISOString() 
      });
      
      query = query
        .gte('created_at', startDateObj.toISOString())
        .lte('created_at', endDateObj.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Erro ao buscar dados de chamadas:', error);
      return [];
    }

    console.log('✅ Dados de chamadas carregados:', data?.length || 0);
    
    // Debug: mostrar alguns dados para verificação
    if (data && data.length > 0) {
      console.log('🔍 Primeiros dados:', data.slice(0, 5));
      console.log('🔍 Últimos dados:', data.slice(-5));
      console.log('🔍 Status únicos encontrados:', [...new Set(data.map((d: any) => d.status_voip))]);
      
      // Verificar se há dados de outras datas "vazando"
      const uniqueDates = [...new Set(data.map((d: any) => new Date(d.created_at).toISOString().split('T')[0]))];
      console.log('🔍 Datas únicas encontradas:', uniqueDates);
      
      // Se estamos filtrando por data específica, verificar se só tem essa data
      if (startDate && endDate && startDate === endDate) {
        const wrongDateData = data.filter((d: any) => {
          const dateStr = new Date(d.created_at).toISOString().split('T')[0];
          return dateStr !== startDate;
        });
        
        if (wrongDateData.length > 0) {
          console.error('🚨 PROBLEMA: Encontrados dados de outras datas quando deveria ser apenas', startDate);
          console.error('🚨 Dados incorretos:', wrongDateData.slice(0, 3));
        } else {
          console.log('✅ CORRETO: Todos os dados são da data', startDate);
        }
      }
    }

    // Agrupar por data
    const groupedData = new Map<string, { answered: number; missed: number }>();

    data?.forEach((call: any) => {
      const date = new Date(call.created_at).toISOString().split('T')[0];
      
      // FILTRO ADICIONAL: Se estamos no modo data específica, ignorar dados de outras datas
      if (startDate && endDate && startDate === endDate && date !== startDate) {
        console.warn('⚠️ Ignorando dado de data incorreta:', date, 'esperado:', startDate);
        return; // Pular este registro
      }
      
      // Classificação baseada no status_voip:
      // - Atendidas: apenas 'normal_clearing'
      // - Não atendidas: 'no_answer', 'originator_cancel', 'number_changed', etc.
      const isAnswered = call.status_voip === 'normal_clearing';
      
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

    // Debug: mostrar dados agrupados
    console.log('📊 Dados agrupados por data:', Object.fromEntries(groupedData));

    // Converter para array e ordenar por data
    let result: CallData[] = Array.from(groupedData.entries())
      .map(([date, counts]) => ({
        date,
        answered: counts.answered,
        missed: counts.missed
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // FILTRO FINAL: Se estamos no modo data específica, garantir que só retornamos aquela data
    if (startDate && endDate && startDate === endDate) {
      result = result.filter(item => item.date === startDate);
      console.log('🎯 FILTRO FINAL aplicado - apenas data', startDate, '- resultado:', result);
      
      // Se não encontrou dados para a data específica, retornar dados zerados
      if (result.length === 0) {
        result = [{
          date: startDate,
          answered: 0,
          missed: 0
        }];
        console.log('📭 Nenhum dado encontrado para', startDate, '- retornando dados zerados');
      }
    }

    console.log('📊 Dados processados FINAL:', result);
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
  
  // Debug: verificar parâmetros recebidos
  console.log('📊 CallVolumeChart recebeu parâmetros:', { 
    selectedPeriod, 
    startDate, 
    endDate,
    isSpecificDate: !!(startDate && endDate && startDate === endDate)
  });
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
      const total = point.answered + point.missed;
      const answeredRate = total > 0 ? Math.round((point.answered / total) * 100) : 0;
      
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

  // Determinar título baseado nos filtros
  const isSpecificDate = startDate && endDate && startDate === endDate;
  const chartTitle = isSpecificDate 
    ? `Volume de Chamadas - ${new Date(startDate + 'T00:00:00').toLocaleDateString('pt-BR')}`
    : `Volume de Chamadas - Últimos ${selectedPeriod} dia${selectedPeriod > 1 ? 's' : ''}`;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="mb-3">
        <h3 className="font-semibold text-slate-800">{chartTitle}</h3>
        <p className="text-sm text-slate-500">
          {isSpecificDate 
            ? 'Dados específicos desta data' 
            : 'Clique em um ponto para filtrar por data • Passe o mouse para ver detalhes'
          }
        </p>
      </div>
      
      <div className="relative w-full overflow-visible">
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

            {/* Data points com hover melhorado */}
            {data.map((d, i) => (
              <g key={i}>
                {/* Área invisível maior para facilitar hover */}
                <circle
                  cx={xScale(i)}
                  cy={yScale(Math.max(d.answered, d.missed))}
                  r="15"
                  fill="transparent"
                  className="cursor-pointer"
                />
                
                {/* Ponto das atendidas */}
                <circle
                  cx={xScale(i)}
                  cy={yScale(d.answered)}
                  r="5"
                  fill="#10b981"
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="hover:r-7 transition-all duration-200 cursor-pointer drop-shadow-sm"
                />
                
                {/* Ponto das não atendidas */}
                <circle
                  cx={xScale(i)}
                  cy={yScale(d.missed)}
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
            <circle cx="0" cy="0" r="4" fill="#10b981" />
            <text x="10" y="4" fontSize="12" fill="#374151">Atendidas</text>
            <circle cx="80" cy="0" r="4" fill="#ef4444" />
            <text x="90" y="4" fontSize="12" fill="#374151">Não Atendidas</text>
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


