import React, { useEffect, useState, useRef } from 'react';
import { CALLS, DATE_FORMATTER, TIME_FORMATTER } from '../../../calls-dashboard/constants';
import { fetchCallDetails, listCallComments, addCallComment, listCallScores } from '../../../services/callsService';
import AiAssistant from '../../../calls-dashboard/components/AiAssistant';

// Mock data for testing while N8N connections are being prepared
const MOCK_SCORECARD_CRITERIA = [
  { id: 1, text: 'Abertura clara e profissional', category: 'Comunicação', weight: 15 },
  { id: 2, text: 'Exploração de necessidades do cliente', category: 'Vendas', weight: 25 },
  { id: 3, text: 'Apresentação da solução', category: 'Vendas', weight: 20 },
  { id: 4, text: 'Tratamento de objeções', category: 'Vendas', weight: 20 },
  { id: 5, text: 'Fechamento e próximos passos', category: 'Vendas', weight: 20 }
];

const MOCK_AI_ANALYSIS = {
  finalScore: 78,
  criteria: [
    { 
      id: 1, 
      score: 9, 
      justification: 'A SDR se apresentou de forma clara e profissional, estabelecendo credibilidade desde o início da conversa.' 
    },
    { 
      id: 2, 
      score: 7, 
      justification: 'Explorou algumas necessidades básicas, mas poderia aprofundar mais para identificar oportunidades específicas.' 
    },
    { 
      id: 3, 
      score: 8, 
      justification: 'Apresentou a solução de forma estruturada, destacando os benefícios principais para o cliente.' 
    },
    { 
      id: 4, 
      score: 6, 
      justification: 'Enfrentou algumas objeções, mas poderia ter sido mais proativo em antecipar e resolver preocupações.' 
    },
    { 
      id: 5, 
      score: 8, 
      justification: 'Definiu claramente os próximos passos e agendou follow-up, demonstrando organização.' 
    }
  ]
};

const MOCK_COMMENTS = [
  {
    id: 1,
    text: 'Excelente abertura! O Bruno se apresentou de forma muito profissional.',
    author_name: 'Maria Silva',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    at_seconds: 30
  },
  {
    id: 2,
    text: 'Poderia ter explorado melhor a necessidade do cliente na parte dos 2:30. Perdeu uma oportunidade.',
    author_name: 'João Santos',
    created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    at_seconds: 150
  },
  {
    id: 3,
    text: 'Bom fechamento! Agendou o follow-up de forma clara.',
    author_name: 'Ana Costa',
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    at_seconds: 420
  }
];

