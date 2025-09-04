

import React, { useMemo, useState } from 'react';
import { OTEProfile, Module, UserRole } from '../types';
import { useUser } from '../contexts/DirectUserContext';
import { supabase } from '../services/supabaseClient';
import { OTE_TOOLTIP_TEXT, SDR_REMUNERATION, CLOSER_REMUNERATION, COORDENADOR_REMUNERATION } from '../constants';
import { useOteCalculator, SdrInputs as SdrInputType, CloserInputs as CloserInputType, CoordenadorInputs as CoordenadorInputType } from '../hooks/useOteCalculator';
import Tooltip from './ui/Tooltip';
import ProgressBar from './ui/ProgressBar';
import { QuestionMarkCircleIcon, CalculatorIcon, CheckCircleIcon, XCircleIcon } from './ui/icons';
import { FormattedInputField, FormSelect as SelectField, FormCheckbox as BonusCheckbox, FormInput as InputField } from './ui/Form';
import Breadcrumb from './common/Breadcrumb';

const initialSdrInputs: SdrInputType = {
    perfil: OTEProfile.SDR,
    nivel: 'Nível 1',
    metaIndividualSQLs: '', sqlsAceitosPeloCloser: '', metaColetivaGlobal: '',
    metaTrimestralSQLs: '', realizadoTrimestralSQLs: '', mqlsGerados: '',
    metaAnualSQLs: '', realizadoAnualSQLs: '', mesesDeCasa: '',
};

const initialCloserInputs: CloserInputType = {
    perfil: OTEProfile.Closer,
    nivel: 'Nível 1',
    metaMensalVendas: '', vendasRealizadas: '', metaColetivaGlobal: '',
    sqlsDoTrimestre: '', vendasDoTrimestre: '',
    metaAnualAcumulada: '', vendasRealizadasAno: '', mesesDeCasa: '',
};

const initialCoordenadorInputs: CoordenadorInputType = {
    perfil: OTEProfile.Coordenador,
    nivel: 'Nível 1',
    metaColetivaVendas: '', vendasRealizadasColetiva: '',
    sqlsDoTrimestre: '', vendasDoTrimestre: '',
    metaAnualVendas: '', vendasRealizadasAno: '',
    mesesDeCasa: '',
};

const initialCloserBonuses = {
    campaign: { ticketMedio: false, pagamentoVista: false, leadProspeccao: false, entrada50: false },
    product: { pesquisasAcima25k: false, valuationAcima15k: false, treinamentosAcima10k: false, maisDe6Modulos: false }
};

