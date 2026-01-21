import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ExportOptions {
  filename?: string;
  scale?: number;
  margin?: number;
}

/**
 * Exporta um elemento HTML para PDF utilizando html2canvas + jsPDF.
 * Uso:
 * const ref = useRef<HTMLDivElement>(null);
 * await exportElementToPDF(ref.current, 'sprint.pdf');
 */
export async function exportElementToPDF(element: HTMLElement | null, options: ExportOptions = {}) {
  if (!element) throw new Error('Elemento não encontrado para exportação');

  const {
    filename = 'relatorio.pdf',
    scale = 2,
    margin = 10,
  } = options;

  // Captura a tela do elemento com boa resolução
  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth() - margin * 2;
  const pageHeight = pdf.internal.pageSize.getHeight() - margin * 2;

  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let position = margin;
  let remainingHeight = imgHeight;

  pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
  remainingHeight -= pageHeight;

  // Adiciona páginas se o conteúdo ultrapassar uma página A4
  while (remainingHeight > 0) {
    pdf.addPage();
    position = margin;
    remainingHeight -= pageHeight;
    pdf.addImage(imgData, 'PNG', margin, position - (imgHeight - remainingHeight - pageHeight), imgWidth, imgHeight);
  }

  pdf.save(filename);
}

// Compatibilidade com importações existentes
export const exportToPDF = exportElementToPDF;
export const exportCompletePDF = exportElementToPDF;

