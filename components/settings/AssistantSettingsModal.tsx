import React, { useState, useEffect } from 'react';
import { AIPersona, UserRole, AIMode } from '../../types';
import { useUser } from '../../contexts/DirectUserContext';
import { getAIPersonas, saveAIPersona, getLLMGenerationConfig, saveLLMGenerationConfig, getRAGConfig, saveRAGConfig } from '../../services/supabaseService';
import { ModalBase } from './ModalBase';
import { LoadingSpinner, ErrorDisplay } from '../ui/Feedback';
import { FormGroup, formLabelClass, formInputClass, formTextareaClass } from '../ui/Form';
import { PencilIcon, XMarkIcon, LightBulbIcon, BoltIcon } from '../ui/icons';
import { personaTemplates, personaTips, personalityTraitsSuggestions } from '../../data/personaTemplates';

export const AssistantSettingsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { user } = useUser();
    const [personas, setPersonas] = useState<AIPersona[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [llmCfg, setLlmCfg] = useState({ temperature: 0.7, topP: 0.95, topK: 40, maxOutputTokens: 2048 });
    const [ragCfg, setRagCfg] = useState({ topKDocs: 5, topKOverview: 3, minScore: 0.15 });
    const [isFormOpen, setFormOpen] = useState(false);
    const [currentPersona, setCurrentPersona] = useState<AIPersona | null>(null);

    // Fail-safe contra travas de carregamento em DEV/estrito
    const withTimeout = async <T,>(p: Promise<T>, ms = 8000, label = 'operação'): Promise<T> => {
        return await Promise.race([
            p,
            new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout após ${ms}ms em ${label}`)), ms))
        ]) as T;
    };

    useEffect(() => {
        const fetchPersonas = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const data = await withTimeout(getAIPersonas(), 8000, 'carregar personas');
                
                // Normalizar dados para garantir que todos os campos existem
                const normalizedData = data.map(persona => ({
                    ...persona,
                    name: persona.name || '',
                    description: persona.description || '',
                    tone: persona.tone || 'profissional',
                    wordLimit: persona.wordLimit || 200,
                    systemPrompt: persona.systemPrompt || '',
                    directives: persona.directives || '',
                    personalityTraits: persona.personalityTraits || []
                }));
                
                console.log('Personas carregadas:', normalizedData);
                setPersonas(normalizedData);

                // carregar configs
                const [lc, rc] = await withTimeout(Promise.all([
                    getLLMGenerationConfig(),
                    getRAGConfig()
                ]), 8000, 'carregar configs');
                setLlmCfg(lc as any);
                setRagCfg(rc as any);
            } catch (err: any) {
                console.error("Error fetching personas:", err);
                setError(`Falha ao carregar personas: ${err.message}`);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPersonas();
    }, []);

    const canEdit = user?.role === UserRole.SuperAdmin;

    const handleEdit = (persona: AIPersona) => {
        setCurrentPersona(persona);
        setFormOpen(true);
    };

    const handleSave = async (persona: AIPersona) => {
        try {
            console.log('Salvando persona:', persona);
            const savedPersona = await saveAIPersona(persona);
            console.log('Persona salva:', savedPersona);
            
            // Recarregar todas as personas para garantir dados atualizados
            const updatedPersonas = await getAIPersonas();
            setPersonas(updatedPersonas);
            
            setFormOpen(false);
            setCurrentPersona(null);
            
            alert('Persona salva com sucesso!');
        } catch (err: any) {
            console.error('Erro ao salvar:', err);
            alert(`Falha ao salvar persona: ${err.message}`);
        }
    };

    return (
        <ModalBase title="Configurações do Assistente IA" onClose={onClose}>
            {isLoading ? (
                <LoadingSpinner />
            ) : error ? (
                <ErrorDisplay message={error} />
            ) : !isFormOpen ? (
                <div>
                    <p className="text-slate-600 mb-4">Gerencie as personas e comportamentos do seu assistente de IA.</p>
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                        <div className="bg-white border border-slate-200 rounded-lg p-4">
                            <h3 className="font-semibold text-slate-800 mb-3">Parâmetros de Geração (LLM)</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormGroup>
                                    <label className={formLabelClass}>temperature</label>
                                    <input type="range" min={0} max={1} step={0.01} value={llmCfg.temperature} onChange={e=>setLlmCfg({...llmCfg, temperature: parseFloat(e.target.value)})} />
                                    <div className="text-xs text-slate-500">{llmCfg.temperature.toFixed(2)}</div>
                                </FormGroup>
                                <FormGroup>
                                    <label className={formLabelClass}>topP</label>
                                    <input type="range" min={0} max={1} step={0.01} value={llmCfg.topP} onChange={e=>setLlmCfg({...llmCfg, topP: parseFloat(e.target.value)})} />
                                    <div className="text-xs text-slate-500">{llmCfg.topP.toFixed(2)}</div>
                                </FormGroup>
                                <FormGroup>
                                    <label className={formLabelClass}>topK</label>
                                    <input type="number" className={formInputClass} value={llmCfg.topK} onChange={e=>setLlmCfg({...llmCfg, topK: parseInt(e.target.value||'0')||0})} />
                                </FormGroup>
                                <FormGroup>
                                    <label className={formLabelClass}>maxOutputTokens</label>
                                    <input type="number" className={formInputClass} value={llmCfg.maxOutputTokens} onChange={e=>setLlmCfg({...llmCfg, maxOutputTokens: parseInt(e.target.value||'0')||0})} />
                                </FormGroup>
                            </div>
                            <div className="flex justify-end mt-3">
                                <button type="button" onClick={async ()=>{ await saveLLMGenerationConfig(llmCfg as any); alert('Parâmetros de geração salvos.'); }} className="bg-blue-900 text-white font-semibold px-4 py-2 rounded">Salvar Geração</button>
                            </div>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-lg p-4">
                            <h3 className="font-semibold text-slate-800 mb-3">Parâmetros de RAG</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormGroup>
                                    <label className={formLabelClass}>topKDocs</label>
                                    <input type="number" className={formInputClass} value={ragCfg.topKDocs} onChange={e=>setRagCfg({...ragCfg, topKDocs: parseInt(e.target.value||'0')||0})} />
                                </FormGroup>
                                <FormGroup>
                                    <label className={formLabelClass}>topKOverview</label>
                                    <input type="number" className={formInputClass} value={ragCfg.topKOverview} onChange={e=>setRagCfg({...ragCfg, topKOverview: parseInt(e.target.value||'0')||0})} />
                                </FormGroup>
                                <FormGroup>
                                    <label className={formLabelClass}>minScore</label>
                                    <input type="range" min={0} max={1} step={0.01} value={ragCfg.minScore} onChange={e=>setRagCfg({...ragCfg, minScore: parseFloat(e.target.value)})} />
                                    <div className="text-xs text-slate-500">{ragCfg.minScore.toFixed(2)}</div>
                                </FormGroup>
                            </div>
                            <div className="flex justify-end mt-3">
                                <button type="button" onClick={async ()=>{ await saveRAGConfig(ragCfg as any); alert('Parâmetros de RAG salvos.'); }} className="bg-blue-900 text-white font-semibold px-4 py-2 rounded">Salvar RAG</button>
                            </div>
                        </div>
                        {personas.map(persona => (
                            <div key={persona.id} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-800">{persona.name}</h3>
                                        <p className="text-sm text-slate-500">{persona.description}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs bg-teal-100 text-teal-800 font-bold px-3 py-1 rounded-full">Ativo</span>
                                        {canEdit && (
                                            <button 
                                                onClick={() => handleEdit(persona)} 
                                                className="flex items-center gap-1.5 bg-white border border-slate-300 text-slate-700 font-semibold px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors text-sm"
                                            >
                                                <PencilIcon className="w-4 h-4" /> Editar
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : currentPersona ? (
                <PersonaForm 
                    persona={currentPersona} 
                    onSave={handleSave} 
                    onCancel={() => {
                        setFormOpen(false);
                        setCurrentPersona(null);
                    }} 
                />
            ) : (
                <div>Erro: Persona não encontrada</div>
            )}
        </ModalBase>
    );
};

export default AssistantSettingsModal;

const PersonaForm: React.FC<{ persona: AIPersona; onSave: (persona: AIPersona) => void; onCancel: () => void }> = ({ persona, onSave, onCancel }) => {
    const { user } = useUser();
    
    // Inicializar formData com valores padrão seguros
    const [formData, setFormData] = useState<AIPersona>(() => ({
        ...persona,
        name: persona.name || '',
        description: persona.description || '',
        tone: persona.tone || 'profissional',
        wordLimit: persona.wordLimit || 200,
        systemPrompt: persona.systemPrompt || '',
        directives: persona.directives || '',
        personalityTraits: persona.personalityTraits || []
    }));
    
    const [traitInput, setTraitInput] = useState('');
    const [showTemplates, setShowTemplates] = useState(false);
    const canEdit = user?.role === UserRole.SuperAdmin;
    
    // Obter dicas e sugestões baseadas no tipo da persona
    const currentTips = personaTips[persona.id as AIMode] || [];
    const currentSuggestions = personalityTraitsSuggestions[persona.id as AIMode] || [];

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseInt(value) || 0 : value }));
    };

    const handleAddTrait = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && traitInput.trim()) {
            e.preventDefault();
            const currentTraits = formData.personalityTraits || [];
            if (!currentTraits.includes(traitInput.trim())) {
                setFormData(prev => ({ ...prev, personalityTraits: [...currentTraits, traitInput.trim()] }));
            }
            setTraitInput('');
        }
    };

    const handleRemoveTrait = (traitToRemove: string) => {
        const currentTraits = formData.personalityTraits || [];
        setFormData(prev => ({ ...prev, personalityTraits: currentTraits.filter(t => t !== traitToRemove) }));
    };

    const handleAddSuggestedTrait = (trait: string) => {
        const currentTraits = formData.personalityTraits || [];
        if (!currentTraits.includes(trait)) {
            setFormData(prev => ({ ...prev, personalityTraits: [...currentTraits, trait] }));
        }
    };

    const handleApplyTemplate = () => {
        const template = personaTemplates[persona.id as AIMode];
        if (template && canEdit) {
            setFormData(prev => ({
                ...prev,
                ...template,
                id: prev.id, // Manter o ID original
            }));
            setShowTemplates(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (canEdit) onSave(formData);
    };

    if (!persona || !formData) {
        return <div>Erro: Dados da persona não encontrados</div>;
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800">{`Editar Persona: ${persona.name}`}</h2>
                {canEdit && (
                    <button
                        type="button"
                        onClick={() => setShowTemplates(!showTemplates)}
                        className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
                    >
                        <BoltIcon className="w-4 h-4" />
                        Template Otimizado
                    </button>
                )}
            </div>

            {showTemplates && canEdit && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2">
                        <BoltIcon className="w-5 h-5 text-blue-600" />
                        <h3 className="font-semibold text-blue-800">Template Otimizado para {persona.name}</h3>
                    </div>
                    <p className="text-blue-700 text-sm">
                        Aplicar configurações otimizadas baseadas nas melhores práticas para esta persona.
                    </p>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={handleApplyTemplate}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                            Aplicar Template
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowTemplates(false)}
                            className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-300 transition-colors text-sm font-medium"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {currentTips.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <LightBulbIcon className="w-5 h-5 text-amber-600" />
                        <h3 className="font-semibold text-amber-800">Dicas para {persona.name}</h3>
                    </div>
                    <ul className="space-y-1">
                        {currentTips.map((tip, index) => (
                            <li key={index} className="text-amber-700 text-sm">{tip}</li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="max-h-[50vh] overflow-y-auto pr-3 space-y-4 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormGroup>
                        <label htmlFor="name" className={formLabelClass}>Nome</label>
                        <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} className={formInputClass} required disabled={!canEdit} />
                    </FormGroup>
                    <FormGroup>
                        <label htmlFor="tone" className={formLabelClass}>Tom de Voz</label>
                        <input type="text" name="tone" id="tone" value={formData.tone} onChange={handleChange} className={formInputClass} required disabled={!canEdit} />
                    </FormGroup>
                    <FormGroup>
                        <label htmlFor="wordLimit" className={formLabelClass}>Limite de Palavras</label>
                        <input type="number" name="wordLimit" id="wordLimit" value={formData.wordLimit} onChange={handleChange} className={formInputClass} required disabled={!canEdit} />
                    </FormGroup>
                </div>
                <FormGroup>
                    <label htmlFor="description" className={formLabelClass}>Descrição</label>
                    <input type="text" name="description" id="description" value={formData.description} onChange={handleChange} className={formInputClass} disabled={!canEdit} />
                </FormGroup>
                <FormGroup>
                    <label htmlFor="systemPrompt" className={formLabelClass}>Prompt do Sistema</label>
                    <textarea name="systemPrompt" id="systemPrompt" value={formData.systemPrompt} onChange={handleChange} className={formTextareaClass} rows={4} disabled={!canEdit}></textarea>
                </FormGroup>
                <FormGroup>
                    <label htmlFor="directives" className={formLabelClass}>Diretrizes</label>
                    <textarea name="directives" id="directives" value={formData.directives} onChange={handleChange} className={formTextareaClass} rows={3} disabled={!canEdit}></textarea>
                </FormGroup>
                <FormGroup>
                    <label htmlFor="personalityTraits" className={formLabelClass}>Características de Personalidade</label>
                    <div className="flex flex-wrap gap-2 p-2 border border-slate-300 rounded-md bg-slate-50 min-h-[40px]">
                        {(formData.personalityTraits || []).map(trait => (
                            <span key={trait} className="flex items-center gap-1.5 bg-blue-200 text-blue-900 text-sm font-semibold px-2 py-1 rounded">
                                {trait}
                                {canEdit && (
                                    <button type="button" onClick={() => handleRemoveTrait(trait)} className="text-blue-700 hover:text-blue-900"><XMarkIcon className="w-3 h-3" /></button>
                                )}
                            </span>
                        ))}
                        {canEdit && (
                            <input
                                type="text"
                                value={traitInput}
                                onChange={(e) => setTraitInput(e.target.value)}
                                onKeyDown={handleAddTrait}
                                placeholder="Digite uma característica e pressione Enter"
                                className="flex-1 bg-transparent focus:outline-none text-sm"
                            />
                        )}
                    </div>
                    
                    {canEdit && currentSuggestions.length > 0 && (
                        <div className="mt-2">
                            <p className="text-sm text-slate-600 mb-2">Sugestões para {persona.name}:</p>
                            <div className="flex flex-wrap gap-1">
                                {currentSuggestions
                                    .filter(suggestion => !(formData.personalityTraits || []).includes(suggestion))
                                    .slice(0, 8)
                                    .map(suggestion => (
                                    <button
                                        key={suggestion}
                                        type="button"
                                        onClick={() => handleAddSuggestedTrait(suggestion)}
                                        className="text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded hover:bg-blue-100 hover:text-blue-800 transition-colors"
                                    >
                                        + {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </FormGroup>
            </div>
            <div className="flex justify-end gap-4 mt-6 pt-4 border-t border-slate-200 bg-white sticky bottom-0">
                <button type="button" onClick={onCancel} className="bg-slate-200 text-slate-800 font-bold py-2 px-5 rounded-lg hover:bg-slate-300 transition-colors">Cancelar</button>
                <button type="submit" disabled={!canEdit} className="bg-blue-900 text-white font-bold py-2 px-5 rounded-lg hover:bg-blue-800 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed">Salvar Alterações</button>
            </div>
        </form>
    );
};
