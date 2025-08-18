import React, { useState, useEffect } from 'react';
import { CompanyData, MarketSegment } from '../../types';
import { getDiagnosticSegments } from '../../services/supabaseService';
import { FATURAMENTO_MENSAL, TAMANHO_EQUIPE_VENDAS, CANAIS_DE_VENDA, RAMOS_DE_ATIVIDADE, SETORES_DE_ATUACAO } from '../../constants';
import { LoadingSpinner, ErrorDisplay } from '../ui/Feedback';
import { GGVInteligenciaBrand } from '../ui/BrandLogos';
import { FormInput, FormSelect, FormCheckbox } from '../ui/Form';

interface CompanyInfoFormProps {
    onSubmit: (data: CompanyData, segment: MarketSegment) => void;
    prefill?: Partial<CompanyData>;
}

export const CompanyInfoForm: React.FC<CompanyInfoFormProps> = ({ onSubmit, prefill }) => {
    const [segments, setSegments] = useState<MarketSegment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAndSetSegments = async () => {
            try {
                setIsLoading(true);
                setFetchError(null);
                const data = await getDiagnosticSegments();
                setSegments(data);
            } catch (error: any) {
                console.error("Error fetching segments:", error);
                setFetchError(`Falha ao carregar segmentos: ${error.message}`);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAndSetSegments();
    }, []);

    const initialData: CompanyData = {
        companyName: '',
        email: '',
        activityBranch: '',
        monthlyBilling: '',
        salesTeamSize: '',
        salesChannels: [],
        activitySector: '',
    };
    const [formData, setFormData] = useState<CompanyData>({ ...initialData, ...(prefill || {}) });
    const [errors, setErrors] = useState<Partial<Record<keyof Omit<CompanyData, 'salesChannels'> | 'salesChannels', string>>>({});

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (errors[e.target.name as keyof typeof errors]) {
            setErrors(prev => ({ ...prev, [e.target.name]: undefined }));
        }
    };
    
    // Função para mapear valores do N8N para valores das constantes
    const mapPipedriveValues = (data: Partial<CompanyData>) => {
        const mapped = { ...data };
        
        // MAPEAMENTO DE FATURAMENTO - Converter valores N8N para formato das constantes
        if (data.monthlyBilling) {
            console.log('💰 FORM - Faturamento original:', data.monthlyBilling);
            console.log('💰 FORM - Tipo:', typeof data.monthlyBilling);
            
            // MAPEAMENTO ESPECÍFICO DOS VALORES N8N
            const faturamentoMap: Record<string, string> = {
                // Valores que vem do N8N → Valores das constantes
                '601 a 1 milhão/mês': 'R$ 601 mil a 1 milhão/mês',
                '€01 a 1 milhão/mês': 'R$ 601 mil a 1 milhão/mês',
                '21 a 50 mil/mês': 'R$ 21 a 50 mil/mês',
                '51 a 100 mil/mês': 'R$ 51 a 100 mil/mês',
                '101 a 300 mil/mês': 'R$ 101 a 300 mil/mês',
                '301 a 600 mil/mês': 'R$ 301 a 600 mil/mês',
                'Acima de 1 milhão/mês': 'Acima de R$ 1 milhão/mês',
                'Nenhum faturamento': 'Nenhum faturamento'
            };
            
            // Tentar mapeamento direto
            if (faturamentoMap[data.monthlyBilling]) {
                mapped.monthlyBilling = faturamentoMap[data.monthlyBilling];
                console.log('💰 FORM - ✅ Mapeamento direto:', data.monthlyBilling, '→', mapped.monthlyBilling);
            } else if (FATURAMENTO_MENSAL.includes(data.monthlyBilling)) {
                // Se já estiver em formato válido, manter
                mapped.monthlyBilling = data.monthlyBilling;
                console.log('💰 FORM - ✅ Faturamento válido mantido:', data.monthlyBilling);
            } else {
                // Fallback baseado em números
                if (data.monthlyBilling.includes('601') || data.monthlyBilling.includes('1 milhão')) {
                    mapped.monthlyBilling = 'R$ 601 mil a 1 milhão/mês';
                    console.log('💰 FORM - 🔄 Fallback baseado em conteúdo (601/1milhão):', mapped.monthlyBilling);
                } else {
                    mapped.monthlyBilling = 'Acima de R$ 1 milhão/mês';
                    console.log('💰 FORM - 🔄 Fallback genérico:', mapped.monthlyBilling);
                }
            }
        }
        
        // MAPEAMENTO DE SETOR - buscar em todos os campos possíveis
        const setorCandidatos = [
            data.activitySector,
            (data as any)['setor_de_atuação'], // COM ACENTOS - PRINCIPAL!
            (data as any).setor_de_atuacao,    // Sem acentos - fallback
            (data as any).setor,
            (data as any).activity_sector
        ].filter(Boolean);
        
        console.log('🎯 FORM - Candidatos a setor encontrados:', setorCandidatos);
        console.log('🎯 FORM - Array SETORES_DE_ATUACAO (primeiros 10):', SETORES_DE_ATUACAO.slice(0, 10));
        console.log('🎯 FORM - Procurando por "Consultoria":', SETORES_DE_ATUACAO.filter(s => s.includes('Consultoria')));
        
        if (setorCandidatos.length > 0) {
            const setorOriginal = setorCandidatos[0];
            const setorLimpo = setorOriginal.trim(); // Remover espaços extras
            
            console.log('🎯 FORM - Setor original:', `"${setorOriginal}"`);
            console.log('🎯 FORM - Setor limpo:', `"${setorLimpo}"`);
            console.log('🎯 FORM - Tamanho do setor:', setorLimpo.length);
            
            // Verificar se existe exatamente
            const existeExato = SETORES_DE_ATUACAO.includes(setorLimpo);
            console.log('🎯 FORM - Existe exato?', existeExato);
            
            if (existeExato) {
                mapped.activitySector = setorLimpo;
                console.log('✅ FORM - Setor exato aplicado:', setorLimpo);
            } else {
                // Buscar por correspondência parcial (case insensitive)
                console.log('🔍 FORM - Buscando setor por correspondência...');
                
                const setorEncontrado = SETORES_DE_ATUACAO.find(opcao => {
                    const opcaoLimpa = opcao.trim().toLowerCase();
                    const setorBusca = setorLimpo.toLowerCase();
                    const match = opcaoLimpa === setorBusca || 
                                  opcaoLimpa.includes('consultoria') && setorBusca.includes('consultoria');
                    
                    if (match) {
                        console.log('🎯 FORM - Match encontrado:', opcao, '←→', setorLimpo);
                    }
                    return match;
                });
                
                if (setorEncontrado) {
                    mapped.activitySector = setorEncontrado;
                    console.log('✅ FORM - Setor encontrado por busca:', setorEncontrado);
                } else {
                    console.log('❌ FORM - Setor não encontrado em nenhuma busca');
                    console.log('📋 FORM - Setores com "Consultoria":', 
                        SETORES_DE_ATUACAO.filter(s => s.toLowerCase().includes('consultoria'))
                    );
                }
            }
        } else {
            console.log('❌ FORM - Nenhum setor encontrado nos dados');
        }
        
        return mapped;
    };

    // Atualiza com prefill quando chegar depois do primeiro render
    useEffect(() => {
        console.log('🔄 FORM - useEffect executado');
        console.log('📥 FORM - Prefill recebido:', prefill);
        
        if (prefill) {
            console.log('🎯 FORM - ANÁLISE DETALHADA DOS DADOS RECEBIDOS:');
            console.log('  - prefill.activitySector:', `"${prefill.activitySector}"`);
            console.log('  - prefill.setor_de_atuacao:', `"${(prefill as any).setor_de_atuacao}"`);
            console.log('  - prefill["setor_de_atuação"]:', `"${(prefill as any)['setor_de_atuação']}"`);
            console.log('  - Tipo activitySector:', typeof prefill.activitySector);
            console.log('  - Todas as chaves do prefill:', Object.keys(prefill));
            console.log('📝 FORM - Aplicando mapeamento...');
            
            const mappedPrefill = mapPipedriveValues(prefill);
            
            console.log('📝 FORM - Dados finais que serão aplicados:', mappedPrefill);
            
            // Verificar se os valores mapeados existem nas constantes
            console.log('🔍 FORM - Verificando se valores existem nas opções:');
            console.log('💰 FORM - Faturamento mapeado existe?', FATURAMENTO_MENSAL.includes(mappedPrefill.monthlyBilling || ''));
            console.log('🎯 FORM - Setor mapeado existe?', SETORES_DE_ATUACAO.includes(mappedPrefill.activitySector as any || ''));
            console.log('📋 FORM - Opções de faturamento:', FATURAMENTO_MENSAL);
            
            // Aplicar dados com delay para garantir que DOM esteja pronto
            setTimeout(() => {
                setFormData(prev => {
                    const newData = { ...prev, ...mappedPrefill } as CompanyData;
                    console.log('📝 FORM - FormData final aplicado:', newData);
                    
                    // Log específico dos campos que não estão preenchendo
                    console.log('💰 FORM - Faturamento no formData:', newData.monthlyBilling);
                    console.log('🎯 FORM - Setor no formData:', newData.activitySector);
                    
                    // Verificar se os valores estão nas opções disponíveis
                    const faturamentoValido = FATURAMENTO_MENSAL.includes(newData.monthlyBilling || '');
                    const setorValido = SETORES_DE_ATUACAO.includes(newData.activitySector as any || '');
                    
                    console.log('✅ FORM - Faturamento válido para select:', faturamentoValido);
                    console.log('✅ FORM - Setor válido para select:', setorValido);
                    
                    if (!faturamentoValido) {
                        console.log('❌ FORM - Faturamento não encontrado nas opções:', newData.monthlyBilling);
                        console.log('📋 FORM - Opções disponíveis:', FATURAMENTO_MENSAL);
                    }
                    
                    if (!setorValido) {
                        console.log('❌ FORM - Setor não encontrado nas opções:', newData.activitySector);
                        console.log('📋 FORM - Opções disponíveis:', SETORES_DE_ATUACAO.slice(0, 10), '...');
                    }
                    
                    return newData;
                });
            }, 100); // Aguardar 100ms
        }
    }, [prefill]);

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value, checked } = e.target;
        const { salesChannels } = formData;
        const newChannels = checked ? [...salesChannels, value] : salesChannels.filter(channel => channel !== value);
        setFormData({ ...formData, salesChannels: newChannels });
        if (newChannels.length > 0 && errors.salesChannels) {
            setErrors(prev => ({ ...prev, salesChannels: undefined }));
        }
    };

    const validate = () => {
        const newErrors: Partial<Record<keyof Omit<CompanyData, 'salesChannels'> | 'salesChannels', string>> = {};
        if (!formData.companyName.trim()) newErrors.companyName = "Nome da empresa é obrigatório.";
        if (!formData.email.trim()) {
            newErrors.email = "E-mail é obrigatório.";
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = "Formato de e-mail inválido.";
        }
        if (!formData.activityBranch) newErrors.activityBranch = "Ramo de atividade é obrigatório.";
        if (!formData.activitySector) (newErrors as any).activitySector = "Setor de atuação é obrigatório.";
        if (!formData.monthlyBilling) newErrors.monthlyBilling = "Faturamento mensal é obrigatório.";
        if (!formData.salesTeamSize) newErrors.salesTeamSize = "Tamanho da equipe é obrigatório.";
        if (formData.salesChannels.length === 0) newErrors.salesChannels = "Selecione ao menos um canal de venda.";
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Encontrar segmento pelo nome selecionado; caso não exista na lista, usar 'Geral' ou o primeiro disponível
        const selectedSegment =
            segments.find(s => s.name === formData.activityBranch) ||
            segments.find(s => s.name?.toLowerCase?.() === 'geral') ||
            segments[0];
        if (validate() && selectedSegment) {
            onSubmit(formData, selectedSegment);
        }
    };

    if (isLoading) {
        return <LoadingSpinner text="Carregando configurações..." />;
    }

    if (fetchError) {
        return <ErrorDisplay message={fetchError} />;
    }

    return (
        <div className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in">
            <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-slate-200/50">
                <div className="text-center mb-8">
                    <GGVInteligenciaBrand className="w-48 mx-auto mb-4" />
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Informações da Empresa</h1>
                    <p className="text-slate-500 mt-2 max-w-xl mx-auto">Essas informações nos ajudam a personalizar seu diagnóstico e compará-lo com empresas similares.</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormInput id="companyName" name="companyName" label="Nome da Empresa" value={formData.companyName} onChange={handleChange} error={errors.companyName} placeholder="Digite o nome da sua empresa" required />
                        <FormInput id="email" name="email" type="email" label="E-mail para receber o resultado" value={formData.email} onChange={handleChange} error={errors.email} placeholder="seu@email.com" required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <FormSelect id="activityBranch" name="activityBranch" label="Ramo de Atividade" value={formData.activityBranch} onChange={handleChange} error={errors.activityBranch} required>
                            <option value="" disabled>Selecione o ramo de atividade</option>
                            {RAMOS_DE_ATIVIDADE.map(r => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </FormSelect>
                        <FormSelect id="activitySector" name="activitySector" label="Setor de atuação" value={formData.activitySector || ''} onChange={handleChange} error={(errors as any).activitySector} required>
                            <option value="" disabled>Selecione um setor</option>
                            {SETORES_DE_ATUACAO.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </FormSelect>
                        <FormSelect id="monthlyBilling" name="monthlyBilling" label="Faturamento Mensal" value={formData.monthlyBilling} onChange={handleChange} error={errors.monthlyBilling} required>
                            <option value="" disabled>Selecione um valor</option>
                            {FATURAMENTO_MENSAL.map(faturamento => <option key={faturamento} value={faturamento}>{faturamento}</option>)}
                        </FormSelect>
                        <FormSelect id="salesTeamSize" name="salesTeamSize" label="Tamanho da Equipe de Vendas" value={formData.salesTeamSize} onChange={handleChange} error={errors.salesTeamSize} required>
                            <option value="" disabled>Selecione um tamanho</option>
                            {TAMANHO_EQUIPE_VENDAS.map(tamanho => <option key={tamanho} value={tamanho}>{tamanho}</option>)}
                        </FormSelect>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Canais de Vendas Utilizados * <span className="text-slate-500 font-normal">(selecione todos que se aplicam)</span></label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {CANAIS_DE_VENDA.map(channel => (
                                <FormCheckbox key={channel} id={channel} name="salesChannels" label={channel} value={channel} checked={formData.salesChannels.includes(channel)} onChange={handleCheckboxChange} />
                            ))}
                        </div>
                        {errors.salesChannels && <p className="text-red-600 text-xs mt-2">{errors.salesChannels}</p>}
                    </div>
                    <div className="pt-4 flex justify-center">
                        <button type="submit" className="w-full max-w-sm bg-slate-700 text-white font-bold py-3 px-8 rounded-lg hover:bg-slate-800 transition-all duration-300 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                            Começar Diagnóstico
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
