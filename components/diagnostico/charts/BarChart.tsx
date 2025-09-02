import React from 'react';
import { DIAGNOSTIC_AREAS, BENCHMARK_DATA } from '../../../constants';
import { DiagnosticArea } from '../../../types';
import Tooltip from '../../ui/Tooltip';

// Mapeamento dos itens específicos avaliados por área
const AREA_ITEMS: Record<DiagnosticArea, string> = {
    'Processos': 'Mapeamento de processos',
    'Tecnologia': 'CRM',
    'Padronização': 'Script comercial',
    'Pessoas': 'Teste de perfil comportamental',
    'Gestão': 'Plano de metas e comissionamento',
    'Monitoramento': 'Indicadores comerciais',
    'Desenvolvimento': 'Treinamentos periódicos',
    'Relacionamento': 'Pós-venda',
    'Prospecção': 'Prospecção ativa',
};

// Mapeamento das categorias para exibição
const AREA_CATEGORIES: Record<DiagnosticArea, string> = {
    'Processos': 'Padronização',
    'Tecnologia': 'Tecnologia',
    'Padronização': 'Abordagem',
    'Pessoas': 'Pessoas',
    'Gestão': 'Gestão',
    'Monitoramento': 'Monitoramento',
    'Desenvolvimento': 'Desenvolvimento',
    'Relacionamento': 'Relacionamento',
    'Prospecção': 'Prospecção',
};

// Ordem correta baseada na sequência das perguntas do diagnóstico
const QUESTION_ORDER: DiagnosticArea[] = [
    'Processos',        // Pergunta 1: Mapeamento de processos
    'Tecnologia',       // Pergunta 2: CRM
    'Padronização',     // Pergunta 3: Script comercial
    'Pessoas',          // Pergunta 4: Teste de perfil comportamental
    'Gestão',           // Pergunta 5: Plano de metas e comissionamento
    'Monitoramento',    // Pergunta 6: Indicadores comerciais
    'Desenvolvimento',  // Pergunta 7: Treinamentos periódicos
    'Relacionamento',   // Pergunta 8: Pós-venda
    'Prospecção',       // Pergunta 9: Prospecção ativa
];

interface BarChartProps {
    scoresByArea: Record<string, { score: number; count: number }>;
}

export const BarChart: React.FC<BarChartProps> = ({ scoresByArea }) => {
    const chartData = QUESTION_ORDER.map(area => {
        const areaData = scoresByArea[area];
        const score = areaData?.score ?? 0;
        const maxScore = (areaData?.count ?? 0) * 10;
        const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
        const marketAvg = BENCHMARK_DATA.marketAverage[area as DiagnosticArea] / 10 * 100;
        const topPerformers = BENCHMARK_DATA.topPerformers[area as DiagnosticArea] / 10 * 100;
        const gap = Math.max(0, topPerformers - percentage);
        const itemName = AREA_ITEMS[area as DiagnosticArea] || area;
        const category = AREA_CATEGORIES[area as DiagnosticArea] || area;
        return { 
            name: area, 
            itemName, 
            category,
            percentage, 
            marketAvg, 
            topPerformers, 
            gap 
        };
    });
    // Agora mantém a ordem das perguntas (sem .sort)

	return (
		<div className="space-y-4">
			{/* Legenda no topo à direita */}
			<div className="flex justify-end gap-6 -mb-1">
				<div className="flex items-center gap-2 text-xs text-slate-600">
					<div className="w-8 border-t-2 border-slate-400" />
					<span>Média do mercado</span>
				</div>
				<div className="flex items-center gap-2 text-xs text-emerald-600">
					<div className="w-8 border-t-2 border-emerald-500 border-dashed" />
					<span>Top Performers</span>
				</div>
			</div>

			{chartData.map(data => {
				const youPercent = Math.max(0, Math.min(100, data.percentage));
				const clamp = (x: number) => Math.min(98, Math.max(2, x));
				// Posicionamento robusto do pill para não sair da barra
				let pillStyle: React.CSSProperties;
				if (youPercent <= 6) {
					pillStyle = { left: 8 };
				} else if (youPercent >= 94) {
					pillStyle = { right: 8 } as React.CSSProperties;
				} else {
					pillStyle = { left: `calc(${youPercent}% - 24px)` };
				}
				const avgLeft = `${clamp(data.marketAvg)}%`;
				const topLeft = `${clamp(data.topPerformers)}%`;
				return (
					<div key={data.name}>
						<div className="grid grid-cols-12 items-center gap-3 mb-1">
							<div className="col-span-3 truncate">
								<div className="text-sm font-medium text-slate-800">{data.itemName}</div>
								<div className="text-xs text-slate-500">({data.category})</div>
							</div>
							<div className="col-span-9 text-right text-[11px] font-medium text-slate-600" aria-hidden>
								{youPercent.toFixed(0)}%
							</div>
						</div>
						<div className="relative w-full bg-slate-200 rounded-full h-3 overflow-visible">
							{/* Barra do usuário com animação suave */}
							<div className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-800 transition-all duration-700 ease-in-out" style={{ width: `${youPercent}%` }} />

							{/* Pill do percentual (só em telas >=sm para evitar sobreposição) */}
							<div className="hidden sm:block absolute top-1/2 -translate-y-1/2 rounded-full bg-white px-2 py-0.5 shadow-sm text-xs font-medium text-blue-800 select-none" style={pillStyle}>
								{youPercent.toFixed(0)}%
							</div>

							{/* Marcador e label: Média */}
							<div className="absolute top-1/2 -translate-y-1/2 z-20" style={{ left: avgLeft }}>
								<Tooltip text="Média de mercado para este segmento">
									<div className="-translate-x-1/2 flex items-center">
										<div className="h-3 border-l-2 border-slate-400/80" />
										<span className="ml-1 text-xs text-slate-600 font-medium bg-white/90 px-1 rounded hidden sm:inline shadow-sm">Média</span>
									</div>
								</Tooltip>
							</div>

							{/* Marcador e label: Top */}
							<div className="absolute top-1/2 -translate-y-1/2 z-20" style={{ left: topLeft }}>
								<Tooltip text="Pontuação média dos top performers do setor">
									<div className="-translate-x-1/2 flex items-center">
										<div className="h-3 border-l-2 border-emerald-500 border-dashed" />
										<span className="ml-1 text-xs text-emerald-700 font-medium bg-white/90 px-1 rounded hidden sm:inline shadow-sm">Top</span>
									</div>
								</Tooltip>
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
};