export default function CallAnalyzePage({ callId }: { callId: string }) {
  const local = CALLS.find((c) => c.id === callId);
  const [call, setCall] = useState<any>(local);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ finalScore: number } | null>(null);
  const [comments, setComments] = useState<any[]>(MOCK_COMMENTS);
  const [newComment, setNewComment] = useState('');
  const [ts, setTs] = useState('00:00');
  const [scores, setScores] = useState<any[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [transcriptSearch, setTranscriptSearch] = useState('');
  const [useMockData, setUseMockData] = useState(true); // Force mock data for now
  const commentsRef = useRef<HTMLDivElement | null>(null);

  const scrollToComments = () => {
    commentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    const run = async () => {
      try { 
        if (useMockData) {
          console.log('🔍 Usando dados mock para callId:', callId);
          setComments(MOCK_COMMENTS);
          return;
        }
        
        console.log('🔍 Buscando comentários para callId:', callId);
        const data = await listCallComments(callId); 
        console.log('💬 Comentários encontrados:', data);
        setComments(data); 
      } catch (error) {
        console.error('❌ Erro ao buscar comentários:', error);
        // Fallback to mock data
        setComments(MOCK_COMMENTS);
      }
    };
    run();
  }, [callId, useMockData]);

  useEffect(() => {
    const run = async () => {
      try { 
        if (useMockData) {
          console.log('🔍 Usando scores mock para callId:', callId);
          setScores(MOCK_AI_ANALYSIS.criteria.map(c => ({
            id: c.id,
            score: c.score,
            justification: c.justification,
            scorecard_criteria: MOCK_SCORECARD_CRITERIA.find(sc => sc.id === c.id)
          })));
          return;
        }
        
        const data = await listCallScores(callId); 
        setScores(data); 
      } catch (error) {
        console.error('❌ Erro ao buscar scores:', error);
        // Fallback to mock data
        setScores(MOCK_AI_ANALYSIS.criteria.map(c => ({
          id: c.id,
          score: c.score,
          justification: c.justification,
          scorecard_criteria: MOCK_SCORECARD_CRITERIA.find(sc => sc.id === c.id)
        })));
      }
    };
    run();
  }, [callId, result, useMockData]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const jumpToTime = (seconds: number) => {
    setCurrentTime(seconds);
    // TODO: Implement actual audio player seek
    console.log(`Jumping to ${formatTime(seconds)}`);
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600 bg-green-50';
    if (score >= 6) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const runMockAnalysis = async () => {
    setRunning(true);
    console.log('🤖 Iniciando análise mock...');
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setResult({ finalScore: MOCK_AI_ANALYSIS.finalScore });
    setScores(MOCK_AI_ANALYSIS.criteria.map(c => ({
      id: c.id,
      score: c.score,
      justification: c.justification,
      scorecard_criteria: MOCK_SCORECARD_CRITERIA.find(sc => sc.id === c.id)
    })));
    
    setRunning(false);
    console.log('✅ Análise mock concluída!');
  };

  const addMockComment = async (text: string, atSeconds: number = 0) => {
    const newCommentObj = {
      id: Date.now(),
      text,
      author_name: 'Você',
      created_at: new Date().toISOString(),
      at_seconds: atSeconds
    };
    
    setComments(prev => [newCommentObj, ...prev]);
    console.log('💬 Comentário mock adicionado:', newCommentObj);
  };

  if (!call) return <div className="p-6 text-slate-600">Chamada não encontrada.</div>;

  return (
    <div className="p-3 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            {call.company || 'Conversa'}
          </h2>
          <div className="text-sm text-slate-500 mt-1">
            {DATE_FORMATTER.format(new Date(call.date || call.created_at))} • {TIME_FORMATTER.format(new Date(call.date || call.created_at))}
            {call.duration && ` • ${formatTime(call.duration)}`}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={runMockAnalysis}
            disabled={running}
            className={`px-3 py-1.5 text-sm rounded-lg ${running ? 'bg-slate-200 text-slate-500' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
          >
            {running ? 'Analisando...' : '🔍 Analisar com IA'}
          </button>
          <button onClick={scrollToComments} className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50">
            💬 Comentários ({comments.length})
          </button>
          <a href="#/calls" className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1">
            ← Voltar
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-8 space-y-6">
          {/* Enhanced Audio Player */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-slate-700">Player de Áudio</div>
                <div className="text-xs text-slate-500">MP3 • {formatTime(duration)}</div>
              </div>
            </div>
            <div className="p-6">
              {/* Waveform Placeholder */}
              <div className="h-16 bg-gradient-to-r from-slate-100 to-slate-200 rounded-lg mb-4 flex items-center justify-center">
                <div className="text-slate-400 text-sm">Visualização da onda sonora</div>
              </div>
              
              {/* Progress Bar */}
              <div className="mb-4">
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div 
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-4">
                <button className="p-2 rounded-full hover:bg-slate-100 transition-colors">
                  <span className="text-lg">⏮</span>
                </button>
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-3 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                >
                  <span className="text-xl">{isPlaying ? '⏸' : '▶'}</span>
                </button>
                <button className="p-2 rounded-full hover:bg-slate-100 transition-colors">
                  <span className="text-lg">⏭</span>
                </button>
                <button className="p-2 rounded-full hover:bg-slate-100 transition-colors">
                  <span className="text-lg">🔊</span>
                </button>
              </div>
            </div>
          </div>

          {/* Notes Section */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
              <div className="text-sm font-medium text-slate-700">Notas Pessoais</div>
            </div>
            <div className="p-4">
              <textarea 
                className="w-full h-32 border border-slate-300 rounded-lg p-3 text-sm resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
                placeholder="Escreva suas observações sobre esta chamada..."
              />
            </div>
          </div>

        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          {/* AI Feedback Panel - Moved to sidebar like in the image */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
              <div className="text-sm font-medium text-slate-700">Feedback de IA</div>
            </div>
            <div className="p-4 space-y-3">
              {scores.length > 0 ? (
                scores.map((s) => (
                  <div key={s.id} className={`p-3 rounded-lg border ${
                    s.score >= 8 ? 'bg-green-50 border-green-200' :
                    s.score >= 6 ? 'bg-yellow-50 border-yellow-200' :
                    'bg-blue-50 border-blue-200'
                  }`}>
                    <div className="font-medium text-slate-800 text-sm mb-1">
                      {s.scorecard_criteria?.text || 'Critério'}
                    </div>
                    <div className="text-xs text-slate-600">
                      {s.justification || 'Análise em andamento...'}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <div className="text-slate-400 text-2xl mb-2">🤖</div>
                  <div className="text-sm text-slate-600">Execute a análise para ver o feedback da IA</div>
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Transcription */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-slate-700">Transcrição</div>
                <div className="text-xs text-slate-500">
                  {call.transcription ? call.transcription.split('\n').length : 0} linhas
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="relative mb-3">
                <input 
                  value={transcriptSearch}
                  onChange={(e) => setTranscriptSearch(e.target.value)}
                  placeholder="🔍 Pesquisar na transcrição..." 
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg pl-10 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
                />
                <span className="absolute left-3 top-2.5 text-slate-400">🔍</span>
              </div>
              <div className="space-y-2 max-h-96 overflow-auto">
                {call.transcription ? (
                  call.transcription.split('\n').map((t: string, i: number) => (
                    <div 
                      key={i} 
                      className={`text-sm text-slate-700 p-2 rounded ${
                        transcriptSearch && t.toLowerCase().includes(transcriptSearch.toLowerCase()) 
                          ? 'bg-yellow-50 border border-yellow-200' 
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      {t}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <div className="text-2xl mb-2">📝</div>
                    <div className="text-sm">Transcrição não disponível</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* AI Assistant */}
          <AiAssistant call={call} />
        </div>
      </div>

      {/* Comments Section - Now as a separate section below */}
      <div ref={commentsRef} className="bg-white border border-slate-200 rounded-lg shadow-sm relative">
        {/* Scroll indicator */}
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg">
          ↓ Role para ver comentários e análise ↓
        </div>
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-slate-700">Comentários e Feedback</div>
            <button 
              disabled={running} 
              onClick={runMockAnalysis}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                running 
                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
              }`}
            >
              {running ? 'Analisando...' : '🔍 Analisar com IA'}
            </button>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Comments List */}
            <div className="lg:col-span-2">
              <div className="text-sm font-medium text-slate-700 mb-3">Comentários da Equipe</div>
              <div className="space-y-4 max-h-96 overflow-auto">
                {comments.length > 0 ? (
                  comments.map((c) => (
                    <div key={c.id} className="bg-slate-50 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                            <span className="text-indigo-600 font-medium text-sm">
                              {c.author_name ? c.author_name.charAt(0).toUpperCase() : 'U'}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium text-slate-800">{c.author_name || 'Usuário'}</div>
                            <div className="text-xs text-slate-500">
                              {new Date(c.created_at).toLocaleString('pt-BR')}
                            </div>
                          </div>
                        </div>
                        {c.at_seconds > 0 && (
                          <button 
                            onClick={() => jumpToTime(c.at_seconds)}
                            className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-200 transition-colors"
                          >
                            🕐 {formatTime(c.at_seconds)}
                          </button>
                        )}
                      </div>
                      <div className="text-slate-700 text-sm leading-relaxed">{c.text}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="text-slate-400 text-4xl mb-3">💬</div>
                    <div className="text-slate-600 font-medium mb-1">Sem comentários ainda</div>
                    <div className="text-sm text-slate-500">
                      Seja o primeiro a adicionar um comentário
                    </div>
                  </div>
                )}
              </div>

              {/* Add Comment Form */}
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 mt-4">
                <div className="text-sm font-medium text-slate-700 mb-3">Adicionar Comentário</div>
                <div className="space-y-3">
                  <textarea 
                    value={newComment} 
                    onChange={(e) => setNewComment(e.target.value)} 
                    className="w-full h-24 text-sm border border-slate-300 rounded-lg p-3 resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
                    placeholder="Escreva seu comentário sobre esta parte da conversa..."
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-slate-600">Timestamp:</label>
                      <input 
                        value={ts} 
                        onChange={(e) => setTs(e.target.value)} 
                        placeholder="00:00" 
                        className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg w-20 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
                      />
                      <span className="text-xs text-slate-500">(opcional)</span>
                    </div>
                    <button 
                      onClick={async () => {
                        if (!newComment.trim()) return;
                        const sec = (() => { 
                          const m = ts.split(':').map(Number); 
                          return (m[0]||0)*60 + (m[1]||0); 
                        })();
                        
                        if (useMockData) {
                          await addMockComment(newComment.trim(), sec);
                        } else {
                          const created = await addCallComment(callId, newComment.trim(), sec);
                          setComments((prev) => [...prev, created]);
                        }
                        
                        setNewComment('');
                        setTs('00:00');
                      }} 
                      disabled={!newComment.trim()}
                      className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                    >
                      Adicionar Comentário
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Scorecard Results */}
            <div className="lg:col-span-1">
              <div className="text-sm font-medium text-slate-700 mb-3">Resultado da Análise</div>
              {result ? (
                <div className="bg-indigo-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-indigo-600 mb-1">{result.finalScore}</div>
                  <div className="text-sm text-indigo-700">Nota Final</div>
                </div>
              ) : (
                <div className="bg-slate-50 rounded-lg p-4 text-center">
                  <div className="text-slate-400 text-2xl mb-2">📊</div>
                  <div className="text-sm text-slate-600">Execute a análise para ver a nota</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


