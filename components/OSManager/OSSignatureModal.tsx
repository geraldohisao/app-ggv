import React, { useState } from 'react';
import { ServiceOrder, OSSigner, SignerStatus, OSStatus } from '../../types';
import { supabase } from '../../services/supabaseClient';
import { osEmailService } from '../../services/osEmailService';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import {
    XMarkIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    ArrowRightIcon
} from '../ui/icons';

interface OSSignatureModalProps {
    order: ServiceOrder;
    signer: OSSigner;
    onClose: () => void;
    onComplete: () => void;
}

/**
 * Modal de Confirmação de Dados para Assinatura
 * Estilo ClickSign
 */
const OSSignatureModal: React.FC<OSSignatureModalProps> = ({
    order,
    signer,
    onClose,
    onComplete
}) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    const [fullName, setFullName] = useState(signer.name || '');
    const [cpf, setCpf] = useState('');
    const [birthDate, setBirthDate] = useState('');

    const validateCPF = (cpf: string): boolean => {
        const cleanCPF = cpf.replace(/\D/g, '');
        
        if (cleanCPF.length !== 11) return false;
        if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
        
        let sum = 0;
        for (let i = 0; i < 9; i++) {
            sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
        }
        let digit = 11 - (sum % 11);
        if (digit >= 10) digit = 0;
        if (digit !== parseInt(cleanCPF.charAt(9))) return false;
        
        sum = 0;
        for (let i = 0; i < 10; i++) {
            sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
        }
        digit = 11 - (sum % 11);
        if (digit >= 10) digit = 0;
        if (digit !== parseInt(cleanCPF.charAt(10))) return false;
        
        return true;
    };

    const formatCPF = (value: string): string => {
        const numbers = value.replace(/\D/g, '');
        return numbers
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
            .substring(0, 14);
    };

    const formatDate = (value: string): string => {
        const numbers = value.replace(/\D/g, '');
        return numbers
            .replace(/(\d{2})(\d)/, '$1/$2')
            .replace(/(\d{2})(\d)/, '$1/$2')
            .substring(0, 10);
    };

    const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCpf(formatCPF(e.target.value));
    };

    const handleBirthDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setBirthDate(formatDate(e.target.value));
    };

    const validateForm = (): boolean => {
        setError('');

        if (!fullName.trim()) {
            setError('Preencha seu nome completo.');
            return false;
        }

        if (fullName.trim().split(' ').length < 2) {
            setError('Digite seu nome completo (nome e sobrenome).');
            return false;
        }

        if (!validateCPF(cpf)) {
            setError('CPF inválido.');
            return false;
        }

        if (birthDate) {
            const dateParts = birthDate.split('/');
            if (dateParts.length !== 3) {
                setError('Data de nascimento inválida.');
                return false;
            }
            const day = parseInt(dateParts[0]);
            const month = parseInt(dateParts[1]);
            const year = parseInt(dateParts[2]);
            
            if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > new Date().getFullYear()) {
                setError('Data de nascimento inválida.');
                return false;
            }
        }

        return true;
    };

    React.useEffect(() => {
        // 1) Prefill com dados já presentes no signer (signature_data)
        const sigData: any = (signer as any).signature_data;
        if (sigData) {
            if (sigData.fullName) setFullName(sigData.fullName);
            if (sigData.cpf) setCpf(formatCPF(sigData.cpf));
            if (sigData.birthDate) setBirthDate(formatDate(sigData.birthDate));
            return;
        }

        // 2) Buscar último cadastro assinado desse e-mail para reaproveitar
        const loadLastSignedData = async () => {
            try {
                const { data, error } = await supabase
                    .from('os_signers')
                    .select('signature_data')
                    .eq('email', signer.email)
                    .eq('status', SignerStatus.Signed)
                    .order('signed_at', { ascending: false })
                    .limit(1)
                    .single();

                if (!error && data?.signature_data) {
                    const prev: any = data.signature_data;
                    if (prev.fullName) setFullName(prev.fullName);
                    if (prev.cpf) setCpf(formatCPF(prev.cpf));
                    if (prev.birthDate) setBirthDate(formatDate(prev.birthDate));
                }
            } catch (err) {
                console.warn('Prefill signature data falhou (ignorado):', err);
            }
        };

        loadLastSignedData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [signer.email]);

    const handleSubmit = async () => {
        if (!validateForm()) return;

        try {
            setLoading(true);
            setError('');

            // Coletar dados de prova (tolerante a bloqueios de rede/navegador)
            let ip = '0.0.0.0';
            try {
                const ipResponse = await fetch('https://api.ipify.org?format=json');
                const ipJson = await ipResponse.json();
                if (ipJson?.ip) ip = ipJson.ip;
            } catch (e) {
                console.warn('⚠️ Falha ao obter IP (prosseguindo mesmo assim):', e);
            }
            
            const signatureData = {
                fullName: fullName.trim(),
                cpf: cpf.replace(/\D/g, ''),
                birthDate: birthDate || null,
                signedAt: new Date().toISOString(),
                ipAddress: ip,
                userAgent: navigator.userAgent,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                screenResolution: `${window.screen.width}x${window.screen.height}`,
                documentHash: order.file_hash || null
            };

            // Gerar hash SHA-256
            const signatureString = JSON.stringify(signatureData);
            const encoder = new TextEncoder();
            const data = encoder.encode(signatureString);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const signatureHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            // Atualizar registro
            const { error: updateError } = await supabase
                .from('os_signers')
                .update({
                    status: SignerStatus.Signed,
                    signed_at: signatureData.signedAt,
                    ip_address: signatureData.ipAddress,
                    user_agent: signatureData.userAgent,
                    signature_hash: signatureHash,
                    signature_data: { ...signatureData, signatureHash }
                })
                .eq('id', signer.id);

            if (updateError) throw updateError;

            // Log de auditoria
            await supabase.rpc('log_os_event', {
                p_os_id: order.id,
                p_signer_id: signer.id,
                p_event_type: 'signed',
                p_event_description: `Assinado por ${fullName}`,
                p_metadata: {
                    cpf_partial: cpf.substring(0, 7) + '***',
                    ip: ip,
                    document_hash: order.file_hash || null,
                        signature_hash: signatureHash
                }
            });

            // Recalcular status da OS e disparar finalização automática se todos assinaram
            const { data: allSigners } = await supabase
                .from('os_signers')
                .select('*')
                .eq('os_id', order.id);

            const total = allSigners?.length || order.total_signers || 0;
            const signedCount = (allSigners || []).filter(s => s.status === SignerStatus.Signed).length;
            const newStatus =
                total > 0 && signedCount === total ? OSStatus.Completed :
                signedCount > 0 ? OSStatus.PartialSigned : order.status;

            await supabase
                .from('service_orders')
                .update({
                    signed_count: signedCount,
                    total_signers: total,
                    status: newStatus,
                    updated_at: new Date().toISOString()
                })
                .eq('id', order.id);

            if (newStatus === OSStatus.Completed) {
                console.log('🎉 OS FINALIZADA! Iniciando processo de conclusão...');
                
                await supabase.rpc('log_os_event', {
                    p_os_id: order.id,
                    p_event_type: 'completed',
                    p_event_description: 'OS finalizada automaticamente (todos assinaram)',
                    p_metadata: {}
                });

                // Gerar PDF final com termo de assinatura como última página
                let finalPath: string | undefined;
                let finalName: string | undefined;
                let finalHash: string | undefined;
                
                try {
                    console.log('📄 Gerando PDF final com termo de assinatura...');
                    console.log('📄 Dados da OS:', {
                        id: order.id,
                        file_path: order.file_path,
                        file_name: order.file_name,
                        total_signers: allSigners?.length
                    });
                    
                    const gen = await generateFinalPdfWithTerm(order, allSigners || []);
                    finalPath = gen.path;
                    finalName = gen.name;
                    finalHash = gen.hash;
                    
                    console.log('✅ PDF final gerado com sucesso!', { 
                        path: finalPath, 
                        name: finalName, 
                        hash: finalHash 
                    });
                } catch (genErr) {
                    console.error('❌ ERRO CRÍTICO ao gerar PDF final com termo:', genErr);
                    console.error('Stack trace:', genErr);
                    // Alertar usuário sobre falha (mas não bloqueia)
                    alert('⚠️ Aviso: Erro ao gerar PDF final com termo. O documento foi assinado, mas pode não ter o termo anexado. Verifique os logs.');
                }

                // Atualizar service_orders com dados do PDF final
                if (finalPath && finalName && finalHash) {
                    console.log('💾 Salvando dados do PDF final no banco...');
                    const { error: updateErr } = await supabase
                        .from('service_orders')
                        .update({
                            final_file_path: finalPath,
                            final_file_name: finalName,
                            final_file_hash: finalHash
                        })
                        .eq('id', order.id);
                    
                    if (updateErr) {
                        console.error('❌ Erro ao salvar PDF final no banco:', updateErr);
                    } else {
                        console.log('✅ Dados do PDF final salvos no banco com sucesso');
                    }
                } else {
                    console.warn('⚠️ PDF final NÃO foi gerado, dados não salvos no banco');
                }

                const orderWithSigners = {
                    ...order,
                    status: newStatus,
                    signers: allSigners || [],
                    signed_count: signedCount,
                    total_signers: total,
                    final_file_path: finalPath,
                    final_file_name: finalName,
                    final_file_hash: finalHash
                };

                console.log('📧 Preparando envio de e-mails de finalização...');
                console.log('📄 Dados para sendFinalized:', {
                    final_file_path: finalPath,
                    final_file_name: finalName,
                    file_path: order.file_path,
                    signers_count: allSigners?.length
                });

                // Enviar e-mails com PDF anexado para todos que assinaram
                try {
                    console.log('📧 Enviando e-mails de finalização para todos que assinaram...');
                    await osEmailService.sendFinalized(orderWithSigners as ServiceOrder, (allSigners || []) as OSSigner[]);
                    console.log('✅ E-mails de finalização enviados com sucesso!');
                } catch (emailErr) {
                    console.error('❌ ERRO ao enviar e-mails de finalização:', emailErr);
                    console.error('Stack trace:', emailErr);
                    // Não bloqueia a assinatura, mas loga o erro
                }
            }

            onComplete();
        } catch (err: any) {
            console.error('Erro ao assinar:', err);
            setError('Erro ao processar assinatura. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const generateFinalPdfWithTerm = async (baseOrder: ServiceOrder, signersList: OSSigner[]): Promise<{ path: string; name: string; hash: string }> => {
        // Baixar PDF original
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

        const marginX = 60;
        const marginY = 60;
        let cursorY = height - 70;
        const contentWidth = width - (2 * marginX);

        // Função para desenhar box com estilo melhorado
        const drawBox = (x: number, y: number, w: number, h: number, bgColor = rgb(0.98, 0.98, 0.98)) => {
            page.drawRectangle({ 
                x, y, width: w, height: h, 
                color: bgColor, 
                borderWidth: 1.5, 
                borderColor: rgb(0.85, 0.85, 0.85) 
            });
        };

        // Função para desenhar linha divisória
        const drawLine = (y: number) => {
            page.drawLine({
                start: { x: marginX, y },
                end: { x: width - marginX, y },
                thickness: 1,
                color: rgb(0.9, 0.9, 0.9)
            });
        };

        // Quebra de texto manual para evitar cortes (hash, user-agent, etc.)
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

        // ========== CABEÇALHO ==========
        write('TERMO DE ASSINATURA DIGITAL', { bold: true, size: 22, colorRgb: [0, 0, 0], lineHeight: 30 });
        drawLine(cursorY + 5);
        cursorY -= 25;

        // ========== INFORMAÇÕES DO DOCUMENTO ==========
        write('INFORMAÇÕES DO DOCUMENTO', { bold: true, size: 13, colorRgb: [0.2, 0.2, 0.2], lineHeight: 20 });
        cursorY -= 5;

        const docBoxY = cursorY - 75;
        drawBox(marginX - 10, docBoxY, contentWidth + 20, 75, rgb(0.97, 0.97, 0.97));
        cursorY -= 10;

        write(`Documento: ${baseOrder.file_name}`, { size: 11, lineHeight: 16 });
        write(`Título: ${baseOrder.title}`, { size: 11, lineHeight: 16 });
        write(`Data/hora da conclusão: ${new Date().toLocaleString('pt-BR')}`, { size: 10, colorRgb: [0.3, 0.3, 0.3], lineHeight: 16 });
        
        cursorY = docBoxY - 25;

        // ========== HASH DO DOCUMENTO ==========
        write('HASH DO DOCUMENTO ORIGINAL (SHA-256)', { bold: true, size: 11, colorRgb: [0.25, 0.25, 0.25], lineHeight: 18 });
        cursorY -= 5;

        const hashBoxY = cursorY - 35;
        drawBox(marginX - 10, hashBoxY, contentWidth + 20, 35, rgb(0.95, 0.97, 1));
        cursorY -= 10;

        const hashText = baseOrder.file_hash || 'Não disponível';
        write(hashText, { size: 9, colorRgb: [0.2, 0.2, 0.5], lineHeight: 14, maxWidth: contentWidth - 20, x: marginX + 10 });
        
        cursorY = hashBoxY - 30;

        // ========== ASSINATURAS ==========
        write('ASSINATURAS COLETADAS', { bold: true, size: 13, colorRgb: [0.2, 0.2, 0.2], lineHeight: 20 });
        cursorY -= 10;

        const signedList = signersList.filter(s => s.status === 'SIGNED');
        
        signedList.forEach((s, idx) => {
            const sigBoxHeight = 150;
            const sigBoxY = cursorY - sigBoxHeight + 10;
            
            // Box com fundo alternado
            const boxBg = idx % 2 === 0 ? rgb(0.98, 0.98, 0.98) : rgb(0.96, 0.97, 0.98);
            drawBox(marginX - 10, sigBoxY, contentWidth + 20, sigBoxHeight, boxBg);
            
            cursorY -= 18;
            
            // Nome com destaque
            write(`${idx + 1}. ${s.name || s.email}`, { bold: true, size: 12, colorRgb: [0, 0, 0], lineHeight: 18 });
            
            // Informações organizadas
            write(`E-mail: ${s.email}`, { size: 10, lineHeight: 14, x: marginX });
            write(`CPF: ${s.cpf || 'Não informado'}`, { size: 10, lineHeight: 14, x: marginX });
            write(`Função: ${s.role || 'Colaborador'}`, { size: 10, lineHeight: 14, x: marginX });
            write(`Assinado em: ${s.signed_at ? new Date(s.signed_at).toLocaleString('pt-BR') : 'Pendente'}`, { size: 10, lineHeight: 14, x: marginX });
            
            cursorY -= 4;
            
            // Dados técnicos (menor) com quebra automática
            write(`IP: ${s.ip_address || 'Não disponível'}`, { size: 8.5, colorRgb: [0.35, 0.35, 0.35], lineHeight: 12, x: marginX });
            write(`User Agent: ${s.user_agent || 'Não disponível'}`, { size: 8.5, colorRgb: [0.35, 0.35, 0.35], lineHeight: 12, x: marginX, maxWidth: contentWidth });
            write(`Hash da assinatura: ${s.signature_hash || 'Não disponível'}`, { size: 8.5, colorRgb: [0.35, 0.35, 0.35], lineHeight: 12, x: marginX, maxWidth: contentWidth });
            
            cursorY = sigBoxY - 25;
        });

        // ========== RODAPÉ ==========
        drawLine(marginY + 40);
        cursorY = marginY + 25;
        
        write('Este termo consolida as evidências de assinatura eletrônica deste documento e possui validade jurídica.', 
            { size: 9, colorRgb: [0.35, 0.35, 0.35], lineHeight: 13, x: marginX + 5 });
        write('Datas e horários em GMT-03:00 Brasília | Documento gerado automaticamente pelo Sistema GGV', 
            { size: 8, colorRgb: [0.5, 0.5, 0.5], lineHeight: 12, x: marginX + 5 });

        const finalBytes = await pdfDoc.save();

        // Calcular hash do PDF final
        const hashBuffer = await crypto.subtle.digest('SHA-256', finalBytes);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const finalHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        const finalFile = new Blob([finalBytes], { type: 'application/pdf' });

        const finalPath = `${baseOrder.file_path}.final.pdf`;
        const finalName = baseOrder.file_name.replace(/\.pdf$/i, '') + '-assinado.pdf';
        
        console.log('📤 Fazendo upload do PDF final para storage:', finalPath);
        const { error: uploadError } = await supabase.storage
            .from('service-orders')
            .upload(finalPath, finalFile, { upsert: true, contentType: 'application/pdf' });
        
        if (uploadError) {
            console.error('❌ Erro ao fazer upload do PDF final:', uploadError);
            throw uploadError;
        }
        
        console.log('✅ Upload do PDF final concluído');

        // Retorna os dados para serem salvos no banco depois (evita duplicação)
        return { path: finalPath, name: finalName, hash: finalHash };
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 md:p-6">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 md:p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-4 md:mb-6">
                    <h2 className="text-xl md:text-2xl font-bold text-slate-900">Confirme seus dados</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 touch-manipulation">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <div className="flex items-start gap-3">
                            <ExclamationTriangleIcon className="w-5 h-5 text-red-600 shrink-0" />
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    </div>
                )}

                {/* Formulário */}
                <div className="space-y-4">
                    {/* Nome Completo */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Nome completo
                        </label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full px-3 md:px-4 py-2 md:py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                            placeholder="Digite seu nome completo"
                        />
                    </div>

                    {/* CPF */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            CPF
                        </label>
                        <input
                            type="text"
                            value={cpf}
                            onChange={handleCPFChange}
                            className="w-full px-3 md:px-4 py-2 md:py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-base"
                            placeholder="000.000.000-00"
                            maxLength={14}
                            inputMode="numeric"
                        />
                    </div>

                    {/* Data de Nascimento */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Data de Nascimento (DD/MM/AAAA)
                        </label>
                        <input
                            type="text"
                            value={birthDate}
                            onChange={handleBirthDateChange}
                            className="w-full px-3 md:px-4 py-2 md:py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-base"
                            placeholder="21/11/1991"
                            maxLength={10}
                            inputMode="numeric"
                        />
                    </div>
                </div>

                {/* Botão */}
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full mt-6 md:mt-8 py-3 md:py-4 bg-slate-900 text-white rounded-lg hover:bg-slate-800 active:bg-slate-950 font-semibold text-base md:text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 touch-manipulation"
                >
                    {loading ? (
                        <>
                            <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                            Processando...
                        </>
                    ) : (
                        <>
                            Avançar
                            <ArrowRightIcon className="w-5 h-5" />
                        </>
                    )}
                </button>

                {/* Footer */}
                <p className="text-xs text-slate-500 text-center mt-4">
                    🔒 Ambiente seguro Grupo GGV
                </p>
            </div>
        </div>
    );
};

export default OSSignatureModal;

