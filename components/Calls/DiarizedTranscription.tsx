import React, { useState } from 'react';

// Tipos e interfaces locais
interface DiarizedSegment {
  speaker: 'sdr' | 'client' | 'unknown';
  speakerName: string;
  text: string;
  confidence: number;
}

interface DiarizedTranscriptionType {
  segments: DiarizedSegment[];
  summary: {
    sdrTotalTime: number;
    clientTotalTime: number;
    totalSegments: number;
    confidence: number;
  };
  originalTranscription: string;
}

// Função de diarização temporária
async function diarizeTranscription(
  transcription: string, 
  sdrName: string, 
  clientName: string
): Promise<DiarizedTranscriptionType> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        segments: [{
          speaker: 'unknown',
          speakerName: 'Funcionalidade em desenvolvimento',
          text: transcription,
          confidence: 0.5
        }],
        summary: {
          sdrTotalTime: 0,
          clientTotalTime: transcription.length,
          totalSegments: 1,
          confidence: 0.5
        },
        originalTranscription: transcription
      });
    }, 2000);
  });
}

interface DiarizedTranscriptionProps {
  callId: string;
  originalTranscription: string;
  sdrName: string;
  clientName: string;
  existingDiarization?: DiarizedTranscriptionType;
}

export default function DiarizedTranscription({
  callId,
  originalTranscription,
  sdrName,
  clientName,
  existingDiarization
}: DiarizedTranscriptionProps) {
  const [diarizedData, setDiarizedData] = useState<DiarizedTranscriptionType | null>(existingDiarization || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);

  const handleDiarize = async () => {
    if (!originalTranscription?.trim()) {
      setError('Transcrição não disponível');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🎤 Iniciando diarização para:', { callId, sdrName, clientName });
      
      const result = await diarizeTranscription(originalTranscription, sdrName, clientName);
      
      console.log('✅ Diarização concluída:', result);
      setDiarizedData(result);
      
    } catch (err) {
      console.error('❌ Erro na diarização:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido na diarização');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-slate-800">📝 Transcrição da Chamada</h3>
          <p className="text-sm text-slate-600">
            {diarizedData ? 'Separada por falante' : 'Clique para separar por falante'}
          </p>
        </div>
        
        <div className="flex gap-2">
          {!diarizedData && (
            <button
              onClick={handleDiarize}
              disabled={loading || !originalTranscription?.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processando...
                </>
              ) : (
                <>
                  🎤 Separar Falantes
                </>
              )}
            </button>
          )}
          
          {diarizedData && (
            <button
              onClick={() => setShowOriginal(!showOriginal)}
              className="px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm"
            >
              {showOriginal ? '👥 Ver Separada' : '📄 Ver Original'}
            </button>
          )}
        </div>
      </div>

      {/* Erro */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg">
          <strong>Erro:</strong> {error}
        </div>
      )}

      {/* Estatísticas da diarização */}
      {diarizedData && !showOriginal && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <h4 className="font-medium text-slate-800 mb-2">📊 Resumo da Conversa</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-slate-500">Segmentos:</span>
              <span className="ml-1 font-medium">{diarizedData.summary.totalSegments}</span>
            </div>
            <div>
              <span className="text-slate-500">SDR falou:</span>
              <span className="ml-1 font-medium text-blue-600">
                {(() => {
                  const total = diarizedData.summary.sdrTotalTime + diarizedData.summary.clientTotalTime;
                  return total > 0 ? Math.round((diarizedData.summary.sdrTotalTime / total) * 100) : 0;
                })()}%
              </span>
            </div>
            <div>
              <span className="text-slate-500">Cliente falou:</span>
              <span className="ml-1 font-medium text-green-600">
                {(() => {
                  const total = diarizedData.summary.sdrTotalTime + diarizedData.summary.clientTotalTime;
                  return total > 0 ? Math.round((diarizedData.summary.clientTotalTime / total) * 100) : 0;
                })()}%
              </span>
            </div>
            <div>
              <span className="text-slate-500">Confiança:</span>
              <span className={`ml-1 font-medium ${
                diarizedData.summary.confidence > 0.8 ? 'text-green-600' :
                diarizedData.summary.confidence > 0.6 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {Math.round(diarizedData.summary.confidence * 100)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo da transcrição */}
      <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 max-h-96 overflow-y-auto">
        {diarizedData && !showOriginal ? (
          // Transcrição separada por falante
          <div className="space-y-3">
            {diarizedData.segments.map((segment, index) => (
              <div key={index} className={`p-3 rounded-lg ${
                segment.speaker === 'sdr' ? 'bg-blue-50 border-l-4 border-blue-400' :
                segment.speaker === 'client' ? 'bg-green-50 border-l-4 border-green-400' :
                'bg-gray-50 border-l-4 border-gray-400'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-medium px-2 py-1 rounded ${
                    segment.speaker === 'sdr' ? 'bg-blue-100 text-blue-700' :
                    segment.speaker === 'client' ? 'bg-green-100 text-green-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {segment.speaker === 'sdr' ? '👩‍💼' : segment.speaker === 'client' ? '👤' : '❓'} {segment.speakerName}
                  </span>
                  <span className="text-xs text-slate-500">
                    {Math.round(segment.confidence * 100)}% confiança
                  </span>
                </div>
                <p className="whitespace-pre-wrap">{segment.text}</p>
              </div>
            ))}
          </div>
        ) : (
          // Transcrição original
          <div className="whitespace-pre-wrap">
            {originalTranscription}
          </div>
        )}
      </div>
    </div>
  );
}