const CalculadoraOTE: React.FC = () => {
    const { user } = useUser();
    const [inputs, setInputs] = useState<SdrInputType | CloserInputType | CoordenadorInputType>(initialSdrInputs);
    const [closerBonuses, setCloserBonuses] = useState(initialCloserBonuses);
    const [includeQuarterlyBonus, setIncludeQuarterlyBonus] = useState(false);
    const [includeAnnualBonus, setIncludeAnnualBonus] = useState(false);

    const results = useOteCalculator(inputs, closerBonuses, includeQuarterlyBonus, includeAnnualBonus);

    const allowedProfile: OTEProfile | 'ALL' = useMemo(() => {
        if (!user) return OTEProfile.SDR;
        
        // Super Admin e Admin têm acesso a todos os perfis (incluindo Coordenador)
        if (user.role === UserRole.SuperAdmin || user.role === UserRole.Admin) return 'ALL';
        
        if (user.email === 'geraldo@grupoggv.com') return 'ALL';
        // ler tabela user_functions para esse usuário (sincronamente não dá; usar mem cache simples)
        // fallback: SDR
        return (window as any).__USER_FUNCTION__ || OTEProfile.SDR;
    }, [user]);

    const handleProfileChange = (newProfile: OTEProfile) => {
        if (newProfile === OTEProfile.SDR) {
            setInputs(initialSdrInputs);
        } else if (newProfile === OTEProfile.Closer) {
            setInputs(initialCloserInputs);
        } else if (newProfile === OTEProfile.Coordenador) {
            setInputs(initialCoordenadorInputs);
        }
        setCloserBonuses(initialCloserBonuses);
        setIncludeQuarterlyBonus(false);
        setIncludeAnnualBonus(false);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        let processedValue = value;
        if ((name === 'mesesDeCasa') && parseInt(value, 10) > 12) {
            processedValue = '12';
        }
        setInputs(prev => ({ ...prev, [name]: processedValue }));
    };

    const handleCloserBonusChange = (category: 'campaign' | 'product', key: string) => {
        setCloserBonuses(prev => ({
            ...prev,
            [category]: { ...prev[category], [key]: !prev[category][key as keyof typeof prev.campaign] }
        }));
    };

    const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

    return (
        <div className="flex flex-col h-full">
            <header className="p-6 text-center">
                <div className="mb-4">
                    <Breadcrumb 
                        items={[
                            { module: Module.Diagnostico, label: 'Início' },
                            { module: Module.Calculadora, label: 'Calculadora OTE' }
                        ]} 
                        className="justify-center"
                    />
                </div>
                <h1 className="text-3xl font-bold text-slate-800">Calculadora OTE</h1>
                <div className="inline-flex items-center gap-1">
                    <p className="text-slate-500 mt-1">Calcule seu On-Target Earnings</p>
                    <Tooltip text={OTE_TOOLTIP_TEXT}>
                        <QuestionMarkCircleIcon className="w-5 h-5 text-slate-400 hover:text-slate-600 cursor-help" />
                    </Tooltip>
                </div>
            </header>
            <div className="flex-1 overflow-y-auto p-6 pt-0">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 max-w-7xl mx-auto">
                    {/* Input Section */}
                    <div className="bg-white p-6 rounded-2xl shadow-lg space-y-4">
                        <Section title="Simulação" icon={<CalculatorIcon className="w-6 h-6 text-slate-500" />}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {allowedProfile === 'ALL' ? (
                                  <SelectField label="Perfil" name="perfil" id="perfil" value={inputs.perfil} onChange={e => handleProfileChange(e.target.value as OTEProfile)}>
                                      <option value={OTEProfile.SDR}>SDR</option>
                                      <option value={OTEProfile.Closer}>Closer</option>
                                      <option value={OTEProfile.Coordenador}>Coordenador</option>
                                  </SelectField>
                                ) : (
                                  <div>
                                      <label className="block text-sm font-medium text-slate-700">Perfil</label>
                                      <div className="mt-1 text-sm font-semibold">{allowedProfile}</div>
                                  </div>
                                )}
                                <SelectField label="Nível" name="nivel" id="nivel" value={inputs.nivel} onChange={handleInputChange}>
                                    <option>Nível 1</option><option>Nível 2</option><option>Nível 3</option><option>Nível 4</option>
                                </SelectField>
                            </div>
                        </Section>
                        {(allowedProfile === 'ALL' ? inputs.perfil : allowedProfile) === OTEProfile.SDR ? (
                          <SdrInputsComponent inputs={allowedProfile === 'ALL' ? (inputs as SdrInputType) : { ...(inputs as any), perfil: OTEProfile.SDR }} onChange={handleInputChange} />
                        ) : (allowedProfile === 'ALL' ? inputs.perfil : allowedProfile) === OTEProfile.Coordenador ? (
                          <CoordenadorInputsComponent inputs={allowedProfile === 'ALL' ? (inputs as CoordenadorInputType) : { ...(inputs as any), perfil: OTEProfile.Coordenador }} onChange={handleInputChange} />
                        ) : (
                          <CloserInputsComponent inputs={allowedProfile === 'ALL' ? (inputs as CloserInputType) : { ...(inputs as any), perfil: OTEProfile.Closer }} onChange={handleInputChange} bonuses={closerBonuses} onBonusChange={handleCloserBonusChange} formatCurrency={formatCurrency} />
                        )}
                    </div>
                    {/* Results Section */}
                    <div className="bg-slate-50 p-6 rounded-2xl shadow-inner-lg space-y-4 border border-slate-200/50 xl:sticky top-6">
                        <Section title="Cálculo OTE" icon={<CalculatorIcon className="w-6 h-6 text-slate-500" />}>
                            {(allowedProfile === 'ALL' ? inputs.perfil : allowedProfile) === OTEProfile.SDR ? (
                              <SdrResults results={results} includeQuarterly={includeQuarterlyBonus} setIncludeQuarterly={setIncludeQuarterlyBonus} includeAnnual={includeAnnualBonus} setIncludeAnnual={setIncludeAnnualBonus} formatCurrency={formatCurrency} />
                            ) : (allowedProfile === 'ALL' ? inputs.perfil : allowedProfile) === OTEProfile.Coordenador ? (
                              <CoordenadorResults results={results} includeQuarterly={includeQuarterlyBonus} setIncludeQuarterly={setIncludeQuarterlyBonus} includeAnnual={includeAnnualBonus} setIncludeAnnual={setIncludeAnnualBonus} formatCurrency={formatCurrency} />
                            ) : (
                              <CloserResults results={results} includeQuarterly={includeQuarterlyBonus} setIncludeQuarterly={setIncludeQuarterlyBonus} includeAnnual={includeAnnualBonus} setIncludeAnnual={setIncludeAnnualBonus} formatCurrency={formatCurrency} />
                            )}
                        </Section>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Input Components ---
const SdrInputsComponent: React.FC<{ inputs: any, onChange: any }> = ({ inputs, onChange }) => (
    <>
        <Section title="Metas e Realizados Mensais">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField id="metaIndividualSQLs" label="Meta Individual (SQLs)" name="metaIndividualSQLs" value={inputs.metaIndividualSQLs} onChange={onChange} placeholder="Ex: 12" type="number" />
                <InputField id="sqlsAceitosPeloCloser" label="SQLs Aceitos pelo Closer" name="sqlsAceitosPeloCloser" value={inputs.sqlsAceitosPeloCloser} onChange={onChange} placeholder="Ex: 10" type="number" />
                <FormattedInputField id="metaColetivaGlobal" label="Meta Coletiva Global Atingida" name="metaColetivaGlobal" value={inputs.metaColetivaGlobal} onChange={onChange} placeholder="Ex: 85,5" formatType="percentage" />
                <InputField id="mqlsGerados" label="MQLs Gerados no Mês" name="mqlsGerados" value={inputs.mqlsGerados} onChange={onChange} placeholder="Ex: 50" type="number" />
            </div>
        </Section>
        <Section title="Metas de Longo Prazo">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField id="metaTrimestralSQLs" label="Meta Trimestral (SQLs)" name="metaTrimestralSQLs" value={inputs.metaTrimestralSQLs} onChange={onChange} placeholder="Ex: 36" type="number" />
                <InputField id="realizadoTrimestralSQLs" label="Realizado Trimestral (SQLs)" name="realizadoTrimestralSQLs" value={inputs.realizadoTrimestralSQLs} onChange={onChange} placeholder="Ex: 30" type="number" />
                <InputField id="metaAnualSQLs" label="Meta Anual (SQLs)" name="metaAnualSQLs" value={inputs.metaAnualSQLs} onChange={onChange} placeholder="Ex: 144" type="number" />
                <InputField id="realizadoAnualSQLs" label="Realizado Anual (SQLs)" name="realizadoAnualSQLs" value={inputs.realizadoAnualSQLs} onChange={onChange} placeholder="Ex: 120" type="number" />
                <InputField id="mesesDeCasa" label="Meses de GGV no ano" name="mesesDeCasa" value={inputs.mesesDeCasa} onChange={onChange} placeholder="Ex: 12" type="number" max="12" min="1" />
            </div>
        </Section>
    </>
);

const CoordenadorInputsComponent: React.FC<{ inputs: any, onChange: any }> = ({ inputs, onChange }) => {
    const nivelKey = COORDENADOR_REMUNERATION.levels[inputs.nivel as keyof typeof COORDENADOR_REMUNERATION.levels] || 'level1';
    const quarterlyRule = COORDENADOR_REMUNERATION.quarterlyEfficiencyBonus[nivelKey as keyof typeof COORDENADOR_REMUNERATION.quarterlyEfficiencyBonus];
    const thresholdText = quarterlyRule ? `Sua meta para ${inputs.nivel}: Atingir ${(quarterlyRule.threshold * 100).toFixed(1)}% de eficiência para ganhar R$ ${quarterlyRule.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.` : 'Selecione um nível para ver a meta.';

    return (
    <>
        <Section title="Meta Coletiva">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormattedInputField
                    label="Meta Coletiva de Vendas"
                    name="metaColetivaVendas"
                    id="metaColetivaVendas"
                    value={inputs.metaColetivaVendas}
                    onChange={onChange}
                    placeholder="Ex: 500.000"
                    formatType="currency"
                />
                <FormattedInputField
                    label="Vendas Realizadas (Coletiva)"
                    name="vendasRealizadasColetiva"
                    id="vendasRealizadasColetiva"
                    value={inputs.vendasRealizadasColetiva}
                    onChange={onChange}
                    placeholder="Ex: 425.000"
                    formatType="currency"
                />
            </div>
        </Section>
        
        <Section title="Eficiência Trimestral">
            <div className="bg-slate-50 p-3 rounded-lg text-xs text-slate-600 space-y-1 mb-4">
                <p className='font-semibold'>{thresholdText}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField
                    label="SQLs do Trimestre"
                    name="sqlsDoTrimestre"
                    id="sqlsDoTrimestre"
                    value={inputs.sqlsDoTrimestre}
                    onChange={onChange}
                    placeholder="Ex: 150"
                    type="number"
                    min="0"
                />
                <InputField
                    label="Vendas do Trimestre"
                    name="vendasDoTrimestre"
                    id="vendasDoTrimestre"
                    value={inputs.vendasDoTrimestre}
                    onChange={onChange}
                    placeholder="Ex: 30"
                    type="number"
                    min="0"
                />
            </div>
        </Section>
        
        <Section title="Metas Anuais">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormattedInputField
                    label="Meta Anual de Vendas"
                    name="metaAnualVendas"
                    id="metaAnualVendas"
                    value={inputs.metaAnualVendas}
                    onChange={onChange}
                    placeholder="Ex: 1.000.000"
                    formatType="currency"
                />
                <FormattedInputField
                    label="Vendas Realizadas no Ano"
                    name="vendasRealizadasAno"
                    id="vendasRealizadasAno"
                    value={inputs.vendasRealizadasAno}
                    onChange={onChange}
                    placeholder="Ex: 1.000.000"
                    formatType="currency"
                />
            </div>
        </Section>
        
        <Section title="Tempo na GGV">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField
                    label="Meses de Casa (máx 12)"
                    name="mesesDeCasa"
                    id="mesesDeCasa"
                    value={inputs.mesesDeCasa}
                    onChange={onChange}
                    placeholder="Ex: 12"
                    type="number"
                    min="1"
                    max="12"
                />
            </div>
        </Section>
    </>
    );
};

const CloserInputsComponent: React.FC<{ inputs: any, onChange: any, bonuses: any, onBonusChange: any, formatCurrency: (v: number) => string }> = ({ inputs, onChange, bonuses, onBonusChange, formatCurrency }) => {
    const nivelKey = CLOSER_REMUNERATION.levels[inputs.nivel as keyof typeof CLOSER_REMUNERATION.levels] || 'level1';
    const quarterlyRule = CLOSER_REMUNERATION.quarterlyBonus[nivelKey as keyof typeof CLOSER_REMUNERATION.quarterlyBonus];
    const dynamicQuarterlyText = quarterlyRule ? `Sua meta para ${inputs.nivel}: Atingir ${(quarterlyRule.threshold * 100).toLocaleString('pt-BR')}% de conversão para ganhar ${formatCurrency(quarterlyRule.value)}.` : 'Selecione um nível para ver a meta.';

    return (
        <>
            <Section title="Metas Mensais">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormattedInputField id="metaMensalVendas" label="Meta Mensal de Vendas" name="metaMensalVendas" value={inputs.metaMensalVendas} onChange={onChange} placeholder="Ex: 250.000" formatType="currency" />
                    <FormattedInputField id="vendasRealizadas" label="Vendas Realizadas" name="vendasRealizadas" value={inputs.vendasRealizadas} onChange={onChange} placeholder="Ex: 275.000" formatType="currency" />
                    <FormattedInputField id="metaColetivaGlobalCloser" label="Meta Coletiva Global" name="metaColetivaGlobal" value={inputs.metaColetivaGlobal} onChange={onChange} placeholder="Ex: 85,5" formatType="percentage" />
                </div>
            </Section>
            <Section title="Premiação Trimestral">
                <div className="bg-slate-50 p-3 rounded-lg text-xs text-slate-600 space-y-1">
                    <p className='font-semibold'>{dynamicQuarterlyText}</p>
                    <p><b>Cálculo:</b> (Vendas do Trimestre (qtd) / SQLs do Trimestre) * 100</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <InputField id="sqlsDoTrimestre" label="SQLs do Trimestre" name="sqlsDoTrimestre" value={inputs.sqlsDoTrimestre} onChange={onChange} placeholder="Ex: 50" type="number" />
                    <InputField id="vendasDoTrimestre" label="Vendas do Trimestre (quantidade)" name="vendasDoTrimestre" value={inputs.vendasDoTrimestre} onChange={onChange} placeholder="Ex: 10" type="number" />
                </div>
            </Section>
            <Section title="Bônus Anual">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormattedInputField id="metaAnualAcumulada" label="Meta Anual Acumulada" name="metaAnualAcumulada" value={inputs.metaAnualAcumulada} onChange={onChange} placeholder="Ex: 1.200.000" formatType="currency" />
                    <FormattedInputField id="vendasRealizadasAno" label="Vendas Realizadas no Ano" name="vendasRealizadasAno" value={inputs.vendasRealizadasAno} onChange={onChange} placeholder="Ex: 1.000.000" formatType="currency" />
                    <InputField id="mesesDeCasaCloser" label="Meses de GGV no ano" name="mesesDeCasa" value={inputs.mesesDeCasa} onChange={onChange} placeholder="Ex: 12" type="number" max="12" min="1" />
                </div>
            </Section>
            <Section title="Bônus Adicionais">
                <div className='grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4'>
                    <div>
                        <h4 className='font-semibold text-sm mb-2 text-slate-700'>Bônus de Campanha</h4>
                        <div className='space-y-2'>
                            {Object.keys(CLOSER_REMUNERATION.campaignBonus).map((key) => (
                                <BonusCheckbox key={key} id={`campaign-${key}`} label={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} checked={bonuses.campaign[key]} onChange={() => onBonusChange('campaign', key)} />
                            ))}
                        </div>
                    </div>
                    <div>
                        <h4 className='font-semibold text-sm mb-2 text-slate-700'>Bônus de Produto</h4>
                        <div className='space-y-2'>
                            {Object.keys(CLOSER_REMUNERATION.productBonus).map((key) => (
                                <BonusCheckbox key={key} id={`product-${key}`} label={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} checked={bonuses.product[key]} onChange={() => onBonusChange('product', key)} />
                            ))}
                        </div>
                    </div>
                </div>
            </Section>
        </>
    );
};

// --- Results Components ---
const SdrResults: React.FC<{ results: any, includeQuarterly: boolean, setIncludeQuarterly: any, includeAnnual: boolean, setIncludeAnnual: any, formatCurrency: (v: number) => string }> = ({ results, includeQuarterly, setIncludeQuarterly, includeAnnual, setIncludeAnnual, formatCurrency }) => (
    <div className="space-y-6">
        <div className="space-y-3">
            <h4 className="font-semibold text-slate-700">Status das Metas</h4>
            <ProgressItem label="Individual" percentage={results.progressoMensal} />
            <ProgressItem label="Coletiva" percentage={results.progressoColetiva} />
            <ProgressItem label="Conversão" percentage={results.progressoConversao} />
            <ProgressItem label="Trimestral" percentage={results.progressoTrimestral} />
            <ProgressItem label="Anual" percentage={results.progressoAnual} />
        </div>
        <div className="bg-green-50 p-6 rounded-2xl text-center border-2 border-green-200/50 shadow-inner-lg">
            <p className="text-sm font-semibold text-green-800 uppercase tracking-wider">OTE Total Mensal</p>
            <p className="text-5xl font-extrabold text-green-700 tracking-tight mt-1">{formatCurrency(results.totalOte)}</p>
        </div>
        <div className="space-y-1">
            <h4 className="font-semibold text-slate-700 text-base mb-2">Detalhamento Variável</h4>
            <DetailRow label="Salário Fixo" value={formatCurrency(results.salarioFixo)} />
            <DetailRow label="Comissão Individual" value={formatCurrency(results.comissaoIndividual)} />
            <DetailRow label="Bônus Coletivo" value={formatCurrency(results.metaColetiva)} />
            <DetailRow label="Prêmio Performance" value={formatCurrency(results.premioPerformance)} />
            {results.metaTrimestralAtingida && <CheckboxRow id="includeQuarterly" label="Bônus Trimestral Atingido" value={results.bonusTrimestralPotencial} checked={includeQuarterly} onChange={setIncludeQuarterly} formatCurrency={formatCurrency} color="yellow" />}
            {results.metaAnualAtingida && <CheckboxRow id="includeAnnual" label="Bônus Anual Atingido" value={results.bonusAnualPotencial} checked={includeAnnual} onChange={setIncludeAnnual} formatCurrency={formatCurrency} color="blue" />}
            <DetailRow label="Total OTE Calculado" value={formatCurrency(results.totalOte)} isTotal />
        </div>
        <div className="space-y-3 pt-4">
            <h4 className="font-semibold text-slate-700">Simulação de Cenários (Fixa + Com. Indiv.)</h4>
            <div className="grid grid-cols-3 gap-3 text-center">
                <ScenarioBox label="🔻 Baixo (75%)" value={formatCurrency(results.oteBaixo)} color="red" />
                <ScenarioBox label="🎯 Alvo (100%)" value={formatCurrency(results.oteAlvo)} color="blue" />
                <ScenarioBox label="🔼 Alto (150%)" value={formatCurrency(results.oteAlto)} color="green" />
            </div>
        </div>
    </div>
);

const CloserResults: React.FC<{ results: any, includeQuarterly: boolean, setIncludeQuarterly: any, includeAnnual: boolean, setIncludeAnnual: any, formatCurrency: (v: number) => string }> = ({ results, includeQuarterly, setIncludeQuarterly, includeAnnual, setIncludeAnnual, formatCurrency }) => (
    <div className="space-y-6">
        <div className="space-y-3">
            <h4 className="font-semibold text-slate-700">Status das Metas</h4>
            <ProgressItem label="Individual" percentage={results.progressoMensal} />
            <ProgressItem label="Coletiva" percentage={results.progressoColetiva} />
            <ProgressItem label="Trimestral" percentage={results.progressoTrimestral} />
            <ProgressItem label="Anual" percentage={results.progressoAnual} />
        </div>
        <div className="bg-green-50 p-6 rounded-2xl text-center border-2 border-green-200/50 shadow-inner-lg">
            <p className="text-sm font-semibold text-green-800 uppercase tracking-wider">OTE Total Mensal</p>
            <p className="text-5xl font-extrabold text-green-700 tracking-tight mt-1">{formatCurrency(results.totalOte)}</p>
        </div>
        <div className="space-y-1">
            <h4 className="font-semibold text-slate-700 text-base mb-2">Detalhamento Variável</h4>
            <DetailRow label="Salário Fixo" value={formatCurrency(results.salarioFixo)} />
            <DetailRow label="Comissão Individual" value={formatCurrency(results.comissaoIndividualFixa)} />
            <DetailRow label="Premiação Individual / Meta" value={formatCurrency(results.premiacaoIndividualMeta)} />
            <DetailRow label="Premiação Coletiva" value={formatCurrency(results.premiacaoColetiva)} />
            {results.metaTrimestralAtingida && <CheckboxRow id="includeQuarterlyCloser" label="Premiação Trimestral" value={results.bonusTrimestralPotencial} checked={includeQuarterly} onChange={setIncludeQuarterly} formatCurrency={formatCurrency} color="yellow" />}
            <DetailRow label="Bônus Campanha" value={formatCurrency(results.bonusCampanha)} />
            <DetailRow label="Bônus Produto" value={formatCurrency(results.bonusProduto)} />
            {results.metaAnualAtingida && <CheckboxRow id="includeAnnualCloser" label="Bônus Anual Atingido" value={results.bonusAnualPotencial} checked={includeAnnual} onChange={setIncludeAnnual} formatCurrency={formatCurrency} color="blue" />}
            <DetailRow label="Total OTE Calculado" value={formatCurrency(results.totalOte)} isTotal />
        </div>
        <div className="space-y-3 pt-4">
            <h4 className="font-semibold text-slate-700">Simulação de Cenários (Fixo + Comissões)</h4>
            <div className="grid grid-cols-3 gap-3 text-center">
                <ScenarioBox label="🔻 Baixo (75%)" value={formatCurrency(results.oteBaixo)} color="red" />
                <ScenarioBox label="🎯 Alvo (100%)" value={formatCurrency(results.oteAlvo)} color="blue" />
                <ScenarioBox label="🔼 Alto (150%)" value={formatCurrency(results.oteAlto)} color="green" />
            </div>
        </div>
    </div>
);

const CoordenadorResults: React.FC<{ results: any, includeQuarterly: boolean, setIncludeQuarterly: any, includeAnnual: boolean, setIncludeAnnual: any, formatCurrency: (v: number) => string }> = ({ results, includeQuarterly, setIncludeQuarterly, includeAnnual, setIncludeAnnual, formatCurrency }) => (
    <div className="space-y-6">
        <div className="space-y-3">
            <h4 className="font-semibold text-slate-700">Status das Metas</h4>
            <ProgressItem label="Meta Coletiva" percentage={results.progressoColetiva} />
            <ProgressItem label="Eficiência Trimestral" percentage={results.progressoTrimestral} />
            <ProgressItem label="Meta Anual" percentage={results.progressoAnual} />
        </div>
        <div className="bg-purple-50 p-6 rounded-2xl text-center border-2 border-purple-200/50 shadow-inner-lg">
            <p className="text-sm font-semibold text-purple-800 uppercase tracking-wider">OTE Total Mensal</p>
            <p className="text-5xl font-extrabold text-purple-700 tracking-tight mt-1">{formatCurrency(results.totalOte)}</p>
        </div>
        <div className="space-y-1">
            <h4 className="font-semibold text-slate-700 text-base mb-2">Detalhamento Variável</h4>
            <DetailRow label="Salário Fixo" value={formatCurrency(results.salarioFixo)} />
            <DetailRow label="Premiação Mensal Coletiva" value={formatCurrency(results.premiacaoColetiva)} />
            {results.metaTrimestralAtingida && <CheckboxRow id="includeQuarterlyCoordenador" label="Premiação Trimestral Eficiência" value={results.bonusTrimestralPotencial} checked={includeQuarterly} onChange={setIncludeQuarterly} formatCurrency={formatCurrency} color="yellow" />}
            {!results.metaTrimestralAtingida && results.progressoTrimestral > 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                        <strong>Premiação Trimestral:</strong> Para o seu nível, é necessário atingir o threshold específico de eficiência (VENDA/SQL).
                        Atual: {results.progressoTrimestral.toFixed(1)}%
                    </p>
                </div>
            )}
            {results.metaAnualAtingida && <CheckboxRow id="includeAnnualCoordenador" label="Bônus Anual (Meta 100% + Tempo GGV)" value={results.bonusAnualPotencial} checked={includeAnnual} onChange={setIncludeAnnual} formatCurrency={formatCurrency} color="blue" />}
            {!results.metaAnualAtingida && results.progressoAnual > 0 && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                        <strong>Bônus Anual:</strong> Necessário atingir 100% da meta anual para liberar o bônus.
                        Atual: {results.progressoAnual.toFixed(1)}%
                    </p>
                </div>
            )}
            <DetailRow label="Total OTE Calculado" value={formatCurrency(results.totalOte)} isTotal />
        </div>
        <div className="space-y-3 pt-4">
            <h4 className="font-semibold text-slate-700">Simulação de Cenários (Fixo + Premiação Coletiva)</h4>
            <div className="grid grid-cols-3 gap-3 text-center">
                <ScenarioBox label="🔻 Baixo (75%)" value={formatCurrency(results.oteBaixo)} color="red" />
                <ScenarioBox label="🎯 Alvo (100%)" value={formatCurrency(results.oteAlvo)} color="blue" />
                <ScenarioBox label="🔼 Alto (150%)" value={formatCurrency(results.oteAlto)} color="green" />
            </div>
        </div>
    </div>
);

