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

// Função para buscar dados reais de chamadas via RPC (usando dados reais da lista)
async function fetchCallVolumeData(days: number = 14, _startDate?: string, _endDate?: string, selectedSdrEmail?: string | null): Promise<CallData[]> {
  if (!supabase) {
    console.log('⚠️ Supabase não inicializado');
    return [];
  }

  try {
    // Calcular período solicitado (últimos N dias a partir de hoje)
    const periodEnd = new Date();
    const periodStart = new Date();
    periodStart.setDate(periodEnd.getDate() - days + 1);

    console.log('🔍 fetchCallVolumeData - FILTRO SDR ATIVO:', { 
      days, 
      selectedSdrEmail,
      filtroAtivo: !!selectedSdrEmail,
      periodStart: periodStart.toISOString().split('T')[0],
      periodEnd: periodEnd.toISOString().split('T')[0]
    });

    // Primeiro buscar dados agregados dos SDRs para comparação
    const { data: sdrMetrics, error: sdrError } = await supabase.rpc('get_sdr_metrics', {
      p_days: 99999 // Todas as chamadas, igual aos rankings
    });
    
    if (sdrError) {
      console.error('❌ Erro get_sdr_metrics:', sdrError);
    }
    
    // Buscar volume agregado NO BACKEND para evitar limites de paginação
    console.log('🔄 Usando RPC get_calls_volume_by_day para trazer volume agregado por dia...');

    const { data: callsData, error: rpcError } = await supabase.rpc('get_calls_volume_by_day', {
      p_start_date: periodStart.toISOString(),
      p_end_date: periodEnd.toISOString(),
      p_sdr: selectedSdrEmail || null
    });
    
    if (rpcError) {
      console.error('❌ Erro query direta calls:', rpcError);
      return [];
    }
    
    if (!callsData || callsData.length === 0) {
      console.log('📭 Nenhuma chamada encontrada');
      return [];
    }

    console.log('✅ Dias carregados da RPC (volume agregado):', callsData.length);
    
    // Helper para chave local YYYY-MM-DD
    const toLocalKey = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    // Agrupar chamadas por data - MOSTRAR TODAS AS DATAS COM DADOS
    const grouped = new Map<string, { total: number; answered: number; missed: number }>();
    
    // NÃO inicializar dias vazios - só mostrar dias que têm dados reais
    // Isso evita dilatar o gráfico com muitos dias sem chamadas
    
    // Processar TODAS as chamadas (ignorar filtro de dias para mostrar volume real)
    callsData.forEach((call: any) => {
      if (!call.created_at) return;
      
      const callDate = new Date(call.created_at);
      const dateKey = toLocalKey(callDate);
      
      // Inicializar dia se não existir
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, { total: 0, answered: 0, missed: 0 });
      }
      
      const dayData = grouped.get(dateKey)!;
      dayData.total++;
      
      // Considerar atendida se status_voip é 'normal_clearing'
      if (call.status_voip === 'normal_clearing') {
        dayData.answered++;
      } else {
        dayData.missed++;
      }
      
      grouped.set(dateKey, dayData);
    });

    // Não filtrar por período - mostrar TODOS os dias que têm dados
    console.log('📅 ANÁLISE COMPLETA DOS DADOS POR DIA:');
    
    // Se vier agregado do backend, preencher o grouped diretamente
    if (Array.isArray(callsData) && callsData.length > 0 && (callsData[0] as any).day) {
      callsData.forEach((row: any) => {
        const key = String(row.day);
        grouped.set(key, {
          total: Number(row.total) || 0,
          answered: Number(row.answered) || 0,
          missed: (Number(row.total) || 0) - (Number(row.answered) || 0)
        });
      });
    }

    // Pegar todas as entradas e ordenar por data
    const allEntries = Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    
    console.log('🔍 TODOS OS DIAS COM DADOS:', {
      totalDiasComDados: allEntries.length,
      primeiroDia: allEntries[0]?.[0],
      ultimoDia: allEntries[allEntries.length - 1]?.[0],
      periodoSelecionado: days,
      todosOsDias: allEntries.map(([date, data]) => ({ 
        data: date, 
        chamadas: data.total 
      }))
    });
    
    // Se o período for menor que o total de dias, pegar apenas os últimos N dias
    const finalEntries = days < allEntries.length 
      ? allEntries.slice(-days) // Últimos N dias dos dados disponíveis
      : allEntries; // Todos os dias
    
    console.log('🎯 DADOS FINAIS PARA O GRÁFICO:', {
      diasSelecionados: finalEntries.length,
      primeiroDiaGrafico: finalEntries[0]?.[0],
      ultimoDiaGrafico: finalEntries[finalEntries.length - 1]?.[0],
      dadosFinais: finalEntries.map(([date, data]) => ({ 
        data: date, 
        chamadas: data.total,
        atendidas: data.answered 
      }))
    });

    // Usar as entradas finais (filtradas por período se necessário)
    const result: CallData[] = finalEntries.map(([date, c]) => {
      const answeredRate = c.total > 0 ? Math.round((c.answered / c.total) * 100) : 0;
      return { date, total: c.total, answered: c.answered, missed: c.missed, answeredRate };
    }).sort((a, b) => a.date.localeCompare(b.date));

    // Calcular totais para comparação DETALHADA
    const totalFromSDRMetrics = sdrMetrics?.reduce((sum: number, sdr: any) => sum + (sdr.total_calls || 0), 0) || 0;
    const totalAnsweredFromSDRMetrics = sdrMetrics?.reduce((sum: number, sdr: any) => sum + (sdr.answered_calls || 0), 0) || 0;
    const totalFromDirectQuery = callsData.length;
    const totalFromChart = result.reduce((sum, day) => sum + day.total, 0);
    const totalAnsweredFromChart = result.reduce((sum, day) => sum + day.answered, 0);
    
    console.log('📊 COMPARAÇÃO COMPLETA - DASHBOARD vs GRÁFICO:', {
      '🏢 DASHBOARD TOTALS': {
        totalChamadas: totalFromSDRMetrics,
        totalAtendidas: totalAnsweredFromSDRMetrics,
        taxaAtendimento: totalFromSDRMetrics > 0 ? Math.round((totalAnsweredFromSDRMetrics / totalFromSDRMetrics) * 100) + '%' : '0%'
      },
      
      '📊 GRÁFICO TOTALS': {
        totalChamadas: totalFromChart,
        totalAtendidas: totalAnsweredFromChart,
        taxaAtendimento: totalFromChart > 0 ? Math.round((totalAnsweredFromChart / totalFromChart) * 100) + '%' : '0%'
      },
      
      '🔍 ANÁLISE DETALHADA': {
        queryRetornou: totalFromDirectQuery + ' chamadas',
        graficoMostra: totalFromChart + ' chamadas (últimos ' + days + ' dias)',
        diferençaTotal: Math.abs(totalFromSDRMetrics - totalFromChart),
        diferençaAtendidas: Math.abs(totalAnsweredFromSDRMetrics - totalAnsweredFromChart),
        consistenciaChamadas: totalFromDirectQuery === totalFromChart ? '✅ CONSISTENTE' : '❌ INCONSISTENTE',
        consistenciaAtendidas: totalAnsweredFromSDRMetrics === totalAnsweredFromChart ? '✅ CONSISTENTE' : '❌ INCONSISTENTE'
      },
      
      '📅 DADOS POR DIA': result.map(r => ({ 
        data: r.date, 
        total: r.total, 
        atendidas: r.answered,
        taxa: r.answeredRate + '%'
      })),
      
      '🔬 SAMPLE DE CHAMADAS BRUTAS': callsData.slice(0, 10).map(c => ({ 
        data: c.created_at?.split('T')[0], 
        status: c.status_voip,
        statusFriendly: c.status_voip === 'normal_clearing' ? 'ATENDIDA' : 'NÃO ATENDIDA',
        agent: c.agent_id 
      }))
    });
    
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
  const margin = { top: 20, right: 60, bottom: 40, left: 60 }; // Aumentar margem direita
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
      
      // Comparar com a média para dar contexto
      const diffFromAvg = answeredRate - avgAnsweredRate;
      const trendText = diffFromAvg > 5 ? '📈 Acima da média' :
                       diffFromAvg < -5 ? '📉 Abaixo da média' : 
                       '📊 Próximo da média';
      
      const performanceColor = answeredRate >= avgAnsweredRate ? '🟢' : '🔴';
      
      setTooltip({
        visible: true,
        x: tooltipX,
        y: tooltipY,
        content: `${formatDate(point.date)} • ${total} chamadas
${performanceColor} ${point.answered} atendidas (${answeredRate}%)
${trendText} (${diffFromAvg > 0 ? '+' : ''}${diffFromAvg}% vs média ${avgAnsweredRate}%)
❌ ${point.missed} não atendidas`
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

  // Calcular taxa real (total de atendidas / total de chamadas)
  const totalCalls = data.reduce((sum, d) => sum + d.total, 0);
  const totalAnswered = data.reduce((sum, d) => sum + d.answered, 0);
  const avgAnsweredRate = totalCalls > 0 
    ? Math.round((totalAnswered / totalCalls) * 100)
    : 0;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
      {/* Header melhorado */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-slate-800 text-lg">{chartTitle}</h3>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-600">
              📊 Média: <span className="font-medium text-indigo-600">{avgAnsweredRate}%</span>
            </span>
            <span className="text-slate-600">
              📈 {data.length} dias
            </span>
          </div>
        </div>
        
        {/* Legenda interativa melhorada */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6 text-sm">
            <button 
              className="flex items-center gap-2 hover:bg-slate-50 px-2 py-1 rounded transition-colors"
              title="Clique para destacar linha"
            >
              <div className="w-3 h-3 bg-blue-500 rounded shadow-sm"></div>
              <span className="text-slate-700 font-medium">Total</span>
            </button>
            <button 
              className="flex items-center gap-2 hover:bg-slate-50 px-2 py-1 rounded transition-colors"
              title="Clique para destacar linha"
            >
              <div className="w-3 h-3 bg-green-500 rounded shadow-sm"></div>
              <span className="text-slate-700 font-medium">Atendidas</span>
            </button>
            <button 
              className="flex items-center gap-2 hover:bg-slate-50 px-2 py-1 rounded transition-colors"
              title="Clique para destacar linha"
            >
              <div className="w-3 h-3 bg-red-500 rounded shadow-sm"></div>
              <span className="text-slate-700 font-medium">Não Atendidas</span>
            </button>
            <button 
              className="flex items-center gap-2 hover:bg-slate-50 px-2 py-1 rounded transition-colors"
              title="Linha de % atendimento"
            >
              <div className="w-4 h-1 bg-purple-500 rounded shadow-sm"></div>
              <span className="text-slate-700 font-medium">% Atendimento</span>
            </button>
          </div>
          
          {/* Insights rápidos */}
          <div className="flex items-center gap-3 text-xs">
            {data.length > 1 && (() => {
              const firstDay = data[0];
              const lastDay = data[data.length - 1];
              const trendTotal = lastDay.total - firstDay.total;
              const trendRate = lastDay.answeredRate - firstDay.answeredRate;
              
              return (
                <>
                  <span className={`px-2 py-1 rounded font-medium ${
                    trendTotal > 0 ? 'bg-blue-50 text-blue-700' : 
                    trendTotal < 0 ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-700'
                  }`}>
                    Volume: {trendTotal > 0 ? '+' : ''}{trendTotal}
                  </span>
                  <span className={`px-2 py-1 rounded font-medium ${
                    trendRate > 0 ? 'bg-green-50 text-green-700' : 
                    trendRate < 0 ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-700'
                  }`}>
                    Taxa: {trendRate > 0 ? '+' : ''}{trendRate}%
                  </span>
                </>
              );
            })()}
          </div>
        </div>
      </div>
      
      <div className="relative w-full overflow-visible">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          height={height}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(prev => ({ ...prev, visible: false }))}
          onClick={handleClick}
          className="cursor-pointer hover:bg-slate-50 transition-colors rounded"
          style={{ width: '100%' }}
        >
          {/* Definir gradientes */}
          <defs>
            <linearGradient id="totalGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3"/>
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1"/>
            </linearGradient>
            <linearGradient id="answeredGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.3"/>
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.1"/>
            </linearGradient>
            <filter id="glow">
              <feMorphology operator="dilate" radius="1"/>
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
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

          {/* Right Y-axis for % - melhor posicionamento */}
          {[0, 0.25, 0.5, 0.75, 1].map((tick, i) => (
            <g key={`r${i}`} transform={`translate(${width - 45},0)`}>
              <text
                x={0}
                y={margin.top + tick * chartHeight + 4}
                textAnchor="start"
                fontSize="12"
                fill="#7c3aed"
                fontWeight="500"
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

          {/* Linha de referência da média */}
          <g transform={`translate(${margin.left}, ${margin.top})`}>
            <line
              x1="0"
              y1={yScaleRate(avgAnsweredRate)}
              x2={chartWidth}
              y2={yScaleRate(avgAnsweredRate)}
              stroke="#94a3b8"
              strokeWidth="1"
              strokeDasharray="4 4"
              opacity="0.6"
            />
            <text
              x={chartWidth - 10}
              y={yScaleRate(avgAnsweredRate) - 5}
              textAnchor="end"
              fontSize="10"
              fill="#64748b"
            >
              Média {avgAnsweredRate}%
            </text>
          </g>

          {/* Áreas preenchidas sob as linhas */}
          <g transform={`translate(${margin.left}, ${margin.top})`}>
            {/* Área preenchida - Total */}
            <polygon
              points={`0,${chartHeight} ${totalPoints} ${chartWidth},${chartHeight}`}
              fill="url(#totalGradient)"
              opacity="0.4"
            />
            
            {/* Área preenchida - Atendidas */}
            <polygon
              points={`0,${chartHeight} ${answeredPoints} ${chartWidth},${chartHeight}`}
              fill="url(#answeredGradient)"
              opacity="0.6"
            />
          </g>

          {/* Lines principais */}
          <g transform={`translate(${margin.left}, ${margin.top})`}>
            {/* Total calls line */}
            <polyline
              points={totalPoints}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="drop-shadow(0 3px 6px rgba(59, 130, 246, 0.25))"
            />
            
            {/* Answered calls line */}
            <polyline
              points={answeredPoints}
              fill="none"
              stroke="#10b981"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="drop-shadow(0 3px 6px rgba(16, 185, 129, 0.25))"
            />
            
            {/* Missed calls line - mais sutil */}
            <polyline
              points={missedPoints}
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.8"
            />

            {/* Answer rate line (%) - destaque especial */}
            <polyline
              points={ratePoints}
              fill="none"
              stroke="#7c3aed"
              strokeDasharray="8 4"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#glow)"
            />

            {/* Data points com alertas visuais */}
            {data.map((d, i) => {
              const isLowPerformance = d.answeredRate < avgAnsweredRate - 10;
              const isHighPerformance = d.answeredRate > avgAnsweredRate + 10;
              
              return (
                <g key={i}>
                  {/* Área invisível maior para facilitar hover */}
                  <circle
                    cx={xScale(i)}
                    cy={yScaleCount(Math.max(d.total, d.answered, d.missed))}
                    r="15"
                    fill="transparent"
                    className="cursor-pointer"
                  />
                  
                  {/* Alerta visual para performance baixa */}
                  {isLowPerformance && (
                    <circle
                      cx={xScale(i)}
                      cy={yScaleRate(d.answeredRate)}
                      r="8"
                      fill="rgba(239, 68, 68, 0.2)"
                      stroke="#ef4444"
                      strokeWidth="2"
                      strokeDasharray="2 2"
                    />
                  )}
                  
                  {/* Destaque para performance alta */}
                  {isHighPerformance && (
                    <circle
                      cx={xScale(i)}
                      cy={yScaleRate(d.answeredRate)}
                      r="8"
                      fill="rgba(16, 185, 129, 0.2)"
                      stroke="#10b981"
                      strokeWidth="2"
                    />
                  )}
                  
                  {/* Ponto do total */}
                  <circle
                    cx={xScale(i)}
                    cy={yScaleCount(d.total)}
                    r="4"
                    fill="#3b82f6"
                    stroke="#ffffff"
                    strokeWidth="2"
                    className="hover:r-6 transition-all duration-200 cursor-pointer"
                  />
                  
                  {/* Ponto das atendidas */}
                  <circle
                    cx={xScale(i)}
                    cy={yScaleCount(d.answered)}
                    r="4"
                    fill="#10b981"
                    stroke="#ffffff"
                    strokeWidth="2"
                    className="hover:r-6 transition-all duration-200 cursor-pointer"
                  />
                  
                  {/* Ponto do % atendimento */}
                  <circle
                    cx={xScale(i)}
                    cy={yScaleRate(d.answeredRate)}
                    r="3"
                    fill={isLowPerformance ? "#ef4444" : isHighPerformance ? "#10b981" : "#7c3aed"}
                    stroke="#ffffff"
                    strokeWidth="2"
                    className="hover:r-5 transition-all duration-200 cursor-pointer"
                  />
                </g>
              );
            })}
          </g>

          {/* Indicadores de tendência nos pontos */}
          <g transform={`translate(${margin.left}, ${margin.top})`}>
            {data.map((d, i) => {
              if (i === 0) return null; // Primeiro ponto não tem comparação
              
              const prevRate = data[i - 1]?.answeredRate || 0;
              const currentRate = d.answeredRate;
              const trend = currentRate - prevRate;
              
              if (Math.abs(trend) > 5) { // Só mostrar se mudança > 5%
                return (
                  <text
                    key={`trend-${i}`}
                    x={xScale(i)}
                    y={yScaleRate(currentRate) - 15}
                    textAnchor="middle"
                    fontSize="10"
                    fill={trend > 0 ? "#10b981" : "#ef4444"}
                    fontWeight="bold"
                  >
                    {trend > 0 ? '↗' : '↘'}{Math.abs(Math.round(trend))}%
                  </text>
                );
              }
              return null;
            })}
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


