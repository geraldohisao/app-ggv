import { CallItem } from '../types';

/**
 * Converte dados para CSV
 */
export function convertToCSV(data: CallItem[]): string {
  if (data.length === 0) return '';

  // Cabeçalhos
  const headers = [
    'ID',
    'Empresa',
    'Código do Deal',
    'Pessoa',
    'Telefone',
    'SDR',
    'Email SDR',
    'Data',
    'Duração (seg)',
    'Duração (formatada)',
    'Status',
    'Score',
    'Tipo',
    'Direção',
    'Tem Áudio',
    'Tem Transcrição'
  ];

  // Dados
  const rows = data.map(call => [
    call.id,
    call.company || '',
    call.dealCode || '',
    call.person_name || '',
    call.to_number || '',
    call.sdr.name || '',
    call.sdr.email || '',
    new Date(call.date).toLocaleString('pt-BR'),
    call.durationSec || 0,
    formatDuration(call.durationSec || 0),
    call.status || '',
    call.score || '',
    call.call_type || '',
    call.direction || '',
    call.recording_url ? 'Sim' : 'Não',
    call.transcription ? 'Sim' : 'Não'
  ]);

  // Combinar cabeçalhos e dados
  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  return csvContent;
}

/**
 * Baixa dados como arquivo CSV
 */
export function downloadCSV(data: CallItem[], filename: string = 'chamadas'): void {
  const csv = convertToCSV(data);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

/**
 * Converte dados para formato Excel (TSV)
 */
export function convertToExcel(data: CallItem[]): string {
  if (data.length === 0) return '';

  // Cabeçalhos
  const headers = [
    'ID',
    'Empresa',
    'Código do Deal',
    'Pessoa',
    'Telefone',
    'SDR',
    'Email SDR',
    'Data',
    'Duração (seg)',
    'Duração (formatada)',
    'Status',
    'Score',
    'Tipo',
    'Direção',
    'Tem Áudio',
    'Tem Transcrição',
    'URL do Áudio',
    'Transcrição'
  ];

  // Dados
  const rows = data.map(call => [
    call.id,
    call.company || '',
    call.dealCode || '',
    call.person_name || '',
    call.to_number || '',
    call.sdr.name || '',
    call.sdr.email || '',
    new Date(call.date).toLocaleString('pt-BR'),
    call.durationSec || 0,
    formatDuration(call.durationSec || 0),
    call.status || '',
    call.score || '',
    call.call_type || '',
    call.direction || '',
    call.recording_url ? 'Sim' : 'Não',
    call.transcription ? 'Sim' : 'Não',
    call.recording_url || '',
    call.transcription || ''
  ]);

  // Combinar cabeçalhos e dados (TSV)
  const tsvContent = [headers, ...rows]
    .map(row => row.map(field => String(field).replace(/\t/g, ' ')).join('\t'))
    .join('\n');

  return tsvContent;
}

/**
 * Baixa dados como arquivo Excel (TSV)
 */
export function downloadExcel(data: CallItem[], filename: string = 'chamadas'): void {
  const tsv = convertToExcel(data);
  const blob = new Blob(['\uFEFF' + tsv], { type: 'text/tab-separated-values;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

/**
 * Formata duração em segundos para formato legível
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
}

/**
 * Gera relatório resumido
 */
export function generateSummaryReport(data: CallItem[]): string {
  const total = data.length;
  const withAudio = data.filter(c => c.recording_url).length;
  const withTranscription = data.filter(c => c.transcription).length;
  const avgDuration = data.reduce((sum, c) => sum + (c.durationSec || 0), 0) / total;
  const avgScore = data.filter(c => c.score).reduce((sum, c) => sum + (c.score || 0), 0) / data.filter(c => c.score).length;
  
  const statusCount = data.reduce((acc, call) => {
    acc[call.status] = (acc[call.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const sdrCount = data.reduce((acc, call) => {
    acc[call.sdr.name] = (acc[call.sdr.name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return `
RELATÓRIO DE CHAMADAS
=====================

RESUMO GERAL:
- Total de chamadas: ${total}
- Chamadas com áudio: ${withAudio} (${((withAudio/total)*100).toFixed(1)}%)
- Chamadas com transcrição: ${withTranscription} (${((withTranscription/total)*100).toFixed(1)}%)
- Duração média: ${formatDuration(Math.round(avgDuration))}
- Score médio: ${avgScore ? avgScore.toFixed(1) : 'N/A'}

STATUS DAS CHAMADAS:
${Object.entries(statusCount).map(([status, count]) => `- ${status}: ${count}`).join('\n')}

CHAMADAS POR SDR:
${Object.entries(sdrCount).map(([sdr, count]) => `- ${sdr}: ${count}`).join('\n')}

Relatório gerado em: ${new Date().toLocaleString('pt-BR')}
  `.trim();
}

/**
 * Baixa relatório resumido como arquivo de texto
 */
export function downloadSummaryReport(data: CallItem[], filename: string = 'relatorio_chamadas'): void {
  const report = generateSummaryReport(data);
  const blob = new Blob([report], { type: 'text/plain;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.txt`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
