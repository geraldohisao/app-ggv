
import { useMemo } from 'react';
import { OTEProfile } from '../types';
import { SDR_REMUNERATION, CLOSER_REMUNERATION, COORDENADOR_REMUNERATION } from '../constants';

// Define types for inputs to ensure type safety
export type SdrInputs = {
    perfil: OTEProfile.SDR;
    nivel: string;
    metaIndividualSQLs: string;
    sqlsAceitosPeloCloser: string;
    metaColetivaGlobal: string;
    metaTrimestralSQLs: string;
    realizadoTrimestralSQLs: string;
    mqlsGerados: string;
    metaAnualSQLs: string;
    realizadoAnualSQLs: string;
    mesesDeCasa: string;
};

export type CloserInputs = {
    perfil: OTEProfile.Closer;
    nivel: string;
    metaMensalVendas: string;
    vendasRealizadas: string;
    metaColetivaGlobal: string;
    sqlsDoTrimestre: string;
    vendasDoTrimestre: string;
    metaAnualAcumulada: string;
    vendasRealizadasAno: string;
    mesesDeCasa: string;
};

export type CoordenadorInputs = {
    perfil: OTEProfile.Coordenador;
    nivel: string;
    metaColetivaVendas: string;
    vendasRealizadasColetiva: string;
    sqlsDoTrimestre: string;
    vendasDoTrimestre: string;
    metaAnualVendas: string;
    vendasRealizadasAno: string;
    mesesDeCasa: string;
};

type CloserBonuses = {
    campaign: { [key: string]: boolean };
    product: { [key: string]: boolean };
};

type OTEInputs = SdrInputs | CloserInputs | CoordenadorInputs;

// Helper function for tiered values
const getTieredValue = (achievement: number, tiers: { threshold: number }[], values: number[]) => {
    for (let i = 0; i < tiers.length; i++) {
        if (achievement >= tiers[i].threshold) {
            return values[i];
        }
    }
    return 0;
};

// Helper function for percentage-based bonuses (% of sales)
const getTieredRate = (achievement: number, tiers: { threshold: number }[], rates: number[]) => {
    for (let i = 0; i < tiers.length; i++) {
        if (achievement >= tiers[i].threshold) {
            return rates[i];
        }
    }
    return 0;
};

