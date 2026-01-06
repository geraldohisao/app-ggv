import React, { useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { ServiceOrder, OSSigner, OSStatus } from '../../types';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { CheckCircleIcon, ExclamationTriangleIcon, ClockIcon } from '../ui/icons';

/**
 * Componente para reprocessar OS concluídas e adicionar termo de assinatura
 * Acesse em: /os-reprocessing (temporário, só admin)
 */
export const OSReprocessing: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<Array<{ id: string; title: string; success: boolean; error?: string }>>([]);
    const [osToReprocess, setOsToReprocess] = useState<ServiceOrder[]>([]);
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [forceAll, setForceAll] = useState(false);

    const loadCompletedOrders = async () => {
        try {
            setLoadingOrders(true);
            
            console.log('🔍 Buscando OS concluídas...');
            
            // Buscar TODAS OS concluídas
            const { data, error } = await supabase
                .from('service_orders')
                .select('*, signers:os_signers(*)')
                .eq('status', OSStatus.Completed)
                .order('created_at', { ascending: false });

            if (error) throw error;

            console.log('📋 Total de OS concluídas:', data?.length);
            
            // Filtrar baseado em forceAll
            let needsReprocessing;
            
            if (forceAll) {
                // Reprocessar TODAS (para atualizar layout)
                needsReprocessing = data || [];
                console.log('🔄 Modo FORÇAR TODAS: reprocessando', needsReprocessing.length, 'OS');
            } else {
                // Apenas as que NÃO têm final_file_path
                needsReprocessing = (data || []).filter(os => 
                    !os.final_file_path || os.final_file_path === '' || os.final_file_path === null
                );
                console.log('📋 OS sem PDF final:', needsReprocessing.length);
            }
            
            console.log('Detalhes:', needsReprocessing.map(os => ({
                title: os.title,
                has_final: !!os.final_file_path,
                final_path: os.final_file_path
            })));

            setOsToReprocess(needsReprocessing as any);
        } catch (err: any) {
            console.error('❌ Erro ao buscar OS:', err);
            alert(`Erro: ${err.message}`);
        } finally {
            setLoadingOrders(false);
        }
    };

    const reprocessAll = async () => {
        if (!confirm(`Reprocessar ${osToReprocess.length} OS(s)?\n\nIsso vai:\n- Gerar PDF final com termo\n- Salvar no storage\n- Atualizar banco de dados\n\nContinuar?`)) {
            return;
        }

        setLoading(true);
        const processResults: typeof results = [];

        for (const order of osToReprocess) {
            try {
                console.log(`🔄 Reprocessando: ${order.title}...`);
                
                const signers = (order as any).signers || [];
                const result = await generateFinalPdfWithTerm(order, signers);
                
                // Salvar no banco
                await supabase
                    .from('service_orders')
                    .update({
                        final_file_path: result.path,
                        final_file_name: result.name,
                        final_file_hash: result.hash
                    })
                    .eq('id', order.id);

                processResults.push({ 
                    id: order.id, 
                    title: order.title, 
                    success: true 
                });
                
                console.log(`✅ Reprocessado: ${order.title}`);
            } catch (err: any) {
                console.error(`❌ Erro ao reprocessar ${order.title}:`, err);
                processResults.push({ 
                    id: order.id, 
                    title: order.title, 
                    success: false, 
                    error: err.message 
                });
            }
        }

        setResults(processResults);
        setLoading(false);
        
        // Recarregar lista
        await loadCompletedOrders();
    };

    const generateFinalPdfWithTerm = async (baseOrder: ServiceOrder, signersList: OSSigner[]): Promise<{ path: string; name: string; hash: string }> => {
        const { data, error } = await supabase.storage
            .from('service-orders')
            .download(baseOrder.file_path);
        if (error) throw error;

        const originalBytes = await data.arrayBuffer();
        const pdfDoc = await PDFDocument.load(originalBytes);
        
        // Embed fonts
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        
        // 🔐 ADICIONAR RODAPÉ DE AUTENTICAÇÃO EM TODAS AS PÁGINAS DO ORIGINAL
        const authCode = baseOrder.file_hash?.substring(0, 18) || 'N/A';
        const totalOriginalPages = pdfDoc.getPageCount();
        
        for (let i = 0; i < totalOriginalPages; i++) {
            const originalPage = pdfDoc.getPage(i);
            const { width: pageWidth } = originalPage.getSize();
            
            // Rodapé esquerdo: apenas código de autenticação
            originalPage.drawText(`Autenticação: ${authCode}`, {
                x: 20,
                y: 15,
                size: 7,
                font: font,
                color: rgb(0.6, 0.6, 0.6)
            });
            
            // Numeração de página (canto direito)
            originalPage.drawText(`${i + 1}`, {
                x: pageWidth - 30,
                y: 15,
                size: 9,
                font: font,
                color: rgb(0.4, 0.4, 0.4)
            });
        }
        
        // 📄 ADICIONAR PÁGINA DE TERMO
        const page = pdfDoc.addPage();
        const { width, height } = page.getSize();

        const marginX = 60;
        const marginY = 60;
        let cursorY = height - 70;
        const contentWidth = width - (2 * marginX);

        const drawBox = (x: number, y: number, w: number, h: number, bgColor = rgb(0.98, 0.98, 0.98)) => {
            page.drawRectangle({ 
                x, y, width: w, height: h, 
                color: bgColor, 
                borderWidth: 1.5, 
                borderColor: rgb(0.85, 0.85, 0.85) 
            });
        };

        const wrapText = (text: string, maxWidth: number, size: number, fontUsed: any) => {
            const words = text.split(' ');
            const lines: string[] = [];
            let currentLine = '';
            words.forEach(word => {
                const testLine = currentLine ? `${currentLine} ${word}` : word;
                const width = fontUsed.widthOfTextAtSize(testLine, size);
                if (width > maxWidth && currentLine) {
                    lines.push(currentLine);
                    currentLine = word;
                } else {
                    currentLine = testLine;
                }
            });
            if (currentLine) lines.push(currentLine);
            return lines;
        };

        const write = (text: string, options: { bold?: boolean; size?: number; x?: number; colorRgb?: [number, number, number]; lineHeight?: number; maxWidth?: number } = {}) => {
            const size = options.size || 11;
            const usedFont = options.bold ? fontBold : font;
            const xPos = options.x !== undefined ? options.x : marginX;
            const textColor = options.colorRgb ? rgb(options.colorRgb[0], options.colorRgb[1], options.colorRgb[2]) : rgb(0.15, 0.15, 0.15);
            const lh = options.lineHeight || (size * 1.4);
            const maxW = options.maxWidth || contentWidth;

            const lines = wrapText(text, maxW, size, usedFont);
            lines.forEach(line => {
                page.drawText(line, { x: xPos, y: cursorY, size, font: usedFont, color: textColor });
                cursorY -= lh;
            });
        };

        // Cabeçalho
        write('TERMO DE ASSINATURA DIGITAL', { bold: true, size: 22, colorRgb: [0, 0, 0], lineHeight: 30 });
        cursorY -= 25;

        // Informações do documento
        write('INFORMAÇÕES DO DOCUMENTO', { bold: true, size: 13, colorRgb: [0.2, 0.2, 0.2], lineHeight: 20 });
        cursorY -= 8;

        const docBoxStartY = cursorY;
        const docBoxHeight = 70;
        drawBox(marginX - 10, docBoxStartY - docBoxHeight, contentWidth + 20, docBoxHeight, rgb(0.97, 0.97, 0.97));
        cursorY -= 12;

        write(`Documento: ${baseOrder.file_name}`, { size: 11, lineHeight: 16 });
        write(`Título: ${baseOrder.title}`, { size: 11, lineHeight: 16 });
        write(`Data/hora da conclusão: ${new Date().toLocaleString('pt-BR')}`, { size: 10, colorRgb: [0.3, 0.3, 0.3], lineHeight: 16 });
        
        cursorY = docBoxStartY - docBoxHeight - 20;

        // Hash do documento
        write('HASH DO DOCUMENTO ORIGINAL (SHA-256)', { bold: true, size: 11, colorRgb: [0.25, 0.25, 0.25], lineHeight: 18 });
        cursorY -= 8;

        const hashBoxStartY = cursorY;
        const hashBoxHeight = 32;
        drawBox(marginX - 10, hashBoxStartY - hashBoxHeight, contentWidth + 20, hashBoxHeight, rgb(0.95, 0.97, 1));
        cursorY -= 10;

        const hashText = baseOrder.file_hash || 'Não disponível';
        write(hashText, { size: 9, colorRgb: [0.2, 0.2, 0.5], lineHeight: 13, maxWidth: contentWidth - 20 });
        
        cursorY = hashBoxStartY - hashBoxHeight - 20;

        // Assinaturas
        write('ASSINATURAS COLETADAS', { bold: true, size: 13, colorRgb: [0.2, 0.2, 0.2], lineHeight: 20 });
        cursorY -= 10;

        const signedList = signersList.filter(s => s.status === 'SIGNED');
        
        // Função para desenhar check verde
        const drawCheckmark = (x: number, y: number) => {
            page.drawCircle({
                x: x + 6,
                y: y + 4,
                size: 6,
                color: rgb(0.13, 0.77, 0.29),
                borderWidth: 1,
                borderColor: rgb(0.13, 0.77, 0.29)
            });
            
            page.drawLine({
                start: { x: x + 3, y: y + 4 },
                end: { x: x + 5, y: y + 2 },
                thickness: 1.5,
                color: rgb(1, 1, 1),
                lineCap: 1 as any
            });
            page.drawLine({
                start: { x: x + 5, y: y + 2 },
                end: { x: x + 9, y: y + 6 },
                thickness: 1.5,
                color: rgb(1, 1, 1),
                lineCap: 1 as any
            });
        };
        
        signedList.forEach((s, idx) => {
            const sigBoxStartY = cursorY;
            const sigBoxHeight = 115;
            
            drawBox(marginX - 10, sigBoxStartY - sigBoxHeight, contentWidth + 20, sigBoxHeight, rgb(0.99, 0.99, 0.99));
            
            cursorY -= 12;
            
            // ✅ Check verde + Nome
            drawCheckmark(marginX, cursorY);
            write(`${s.name || s.email}`, { bold: true, size: 11, colorRgb: [0, 0, 0], lineHeight: 15, x: marginX + 25 });
            
            write(`CPF: ${s.cpf || 'Não informado'}`, { size: 9.5, lineHeight: 13, x: marginX + 25 });
            write(`Assinou como ${s.role || 'Colaborador'} em ${s.signed_at ? new Date(s.signed_at).toLocaleString('pt-BR') : 'Pendente'}`, { size: 9, colorRgb: [0.3, 0.3, 0.3], lineHeight: 13, x: marginX + 25 });
            
            cursorY -= 5;
            
            write(`Pontos de autenticação: Token via E-mail; Nome Completo; CPF`, { size: 7.5, colorRgb: [0.45, 0.45, 0.45], lineHeight: 10, x: marginX + 25 });
            write(`Dados informados: ${s.cpf || 'N/A'}`, { size: 7.5, colorRgb: [0.45, 0.45, 0.45], lineHeight: 10, x: marginX + 25 });
            write(`IP: ${s.ip_address || 'N/A'} | Navegador: ${(s.user_agent || 'N/A').substring(0, 55)}...`, { size: 7, colorRgb: [0.5, 0.5, 0.5], lineHeight: 10, x: marginX + 25, maxWidth: contentWidth - 30 });
            
            cursorY = sigBoxStartY - sigBoxHeight - 12;
        });
        
        // Log de eventos
        cursorY -= 15;
        
        if (cursorY < 100) {
            console.log('⚠️ Espaço insuficiente para logs');
        } else {
            write('Log', { bold: true, size: 13, colorRgb: [0.2, 0.2, 0.2], lineHeight: 20 });
            cursorY -= 8;
            
            const logs: Array<{date: string; action: string}> = [];
            logs.push({
                date: new Date(baseOrder.created_at).toLocaleString('pt-BR'),
                action: 'Documento criado e enviado para assinatura'
            });
            
            signedList.forEach(s => {
                if (s.signed_at) {
                    logs.push({
                        date: new Date(s.signed_at).toLocaleString('pt-BR'),
                        action: `Assinado por ${s.name || s.email}`
                    });
                }
            });
            
            logs.push({
                date: new Date().toLocaleString('pt-BR'),
                action: 'Documento concluído e finalizado'
            });
            
            logs.forEach((log, idx) => {
                const logBoxH = 42;
                const logBoxStartY = cursorY;
                
                if (cursorY - logBoxH < 60) {
                    console.log(`⚠️ Log ${idx + 1} truncado`);
                    return;
                }
                
                drawBox(marginX - 10, logBoxStartY - logBoxH, contentWidth + 20, logBoxH, rgb(0.97, 0.99, 0.97));
                cursorY -= 10;
                
                write(`${log.date}`, { bold: true, size: 8.5, colorRgb: [0.25, 0.25, 0.25], lineHeight: 11 });
                write(`${log.action}`, { size: 8, colorRgb: [0.35, 0.35, 0.35], lineHeight: 11 });
                
                cursorY = logBoxStartY - logBoxH - 8;
            });
        }
        
        // Rodapé da página de termo
        page.drawText(`Autenticação: ${authCode}`, {
            x: 20,
            y: 15,
            size: 7,
            font: font,
            color: rgb(0.6, 0.6, 0.6)
        });
        
        const totalPages = pdfDoc.getPageCount();
        page.drawText(`${totalPages}`, {
            x: width - 30,
            y: 15,
            size: 9,
            font: font,
            color: rgb(0.4, 0.4, 0.4)
        });

        const finalBytes = await pdfDoc.save();

        const hashBuffer = await crypto.subtle.digest('SHA-256', finalBytes);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const finalHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        const finalFile = new Blob([finalBytes], { type: 'application/pdf' });
        const finalPath = `${baseOrder.file_path}.final.pdf`;
        const finalName = baseOrder.file_name.replace(/\.pdf$/i, '') + '-assinado.pdf';
        
        const { error: uploadError } = await supabase.storage
            .from('service-orders')
            .upload(finalPath, finalFile, { upsert: true, contentType: 'application/pdf' });
        
        if (uploadError) throw uploadError;

        return { path: finalPath, name: finalName, hash: finalHash };
    };

    React.useEffect(() => {
        loadCompletedOrders();
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">🔄 Reprocessamento de OS</h1>
                    <p className="text-slate-600 mb-6">
                        Adicionar termo de assinatura em OS concluídas que não têm PDF final
                    </p>

                    <div className="space-y-4 mb-6">
                        <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <input
                                type="checkbox"
                                id="forceAll"
                                checked={forceAll}
                                onChange={(e) => setForceAll(e.target.checked)}
                                className="w-4 h-4"
                            />
                            <label htmlFor="forceAll" className="text-sm text-amber-900 font-medium cursor-pointer">
                                Forçar reprocessamento de TODAS (incluindo as que já têm PDF final)
                                <span className="block text-xs text-amber-700 mt-1">
                                    Use isto para atualizar o layout do termo em OS antigas
                                </span>
                            </label>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={loadCompletedOrders}
                                disabled={loadingOrders}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                {loadingOrders ? 'Buscando...' : 'Buscar OS para Reprocessar'}
                            </button>

                            {osToReprocess.length > 0 && (
                                <button
                                    onClick={reprocessAll}
                                    disabled={loading}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                                >
                                    {loading ? 'Processando...' : `Reprocessar ${osToReprocess.length} OS`}
                                </button>
                            )}
                        </div>
                    </div>

                    {osToReprocess.length > 0 && (
                        <div className="mb-6">
                            <h3 className="font-semibold text-slate-700 mb-3">OS para reprocessar:</h3>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {osToReprocess.map(os => (
                                    <div key={os.id} className="p-3 bg-slate-50 rounded-lg">
                                        <p className="font-medium">{os.title}</p>
                                        <p className="text-sm text-slate-600">{os.file_name}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {results.length > 0 && (
                        <div>
                            <h3 className="font-semibold text-slate-700 mb-3">Resultados:</h3>
                            <div className="space-y-2">
                                {results.map(r => (
                                    <div key={r.id} className={`p-3 rounded-lg flex items-start gap-3 ${r.success ? 'bg-green-50' : 'bg-red-50'}`}>
                                        {r.success ? (
                                            <CheckCircleIcon className="w-5 h-5 text-green-600 shrink-0" />
                                        ) : (
                                            <ExclamationTriangleIcon className="w-5 h-5 text-red-600 shrink-0" />
                                        )}
                                        <div className="flex-1">
                                            <p className={`font-medium ${r.success ? 'text-green-800' : 'text-red-800'}`}>
                                                {r.title}
                                            </p>
                                            {r.error && (
                                                <p className="text-sm text-red-700 mt-1">{r.error}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {!loadingOrders && osToReprocess.length === 0 && (
                        <div className="text-center py-8 bg-slate-50 rounded-lg">
                            <ClockIcon className="w-12 h-12 mx-auto text-slate-400 mb-2" />
                            <p className="text-slate-600">Nenhuma OS precisa de reprocessamento</p>
                            <p className="text-sm text-slate-500 mt-1">
                                Todas as OS concluídas já têm PDF final com termo
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

