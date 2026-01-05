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
            
            // Filtrar as que NÃO têm final_file_path
            const needsReprocessing = (data || []).filter(os => 
                !os.final_file_path || os.final_file_path === '' || os.final_file_path === null
            );
            
            console.log('📋 OS sem PDF final:', needsReprocessing.length);
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
        const page = pdfDoc.addPage();
        const { width, height } = page.getSize();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        const marginX = 50;
        const marginY = 50;
        let cursorY = height - 60;
        const lineHeight = 14;

        const drawBox = (x: number, y: number, w: number, h: number, bgColor = rgb(0.95, 0.95, 0.95)) => {
            page.drawRectangle({ 
                x, y, width: w, height: h, 
                color: bgColor, 
                borderWidth: 1, 
                borderColor: rgb(0.8, 0.8, 0.8) 
            });
        };

        const write = (text: string, options: { bold?: boolean; size?: number; x?: number; colorRgb?: [number, number, number] } = {}) => {
            const size = options.size || 11;
            const usedFont = options.bold ? fontBold : font;
            const xPos = options.x !== undefined ? options.x : marginX;
            const textColor = options.colorRgb ? rgb(options.colorRgb[0], options.colorRgb[1], options.colorRgb[2]) : rgb(0.2, 0.2, 0.2);
            page.drawText(text, { x: xPos, y: cursorY, size, font: usedFont, color: textColor });
            cursorY -= size + lineHeight - size;
        };

        write('TERMO DE ASSINATURA DIGITAL', { bold: true, size: 18, colorRgb: [0, 0, 0] });
        cursorY -= 20;

        write(`Documento: ${baseOrder.file_name}`, { bold: true, size: 12 });
        write(`Título: ${baseOrder.title}`, { size: 11 });
        cursorY -= 8;

        drawBox(marginX - 10, cursorY - 5, width - 2 * marginX + 20, 30);
        cursorY += 5;
        write(`Hash do documento original (SHA256):`, { bold: true, size: 10 });
        const hashText = baseOrder.file_hash || 'Não disponível';
        write(hashText.substring(0, 64), { size: 9, x: marginX + 10 });
        if (hashText.length > 64) write(hashText.substring(64), { size: 9, x: marginX + 10 });
        cursorY -= 20;

        write(`Data/hora da conclusão: ${new Date().toLocaleString('pt-BR')}`, { size: 10 });
        cursorY -= 25;

        write('Assinaturas', { bold: true, size: 14, colorRgb: [0, 0, 0] });
        cursorY -= 15;

        signersList.filter(s => s.status === 'SIGNED').forEach((s, idx) => {
            const boxHeight = 120;
            drawBox(marginX - 10, cursorY - boxHeight + 15, width - 2 * marginX + 20, boxHeight, rgb(0.98, 0.98, 0.98));
            
            write(`${idx + 1}. ${s.name || s.email}`, { bold: true, size: 11 });
            write(`    E-mail: ${s.email}`, { size: 10 });
            write(`    CPF: ${s.cpf || 'Não informado'}`, { size: 10 });
            write(`    Papel: ${s.role || 'Colaborador'}`, { size: 10 });
            write(`    Assinado em: ${s.signed_at ? new Date(s.signed_at).toLocaleString('pt-BR') : 'Pendente'}`, { size: 10 });
            write(`    IP: ${s.ip_address || 'Não disponível'}`, { size: 9 });
            write(`    User Agent: ${(s.user_agent || '').substring(0, 80)}${s.user_agent && s.user_agent.length > 80 ? '...' : ''}`, { size: 8 });
            write(`    Hash da assinatura: ${(s.signature_hash || 'Não disponível').substring(0, 60)}`, { size: 8 });
            
            cursorY -= 15;
        });

        cursorY = marginY + 20;
        write('Observação: Este termo consolida as evidências de assinatura deste documento.', { size: 9, colorRgb: [0.4, 0.4, 0.4] });
        write('Datas e horários em GMT -03:00 Brasília', { size: 8, colorRgb: [0.5, 0.5, 0.5] });

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

                    <div className="flex gap-3 mb-6">
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