// --- UI Helper Components ---
const Section: React.FC<{ title: string; icon?: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-200 pb-3 mb-4">
            {icon}
            <h3 className="text-lg font-bold text-slate-800">{title}</h3>
        </div>
        {children}
    </div>
);

const ProgressItem: React.FC<{ label: string; percentage: number }> = ({ label, percentage }) => {
    const icon = percentage >= 100 ? <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0" /> : <XCircleIcon className="w-5 h-5 text-slate-400 flex-shrink-0" />;
    return (
        <div className="flex items-center gap-3">
            {icon}
            <span className="text-sm font-medium text-slate-600 w-20">{label}</span>
            <div className="flex-1">
                <ProgressBar percentage={percentage} />
            </div>
            <span className="text-sm font-bold text-slate-700 w-12 text-right">{percentage.toFixed(0)}%</span>
        </div>
    );
};

const checkboxColors = { yellow: "bg-yellow-50 text-yellow-800 border border-yellow-200", blue: "bg-blue-50 text-blue-800 border border-blue-200" };
const CheckboxRow: React.FC<{ id: string, label: string, value: number, checked: boolean, onChange: (c: boolean) => void, formatCurrency: (v: number) => string, color: 'yellow' | 'blue' }> = ({ id, label, value, checked, onChange, formatCurrency, color }) => (
    <div className={`flex items-center justify-between p-2.5 rounded-lg ${checkboxColors[color]}`}>
        <label htmlFor={id} className="text-sm font-semibold flex items-center gap-2 cursor-pointer">
            <input type="checkbox" id={id} checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded border-gray-400 text-blue-800 focus:ring-blue-800" />
            {label}
        </label>
        <span className="text-sm font-bold">{formatCurrency(value)}</span>
    </div>
);

const DetailRow: React.FC<{ label: string; value: string; isTotal?: boolean }> = ({ label, value, isTotal }) => (
    <div className={`flex justify-between items-baseline py-2 ${isTotal ? 'font-bold text-base pt-3 mt-2 border-t-2 border-slate-300' : 'text-sm'}`}>
        <span className={isTotal ? 'text-slate-800' : 'text-slate-600'}>{label}</span>
        <div className="flex-grow border-b border-dotted border-slate-300 mx-2"></div>
        <span className={isTotal ? 'text-slate-900' : 'text-slate-700 font-medium'}>{value}</span>
    </div>
);

const scenarioColors = { red: "bg-red-50 border-red-200 text-red-800", blue: "bg-blue-50 border-blue-200 text-blue-800", green: "bg-green-50 border-green-200 text-green-800" };
const ScenarioBox: React.FC<{ label: string; value: string; color: 'red' | 'blue' | 'green' }> = ({ label, value, color }) => (
    <div className={`p-3 rounded-lg border ${scenarioColors[color]}`}>
        <p className="text-xs font-semibold opacity-80">{label}</p>
        <p className="font-bold">{value}</p>
    </div>
);

export default CalculadoraOTE;