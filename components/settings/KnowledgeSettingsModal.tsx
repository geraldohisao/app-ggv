import React, { useState, useEffect, useRef } from 'react';
import { StoredKnowledgeDocument, UserRole } from '../../types';
import { useUser } from '../../contexts/DirectUserContext';
import { getKnowledgeDocuments, addKnowledgeDocument, deleteKnowledgeDocument, getKnowledgeOverview, upsertKnowledgeOverview } from '../../services/supabaseService';
import { generateEmbedding } from '../../services/embeddingService';
// Removido: fluxo antigo de armazenamento local e sincronização
import { ModalBase } from './ModalBase';
import { LoadingSpinner, ErrorDisplay } from '../ui/Feedback';
import { DocumentTextIcon, PlusIcon, BookOpenIcon, TrashIcon } from '../ui/icons';
import * as pdfjsLib from 'pdfjs-dist';
import { supabase } from '../../services/supabaseClient';

// Ajuste automático do worker para a mesma versão da lib instalada
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@${(pdfjsLib as any).version || '5.4.54'}/build/pdf.worker.min.mjs`;

export const KnowledgeSettingsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { user } = useUser();
    const [documents, setDocuments] = useState<StoredKnowledgeDocument[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isSavingOverview, setIsSavingOverview] = useState(false);
    const [isConverting, setIsConverting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [overviewText, setOverviewText] = useState('');
    const [overviewId, setOverviewId] = useState<string | null>(null);

    // Divide texto longo em blocos menores para salvar como múltiplos documentos
    const splitTextIntoChunks = (text: string, maxChunkSize = 2500): string[] => {
        const normalized = text.replace(/\r\n/g, '\n');
        if (normalized.length <= maxChunkSize) return [normalized];

        const paragraphs = normalized.split(/\n{2,}/);
        const chunks: string[] = [];
        let current = '';
        for (const p of paragraphs) {
            const candidate = current.length === 0 ? p : current + '\n\n' + p;
            if (candidate.length <= maxChunkSize) {
                current = candidate;
            } else {
                if (current) chunks.push(current);
                if (p.length <= maxChunkSize) {
                    current = p;
                } else {
                    // Quebra parágrafo muito grande por frases
                    const sentences = p.split(/(?<=[\.\?!])\s+/);
                    let buf = '';
                    for (const s of sentences) {
                        const cand = buf.length === 0 ? s : buf + ' ' + s;
                        if (cand.length <= maxChunkSize) {
                            buf = cand;
                        } else {
                            if (buf) chunks.push(buf);
                            buf = s;
                        }
                    }
                    if (buf) chunks.push(buf);
                    current = '';
                }
            }
        }
        if (current) chunks.push(current);
        return chunks;
    };

    const withTimeout = async <T,>(promise: Promise<T>, ms = 8000, task = 'operação'): Promise<T> => {
        return await Promise.race([
            promise,
            new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout (${ms}ms) em ${task}`)), ms))
        ]) as T;
    };

    // Salva o texto do overview diretamente na tabela knowledge_documents
    const saveOverviewAsDocuments = async (text: string) => {
        if (!user) throw new Error('Usuário não autenticado');
        const titleBase = 'overview_ggv';
        const chunks = splitTextIntoChunks(text);

        const savedDocs: StoredKnowledgeDocument[] = [];
        for (let i = 0; i < chunks.length; i++) {
            const content = chunks[i];
            const name = `${titleBase}_parte_${i + 1}`;
            try {
                const embedding = await withTimeout(
                    generateEmbedding(content, 'RETRIEVAL_DOCUMENT', name),
                    8000,
                    'gerar embedding'
                );
                const payload = { user_id: user.id, name, content, embedding } as any;
                const saved = await withTimeout(
                    addKnowledgeDocument(payload),
                    8000,
                    'salvar documento'
                );
                savedDocs.push(saved);
            } catch (e: any) {
                console.error('Falha ao salvar chunk', i + 1, e);
                throw new Error(`Falha ao salvar parte ${i + 1}: ${e?.message || 'erro desconhecido'}`);
            }
        }
        // Atualizar lista com o que acabou de ser salvo
        setDocuments(prev => [...savedDocs, ...prev]);
        return savedDocs.length;
    };

    useEffect(() => {
        const fetchDocs = async () => {
            console.log('🔄 MODAL CÉREBRO - Iniciando carregamento...');
            if (!user) {
                console.log('❌ MODAL CÉREBRO - Usuário não autenticado');
                setError("Usuário não autenticado.");
                setIsLoading(false);
                return;
            }
            

            
            try {
                console.log('📚 MODAL CÉREBRO - Carregando documentos...');
                const data = await getKnowledgeDocuments();
                console.log('✅ MODAL CÉREBRO - Documentos carregados:', data.length);
                setDocuments(data);
                
                // Carregar overview da tabela correta
                try {
                    console.log('📋 MODAL CÉREBRO - Carregando overview...');
                    const overview = await getKnowledgeOverview();
                    if (overview) {
                        setOverviewId(overview.id);
                        setOverviewText(overview.content || '');
                        console.log('✅ MODAL CÉREBRO - Overview carregado');
                    }
                } catch (e) { 
                    console.warn('⚠️ MODAL CÉREBRO - Overview falhou, ignorando:', (e as any)?.message);
                }
                
            } catch (err: any) {
                console.error('❌ MODAL CÉREBRO - Erro geral:', err);
                setError(`Falha ao carregar: ${err.message}`);
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchDocs();
        // Realtime: manter lista sincronizada com inserts/deletes
        let cleanup: (() => void) | undefined;
        (async () => {
            try {
                if (!user || !supabase) return;
                const channel = supabase
                    .channel('realtime-knowledge')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'knowledge_documents', filter: `user_id=eq.${user.id}` }, async () => {
                        try { const latest = await getKnowledgeDocuments(); setDocuments(latest); } catch {}
                    })
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'knowledge_overview', filter: `user_id=eq.${user.id}` }, async () => {
                        try { const ov = await getKnowledgeOverview(); if (ov) { setOverviewId(ov.id); setOverviewText(ov.content || ''); } } catch {}
                    })
                    .subscribe();
                cleanup = () => { try { supabase.removeChannel(channel); } catch {} };
            } catch {}
        })();
        return () => { if (cleanup) cleanup(); };
    }, [user]);

    const canEdit = user?.role === UserRole.SuperAdmin || user?.role === UserRole.Admin;

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || !canEdit || !user) return;
        const file = event.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            let content = '';
            if (file.type === 'application/pdf') {
                const arrayBuffer = await file.arrayBuffer();

                // Tentativas com diferentes workers (corrige mismatch de versão)
                const candidateWorkers = [
                    `https://esm.sh/pdfjs-dist@${(pdfjsLib as any).version}/build/pdf.worker.min.mjs`,
                    `https://unpkg.com/pdfjs-dist@${(pdfjsLib as any).version}/build/pdf.worker.min.js`,
                    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${(pdfjsLib as any).version}/pdf.worker.min.js`,
                    '', // fallback sem worker
                ];

                let lastErr: any = null;
                for (const w of candidateWorkers) {
                    try {
                        pdfjsLib.GlobalWorkerOptions.workerSrc = w as any;
                        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                        for (let i = 1; i <= pdf.numPages; i++) {
                            const page = await pdf.getPage(i);
                            const textContent = await page.getTextContent();
                            content += (textContent.items as any[]).map(item => ('str' in item ? (item as any).str : '')).join(' ') + '\n';
                        }
                        lastErr = null;
                        break; // sucesso
                    } catch (e: any) {
                        console.warn('PDF worker falhou, tentando próximo...', w, e?.message);
                        lastErr = e;
                    }
                }

                if (lastErr) {
                    throw new Error(`Falha ao processar PDF: ${lastErr.message}`);
                }
            } else if (file.type === 'text/plain') {
                content = await file.text();
            } else {
                throw new Error('Formato de arquivo não suportado. Use PDF ou TXT.');
            }

            if (!content.trim()) {
                throw new Error('Não foi possível extrair conteúdo do arquivo.');
            }

            const embedding = await generateEmbedding(content, 'RETRIEVAL_DOCUMENT', file.name);
            const newDocData = { user_id: user.id, name: file.name, content, embedding };
            const savedDoc = await addKnowledgeDocument(newDocData);
            setDocuments(prev => [...prev, savedDoc]);

        } catch (error: any) {
            console.error("Error processing and uploading file:", error);
            alert(`Falha ao processar e salvar o arquivo: ${error.message}`);
        } finally {
            setIsUploading(false);
            if (event.target) event.target.value = '';
        }
    };

    const handleDelete = async (docId: string) => {
        if (window.confirm("Tem certeza que deseja remover este documento?")) {
            try {
                await deleteKnowledgeDocument(docId);
                setDocuments(prev => prev.filter(doc => doc.id !== docId));
            } catch (err: any) {
                alert(`Falha ao remover documento: ${err.message}`);
            }
        }
    };

    return (
        <ModalBase title="Gerenciar Cérebro da IA" onClose={onClose}>
            <div className="flex justify-between items-center mb-4">
                <p className="text-slate-600">Adicione ou remova documentos (PDF ou TXT).</p>
                {canEdit && (
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="flex items-center gap-2 bg-purple-800 text-white font-semibold px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm disabled:bg-slate-400 disabled:cursor-wait"
                    >
                        {isUploading ? 'Processando...' : <><PlusIcon className="w-5 h-5" /> Adicionar Documento</>}
                    </button>
                )}
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,.txt" disabled={!canEdit || isUploading} />
            </div>
            {error ? <ErrorDisplay message={error} /> : (
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                    <div className="bg-white rounded-lg border border-slate-200 p-4">
                        <h3 className="font-semibold mb-2">Bloco de Contexto (texto livre)</h3>
                        <textarea
                            className="w-full border rounded-md p-3 text-sm min-h-[180px]"
                            placeholder="Cole aqui o bloco 'Sobre a GGV', metodologia, cases etc. Este texto será priorizado no contexto da IA."
                            value={overviewText}
                            onChange={e => setOverviewText(e.target.value)}
                        />
                        <div className="mt-2 flex justify-end gap-2">
                            <button
                                className="px-3 py-1.5 bg-purple-800 text-white rounded-md text-sm disabled:bg-slate-400"
                                disabled={isConverting}
                                title="Ignora o bloco livre e salva diretamente como documentos vetoriais (recomendado para textos longos)"
                                onClick={async () => {
                                    if (!overviewText.trim()) {
                                        alert('Digite algum texto antes de converter.');
                                        return;
                                    }
                                    setIsConverting(true);
                                    try {
                                        const qtd = await saveOverviewAsDocuments(overviewText);
                                        try {
                                            const refreshed = await getKnowledgeDocuments();
                                            setDocuments(refreshed);
                                        } catch {}
                                        alert(`✅ Texto convertido em ${qtd} documento(s) no cérebro da IA.`);
                                    } catch (err: any) {
                                        console.error('Erro ao converter bloco para documentos:', err);
                                        alert(`❌ Falha ao converter: ${err.message || 'Erro desconhecido'}`);
                                    } finally {
                                        setIsConverting(false);
                                    }
                                }}
                            >
                                {isConverting ? 'Convertendo...' : 'Salvar como Documentos'}
                            </button>
                            <button
                                className="px-3 py-1.5 bg-blue-900 text-white rounded-md text-sm disabled:bg-slate-400"
                                disabled={isSavingOverview}
                                onClick={async () => {
                                    if (!overviewText.trim()) {
                                        alert('Digite algum texto antes de salvar.');
                                        return;
                                    }
                                    
                                    setIsSavingOverview(true);
                                    try {
                                        console.log('💾 SALVANDO BLOCO - Iniciando...');
                                        console.log('📝 Conteúdo:', overviewText.substring(0, 100) + '...');
                                        
                                        try {
                                            const embedding = await generateEmbedding(overviewText, 'RETRIEVAL_DOCUMENT', 'overview');
                                            console.log('✅ Embedding gerado:', embedding.length, 'dimensões');

                                            // Timeout de segurança para evitar travas
                                            const upsertPromise = upsertKnowledgeOverview({ 
                                                title: 'Sobre a GGV', 
                                                content: overviewText, 
                                                embedding 
                                            });
                                            const saved = await Promise.race([
                                                upsertPromise,
                                                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout ao salvar overview (6s)')), 6000))
                                            ] as any);
                                            console.log('✅ Bloco salvo na tabela knowledge_overview:', saved.id);
                                            setOverviewId(saved.id);
                                            alert('✅ Bloco de contexto salvo com sucesso!');
                                        } catch (primaryErr: any) {
                                            console.warn('⚠️ Falha ao salvar no knowledge_overview. Aplicando fallback para documents.', primaryErr?.message);
                                            const qtd = await saveOverviewAsDocuments(overviewText);
                                            // Recarregar lista após fallback
                                            try {
                                                const refreshedDocs = await getKnowledgeDocuments();
                                                setDocuments(refreshedDocs);
                                            } catch (e) {
                                                console.warn('Falha ao recarregar documentos após fallback:', (e as any)?.message);
                                            }
                                            alert(`✅ Bloco salvo como ${qtd} documento(s) no cérebro da IA. A busca vetorial continuará funcionando.`);
                                        }
                                        
                                    } catch (err: any) {
                                        console.error('❌ ERRO ao salvar bloco:', err);
                                        alert(`❌ Falha ao salvar: ${err.message}`);
                                    } finally {
                                        setIsSavingOverview(false);
                                    }
                                }}
                            >
                                {isSavingOverview ? 'Salvando...' : 'Salvar Bloco'}
                            </button>
                        </div>
                    </div>
                    {documents.length > 0 ? documents.map(doc => (
                        <div key={doc.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-between items-center">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <DocumentTextIcon className="w-6 h-6 text-purple-600 flex-shrink-0" />
                                <div className="overflow-hidden">
                                    <h4 className="font-semibold text-slate-800 truncate">{doc.name}</h4>
                                    <p className="text-xs text-slate-500 truncate">{doc.content}</p>
                                </div>
                            </div>
                            {canEdit && (
                                <button onClick={() => handleDelete(doc.id)} className="p-2 text-slate-500 hover:text-red-700 hover:bg-red-100 rounded-md flex-shrink-0 ml-2">
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    )) : (
                        <div className="text-center py-10 text-slate-500 border-2 border-dashed border-slate-200 rounded-lg">
                            <BookOpenIcon className="w-12 h-12 mx-auto text-slate-400 mb-2" />
                            <h3 className="font-semibold text-slate-700">O cérebro da IA está vazio.</h3>
                            <p>Adicione documentos para enriquecer o conhecimento do assistente.</p>
                        </div>
                    )}
                </div>
            )}
        </ModalBase>
    );
};
