import React, { useState } from 'react';
import { supabase } from '../../services/supabaseClient';

export default function SimpleBatchAnalysis() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testBatchSystem = async () => {
    if (loading) return;
    
    try {
      setLoading(true);
      console.log('🧪 Testando sistema de análise em lote...');

      // 1. Verificar quantas chamadas são elegíveis
      const { data: eligibleCalls, error: eligibleError } = await supabase
        .from('calls')
        .select('id, transcription, duration, call_type, pipeline, cadence')
        .not('transcription', 'is', null)
        .gte('duration', 180);

      if (eligibleError) throw eligibleError;

      console.log('📊 Chamadas elegíveis encontradas:', eligibleCalls?.length || 0);

      // 2. Verificar quantas já têm análise
      const { data: analyzedCalls, error: analyzedError } = await supabase
        .from('call_analysis')
        .select('call_id, final_grade');

      if (analyzedError) throw analyzedError;

      console.log('📋 Chamadas já analisadas:', analyzedCalls?.length || 0);

      // 3. Calcular chamadas que precisam de análise
      const eligibleIds = new Set(eligibleCalls?.map(c => c.id) || []);
      const analyzedIds = new Set(analyzedCalls?.map(c => c.call_id) || []);
      const needAnalysis = Array.from(eligibleIds).filter(id => !analyzedIds.has(id));

      console.log('🎯 Chamadas que precisam de análise:', needAnalysis.length);

      // 4. Testar análise de uma chamada específica
      if (needAnalysis.length > 0) {
        const testCallId = needAnalysis[0];
        console.log('🧪 Testando análise da chamada:', testCallId);

        const { data: analysisResult, error: analysisError } = await supabase.rpc('perform_ultra_fast_ai_analysis', {
          call_id_param: testCallId
        });

        if (analysisError) {
          console.error('❌ Erro na análise:', analysisError);
        } else {
          console.log('✅ Análise realizada com sucesso:', analysisResult);
        }
      }

      setResult({
        totalCalls: eligibleCalls?.length || 0,
        analyzedCalls: analyzedCalls?.length || 0,
        needAnalysis: needAnalysis.length,
        testCallId: needAnalysis[0] || null
      });

    } catch (error) {
      console.error('💥 Erro no teste:', error);
      setResult({ error: (error as any)?.message || 'Erro desconhecido' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">🧪 Teste de Análise em Lote</h3>
          <p className="text-sm text-slate-600">Diagnóstico e teste do sistema</p>
        </div>
        <button
          onClick={testBatchSystem}
          disabled={loading}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            loading
              ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {loading ? 'Testando...' : '🔍 Diagnosticar Sistema'}
        </button>
      </div>

      {result && (
        <div className="bg-slate-50 rounded-lg p-4">
          <h4 className="font-medium text-slate-800 mb-2">Resultado do Diagnóstico:</h4>
          
          {result.error ? (
            <div className="text-red-600">❌ Erro: {result.error}</div>
          ) : (
            <div className="space-y-2 text-sm">
              <div>📊 <strong>Total de chamadas elegíveis:</strong> {result.totalCalls}</div>
              <div>📋 <strong>Chamadas já analisadas:</strong> {result.analyzedCalls}</div>
              <div>🎯 <strong>Chamadas que precisam de análise:</strong> {result.needAnalysis}</div>
              {result.testCallId && (
                <div>🧪 <strong>ID de teste:</strong> {result.testCallId}</div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="text-xs text-slate-500">
        Este componente vai ajudar a identificar por que a análise em lote não está funcionando.
        Verifique o console para logs detalhados.
      </div>
    </div>
  );
}
