import React, { useState, useEffect } from 'react';
import { DATE_FORMATTER, TIME_FORMATTER, secondsToHuman } from '../constants';
import { fetchCallDetail, convertToCallItem } from '../services/callsService';
import { CallItem } from '../types';
import AiAssistant from '../components/AiAssistant';
import { v4 as uuidv4 } from 'uuid';
import ScorecardAnalysis from '../components/ScorecardAnalysis';
import AudioStatusIndicator from '../components/AudioStatusIndicator';
import ParsedTranscription from '../components/ParsedTranscription';
import { formatCallType, getCallTypeColor } from '../utils/callTypeUtils';
import { getRealDuration, formatDurationDisplay } from '../utils/durationUtils';
import { getCallAnalysisFromDatabase, processCallAnalysis } from '../services/callAnalysisBackendService';
import { supabase } from '../../services/supabaseClient';
import { getCurrentUserDisplayName } from '../../services/supabaseService';
import CallAIAssistantChat from '../../components/Calls/CallAIAssistantChat';
// import DiarizedTranscription from '../../components/Calls/DiarizedTranscription';

// Funções auxiliares para dados do usuário
const getAuthorDisplayName = (authorId: string | null | undefined): string => {
  if (!authorId) return 'Usuário Anônimo'; // Fallback para null/undefined
  
  // Buscar do localStorage primeiro (dados reais do usuário)
  const userName = localStorage.getItem('ggv_user_name') || 'Usuário';
  
  if (authorId === localStorage.getItem('ggv_user_id')) {
    return userName;
  }
  
  // Fallbacks para outros usuários
  if (authorId === '00000000-0000-0000-0000-000000000001') return 'Sistema';
  return 'Usuário';
};

const getAuthorEmail = (authorId: string | null | undefined): string => {
  if (!authorId) return ''; // Fallback para null/undefined
  
  // Buscar do localStorage primeiro (dados reais do usuário)
  const userEmail = localStorage.getItem('ggv_user_email') || '';
  
  if (authorId === localStorage.getItem('ggv_user_id')) {
    return userEmail;
  }
  
  if (authorId === '00000000-0000-0000-0000-000000000001') return 'sistema@grupoggv.com';
  return '';
};

