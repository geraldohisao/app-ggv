import { StrategicMap } from '../../../types';

/**
 * Exporta mapa estratégico para PDF
 * Versão simplificada sem dependências externas
 */
export const exportMapToPDF = async (
  map: StrategicMap,
  elementId: string = 'strategic-map-content'
): Promise<void> => {
  alert('📄 Funcionalidade de PDF disponível após instalar: npm install html2canvas jspdf');
  console.log('Para habilitar PDF, instale: npm install html2canvas jspdf');
};

/**
 * Exporta análise executiva para PDF
 */
export const exportAnalysisToPDF = async (
  analysis: string,
  mapName: string
): Promise<void> => {
  alert('📄 Funcionalidade de PDF disponível após instalar: npm install html2canvas jspdf');
  console.log('Para habilitar PDF, instale: npm install html2canvas jspdf');
};

/**
 * Gera relatório completo (Mapa + Análise) em PDF
 */
export const exportCompletePDF = async (
  map: StrategicMap,
  analysis: string | null
): Promise<void> => {
  // Versão simplificada - criar arquivo de texto com os dados
  try {
    const content = `
MAPA ESTRATÉGICO
================

Empresa: ${map.company_name}
Data: ${map.date}

IDENTIDADE
----------
Missão: ${map.mission || 'Não definida'}
Visão: ${map.vision || 'Não definida'}
Valores: ${map.values?.join(', ') || 'Não definidos'}

OBJETIVOS ESTRATÉGICOS
----------------------
${map.objectives?.map((obj, i) => `
${i + 1}. ${obj.title}
   KPIs: ${obj.kpis?.map(kpi => `${kpi.name} (${kpi.frequency}): ${kpi.target}`).join(', ')}
`).join('\n') || 'Nenhum objetivo definido'}

MOTORES ESTRATÉGICOS
-------------------
${map.motors?.map((motor, i) => `
${i + 1}. ${motor.name}
   Estratégias: ${motor.strategies?.map(s => s.text).join(', ')}
`).join('\n') || 'Nenhum motor definido'}

${analysis ? `
ANÁLISE EXECUTIVA
-----------------
${analysis}
` : ''}

---
Gerado por GGV OKR Manager
${new Date().toLocaleString('pt-BR')}
    `.trim();

    // Criar blob e download
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `okr-${map.company_name?.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert('✅ Arquivo TXT exportado! (Para PDF, instale: npm install html2canvas jspdf)');
  } catch (error) {
    console.error('❌ Erro ao exportar:', error);
    throw error;
  }
};

