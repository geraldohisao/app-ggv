import { StrategicMap } from '../../../types';

/**
 * Exporta mapa estratégico para PDF
 * Versão com fallback se dependências não instaladas
 */
export const exportMapToPDF = async (
  map: StrategicMap,
  elementId: string = 'strategic-map-content'
): Promise<void> => {
  try {
    // Tentar importar dependências dinamicamente
    // @ts-ignore - Importação dinâmica opcional
    const html2canvas = await import('html2canvas');
    // @ts-ignore - Importação dinâmica opcional
    const jsPDF = (await import('jspdf')).default;

    console.log('📄 Gerando PDF...');

    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Elemento ${elementId} não encontrado`);
    }

    const canvas = await html2canvas.default(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    const pdf = new jsPDF({
      orientation: imgHeight > imgWidth ? 'portrait' : 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

    pdf.setProperties({
      title: `Mapa Estratégico - ${map.company_name}`,
      subject: 'OKR',
      author: 'GGV Inteligência'
    });

    const fileName = `mapa-${map.company_name?.replace(/\s+/g, '-').toLowerCase()}-${map.date}.pdf`;
    pdf.save(fileName);

    console.log('✅ PDF gerado!');
  } catch (error: any) {
    if (error.message?.includes('Cannot find module')) {
      alert('📦 Para exportar PDF, instale as dependências:\n\nnpm install html2canvas jspdf');
    } else {
      console.error('❌ Erro ao gerar PDF:', error);
      // Fallback para TXT
      exportToText(map);
    }
  }
};

/**
 * Exporta análise executiva para PDF
 */
export const exportAnalysisToPDF = async (
  analysis: string,
  mapName: string
): Promise<void> => {
  try {
    // @ts-ignore - Importação dinâmica opcional
    const jsPDF = (await import('jspdf')).default;
    
    const pdf = new jsPDF();
    
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Análise Executiva', 105, 20, { align: 'center' });
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(mapName, 105, 30, { align: 'center' });
    
    pdf.setFontSize(10);
    pdf.text(new Date().toLocaleDateString('pt-BR'), 105, 38, { align: 'center' });
    
    pdf.line(20, 42, 190, 42);
    
    pdf.setFontSize(11);
    const lines = pdf.splitTextToSize(analysis, 170);
    pdf.text(lines, 20, 50);
    
    const fileName = `analise-${mapName.replace(/\s+/g, '-').toLowerCase()}.pdf`;
    pdf.save(fileName);
    
    console.log('✅ Análise exportada!');
  } catch (error: any) {
    if (error.message?.includes('Cannot find module')) {
      alert('📦 Para exportar PDF, instale: npm install jspdf');
    }
  }
};

/**
 * Fallback: Exporta como TXT
 */
const exportToText = (map: StrategicMap, analysis?: string | null) => {
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

    console.log('✅ TXT exportado como fallback');
  } catch (error) {
    console.error('❌ Erro ao exportar:', error);
  }
};

/**
 * Gera relatório completo (Mapa + Análise) em PDF
 */
export const exportCompletePDF = async (
  map: StrategicMap,
  analysis: string | null
): Promise<void> => {
  try {
    // @ts-ignore - Importação dinâmica opcional
    const jsPDF = (await import('jspdf')).default;
    
    const pdf = new jsPDF();
    let currentY = 20;
    
    // Página 1: Capa
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Mapa Estratégico', 105, currentY, { align: 'center' });
    
    currentY += 15;
    pdf.setFontSize(18);
    pdf.text(map.company_name || 'Empresa', 105, currentY, { align: 'center' });
    
    currentY += 10;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(new Date(map.date).toLocaleDateString('pt-BR'), 105, currentY, { align: 'center' });
    
    // Página 2: Identidade
    pdf.addPage();
    currentY = 20;
    
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Identidade', 20, currentY);
    currentY += 10;
    
    if (map.mission) {
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Missão:', 20, currentY);
      currentY += 7;
      
      pdf.setFont('helvetica', 'normal');
      const missionLines = pdf.splitTextToSize(map.mission, 170);
      pdf.text(missionLines, 20, currentY);
      currentY += missionLines.length * 5 + 5;
    }
    
    if (map.vision) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Visão:', 20, currentY);
      currentY += 7;
      
      pdf.setFont('helvetica', 'normal');
      const visionLines = pdf.splitTextToSize(map.vision, 170);
      pdf.text(visionLines, 20, currentY);
      currentY += visionLines.length * 5 + 5;
    }
    
    // Objetivos
    if (map.objectives && map.objectives.length > 0) {
      pdf.addPage();
      currentY = 20;
      
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Objetivos Estratégicos', 20, currentY);
      currentY += 10;
      
      map.objectives.forEach((obj, index) => {
        if (currentY > 270) {
          pdf.addPage();
          currentY = 20;
        }
        
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${index + 1}. ${obj.title}`, 20, currentY);
        currentY += 7;
        
        if (obj.kpis && obj.kpis.length > 0) {
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'normal');
          obj.kpis.forEach(kpi => {
            pdf.text(`• ${kpi.name} (${kpi.frequency}): ${kpi.target}`, 25, currentY);
            currentY += 5;
          });
        }
        
        currentY += 5;
      });
    }
    
    // Análise
    if (analysis) {
      pdf.addPage();
      currentY = 20;
      
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Análise Executiva', 20, currentY);
      currentY += 10;
      
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      const analysisLines = pdf.splitTextToSize(analysis, 170);
      pdf.text(analysisLines, 20, currentY);
    }
    
    const fileName = `relatorio-${map.company_name?.replace(/\s+/g, '-').toLowerCase()}.pdf`;
    pdf.save(fileName);
    
    console.log('✅ Relatório completo gerado!');
  } catch (error: any) {
    if (error.message?.includes('Cannot find module')) {
      console.log('📦 Dependências não instaladas, usando fallback TXT');
      exportToText(map, analysis);
    } else {
      console.error('❌ Erro ao gerar PDF:', error);
      exportToText(map, analysis);
    }
  }
};