const getAuthorInitials = (name: string): string => {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

const getAuthorColor = (authorId: string | null | undefined): string => {
  if (!authorId) return 'bg-gray-500'; // Fallback para null/undefined
  if (authorId === '00000000-0000-0000-0000-000000000001') return 'bg-indigo-500';
  
  // Gerar cor baseada no hash do ID
  const hash = authorId.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-yellow-500'];
  return colors[Math.abs(hash) % colors.length];
};

// Função para verificar se URL de áudio é válida
function hasValidAudio(recording_url?: string): boolean {
  if (!recording_url) return false;
  
  return recording_url.includes('ggv-chatwoot.nyc3.cdn.digitaloceanspaces.com') ||
         recording_url.includes('listener.api4com.com') ||
         recording_url.includes('.mp3') ||
         recording_url.includes('.wav');
}

interface CallDetailPageProps {
  callId: string;
}

export default function CallDetailPage({ callId }: CallDetailPageProps) {
  const [call, setCall] = useState<CallItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiNote, setAiNote] = useState<string>('N/A');
  const [aiScore, setAiScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [feedbacks, setFeedbacks] = useState<Array<{
    id: string,
    content: string, 
    created_at: string,
    author_id: string,
    author_name?: string,
    author_email?: string
  }>>([]);
  const [savingFb, setSavingFb] = useState(false);
  const [fbError, setFbError] = useState<string | null>(null);
  const [editingFeedback, setEditingFeedback] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    const loadCallDetail = async () => {
      if (!callId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const callDetail = await fetchCallDetail(callId);
        if (callDetail) {
          const callItem = convertToCallItem(callDetail);
          setCall(callItem);
          
          // Carregar análise IA existente (sem processamento automático)
          await loadExistingAIAnalysis(callItem);
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

  // Carregar feedbacks
  useEffect(() => {
    const loadFeedbacks = async () => {
      if (!callId) return;
      
      try {
        console.log('🔄 Carregando feedbacks para chamada:', callId);
        
        // Query ultra simples para evitar problemas de RLS
        const { data, error } = await supabase
          .rpc('get_call_feedbacks', { p_call_id: callId });
        
        console.log('📥 Resposta feedbacks:', { data, error });
        
        if (error) {
          console.error('❌ Erro ao carregar feedbacks:', error);
        } else if (data) {
          console.log('✅ Feedbacks carregados:', data.length);
          
          // Mapear dados com informações do usuário
          const mappedFeedbacks = data.map(fb => ({
            ...fb,
            author_name: getAuthorDisplayName(fb.author_id),
            author_email: getAuthorEmail(fb.author_id)
          }));
          setFeedbacks(mappedFeedbacks as any);
        }
      } catch (err) {
        console.error('❌ Erro geral ao carregar feedbacks:', err);
      }
    };
    loadFeedbacks();
  }, [callId]);

  const submitFeedback = async () => {
    if (!feedback.trim() || !call) return;
    setSavingFb(true);
    setFbError(null);
    try {
      console.log('🔄 Salvando feedback para chamada:', call.id);
      
      // Usar dados reais do usuário autenticado
      const { data: { session } } = await supabase.auth.getSession();
      const realUserId = session?.user?.id;
      const userEmail = session?.user?.email || localStorage.getItem('ggv_user_email') || '';
      const userName = session?.user?.user_metadata?.full_name || localStorage.getItem('ggv_user_name') || 'Usuário';
      
      // Usar o ID real ou fallback para UUID administrativo
      const authorId = realUserId || '00000000-0000-0000-0000-000000000001';
      
      console.log('🔐 Auth check (dados reais):', {
        realUserId,
        userEmail,
        userName,
        authorId,
        callId: call.id
      });
      
      // Salvar dados do usuário no localStorage para uso posterior
      if (userEmail) localStorage.setItem('ggv_user_email', userEmail);
      if (userName) localStorage.setItem('ggv_user_name', userName);
      if (realUserId) localStorage.setItem('ggv_user_id', realUserId);
      
      // Vincular feedback ao SDR dono da chamada, se disponível
      const sdrId = (call as any).sdr_id && typeof (call as any).sdr_id === 'string' && (call as any).sdr_id.length === 36
        ? (call as any).sdr_id
        : null;
      
      console.log('📋 Dados do feedback:', {
        call_id: call.id,
        sdr_id: sdrId,
        author_id: authorId,
        content: feedback.trim()
      });
      
      const insertPayload = {
        call_id: call.id,
        sdr_id: sdrId,
        author_id: authorId,
        content: feedback.trim()
      };
      
      console.log('📤 Payload de inserção:', insertPayload);
      
        const { data, error } = await supabase
        .from('call_feedbacks')
        .insert(insertPayload)
        .select('id, content, created_at, author_id')
        .single();
        
      console.log('📥 Resposta do Supabase:', { data, error });
        
      if (error) {
        console.error('❌ Erro detalhado ao salvar feedback:', {
          error,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        setFbError(`Erro: ${error.message}`);
      } else if (data) {
        console.log('✅ Feedback salvo com sucesso no banco:', data);
        
        // Adicionar dados do usuário ao feedback
        const enrichedFeedback = {
          ...data,
          author_name: userName,
          author_email: userEmail
        };
        
        setFeedback('');
        setFeedbacks(prev => [enrichedFeedback as any, ...prev]);
        
        // Verificar se realmente salvou (query de confirmação)
        const { data: verification } = await supabase
          .from('call_feedbacks')
          .select('id, content')
          .eq('id', data.id)
          .single();
          
        console.log('🔍 Verificação de persistência:', verification);
      }
    } catch (err: any) {
      console.error('❌ Erro geral ao salvar feedback:', err);
      setFbError(`Erro: ${err.message || 'Falha desconhecida'}`);
    } finally {
      setSavingFb(false);
    }
  };

  const loadExistingAIAnalysis = async (callItem: CallItem) => {
    try {
      console.log('🔍 Carregando análise IA persistida para:', callItem.id);
      
      // SEMPRE tentar carregar análise do banco (PERSISTÊNCIA GARANTIDA)
      const existingAnalysis = await getCallAnalysisFromDatabase(callItem.id);
      
      if (existingAnalysis) {
        // Análise encontrada no banco - usar dados persistidos
        if (existingAnalysis.final_grade !== null && existingAnalysis.final_grade !== undefined) {
          setAiNote(existingAnalysis.final_grade.toFixed(1));
          setAiScore(existingAnalysis.final_grade);
        } else {
          setAiNote('Não analisado');
          setAiScore(null);
        }
        console.log('✅ Análise IA carregada do banco (PERSISTIDA):', {
          final_grade: existingAnalysis.final_grade,
          scorecard: existingAnalysis.scorecard_used?.name,
          created_at: existingAnalysis.created_at
        });
        
        // Garantir que o score está atualizado na tabela calls
        await updateCallScore(callItem.id, existingAnalysis.final_grade);
      } else {
        // Nenhuma análise persistida encontrada
        console.log('ℹ️ Nenhuma análise persistida encontrada para:', callItem.id);
        setAiNote('N/A');
        setAiScore(null);
      }
      
    } catch (error) {
      console.error('❌ Erro ao carregar análise IA:', error);
      setAiNote('N/A');
      setAiScore(null);
    }
  };

  const deleteFeedback = async (feedbackId: string) => {
    if (!confirm('Tem certeza que deseja excluir este feedback?')) return;
    
    try {
      const { error } = await supabase
        .from('call_feedbacks')
        .delete()
        .eq('id', feedbackId);
        
      if (error) {
        console.error('❌ Erro ao excluir feedback:', error);
        setFbError(`Erro ao excluir: ${error.message}`);
      } else {
        console.log('✅ Feedback excluído com sucesso');
        setFeedbacks(prev => prev.filter(fb => fb.id !== feedbackId));
      }
    } catch (err: any) {
      console.error('❌ Erro geral ao excluir feedback:', err);
      setFbError(`Erro: ${err.message}`);
    }
  };

  const startEditFeedback = (feedbackId: string, currentContent: string) => {
    setEditingFeedback(feedbackId);
    setEditContent(currentContent);
  };

  const cancelEdit = () => {
    setEditingFeedback(null);
    setEditContent('');
  };

  const saveEditFeedback = async (feedbackId: string) => {
    if (!editContent.trim()) return;
    
    try {
      const { data, error } = await supabase
        .from('call_feedbacks')
        .update({ content: editContent.trim() })
        .eq('id', feedbackId)
        .select('id, content, created_at, author_id')
        .single();
        
      if (error) {
        console.error('❌ Erro ao editar feedback:', error);
        setFbError(`Erro ao editar: ${error.message}`);
      } else {
        console.log('✅ Feedback editado com sucesso');
        setFeedbacks(prev => prev.map(fb => 
          fb.id === feedbackId 
            ? { ...fb, content: editContent.trim() }
            : fb
        ));
        setEditingFeedback(null);
        setEditContent('');
      }
    } catch (err: any) {
      console.error('❌ Erro geral ao editar feedback:', err);
      setFbError(`Erro: ${err.message}`);
    }
  };

  const updateCallScore = async (callId: string, score: number | null) => {
    try {
      // Só atualizar se o score não for null
      if (score !== null && score !== undefined) {
        const { error } = await supabase
          .from('calls')
          .update({ 
            scorecard: { final_score: score }, // Escala 0-10
            ai_status: 'completed'
          })
          .eq('id', callId);
          
        if (error) {
          console.warn('⚠️ Erro ao atualizar score na tabela calls:', error);
        }
      } else {
        // Para scores null, marcar como erro na análise
        const { error } = await supabase
          .from('calls')
          .update({ 
            ai_status: 'failed'
          })
          .eq('id', callId);
          
        if (error) {
          console.warn('⚠️ Erro ao atualizar status da análise:', error);
        }
      }
    } catch (error) {
      console.warn('⚠️ Erro ao atualizar score:', error);
    }
  };

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
          {call.call_type && (
            <p className="text-sm text-slate-500">
              Etapa: <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getCallTypeColor(call.call_type)}`}>
                {formatCallType(call.call_type)}
              </span>
            </p>
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
                {/* E-mail do SDR removido por solicitação */}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-slate-500">Duração</div>
                <div className="font-semibold">
                  {formatDurationDisplay(call)}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Status</div>
                <div className="font-semibold">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    call.status_voip_friendly === 'Atendida' ? 'bg-green-100 text-green-800' :
                    call.status_voip_friendly === 'Não atendida' ? 'bg-red-100 text-red-800' :
                    call.status_voip_friendly === 'Cancelada pela SDR' ? 'bg-yellow-100 text-yellow-800' :
                    call.status_voip_friendly === 'Numero mudou' ? 'bg-orange-100 text-orange-800' :
                    'bg-slate-100 text-slate-800'
                  }`}>
                    {call.status_voip_friendly || call.status}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-slate-500">Nota</div>
                <div className="font-semibold">{aiNote}</div>
              </div>
              <div>
                <div className="text-slate-500">Áudio</div>
                <div className="font-semibold">{hasValidAudio(call.recording_url) ? '✅' : '❌'}</div>
              </div>
            </div>
          </div>

          {/* Player de Áudio */}
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="mb-3 font-medium text-slate-800">Áudio da Chamada</div>
            {hasValidAudio(call.recording_url) ? (
              <div className="space-y-2">
                <audio controls className="w-full" preload="metadata">
                  <source src={call.recording_url} type="audio/mpeg" />
                  <source src={call.recording_url} type="audio/wav" />
                  <source src={call.recording_url} type="audio/ogg" />
                  Seu navegador não suporta o elemento de áudio.
                </audio>
                <div className="text-xs text-slate-500">
                  URL: <a href={call.recording_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                    {call.recording_url && call.recording_url.length > 60 ? call.recording_url.substring(0, 60) + '...' : call.recording_url}
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

          {/* Feedback da Chamada (logo abaixo do áudio) */}
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="mb-2 font-medium text-slate-800">💬 Feedback</div>
            <textarea
              className="w-full border border-slate-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={3}
              placeholder="Escreva um feedback objetivo para o SDR..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
            <div className="flex items-center justify-between mt-2">
              {fbError && <div className="text-xs text-red-600">{fbError}</div>}
              <div className="flex-1"></div>
              <button
                onClick={submitFeedback}
                disabled={savingFb || !feedback.trim()}
                className="px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {savingFb ? 'Salvando...' : 'Salvar feedback'}
              </button>
            </div>

            {feedbacks.length > 0 && (
              <div className="mt-4 space-y-3">
                <div className="text-sm font-medium text-slate-700 border-b border-slate-200 pb-2">
                  Feedbacks ({feedbacks.length})
                </div>
                {feedbacks.map(fb => {
                  const authorName = getAuthorDisplayName(fb.author_id);
                  const authorEmail = getAuthorEmail(fb.author_id);
                  const initials = getAuthorInitials(authorName);
                  const colorClass = getAuthorColor(fb.author_id);
                  
                  return (
                    <div key={fb.id} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className={`w-8 h-8 rounded-full ${colorClass} flex items-center justify-center flex-shrink-0`}>
                          <span className="text-white text-xs font-medium">{initials}</span>
                        </div>
                        
                        {/* Conteúdo */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-800">{authorName}</span>
                              {authorEmail && (
                                <span className="text-xs text-slate-500">{authorEmail}</span>
                              )}
                              <span className="text-xs text-slate-400">
                                {new Date(fb.created_at).toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                            
                            {/* Botões de ação */}
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => startEditFeedback(fb.id, fb.content)}
                                className="text-slate-400 hover:text-blue-600 p-1 rounded transition-colors"
                                title="Editar feedback"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => deleteFeedback(fb.id)}
                                className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors"
                                title="Excluir feedback"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                          
                          {/* Conteúdo editável ou texto */}
                          {editingFeedback === fb.id ? (
                            <div className="space-y-2">
                              <textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="w-full border border-slate-300 rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows={3}
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => saveEditFeedback(fb.id)}
                                  disabled={!editContent.trim()}
                                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                                >
                                  Salvar
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="px-3 py-1 border border-slate-300 text-slate-600 rounded text-sm hover:bg-slate-50"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                              {fb.content}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Transcrição */}
          {call.transcription && (
            <div className="bg-white rounded-lg border border-slate-200 p-4 max-h-[70vh] overflow-y-auto">
              <div className="mb-3 font-medium text-slate-800">📝 Transcrição da Chamada</div>
              <ParsedTranscription 
                transcription={call.transcription || ''} 
                sdrName={call.sdr.name || 'SDR'} 
                clientName={call.person_name || 'Cliente'} 
              />
            </div>
          )}
        </div>

        <div className="space-y-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
          <AudioStatusIndicator call={call} />
          <ScorecardAnalysis 
            call={call} 
            onAnalysisComplete={(analysis) => {
              if (analysis.final_grade !== null && analysis.final_grade !== undefined) {
                setAiNote(analysis.final_grade.toFixed(1));
                setAiScore(analysis.final_grade);
                updateCallScore(call.id, analysis.final_grade);
              } else {
                setAiNote('Não analisado');
                setAiScore(null);
              }
            }}
          />
          
          
          <AiAssistant call={call} />
        </div>
      </div>

      {/* Chat flutuante do assistente IA */}
      {(call.deal_id || call.dealCode) && (
        <CallAIAssistantChat 
          dealId={call.deal_id || call.dealCode} 
          dealCode={call.dealCode || call.deal_id || 'N/A'} 
        />
      )}
    </div>
  );
}


