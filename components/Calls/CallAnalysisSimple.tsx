import React, { useState, useEffect } from 'react';
import { 
  analyzeDealCallsWithAI,
  getLatestAnalysis,
  CallAnalysisResult 
} from '../../services/callAnalysisService';
import { addCallComment, listCallComments } from '../../services/callsService';

interface CallData {
  id: string;
  company?: string;
  duration?: number;
  recording_url?: string;
  transcription?: string;
  created_at?: string;
  status?: string;
  deal_id?: string;
  sdr_name?: string;
  sdr_email?: string;
}

interface CallAnalysisSimpleProps {
  call: CallData;
}

export default function CallAnalysisSimple({ call }: CallAnalysisSimpleProps) {
  const [analysis, setAnalysis] = useState<CallAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentTime, setCommentTime] = useState(0);
  const [companyName, setCompanyName] = useState(call.company || '');
  const [audioUrl, setAudioUrl] = useState('');
  const [audioError, setAudioError] = useState<string | null>(null);

  // Carregar análise existente e comentários
  useEffect(() => {
    const loadData = async () => {
      try {
        // Carregar análise existente se houver deal_id
        if (call.deal_id) {
          const existingAnalysis = await getLatestAnalysis(call.deal_id);
          if (existingAnalysis) {
            setAnalysis(existingAnalysis);
          }
        }

        // Carregar comentários
        const existingComments = await listCallComments(call.id);
        setComments(existingComments);

        // Processar URL do áudio
        if (call.recording_url) {
          const processedUrl = processAudioUrl(call.recording_url);
          setAudioUrl(processedUrl);
        }

      } catch (err: any) {
        console.error('❌ Erro ao carregar dados:', err);
        setError(err.message);
      }
    };

    loadData();
  }, [call.id, call.deal_id, call.recording_url]);

  // Processar URL do áudio para diferentes formatos
  const processAudioUrl = (url: string): string => {
    if (!url) return '';

    // Se já é uma URL direta
    if (url.startsWith('http') && !url.includes('drive.google.com')) {
      return url;
    }

    // Se é Google Drive, converter para formato direto
    if (url.includes('drive.google.com')) {
      const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match) {
        return `https://drive.google.com/uc?id=${match[1]}&export=download`;
      }
    }

    // Se é S3 ou outro formato
    if (url.includes('s3.') || url.includes('amazonaws.com')) {
      return url;
    }

    return url;
  };

  // Analisar call com IA
  const handleAnalyze = async () => {
    if (!call.transcription) {
      setError('Transcrição não disponível para análise');
      return;
    }

    if (!call.deal_id) {
      setError('Deal ID não disponível para análise');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🤖 Iniciando análise IA...');
      
      // Usar o novo sistema de análise por deal
      const analysisGenerator = analyzeDealCallsWithAI(call.deal_id);
      
      let fullAnalysis = '';
      for await (const chunk of analysisGenerator) {
        fullAnalysis += chunk;
        // Aqui você pode atualizar a UI em tempo real se necessário
      }

      if (fullAnalysis) {
        // Criar objeto de análise no formato esperado
        const result: CallAnalysisResult = {
          id: Date.now().toString(),
          deal_id: call.deal_id,
          analysis_content: fullAnalysis,
          transcription_summary: `Ligação ${call.id}`,
          call_count: 1,
          total_duration: call.duration || 0,
          created_at: new Date().toISOString()
        };
        
        setAnalysis(result);
        console.log('✅ Análise concluída');
      } else {
        setError('Erro na análise IA');
      }

    } catch (err: any) {
      console.error('❌ Erro na análise:', err);
      setError(err.message || 'Erro na análise IA');
    } finally {
      setLoading(false);
    }
  };

  // Adicionar comentário
  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      const comment = await addCallComment(call.id, newComment, commentTime);
      if (comment) {
        setComments(prev => [...prev, comment]);
        setNewComment('');
        setCommentTime(0);
      }
    } catch (err: any) {
      console.error('❌ Erro ao adicionar comentário:', err);
      setError(err.message);
    }
  };

  // Sincronizar empresa (função simplificada)
  const handleSyncCompany = async () => {
    if (!call.deal_id || !companyName) return;

    try {
      console.log('✅ Empresa atualizada localmente:', companyName);
      // Aqui você pode implementar a sincronização real se necessário
    } catch (err: any) {
      console.error('❌ Erro ao sincronizar empresa:', err);
    }
  };

  // Formatar duração
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Formatar data
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-slate-800">Análise de Chamada</h1>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                call.status === 'processed' ? 'bg-green-100 text-green-800' :
                call.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {call.status}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Empresa</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
                placeholder="Nome da empresa"
              />
              {call.deal_id && (
                <button
                  onClick={handleSyncCompany}
                  className="mt-1 text-xs text-indigo-600 hover:text-indigo-800"
                >
                  🔄 Sincronizar
                </button>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">SDR</label>
              <div className="px-3 py-2 bg-slate-50 rounded-md">
                {call.sdr_name || 'Não informado'}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Duração</label>
              <div className="px-3 py-2 bg-slate-50 rounded-md">
                {call.duration ? formatDuration(call.duration) : 'Não informado'}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
              <div className="px-3 py-2 bg-slate-50 rounded-md">
                {call.created_at ? formatDate(call.created_at) : 'Não informado'}
              </div>
            </div>
          </div>
        </div>

        {/* Player de Áudio */}
        {audioUrl && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">🎵 Áudio da Chamada</h2>
            
            {audioError ? (
              <div className="text-red-600 mb-4">
                ❌ Erro ao carregar áudio: {audioError}
                <a 
                  href={audioUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="ml-2 text-indigo-600 hover:text-indigo-800 underline"
                >
                  Baixar áudio
                </a>
              </div>
            ) : (
              <audio 
                controls 
                className="w-full"
                onError={() => setAudioError('Formato não suportado')}
              >
                <source src={audioUrl} type="audio/mpeg" />
                Seu navegador não suporta o elemento de áudio.
              </audio>
            )}
          </div>
        )}

        {/* Transcrição */}
        {call.transcription && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">📝 Transcrição</h2>
            <div className="bg-slate-50 p-4 rounded-md max-h-96 overflow-y-auto">
              <p className="text-slate-700 whitespace-pre-wrap">{call.transcription}</p>
            </div>
          </div>
        )}

        {/* Análise IA */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">🤖 Análise IA</h2>
            {!analysis && (
              <button
                onClick={handleAnalyze}
                disabled={loading || !call.transcription}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Analisando...' : 'Analisar com IA'}
              </button>
            )}
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {analysis ? (
            <div className="space-y-6">
              {/* Análise Completa */}
              <div>
                <h3 className="font-semibold text-slate-800 mb-2">📊 Análise Completa</h3>
                <div className="bg-slate-50 p-4 rounded-md max-h-96 overflow-y-auto">
                  <div className="text-slate-700 whitespace-pre-wrap">{analysis.analysis_content}</div>
                </div>
              </div>

              {/* Informações da Análise */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-md">
                <div className="text-center">
                  <div className="text-lg font-bold text-indigo-600">{analysis.call_count}</div>
                  <div className="text-xs text-slate-600">Ligações</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">{formatDuration(analysis.total_duration)}</div>
                  <div className="text-xs text-slate-600">Duração Total</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-purple-600">
                    {analysis.transcription_summary?.split(' ')[1] || 'N/A'}
                  </div>
                  <div className="text-xs text-slate-600">Resumo</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-orange-600">
                    {formatDate(analysis.created_at)}
                  </div>
                  <div className="text-xs text-slate-600">Data da Análise</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              {!call.transcription ? (
                <p>Transcrição não disponível para análise</p>
              ) : (
                <p>Clique em "Analisar com IA" para gerar a análise</p>
              )}
            </div>
          )}
        </div>

        {/* Comentários */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">💬 Comentários</h2>
          
          {/* Adicionar comentário */}
          <div className="mb-4 space-y-3">
            <div className="flex gap-2">
              <input
                type="number"
                value={commentTime}
                onChange={(e) => setCommentTime(Number(e.target.value))}
                placeholder="Tempo (segundos)"
                className="w-24 px-3 py-2 border border-slate-300 rounded-md"
                min="0"
              />
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Adicionar comentário..."
                className="flex-1 px-3 py-2 border border-slate-300 rounded-md"
                onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
              />
              <button
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                Adicionar
              </button>
            </div>
          </div>

          {/* Lista de comentários */}
          <div className="space-y-3">
            {comments.map((comment) => (
              <div key={comment.id} className="border border-slate-200 rounded-md p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-800">
                    {comment.author_name || 'Usuário'}
                  </span>
                  <span className="text-xs text-slate-500">
                    {comment.at_seconds > 0 ? `${Math.floor(comment.at_seconds / 60)}:${(comment.at_seconds % 60).toString().padStart(2, '0')}` : ''}
                  </span>
                </div>
                <p className="text-slate-700">{comment.text}</p>
                <span className="text-xs text-slate-500">
                  {new Date(comment.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
            ))}
            
            {comments.length === 0 && (
              <p className="text-center py-4 text-slate-500">
                Nenhum comentário ainda. Seja o primeiro a comentar!
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
