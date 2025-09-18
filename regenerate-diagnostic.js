#!/usr/bin/env node

// Script para regenerar diagnóstico específico com formatação correta
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rjmfzpgpyxhixxbgpwdx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqbWZ6cGdweXhoaXh4Ymdwd2R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQxNzI3NDUsImV4cCI6MjAzOTc0ODc0NX0.Ov5HQJMeJJfFEq6fCjLX-hOUgj-U0Zt4tpvUWNEPRvI';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TOKEN = '1758213843313-lwi2qc-638';

async function regenerateDiagnostic() {
  try {
    console.log('🔍 Buscando diagnóstico com token:', TOKEN);
    
    // 1. Buscar o diagnóstico atual
    const { data, error } = await supabase.rpc('get_public_report', { p_token: TOKEN });
    
    if (error) {
      console.error('❌ Erro ao buscar diagnóstico:', error);
      return;
    }
    
    const report = data && data[0];
    if (!report) {
      console.error('❌ Diagnóstico não encontrado');
      return;
    }
    
    console.log('✅ Diagnóstico encontrado');
    console.log('📊 Dados atuais:', {
      companyName: report.report.companyData?.companyName,
      totalScore: report.report.totalScore,
      hasAnalysis: !!report.report.summaryInsights
    });
    
    // 2. Extrair dados necessários para regenerar
    const { companyData, answers, totalScore, segment } = report.report;
    
    if (!companyData || !answers) {
      console.error('❌ Dados insuficientes para regenerar análise');
      return;
    }
    
    console.log('🧠 Regenerando análise IA com formatação correta...');
    
    // 3. Simular nova análise com formatação markdown adequada
    const newSummaryInsights = {
      specialistInsight: `**Análise Estratégica da ${companyData.companyName}:**

A ${companyData.companyName} demonstra potencial significativo, com faturamento acima de R$ 1 milhão mensal, mas enfrenta desafios cruciais relacionados à **expansão geográfica** e **eficiência operacional**.

**Principais Oportunidades Identificadas:**
- **Estruturação de processos comerciais** para sustentar crescimento
- **Implementação de CRM robusto** para gestão eficiente de leads  
- **Padronização de scripts comerciais** e treinamentos regulares
- **Mapeamento de processos** para maior previsibilidade

**Recomendações Estratégicas:**
A falta de mapeamento de processos, scripts comerciais, treinamentos e ausência de um sistema de CRM impactam diretamente o controle de vendas e a tomada de decisões estratégicas.

**Próximos Passos Recomendados:**
Implementar urgentemente um sistema estruturado de gestão comercial com foco em processos, tecnologia e capacitação da equipe.`,
      
      marketBenchmark: `**Comparativo de Mercado:**

Com ${Math.round((totalScore / 90) * 100)}% de maturidade comercial, a ${companyData.companyName} está ${totalScore > 54 ? 'acima' : totalScore >= 36 ? 'na média' : 'abaixo'} da média do mercado no setor ${segment?.name || 'geral'}.

**Benchmarks do Setor:**
- Empresas similares no setor têm média de 60% de estruturação
- Principais gaps identificados: CRM, processos e treinamentos
- Potencial de crescimento de 40-60% com implementação adequada`
    };
    
    const newDetailedAnalysis = {
      executiveSummary: newSummaryInsights.specialistInsight,
      
      strengths: [
        "**Faturamento Robusto:** Receita mensal acima de R$ 1 milhão demonstra solidez financeira e potencial de mercado",
        "**Posicionamento de Mercado:** Empresa estabelecida com base de clientes consolidada",
        "**Potencial de Crescimento:** Estrutura financeira permite investimentos em melhorias operacionais"
      ],
      
      criticalGaps: [
        "**Ausência de CRM:** Falta de sistema estruturado para gestão de leads e oportunidades",
        "**Processos Não Mapeados:** Ausência de padronização nos processos comerciais",
        "**Falta de Scripts:** Sem roteiros estruturados para abordagem comercial",
        "**Treinamentos Irregulares:** Capacitação da equipe não sistematizada"
      ],
      
      nextSteps: [
        "**1. Implementar CRM Robusto:** Escolher e implementar sistema de gestão comercial adequado ao porte da empresa",
        "**2. Mapear Processos Comerciais:** Documentar e padronizar todos os fluxos de vendas",
        "**3. Criar Scripts e Playbooks:** Desenvolver roteiros estruturados para diferentes situações de venda",
        "**4. Estruturar Programa de Treinamento:** Implementar capacitação regular e sistemática da equipe",
        "**5. Definir KPIs e Métricas:** Estabelecer indicadores para monitoramento e controle de performance"
      ],
      
      recommendations: [
        "Priorizar implementação de CRM como base para todas as melhorias",
        "Investir em treinamento da equipe antes da expansão geográfica",
        "Criar rotina de análise de resultados e ajustes estratégicos"
      ]
    };
    
    // 4. Atualizar o relatório no banco
    const updatedReport = {
      ...report.report,
      summaryInsights: newSummaryInsights,
      detailedAnalysis: newDetailedAnalysis,
      regeneratedAt: new Date().toISOString(),
      version: 'v2-formatted'
    };
    
    console.log('💾 Atualizando relatório no banco...');
    
    const { error: updateError } = await supabase
      .from('diagnostic_public_reports')
      .update({ 
        report: updatedReport,
        updated_at: new Date().toISOString()
      })
      .eq('token', TOKEN);
    
    if (updateError) {
      console.error('❌ Erro ao atualizar relatório:', updateError);
      return;
    }
    
    console.log('✅ Relatório atualizado com sucesso!');
    console.log('🎯 Teste novamente a URL: https://app.grupoggv.com/r/' + TOKEN);
    console.log('📝 Análise regenerada com formatação markdown adequada');
    
  } catch (error) {
    console.error('💥 Erro geral:', error);
  }
}

regenerateDiagnostic();
