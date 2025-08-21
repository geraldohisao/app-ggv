import React, { useState, useEffect } from 'react';
import { MarketSegment, UserRole } from '../../types';
import { useUser } from '../../contexts/DirectUserContext';
import { getDiagnosticSegments, saveDiagnosticSegment, deleteDiagnosticSegment, seedDefaultSegments } from '../../services/supabaseService';
import { DEFAULT_DIAGNOSTIC_SEGMENTS, AI_FOCUS_AREAS } from '../../constants';
import { ModalBase } from './ModalBase';
import { LoadingSpinner, ErrorDisplay } from '../ui/Feedback';
import { FormGroup, formLabelClass, formInputClass, formTextareaClass } from '../ui/Form';
import { PlusIcon, ChartBarIcon, PencilIcon, TrashIcon } from '../ui/icons';

export const DiagnosticSettingsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { user } = useUser();
    const [segments, setSegments] = useState<MarketSegment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFormOpen, setFormOpen] = useState(false);
    const [isSeeding, setIsSeeding] = useState(false);
    const [currentSegment, setCurrentSegment] = useState<MarketSegment | null>(null);

    const fetchSegments = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await getDiagnosticSegments();
            setSegments(data);
        } catch (err: any) {
            console.error("Error fetching segments:", err);
            setError(`Falha ao carregar segmentos: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSegments();
    }, []);

    const canEdit = user?.role === UserRole.SuperAdmin || user?.role === UserRole.Admin;

    const handleAdd = () => {
        setCurrentSegment(null);
        setFormOpen(true);
    };

    const handleEdit = (segment: MarketSegment) => {
        setCurrentSegment(segment);
        setFormOpen(true);
    };

    const handleDelete = async (segmentId: string) => {
        if (window.confirm("Tem certeza que deseja excluir este segmento?")) {
            try {
                await deleteDiagnosticSegment(segmentId);
                setSegments(prev => prev.filter(s => s.id !== segmentId));
            } catch (err: any) {
                alert(`Falha ao excluir segmento: ${err.message}`);
            }
        }
    };

    const handleSeedSegments = async () => {
        if (!canEdit) return;
        if (!window.confirm("Isso irá adicionar 3 segmentos de exemplo ao banco de dados. Deseja continuar?")) return;

        setIsSeeding(true);
        try {
            const segmentsToInsert = DEFAULT_DIAGNOSTIC_SEGMENTS.map(({ id, ...rest }) => rest);
            await seedDefaultSegments(segmentsToInsert as any);
            await fetchSegments();
        } catch (error: any) {
            alert(`Falha ao adicionar segmentos padrão: ${error.message}`);
        } finally {
            setIsSeeding(false);
        }
    };

    const handleSave = async (segment: MarketSegment) => {
        try {
            const savedSegment = await saveDiagnosticSegment(segment);
            if (currentSegment) {
                setSegments(prev => prev.map(s => s.id === savedSegment.id ? savedSegment : s));
            } else {
                setSegments(prev => [...prev, savedSegment]);
            }
            setFormOpen(false);
            setCurrentSegment(null);
        } catch (err: any) {
            console.error("Save error:", err);
            alert(`Falha ao salvar segmento: ${err.message}`);
        }
    };

    return (
        <ModalBase title="Configurações do Diagnóstico Comercial" onClose={onClose}>
            {isLoading ? <LoadingSpinner /> : error ? <ErrorDisplay message={error} /> : !isFormOpen ? (
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <p className="text-slate-600">Gerencie os segmentos de mercado para análise.</p>
                        {canEdit && (
                            <button onClick={handleAdd} className="flex items-center gap-2 bg-blue-900 text-white font-semibold px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors text-sm">
                                <PlusIcon className="w-5 h-5" /> Adicionar Novo Segmento
                            </button>
                        )}
                    </div>

                    {segments.length === 0 && canEdit && (
                        <div className="text-center py-10 text-slate-500 border-2 border-dashed border-slate-200 rounded-lg">
                            <ChartBarIcon className="w-12 h-12 mx-auto text-slate-400 mb-2" />
                            <h3 className="font-semibold text-slate-700">Nenhum segmento encontrado.</h3>
                            <p>Comece adicionando segmentos ou carregue dados de exemplo.</p>
                            <button
                                onClick={handleSeedSegments}
                                disabled={isSeeding}
                                className="mt-4 flex items-center mx-auto gap-2 bg-slate-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors text-sm disabled:bg-slate-400"
                            >
                                {isSeeding ? 'Carregando...' : 'Adicionar Segmentos Padrão'}
                            </button>
                        </div>
                    )}

                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                        {segments.length > 0 && segments.map(segment => (
                            <div key={segment.id} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-800">{segment.name}</h3>
                                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mt-1">
                                            <span>Média: {segment.benchmarkMedio}%</span>
                                            <span>|</span>
                                            <span>Top: {segment.topPerformers}%</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {canEdit && (
                                            <>
                                                <button onClick={() => handleEdit(segment)} className="p-2 text-slate-500 hover:text-blue-700 hover:bg-blue-100 rounded-md"><PencilIcon className="w-5 h-5" /></button>
                                                <button onClick={() => handleDelete(segment.id)} className="p-2 text-slate-500 hover:text-red-700 hover:bg-red-100 rounded-md"><TrashIcon className="w-5 h-5" /></button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <SegmentForm
                    segment={currentSegment}
                    onSave={handleSave}
                    onCancel={() => setFormOpen(false)}
                />
            )}
        </ModalBase>
    );
};

const SegmentForm: React.FC<{ segment: MarketSegment | null; onSave: (segment: MarketSegment) => void; onCancel: () => void }> = ({ segment, onSave, onCancel }) => {
    const { user } = useUser();
    const [activeTab, setActiveTab] = useState<'basic' | 'ai'>('basic');
    const [formData, setFormData] = useState<MarketSegment>(segment || {
        id: '', name: '', benchmarkMedio: 45, topPerformers: 75,
        characteristics: '', trends: '', challenges: '', successFactors: '',
        aiFocusAreas: [], aiCustomPrompt: '', aiRevenueInsights: '',
        aiChannelInsights: { b2b: '', b2c: '', hibrido: '' }
    });
    
    const canEdit = user?.role === UserRole.SuperAdmin || user?.role === UserRole.Admin;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
    };
    
    const handleNestedChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({...prev, aiChannelInsights: {...prev.aiChannelInsights, [name]: value }}));
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            aiFocusAreas: checked ? [...prev.aiFocusAreas, value] : prev.aiFocusAreas.filter(area => area !== value)
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(canEdit) onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800">{segment ? `Editar Segmento: ${segment.name}` : 'Criar Novo Segmento'}</h2>
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-6">
                    <button type="button" onClick={() => setActiveTab('basic')} className={`py-3 px-1 border-b-2 font-semibold text-sm ${activeTab === 'basic' ? 'border-blue-800 text-blue-800' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>Configurações Básicas</button>
                    <button type="button" onClick={() => setActiveTab('ai')} className={`py-3 px-1 border-b-2 font-semibold text-sm ${activeTab === 'ai' ? 'border-blue-800 text-blue-800' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>Configuração de IA</button>
                </nav>
            </div>
            <div className="max-h-[55vh] overflow-y-auto pr-3 space-y-5">
                {activeTab === 'basic' && (
                    <div className="space-y-4 animate-fade-in">
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                             <FormGroup>
                                <label htmlFor="name" className={formLabelClass}>Nome do Segmento</label>
                                <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} className={formInputClass} placeholder="Ex: Tecnologia, Saúde..." required disabled={!canEdit}/>
                            </FormGroup>
                            <FormGroup>
                                <label htmlFor="benchmarkMedio" className={formLabelClass}>Benchmark Médio (%)</label>
                                <input type="number" name="benchmarkMedio" id="benchmarkMedio" value={formData.benchmarkMedio} onChange={handleChange} className={formInputClass} required disabled={!canEdit}/>
                            </FormGroup>
                             <FormGroup>
                                <label htmlFor="topPerformers" className={formLabelClass}>Top Performers (%)</label>
                                <input type="number" name="topPerformers" id="topPerformers" value={formData.topPerformers} onChange={handleChange} className={formInputClass} required disabled={!canEdit}/>
                            </FormGroup>
                        </div>
                         <FormGroup>
                            <label htmlFor="characteristics" className={formLabelClass}>Características do Mercado</label>
                            <textarea name="characteristics" id="characteristics" value={formData.characteristics} onChange={handleChange} className={formTextareaClass} rows={2} placeholder="Descreva as principais características deste segmento..." disabled={!canEdit}></textarea>
                        </FormGroup>
                         <FormGroup>
                            <label htmlFor="trends" className={formLabelClass}>Tendências de Crescimento</label>
                            <textarea name="trends" id="trends" value={formData.trends} onChange={handleChange} className={formTextareaClass} rows={2} placeholder="Principais tendências e oportunidades..." disabled={!canEdit}></textarea>
                        </FormGroup>
                         <FormGroup>
                            <label htmlFor="challenges" className={formLabelClass}>Principais Desafios</label>
                            <textarea name="challenges" id="challenges" value={formData.challenges} onChange={handleChange} className={formTextareaClass} rows={2} placeholder="Desafios típicos enfrentados neste segmento..." disabled={!canEdit}></textarea>
                        </FormGroup>
                         <FormGroup>
                            <label htmlFor="successFactors" className={formLabelClass}>Fatores de Sucesso</label>
                            <textarea name="successFactors" id="successFactors" value={formData.successFactors} onChange={handleChange} className={formTextareaClass} rows={2} placeholder="O que determina o sucesso em vendas neste segmento..." disabled={!canEdit}></textarea>
                        </FormGroup>
                    </div>
                )}
                {activeTab === 'ai' && (
                     <div className="space-y-5 animate-fade-in">
                        <FormGroup>
                            <label className={formLabelClass}>Focos de Análise da IA</label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-1">
                                {AI_FOCUS_AREAS.map(area => (
                                     <div key={area} className="flex items-center">
                                        <input type="checkbox" id={`focus-${area}`} value={area} checked={formData.aiFocusAreas.includes(area)} onChange={handleCheckboxChange} className="h-4 w-4 rounded border-gray-300 text-blue-800 focus:ring-blue-800" disabled={!canEdit} />
                                        <label htmlFor={`focus-${area}`} className="ml-2 text-sm text-slate-800">{area}</label>
                                    </div>
                                ))}
                            </div>
                        </FormGroup>
                        <FormGroup>
                            <label htmlFor="aiCustomPrompt" className={formLabelClass}>Prompt Personalizado</label>
                            <textarea name="aiCustomPrompt" id="aiCustomPrompt" value={formData.aiCustomPrompt} onChange={handleChange} className={formTextareaClass} rows={3} placeholder="Instruções específicas para a análise da IA neste setor..." disabled={!canEdit}></textarea>
                        </FormGroup>
                        <FormGroup>
                            <label htmlFor="aiRevenueInsights" className={formLabelClass}>Considerações por Faixa de Receita</label>
                            <textarea name="aiRevenueInsights" id="aiRevenueInsights" value={formData.aiRevenueInsights} onChange={handleChange} className={formTextareaClass} rows={2} placeholder="Insights específicos baseados no faturamento..." disabled={!canEdit}></textarea>
                        </FormGroup>
                         <FormGroup>
                             <label className={formLabelClass}>Insights por Canal de Vendas</label>
                             <div className="space-y-3">
                                <textarea name="b2b" value={formData.aiChannelInsights.b2b} onChange={handleNestedChange} className={formTextareaClass} rows={2} placeholder="Insights específicos para vendas B2B..." disabled={!canEdit}></textarea>
                                <textarea name="b2c" value={formData.aiChannelInsights.b2c} onChange={handleNestedChange} className={formTextareaClass} rows={2} placeholder="Insights específicos para vendas B2C..." disabled={!canEdit}></textarea>
                                <textarea name="hibrido" value={formData.aiChannelInsights.hibrido} onChange={handleNestedChange} className={formTextareaClass} rows={2} placeholder="Insights específicos para vendas Híbrido..." disabled={!canEdit}></textarea>
                             </div>
                         </FormGroup>
                    </div>
                )}
            </div>
            <div className="flex justify-end gap-4 mt-6 pt-4 border-t border-slate-200">
                <button type="button" onClick={onCancel} className="bg-slate-200 text-slate-800 font-bold py-2 px-5 rounded-lg hover:bg-slate-300 transition-colors">Cancelar</button>
                <button type="submit" disabled={!canEdit} className="bg-blue-900 text-white font-bold py-2 px-5 rounded-lg hover:bg-blue-800 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed">{segment ? 'Salvar Alterações' : 'Criar Segmento'}</button>
            </div>
        </form>
    );
};