// Hook implementation
export const useOteCalculator = (
    inputs: OTEInputs,
    closerBonuses: CloserBonuses,
    includeQuarterlyBonus: boolean,
    includeAnnualBonus: boolean
) => {
    return useMemo(() => {
        if (inputs.perfil === OTEProfile.Closer) {
            const closerInputs = inputs as CloserInputs;
            const nivelKey = CLOSER_REMUNERATION.levels[closerInputs.nivel as keyof typeof CLOSER_REMUNERATION.levels] || 'level1';
            
            const metaMensalVendas = parseFloat(closerInputs.metaMensalVendas || '0');
            const vendasRealizadas = parseFloat(closerInputs.vendasRealizadas || '0');
            // Handle percentage with possible decimal separator (comma or dot)
            const metaColetivaGlobalStr = closerInputs.metaColetivaGlobal || '0';
            const metaColetivaGlobalPerc = parseFloat(metaColetivaGlobalStr.replace(',', '.')) / 100;
            const sqlsDoTrimestre = parseFloat(closerInputs.sqlsDoTrimestre || '0');
            const vendasDoTrimestre = parseFloat(closerInputs.vendasDoTrimestre || '0');
            const metaAnualAcumulada = parseFloat(closerInputs.metaAnualAcumulada || '0');
            const vendasRealizadasAno = parseFloat(closerInputs.vendasRealizadasAno || '0');
            const mesesDeCasa = Math.max(1, Math.min(12, parseInt(closerInputs.mesesDeCasa || '12', 10)));

            const salarioFixo = CLOSER_REMUNERATION.fixedSalary[nivelKey as keyof typeof CLOSER_REMUNERATION.fixedSalary];
            
            // Comissão Individual fixa de 0.75% sobre vendas (independente da meta)
            const comissaoIndividualFixa = vendasRealizadas * CLOSER_REMUNERATION.fixedIndividualCommission.rate;
            
            const progressoMensal = metaMensalVendas > 0 ? (vendasRealizadas / metaMensalVendas) : 0;
            
            const getTieredRate = (achievement: number, tiers: {threshold: number, rate: number}[]) => {
                for (let i = 0; i < tiers.length; i++) {
                    if (achievement >= tiers[i].threshold) {
                        return tiers[i].rate;
                    }
                }
                return 0;
            };

            // Premiação Individual / Meta (baseada no atingimento da meta)
            const premiacaoRate = getTieredRate(progressoMensal, CLOSER_REMUNERATION.individualCommission.tiers);
            const premiacaoIndividualMeta = vendasRealizadas * premiacaoRate;

            const premiacaoColetiva = getTieredValue(
                metaColetivaGlobalPerc,
                CLOSER_REMUNERATION.teamBonus.tiers,
                CLOSER_REMUNERATION.teamBonus.values[nivelKey as keyof typeof CLOSER_REMUNERATION.teamBonus.values]
            );

            const conversaoTrimestral = sqlsDoTrimestre > 0 ? (vendasDoTrimestre / sqlsDoTrimestre) : 0;
            const quarterlyBonusRule = CLOSER_REMUNERATION.quarterlyBonus[nivelKey as keyof typeof CLOSER_REMUNERATION.quarterlyBonus];
            const bonusTrimestralPotencial = (quarterlyBonusRule && conversaoTrimestral >= quarterlyBonusRule.threshold) 
                ? quarterlyBonusRule.value 
                : 0;

            const metaTrimestralAtingida = bonusTrimestralPotencial > 0;
            const premiacaoTrimestral = includeQuarterlyBonus ? bonusTrimestralPotencial : 0;

            const progressoAnual = metaAnualAcumulada > 0 ? (vendasRealizadasAno / metaAnualAcumulada) : 0;
            const fullAnnualBonus = CLOSER_REMUNERATION.annualBonus.values[nivelKey as keyof typeof CLOSER_REMUNERATION.annualBonus.values];
            const bonusAnualPotencial = progressoAnual >= 1 ? (fullAnnualBonus / 12) * mesesDeCasa : 0;
            const metaAnualAtingida = bonusAnualPotencial > 0;
            const bonusAnual = includeAnnualBonus ? bonusAnualPotencial : 0;
            
            const bonusCampanha = Object.entries(closerBonuses.campaign).reduce((acc, [key, isChecked]) => {
                if(isChecked) {
                    acc += CLOSER_REMUNERATION.campaignBonus[key as keyof typeof CLOSER_REMUNERATION.campaignBonus][nivelKey as keyof typeof CLOSER_REMUNERATION.fixedSalary];
                }
                return acc;
            }, 0);

            const bonusProduto = Object.entries(closerBonuses.product).reduce((acc, [key, isChecked]) => {
                if(isChecked) {
                    acc += CLOSER_REMUNERATION.productBonus[key as keyof typeof CLOSER_REMUNERATION.productBonus][nivelKey as keyof typeof CLOSER_REMUNERATION.fixedSalary];
                }
                return acc;
            }, 0);

            const totalOte = salarioFixo + comissaoIndividualFixa + premiacaoIndividualMeta + premiacaoColetiva + premiacaoTrimestral + bonusCampanha + bonusProduto + bonusAnual;

            const calculateScenarioOTE = (achievement: number) => {
                 const scenarioVendas = metaMensalVendas * achievement;
                 const scenarioFixedCommission = scenarioVendas * CLOSER_REMUNERATION.fixedIndividualCommission.rate;
                 const scenarioRate = getTieredRate(achievement, CLOSER_REMUNERATION.individualCommission.tiers);
                 const scenarioVariableCommission = scenarioVendas * scenarioRate;
                 return salarioFixo + scenarioFixedCommission + scenarioVariableCommission;
            };

            return {
                salarioFixo, comissaoIndividualFixa, premiacaoIndividualMeta, premiacaoColetiva, premiacaoTrimestral, bonusCampanha, bonusProduto, bonusAnual, totalOte,
                progressoMensal: progressoMensal * 100,
                progressoTrimestral: conversaoTrimestral * 100,
                progressoColetiva: metaColetivaGlobalPerc * 100,
                progressoAnual: progressoAnual * 100,
                oteBaixo: calculateScenarioOTE(0.75),
                oteAlvo: calculateScenarioOTE(1.0),
                oteAlto: calculateScenarioOTE(1.5),
                metaTrimestralAtingida,
                bonusTrimestralPotencial,
                metaAnualAtingida,
                bonusAnualPotencial,
            };

        } else if (inputs.perfil === OTEProfile.Coordenador) {
            const coordenadorInputs = inputs as CoordenadorInputs;
            const nivelKey = COORDENADOR_REMUNERATION.levels[coordenadorInputs.nivel as keyof typeof COORDENADOR_REMUNERATION.levels] || 'level1';
            
            const metaColetivaVendas = parseFloat(coordenadorInputs.metaColetivaVendas || '0');
            const vendasRealizadasColetiva = parseFloat(coordenadorInputs.vendasRealizadasColetiva || '0');
            const sqlsDoTrimestre = parseFloat(coordenadorInputs.sqlsDoTrimestre || '0');
            const vendasDoTrimestre = parseFloat(coordenadorInputs.vendasDoTrimestre || '0');
            const metaAnualVendas = parseFloat(coordenadorInputs.metaAnualVendas || '0');
            const vendasRealizadasAno = parseFloat(coordenadorInputs.vendasRealizadasAno || '0');
            const mesesDeCasa = Math.max(1, Math.min(12, parseInt(coordenadorInputs.mesesDeCasa || '12', 10)));

            const salarioFixo = COORDENADOR_REMUNERATION.fixedSalary[nivelKey as keyof typeof COORDENADOR_REMUNERATION.fixedSalary];
            
            // Calcular % da meta coletiva baseado nas vendas realizadas vs meta coletiva
            const progressoColetivoCalc = metaColetivaVendas > 0 ? (vendasRealizadasColetiva / metaColetivaVendas) : 0;
            
            // Premiação mensal coletiva: % sobre as vendas realizadas
            const premiacaoRate = getTieredRate(
                progressoColetivoCalc,
                COORDENADOR_REMUNERATION.monthlyCollectiveBonus.tiers,
                COORDENADOR_REMUNERATION.monthlyCollectiveBonus.rates
            );
            const premiacaoColetiva = vendasRealizadasColetiva * premiacaoRate;

            // Premiação trimestral por eficiência (% VENDA/SQL) - threshold específico por nível
            const conversaoTrimestral = sqlsDoTrimestre > 0 ? (vendasDoTrimestre / sqlsDoTrimestre) : 0;
            
            // Verificar se atingiu o threshold específico do nível
            const quarterlyRule = COORDENADOR_REMUNERATION.quarterlyEfficiencyBonus[nivelKey as keyof typeof COORDENADOR_REMUNERATION.quarterlyEfficiencyBonus];
            const canEarnQuarterlyBonus = conversaoTrimestral >= quarterlyRule.threshold;
            const premiacaoTrimestralPotencial = canEarnQuarterlyBonus ? quarterlyRule.value : 0;
            
            const premiacaoTrimestral = includeQuarterlyBonus && canEarnQuarterlyBonus ? premiacaoTrimestralPotencial : 0;

            // Bônus anual - baseado em atingir 100% da meta anual e proporcional ao salário fixo
            const progressoAnual = metaAnualVendas > 0 ? (vendasRealizadasAno / metaAnualVendas) : 0;
            const metaAnualAtingida = progressoAnual >= 1.0; // 100% da meta anual
            
            // Bônus = salário fixo do nível × (meses de casa ÷ 12)
            // Ex: Nível 1 (R$ 5.000) com 6 meses = R$ 5.000 × (6÷12) = R$ 2.500
            const bonusAnualPotencial = metaAnualAtingida ? (salarioFixo / 12) * mesesDeCasa : 0;
            const bonusAnual = includeAnnualBonus && metaAnualAtingida ? bonusAnualPotencial : 0;

            const totalOte = salarioFixo + premiacaoColetiva + premiacaoTrimestral + bonusAnual;

            const calculateScenarioOTE = (achievement: number) => {
                const scenarioRate = getTieredRate(
                    achievement,
                    COORDENADOR_REMUNERATION.monthlyCollectiveBonus.tiers,
                    COORDENADOR_REMUNERATION.monthlyCollectiveBonus.rates
                );
                const scenarioCollectiveBonus = vendasRealizadasColetiva * scenarioRate;
                return salarioFixo + scenarioCollectiveBonus;
            };

            return {
                salarioFixo, 
                premiacaoColetiva, 
                premiacaoTrimestral, 
                bonusAnual, 
                totalOte,
                progressoColetiva: progressoColetivoCalc * 100,
                progressoTrimestral: conversaoTrimestral * 100,
                progressoAnual: progressoAnual * 100,
                oteBaixo: calculateScenarioOTE(0.75),
                oteAlvo: calculateScenarioOTE(1.0),
                oteAlto: calculateScenarioOTE(1.5),
                metaTrimestralAtingida: canEarnQuarterlyBonus,
                bonusTrimestralPotencial: premiacaoTrimestralPotencial,
                metaAnualAtingida: metaAnualAtingida,
                bonusAnualPotencial,
            };

        } else { // SDR Profile
            const sdrInputs = inputs as SdrInputs;
            const nivelKey = SDR_REMUNERATION.levels[sdrInputs.nivel as keyof typeof SDR_REMUNERATION.levels] || 'level1';
            
            const metaIndividualSQLs = parseFloat(sdrInputs.metaIndividualSQLs || '0');
            const sqlsAceitosPeloCloser = parseFloat(sdrInputs.sqlsAceitosPeloCloser || '0');
            // Handle percentage with possible decimal separator (comma or dot)
            const metaColetivaGlobalStr = sdrInputs.metaColetivaGlobal || '0';
            const metaColetivaGlobalPerc = parseFloat(metaColetivaGlobalStr.replace(',', '.')) / 100;
            const metaTrimestralSQLs = parseFloat(sdrInputs.metaTrimestralSQLs || '0');
            const realizadoTrimestralSQLs = parseFloat(sdrInputs.realizadoTrimestralSQLs || '0');
            const mqlsGerados = parseFloat(sdrInputs.mqlsGerados || '0');
            const metaAnualSQLs = parseFloat(sdrInputs.metaAnualSQLs || '0');
            const realizadoAnualSQLs = parseFloat(sdrInputs.realizadoAnualSQLs || '0');
            const mesesDeCasa = Math.max(1, Math.min(12, parseInt(sdrInputs.mesesDeCasa || '12', 10)));
            
            const salarioFixo = SDR_REMUNERATION.fixedSalary[nivelKey as keyof typeof SDR_REMUNERATION.fixedSalary];
            
            const progressoMensal = metaIndividualSQLs > 0 ? (sqlsAceitosPeloCloser / metaIndividualSQLs) : 0;
            const comissaoIndividual = getTieredValue(progressoMensal, SDR_REMUNERATION.individualCommission.tiers, SDR_REMUNERATION.individualCommission.values[nivelKey as keyof typeof SDR_REMUNERATION.individualCommission.values]);

            const metaColetiva = getTieredValue(metaColetivaGlobalPerc, SDR_REMUNERATION.teamBonus.tiers, SDR_REMUNERATION.teamBonus.values[nivelKey as keyof typeof SDR_REMUNERATION.teamBonus.values]);
            
            const conversaoMQLSQL = mqlsGerados > 0 ? (sqlsAceitosPeloCloser / mqlsGerados) : 0;
            const hasMetConversionForBonus = conversaoMQLSQL >= SDR_REMUNERATION.performanceBonus.threshold;
            
            const premioPerformance = hasMetConversionForBonus ? SDR_REMUNERATION.performanceBonus.values[nivelKey as keyof typeof SDR_REMUNERATION.performanceBonus.values] : 0;
            
            const progressoTrimestral = metaTrimestralSQLs > 0 ? (realizadoTrimestralSQLs / metaTrimestralSQLs) : 0;
            const bonusTrimestralPotencial = getTieredValue(progressoTrimestral, SDR_REMUNERATION.quarterlyBonus.tiers, SDR_REMUNERATION.quarterlyBonus.values[nivelKey as keyof typeof SDR_REMUNERATION.quarterlyBonus.values]);
            const metaTrimestralAtingida = bonusTrimestralPotencial > 0;
            
            const progressoAnual = metaAnualSQLs > 0 ? (realizadoAnualSQLs / metaAnualSQLs) : 0;
            const fullAnnualBonus = SDR_REMUNERATION.annualBonus.values[nivelKey as keyof typeof SDR_REMUNERATION.annualBonus.values];
            const bonusAnualPotencial = progressoAnual >= 1 ? (fullAnnualBonus / 12) * mesesDeCasa : 0;
            const metaAnualAtingida = bonusAnualPotencial > 0;
            
            const metaTrimestral = includeQuarterlyBonus && metaTrimestralAtingida ? bonusTrimestralPotencial : 0;
            const bonusAnual = includeAnnualBonus && metaAnualAtingida ? bonusAnualPotencial : 0;

            const totalOte = salarioFixo + comissaoIndividual + metaColetiva + premioPerformance + metaTrimestral + bonusAnual;

            const calculateScenarioOTE = (achievement: number) => {
                const scenarioCommission = getTieredValue(achievement, SDR_REMUNERATION.individualCommission.tiers, SDR_REMUNERATION.individualCommission.values[nivelKey as keyof typeof SDR_REMUNERATION.individualCommission.values]);
                return salarioFixo + scenarioCommission;
            }
            
            return {
                salarioFixo, comissaoIndividual, metaColetiva, premioPerformance, totalOte,
                metaTrimestral, bonusAnual,
                progressoMensal: progressoMensal * 100,
                progressoTrimestral: progressoTrimestral * 100,
                progressoColetiva: metaColetivaGlobalPerc * 100,
                progressoConversao: SDR_REMUNERATION.performanceBonus.threshold > 0 ? Math.min(100, (conversaoMQLSQL / SDR_REMUNERATION.performanceBonus.threshold) * 100) : 0,
                progressoAnual: progressoAnual * 100,
                oteBaixo: calculateScenarioOTE(0.75), oteAlvo: calculateScenarioOTE(1.0), oteAlto: calculateScenarioOTE(1.5),
                metaTrimestralAtingida, bonusTrimestralPotencial, metaAnualAtingida, bonusAnualPotencial,
            };
        }
    }, [inputs, closerBonuses, includeQuarterlyBonus, includeAnnualBonus]);
};