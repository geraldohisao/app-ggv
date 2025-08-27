import React, { useEffect, useState } from 'react';
import { fetchCallDetails, UiCallItem } from '../../services/callsService';
import { secondsToHuman } from '../../calls-dashboard/constants';

interface CallDetailProps {
  callId: string;
}

export default function CallDetail({ callId }: CallDetailProps) {
  const [call, setCall] = useState<UiCallItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCall = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchCallDetails(callId);
        setCall(data);
      } catch (err: any) {
        setError(err?.message || 'Erro ao carregar chamada');
      } finally {
        setLoading(false);
      }
    };

    if (callId) {
      loadCall();
    }
  }, [callId]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-slate-200 rounded"></div>
            <div className="h-4 bg-slate-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="text-rose-600 text-center">
          <h3 className="text-lg font-medium mb-2">Erro ao carregar</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!call) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="text-slate-500 text-center">
          <h3 className="text-lg font-medium mb-2">Chamada não encontrada</h3>
          <p>A chamada solicitada não foi encontrada.</p>
        </div>
      </div>
    );
  }

  const hasAudio = call.recording_url || (call.audio_bucket && call.audio_path);
  const hasTranscription = call.transcription && call.transcription.trim().length > 0;

  return (
    <div className="space-y-6">
      {/* Header da Chamada */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{call.company}</h1>
            <p className="text-slate-600">Deal ID: {call.deal_id || 'N/A'}</p>
          </div>
          <div className="text-right">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              call.status === 'processed' ? 'bg-green-100 text-green-800' :
              call.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
              call.status === 'failed' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {call.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* SDR Info */}
          <div className="bg-slate-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-slate-700 mb-2">SDR</h3>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-slate-300 rounded-full flex items-center justify-center">
                <span className="text-slate-600 font-medium">
                  {(call.sdr_name || call.sdr_email || 'U')[0].toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-medium text-slate-900">{call.sdr_name || 'Nome não disponível'}</p>
                <p className="text-sm text-slate-600">{call.sdr_email || 'Email não disponível'}</p>
              </div>
            </div>
          </div>

          {/* Detalhes da Chamada */}
          <div className="bg-slate-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-slate-700 mb-2">Detalhes</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Duração:</span>
                <span className="font-medium">{secondsToHuman(call.duration || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Tipo:</span>
                <span className="font-medium">{call.call_type || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Direção:</span>
                <span className="font-medium">
                  {call.direction === 'inbound' ? '📞 Recebida' : call.direction === 'outbound' ? '📱 Feita' : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Recursos Disponíveis */}
          <div className="bg-slate-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-slate-700 mb-2">Recursos</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={hasAudio ? 'text-green-600' : 'text-slate-400'}>🎵</span>
                <span className="text-sm">{hasAudio ? 'Áudio disponível' : 'Sem áudio'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={hasTranscription ? 'text-blue-600' : 'text-slate-400'}>📝</span>
                <span className="text-sm">{hasTranscription ? 'Transcrição disponível' : 'Sem transcrição'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={call.insights && Object.keys(call.insights).length > 0 ? 'text-purple-600' : 'text-slate-400'}>🧠</span>
                <span className="text-sm">{call.insights && Object.keys(call.insights).length > 0 ? 'Insights disponíveis' : 'Sem insights'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Player de Áudio */}
      {hasAudio && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">🎵 Gravação da Chamada</h2>
          {call.recording_url ? (
            <audio controls className="w-full">
              <source src={call.recording_url} type="audio/mpeg" />
              <source src={call.recording_url} type="audio/wav" />
              Seu navegador não suporta o elemento de áudio.
            </audio>
          ) : (
            <div className="bg-slate-50 rounded-lg p-4 text-center text-slate-600">
              <p>Áudio armazenado em: {call.audio_bucket}/{call.audio_path}</p>
              <p className="text-sm mt-2">URL de acesso direto não disponível</p>
            </div>
          )}
        </div>
      )}

      {/* Transcrição */}
      {hasTranscription && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">📝 Transcrição</h2>
          <div className="bg-slate-50 rounded-lg p-4">
            <pre className="whitespace-pre-wrap text-sm text-slate-700 font-mono">
              {call.transcription}
            </pre>
          </div>
          {call.transcript_status && (
            <div className="mt-3 text-sm text-slate-500">
              Status da transcrição: <span className="font-medium">{call.transcript_status}</span>
            </div>
          )}
        </div>
      )}

      {/* Insights */}
      {call.insights && Object.keys(call.insights).length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">🧠 Insights</h2>
          <div className="bg-slate-50 rounded-lg p-4">
            <pre className="whitespace-pre-wrap text-sm text-slate-700">
              {JSON.stringify(call.insights, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Scorecard */}
      {call.scorecard && Object.keys(call.scorecard).length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">📊 Scorecard</h2>
          <div className="bg-slate-50 rounded-lg p-4">
            <pre className="whitespace-pre-wrap text-sm text-slate-700">
              {JSON.stringify(call.scorecard, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Informações Técnicas */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">🔧 Informações Técnicas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <strong>ID da Chamada:</strong> {call.id}
          </div>
          <div>
            <strong>Provider Call ID:</strong> {call.provider_call_id || 'N/A'}
          </div>
          <div>
            <strong>Número de Origem:</strong> {call.from_number || 'N/A'}
          </div>
          <div>
            <strong>Número de Destino:</strong> {call.to_number || 'N/A'}
          </div>
          <div>
            <strong>Agent ID:</strong> {call.agent_id || 'N/A'}
          </div>
          <div>
            <strong>Status IA:</strong> {call.ai_status || 'N/A'}
          </div>
          <div>
            <strong>Criado em:</strong> {new Date(call.created_at).toLocaleString('pt-BR')}
          </div>
          <div>
            <strong>Atualizado em:</strong> {call.updated_at ? new Date(call.updated_at).toLocaleString('pt-BR') : 'N/A'}
          </div>
        </div>
      </div>
    </div>
  );
}
