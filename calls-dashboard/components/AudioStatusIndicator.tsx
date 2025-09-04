import React, { useState } from 'react';
import { CallItem } from '../types';

interface AudioStatusIndicatorProps {
  call: CallItem;
}

export default function AudioStatusIndicator({ call }: AudioStatusIndicatorProps) {
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryAttempted, setRecoveryAttempted] = useState(false);

  // Determinar se deveria ter áudio baseado na duração
  const shouldHaveAudio = call.durationSec > 60; // Chamadas > 1 minuto deveriam ter áudio
  const hasAudioUrl = !!(call.recording_url);
  const hasValidAudioUrl = hasAudioUrl && (
    call.recording_url?.includes('ggv-chatwoot.nyc3.cdn.digitaloceanspaces.com') ||
    call.recording_url?.includes('listener.api4com.com') ||
    call.recording_url?.includes('.mp3') ||
    call.recording_url?.includes('.wav')
  );
  const hasTranscription = !!(call.transcription && call.transcription.length > 50);

  // Diferentes cenários de problemas
  const audioMissing = shouldHaveAudio && !hasValidAudioUrl;
  const inconsistentData = hasTranscription && !hasValidAudioUrl && call.durationSec > 180; // Transcrição sem áudio em chamada longa
  const shortCallWithTranscription = call.durationSec < 60 && hasTranscription; // Suspeito: transcrição em chamada muito curta
  const hasUrlButInvalid = hasAudioUrl && !hasValidAudioUrl; // URL existe mas não parece válida

  const handleRecoveryAttempt = async () => {
    setIsRecovering(true);
    
    try {
      // Simular tentativa de recuperação
      // Aqui você implementaria a lógica real de recuperação de áudio
      console.log('🔄 Tentando recuperar áudio para chamada:', call.id);
      
      // Simular delay de processamento
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Por enquanto, apenas marcar como tentado
      setRecoveryAttempted(true);
      
    } catch (error) {
      console.error('❌ Erro na recuperação de áudio:', error);
    } finally {
      setIsRecovering(false);
    }
  };

  // Não mostrar nada se os dados estão consistentes
  if (!audioMissing && !inconsistentData && !shortCallWithTranscription && !hasUrlButInvalid) {
    return null;
  }

  return (
    <div className="space-y-2">
      {/* Áudio Ausente */}
      {audioMissing && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-2">
              <span className="text-yellow-600">⚠️</span>
              <div>
                <div className="font-medium text-yellow-800">Áudio Esperado Ausente</div>
                <div className="text-sm text-yellow-700">
                  Chamada de {Math.floor(call.durationSec / 60)}m{call.durationSec % 60}s deveria ter gravação
                </div>
              </div>
            </div>
            
            {!recoveryAttempted && (
              <button
                onClick={handleRecoveryAttempt}
                disabled={isRecovering}
                className="px-3 py-1.5 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 disabled:opacity-50 flex items-center gap-1"
              >
                {isRecovering ? (
                  <>
                    <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                    Buscando...
                  </>
                ) : (
                  <>
                    🔄 Tentar Recuperar
                  </>
                )}
              </button>
            )}
            
            {recoveryAttempted && (
              <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">
                ✓ Tentativa realizada
              </span>
            )}
          </div>
        </div>
      )}

      {/* Dados Inconsistentes */}
      {inconsistentData && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <span className="text-orange-600">🔍</span>
            <div>
              <div className="font-medium text-orange-800">Possível Inconsistência</div>
              <div className="text-sm text-orange-700">
                Chamada tem transcrição mas não tem áudio - pode indicar problema no upload
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chamada Curta com Transcrição */}
      {shortCallWithTranscription && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <span className="text-blue-600">ℹ️</span>
            <div>
              <div className="font-medium text-blue-800">Dados Incomuns</div>
              <div className="text-sm text-blue-700">
                Chamada muito curta ({call.durationSec}s) mas com transcrição disponível
              </div>
            </div>
          </div>
        </div>
      )}

      {/* URL de Áudio Inválida */}
      {hasUrlButInvalid && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <span className="text-red-600">🔗</span>
            <div>
              <div className="font-medium text-red-800">URL de Áudio Inválida</div>
              <div className="text-sm text-red-700">
                URL presente mas não parece ser um arquivo de áudio válido
              </div>
              <div className="text-xs text-red-600 mt-1 font-mono bg-red-100 p-1 rounded">
                {call.recording_url?.substring(0, 80)}...
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Hook para estatísticas de qualidade de áudio
export function useAudioQualityStats() {
  const [stats, setStats] = useState({
    totalCalls: 0,
    callsWithExpectedAudio: 0,
    callsWithActualAudio: 0,
    missingAudioCount: 0,
    qualityPercentage: 0
  });

  const calculateStats = async (calls: CallItem[]) => {
    const totalCalls = calls.length;
    const callsWithExpectedAudio = calls.filter(c => c.durationSec > 60).length;
    
    // Verificar áudio válido com novos padrões
    const callsWithActualAudio = calls.filter(c => 
      c.recording_url && (
        c.recording_url.includes('ggv-chatwoot.nyc3.cdn.digitaloceanspaces.com') ||
        c.recording_url.includes('listener.api4com.com') ||
        c.recording_url.includes('.mp3') ||
        c.recording_url.includes('.wav')
      )
    ).length;
    
    const missingAudioCount = calls.filter(c => 
      c.durationSec > 60 && !(
        c.recording_url && (
          c.recording_url.includes('ggv-chatwoot.nyc3.cdn.digitaloceanspaces.com') ||
          c.recording_url.includes('listener.api4com.com') ||
          c.recording_url.includes('.mp3') ||
          c.recording_url.includes('.wav')
        )
      )
    ).length;
    
    const qualityPercentage = callsWithExpectedAudio > 0 
      ? Math.round(((callsWithExpectedAudio - missingAudioCount) / callsWithExpectedAudio) * 100)
      : 100;

    setStats({
      totalCalls,
      callsWithExpectedAudio,
      callsWithActualAudio,
      missingAudioCount,
      qualityPercentage
    });
  };

  return { stats, calculateStats };
}

// Componente para mostrar estatísticas gerais
export function AudioQualityDashboard({ calls }: { calls: CallItem[] }) {
  const { stats, calculateStats } = useAudioQualityStats();

  React.useEffect(() => {
    calculateStats(calls);
  }, [calls]);

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <h3 className="font-medium text-slate-800 mb-3">📊 Qualidade dos Dados de Áudio</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-slate-700">{stats.totalCalls}</div>
          <div className="text-sm text-slate-500">Total de Chamadas</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.callsWithExpectedAudio}</div>
          <div className="text-sm text-slate-500">Deveriam ter Áudio</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{stats.callsWithActualAudio}</div>
          <div className="text-sm text-slate-500">Têm Áudio</div>
        </div>
        
        <div className="text-center">
          <div className={`text-2xl font-bold ${stats.missingAudioCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {stats.missingAudioCount}
          </div>
          <div className="text-sm text-slate-500">Áudio Ausente</div>
        </div>
      </div>
      
      <div className="mt-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-slate-600">Qualidade Geral</span>
          <span className={`text-sm font-medium ${stats.qualityPercentage >= 90 ? 'text-green-600' : stats.qualityPercentage >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
            {stats.qualityPercentage}%
          </span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              stats.qualityPercentage >= 90 ? 'bg-green-500' : 
              stats.qualityPercentage >= 70 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${stats.qualityPercentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}
