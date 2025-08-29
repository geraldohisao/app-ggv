import React, { useState, useEffect } from 'react';
import { DATE_FORMATTER, TIME_FORMATTER, secondsToHuman } from '../constants';
import { fetchCallDetail, convertToCallItem } from '../services/callsService';
import { CallItem } from '../types';
import AiAssistant from '../components/AiAssistant';

interface CallDetailPageProps {
  callId: string;
}

export default function CallDetailPage({ callId }: CallDetailPageProps) {
  const [call, setCall] = useState<CallItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCallDetail = async () => {
      if (!callId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const callDetail = await fetchCallDetail(callId);
        if (callDetail) {
          setCall(convertToCallItem(callDetail));
        } else {
          setError('Chamada não encontrada.');
        }
      } catch (err) {
        console.error('Erro ao carregar detalhes da call:', err);
        setError('Erro ao carregar detalhes da chamada.');
      } finally {
        setLoading(false);
      }
    };

    loadCallDetail();
  }, [callId]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="bg-white border border-slate-200 rounded p-6 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-2 text-slate-600">Carregando detalhes da chamada...</p>
        </div>
      </div>
    );
  }

  if (error || !call) {
    return (
      <div className="p-6">
        <div className="bg-white border border-slate-200 rounded p-6">
          <div className="text-slate-700">{error || 'Chamada não encontrada.'}</div>
          <a href="#/calls" className="text-indigo-600 text-sm">Voltar para lista</a>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Detalhes da Chamada</h2>
          <p className="text-sm text-slate-600">{call.company} • {call.dealCode}</p>
          {call.person_name && (
            <p className="text-sm text-slate-500">Contato: {call.person_name}</p>
          )}
        </div>
        <a href="#/calls" className="text-sm text-slate-600 hover:text-slate-900">Voltar</a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* Informações da Chamada */}
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                <span className="text-indigo-600 font-medium text-sm">
                  {call.sdr.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                </span>
              </div>
              <div>
                <div className="font-medium text-slate-800">{call.sdr.name}</div>
                <div className="text-xs text-slate-500">
                  {DATE_FORMATTER.format(new Date(call.date))} • {TIME_FORMATTER.format(new Date(call.date))}
                </div>
                {call.sdr.email && (
                  <div className="text-xs text-slate-400">{call.sdr.email}</div>
                )}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-slate-500">Duração</div>
                <div className="font-semibold">{secondsToHuman(call.durationSec)}</div>
              </div>
              <div>
                <div className="text-slate-500">Status</div>
                <div className="font-semibold">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    call.status === 'processed' ? 'bg-green-100 text-green-800' :
                    call.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                    call.status === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {call.status}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-slate-500">Nota</div>
                <div className="font-semibold">{typeof call.score === 'number' ? call.score : 'N/A'}</div>
              </div>
              <div>
                <div className="text-slate-500">Áudio</div>
                <div className="font-semibold">{call.audio_url ? '✅' : '❌'}</div>
              </div>
            </div>
          </div>

          {/* Player de Áudio */}
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="mb-3 font-medium text-slate-800">Áudio da Chamada</div>
            {call.audio_url ? (
              <div className="space-y-2">
                <audio controls className="w-full" preload="metadata">
                  <source src={call.audio_url} type="audio/mpeg" />
                  <source src={call.audio_url} type="audio/wav" />
                  <source src={call.audio_url} type="audio/ogg" />
                  Seu navegador não suporta o elemento de áudio.
                </audio>
                <div className="text-xs text-slate-500">
                  URL: <a href={call.audio_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                    {call.audio_url.length > 60 ? call.audio_url.substring(0, 60) + '...' : call.audio_url}
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <div className="text-4xl mb-2">🎵</div>
                <p>Áudio não disponível para esta chamada</p>
                <p className="text-xs mt-1">O áudio pode estar sendo processado ou não foi gravado</p>
              </div>
            )}
          </div>

          {/* Transcrição */}
          {call.transcription && (
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="mb-3 font-medium text-slate-800">Transcrição</div>
              <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 whitespace-pre-wrap">
                {call.transcription}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <AiAssistant call={call} />
        </div>
      </div>
    </div>
  );
}


