import React, { useEffect, useState } from 'react';
import { CALLS, DATE_FORMATTER, TIME_FORMATTER, secondsToHuman } from '../../../calls-dashboard/constants';
import AiAssistant from '../../../calls-dashboard/components/AiAssistant';
import { fetchCallDetails, listCallComments, addCallComment } from '../../../services/callsService';
import { useAdminFeatures } from '../../../hooks/useAdminPermissions';

export default function CallDetailPage({ callId }: { callId: string }) {
  const { canAccessManualAnalysis } = useAdminFeatures();
  const local = CALLS.find((c) => c.id === callId);
  const [call, setCall] = useState<any>(local);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState<string>('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Converter link do Google Drive para link direto quando necessário
  const convertGoogleDriveUrl = (url: string | null | undefined) => {
    if (!url) return '';
    if (url.includes('/uc?export=download') || url.includes('googleusercontent.com')) return url;
    const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return m ? `https://drive.google.com/uc?export=download&id=${m[1]}` : url;
  };

  useEffect(() => {
    const run = async () => {
      try {
        const data = await fetchCallDetails(callId);
        if (data) setCall({ ...local, ...data });
        // usar diretamente recording_url (convertido) ao invés de endpoint assinado
        if (data?.recording_url) {
          setSignedUrl(convertGoogleDriveUrl(data.recording_url));
        } else {
          setSignedUrl(null);
        }
        // carregar comentários
        try {
          const c = await listCallComments(callId);
          setComments(Array.isArray(c) ? c : []);
        } catch {
          setComments([]);
        }
      } catch {
        // mantém fallback local
      }
    };
    run();
  }, [callId]);

  // Função para adicionar comentário
  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    setIsSubmittingComment(true);
    try {
      const comment = await addCallComment(callId, newComment, currentTime);
      if (comment) {
        setComments(prev => [...prev, comment]);
        setNewComment('');
      }
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Função para formatar análise IA
  const renderAIAnalysis = () => {
    if (!call.scorecard || Object.keys(call.scorecard).length === 0) {
      return (
        <div className="text-center py-8 text-slate-500">
          <div className="text-lg mb-2">🤖</div>
          <div>Análise de IA não disponível</div>
          <div className="text-sm">A análise será gerada automaticamente quando a transcrição estiver pronta</div>
        </div>
      );
    }

    const qualityIndicators = call.scorecard.qualityIndicators || {};
    const indicators = Object.entries(qualityIndicators);

    return (
      <div className="space-y-3">
        {indicators.map(([key, value]) => (
          <div key={key} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
            <div className={`w-2 h-2 rounded-full mt-2 ${
              key.includes('clara') || key.includes('profissional') ? 'bg-green-500' :
              key.includes('aprofundar') || key.includes('melhorar') ? 'bg-yellow-500' :
              'bg-blue-500'
            }`} />
            <div className="flex-1">
              <div className="font-medium text-slate-800 capitalize">
                {key.replace(/_/g, ' ')}
              </div>
              <div className="text-sm text-slate-600">{String(value)}</div>
            </div>
          </div>
        ))}
        {call.scorecard.finalScore && (
          <div className="mt-4 p-3 bg-indigo-50 rounded-lg">
            <div className="text-sm text-indigo-600 font-medium">Pontuação Final</div>
            <div className="text-2xl font-bold text-indigo-800">{call.scorecard.finalScore}/100</div>
          </div>
        )}
      </div>
    );
  };

  // Função para renderizar transcrição
  const renderTranscription = () => {
    if (!call.transcription) {
      return (
        <div className="text-center py-8 text-slate-500">
          <div className="text-lg mb-2">📝</div>
          <div>Transcrição não disponível</div>
          <div className="text-sm">A transcrição será gerada automaticamente</div>
        </div>
      );
    }

    return (
      <div className="bg-slate-50 p-4 rounded-lg">
        <div className="text-sm text-slate-700 whitespace-pre-wrap">
          {call.transcription}
        </div>
      </div>
    );
  };

  if (!call) return <div className="text-slate-600">Chamada não encontrada.</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        {/* Informações da chamada */}
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            {call.sdr?.avatarUrl ? (
              <img className="w-10 h-10 rounded-full" src={call.sdr.avatarUrl} alt="avatar" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                <span className="text-indigo-600 font-medium text-sm">
                  {call.sdr?.name?.charAt(0).toUpperCase() || call.sdr_name?.charAt(0).toUpperCase() || '?'}
                </span>
              </div>
            )}
            <div>
              <div className="font-medium text-slate-800">{call.sdr?.name || call.sdr_name || 'SDR não identificado'}</div>
              <div className="text-xs text-slate-500">
                {call.date || call.created_at ? (
                  <>
                    {DATE_FORMATTER.format(new Date(call.date || call.created_at))} • {TIME_FORMATTER.format(new Date(call.date || call.created_at))}
                  </>
                ) : (
                  'Data não disponível'
                )}
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-slate-500">Duração</div>
              <div className="font-semibold">{secondsToHuman(call.durationSec || call.duration || 0)}</div>
            </div>
            <div>
              <div className="text-slate-500">Status</div>
              <div className="font-semibold capitalize">{call.status}</div>
            </div>
            {canAccessManualAnalysis ? (
              <div>
                <div className="text-slate-500">Nota</div>
                <div className="font-semibold">{typeof call.score === 'number' ? call.score : 'N/A'}</div>
              </div>
            ) : (
              <div>
                <div className="text-slate-500">Nota</div>
                <div className="font-semibold">—</div>
              </div>
            )}
          </div>
        </div>

        {/* Áudio da chamada */}
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="mb-2 font-medium text-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              Áudio da chamada
              {!signedUrl && (
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                  Áudio indisponível
                </span>
              )}
            </div>
          </div>
          {signedUrl ? (
            <audio
              ref={setAudioEl}
              controls
              className="w-full"
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            >
              <source src={signedUrl} type="audio/mpeg" />
              Seu navegador não suporta o elemento de áudio.
            </audio>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <div className="text-lg mb-2">🎵</div>
              <div>Áudio não disponível</div>
            </div>
          )}
        </div>

        {/* Transcrição */}
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="mb-4 font-medium text-slate-800">📝 Transcrição</div>
          {renderTranscription()}
        </div>

        {/* Análise IA (somente Admin/SuperAdmin) */}
        {canAccessManualAnalysis && (
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="mb-4 font-medium text-slate-800">🤖 Feedback de IA</div>
            {renderAIAnalysis()}
          </div>
        )}
      </div>

      {/* Sidebar com comentários */}
      <div className="space-y-4">
        {/* Comentários */}
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="mb-4 font-medium text-slate-800">💬 Comentários</div>
          
          {/* Lista de comentários */}
          <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
            {comments.length === 0 ? (
              <div className="text-center py-4 text-slate-500 text-sm">
                Nenhum comentário ainda
              </div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs text-slate-500">
                      {comment.author_name || 'Usuário'}
                    </div>
                    <div className="text-xs text-slate-400">
                      {comment.at_seconds > 0 ? `${Math.floor(comment.at_seconds / 60)}:${(comment.at_seconds % 60).toString().padStart(2, '0')}` : ''}
                    </div>
                  </div>
                  <div className="text-sm text-slate-700">{comment.text}</div>
                </div>
              ))
            )}
          </div>

          {/* Adicionar comentário */}
          <div className="space-y-2">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Adicionar comentário..."
              className="w-full p-2 border border-slate-300 rounded-lg text-sm resize-none"
              rows={3}
            />
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-500">
                {currentTime > 0 ? `Tempo: ${Math.floor(currentTime / 60)}:${(currentTime % 60).toString().padStart(2, '0')}` : ''}
              </div>
              <button
                onClick={handleAddComment}
                disabled={!newComment.trim() || isSubmittingComment}
                className="px-3 py-1 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingComment ? 'Adicionando...' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>

        {/* Informações adicionais */}
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="mb-4 font-medium text-slate-800">ℹ️ Informações</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Empresa:</span>
              <span className="font-medium">{call.company || 'Não informada'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Deal ID:</span>
              <span className="font-medium">{call.deal_id || 'Não informado'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Tipo:</span>
              <span className="font-medium capitalize">{call.call_type || 'Não informado'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Direção:</span>
              <span className="font-medium capitalize">{call.direction || 'Não informada'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


