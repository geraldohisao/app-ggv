// components/Calls/CallAIAssistantChat.tsx
// Chat flutuante para assistente IA de análise de ligações

import React, { useState, useRef, useEffect } from 'react';
import { getAIPersonas } from '../../services/supabaseService';
import { getAIAssistantResponseStream } from '../../services/aiRouterClient';
import { getDealTranscriptions } from '../../services/callAnalysisService';
import { AIPersona, AIMessage } from '../../types';

interface CallAIAssistantChatProps {
  dealId: string;
  dealCode: string;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
}

export default function CallAIAssistantChat({ dealId, dealCode }: CallAIAssistantChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [sdrPersona, setSdrPersona] = useState<AIPersona | null>(null);
  const [transcriptions, setTranscriptions] = useState<any[]>([]);
  const [chatHistory, setChatHistory] = useState<AIMessage[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll automático para a última mensagem
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focar no input quando o chat abrir
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Carregar dados iniciais quando o chat abrir
  useEffect(() => {
    if (isOpen && dealId) {
      loadInitialData();
    }
  }, [isOpen, dealId]);

  // Função para construir contexto de transcrições
  const buildTranscriptionContext = (transcriptions: any[]): string => {
    if (!transcriptions || transcriptions.length === 0) {
      return `🎯 CONTEXTO: Nenhuma transcrição disponível para este deal.

Como assistente especializado em análise de vendas, posso ajudar você com:
- Dicas gerais de prospecção e qualificação
- Estratégias de abordagem inicial  
- Técnicas de identificação BANT
- Melhores práticas para SDRs
- Análise de oportunidades de melhoria

Faça perguntas sobre vendas e prospecção que posso responder com base na minha experiência.`;
    }

    const context = `
🎯 CONTEXTO DE ANÁLISE - Deal ${dealCode}:

${transcriptions.map((call, index) => `
[#src:call_${index + 1}]
📞 **LIGAÇÃO ${index + 1} - ${new Date(call.created_at).toLocaleDateString('pt-BR')}**
- **ID**: ${call.provider_call_id}
- **Duração**: ${Math.round(call.duration / 60)} minutos
- **Agente**: ${call.agent_id}
- **Status**: ${call.call_status}
- **Tipo**: ${call.call_type || 'N/A'}

💬 **TRANSCRIÇÃO COMPLETA:**
${call.transcription || 'Transcrição não disponível'}

---`).join('\n\n')}

📊 **INSTRUÇÕES PARA ANÁLISE DE VENDAS:**
- Analise as transcrições acima para identificar pontos fortes e oportunidades
- Avalie a qualificação BANT (Budget, Authority, Need, Timeline)
- Identifique sinais de interesse do cliente
- Analise a abordagem do vendedor e sugira melhorias
- Cite trechos específicos das conversas
- Sugira próximos passos baseados no que foi discutido
- Foque em resultados práticos e acionáveis

Use APENAS as transcrições fornecidas como base para suas respostas.
`;

    return context;
  };

  // Carregar dados iniciais
  const loadInitialData = async () => {
    try {
      console.log('🤖 CHAT - Carregando dados iniciais para deal:', dealId);
      
      // Buscar persona SDR e transcrições em paralelo
      const [personas, transcriptionsData] = await Promise.all([
        getAIPersonas(),
        getDealTranscriptions(dealId)
      ]);

      // Encontrar persona SDR
      const sdr = personas.find(p => p.id === 'SDR');
      if (sdr) {
        setSdrPersona(sdr);
        console.log('✅ CHAT - Persona SDR carregada:', sdr.name);
      } else {
        console.warn('⚠️ CHAT - Persona SDR não encontrada');
      }

      // Salvar transcrições
      console.log('📊 CHAT - Debug transcrições:', {
        dealId,
        transcriptionsFound: transcriptionsData.length,
        transcriptions: transcriptionsData.map(t => ({
          id: t.id,
          deal_id: t.deal_id,
          hasTranscription: !!(t.transcription && t.transcription.trim()),
          transcriptionLength: t.transcription?.length || 0
        }))
      });
      
      setTranscriptions(transcriptionsData);
      console.log('✅ CHAT - Transcrições carregadas:', transcriptionsData.length);
      
    } catch (error) {
      console.error('❌ CHAT - Erro ao carregar dados:', error);
    }
  };

  // Mensagem de boas-vindas focada em análise de vendas
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const transcriptionCount = transcriptions.length;
      let welcomeContent = `🎯 **Assistente de Análise de Vendas**\n\nOlá! Sou seu especialista em análise de ligações de vendas.\n\n📊 **Deal ${dealCode}:**\n• ${transcriptionCount} ligação(ões) analisada(s)\n• Pronto para análise detalhada\n\n`;
      
      if (transcriptionCount === 0) {
        welcomeContent += `⚠️ **Sem transcrições disponíveis**\n\nPosso ajudar com estratégias gerais de vendas:\n• 🎯 Técnicas de qualificação BANT\n• 📞 Estratégias de abordagem inicial\n• 💡 Melhores práticas para SDRs\n• 🔍 Análise de oportunidades\n\n`;
      } else {
        welcomeContent += `🔍 **Análise disponível:**\n• 📈 Avaliação da qualificação BANT\n• 💬 Análise da abordagem do vendedor\n• 🎯 Identificação de sinais de interesse\n• 📋 Sugestões de próximos passos\n• 🔧 Melhorias específicas baseadas nas conversas\n\n`;
      }
      
      welcomeContent += `**Como posso ajudar na sua análise de vendas hoje?**`;
      
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        type: 'assistant',
        content: welcomeContent,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, dealCode, dealId, transcriptions.length]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || !sdrPersona) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    // Adicionar mensagem do usuário
    setMessages(prev => [...prev, userMessage]);
    
    // Adicionar ao histórico do chat
    const newUserMessage: AIMessage = { role: 'user', content: inputValue.trim() };
    setChatHistory(prev => [...prev, newUserMessage]);
    
    setInputValue('');
    setIsLoading(true);

    try {
      console.log('🤖 CHAT - Enviando mensagem para IA...');
      
      // Construir contexto de transcrições
      const knowledgeBase = buildTranscriptionContext(transcriptions);
      console.log('📝 CHAT - Contexto de transcrições:', knowledgeBase.substring(0, 200) + '...');
      
      // Tentar AI Router primeiro, com fallback para Gemini direto
      console.log('🤖 CHAT - Tentando AI Router primeiro...');
      
      let stream;
      try {
        stream = getAIAssistantResponseStream(
          inputValue.trim(),
          sdrPersona,
          chatHistory,
          knowledgeBase,
          { requestId: `chat_${dealId}_${Date.now()}` }
        );
      } catch (error) {
        console.warn('⚠️ CHAT - AI Router falhou, usando Gemini direto:', error);
        // Fallback para Gemini direto
        const { getAIAssistantResponseStream: geminiStream } = await import('../../services/geminiService');
        stream = geminiStream(
          inputValue.trim(),
          sdrPersona,
          chatHistory,
          knowledgeBase,
          { requestId: `chat_${dealId}_${Date.now()}` }
        );
      }

      let fullResponse = '';
      let isFirstCharacter = true;
      let buffer = '';
      let animationFrameRef: number | null = null;

      const updateUI = () => {
        fullResponse += buffer;
        buffer = '';

        setMessages(prev => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage && lastMessage.isTyping) {
            return [...prev.slice(0, -1), { ...lastMessage, content: fullResponse, isTyping: false }];
          }
          return prev;
        });

        animationFrameRef = null;
      };

      // Adicionar mensagem de "digitando" primeiro
      const typingMessage: ChatMessage = {
        id: `typing_${Date.now()}`,
        type: 'assistant',
        content: '',
        timestamp: new Date(),
        isTyping: true
      };
      setMessages(prev => [...prev, typingMessage]);

      try {
        for await (const char of stream) {
          if (isFirstCharacter) {
            setIsLoading(false);
            isFirstCharacter = false;
          }
          buffer += char;
          if (!animationFrameRef) {
            animationFrameRef = requestAnimationFrame(updateUI);
          }
        }

        if (animationFrameRef) {
          cancelAnimationFrame(animationFrameRef);
        }
        updateUI(); // Final update
      } catch (streamError) {
        console.error('❌ CHAT - Erro no stream, tentando fallback:', streamError);
        
        // Fallback: usar Gemini direto
        try {
          const { getAIAssistantResponseStream: geminiStream } = await import('../../services/geminiService');
          const fallbackStream = geminiStream(
            inputValue.trim(),
            sdrPersona,
            chatHistory,
            knowledgeBase,
            { requestId: `chat_fallback_${dealId}_${Date.now()}` }
          );
          
          fullResponse = '';
          buffer = '';
          isFirstCharacter = true;
          animationFrameRef = null;
          
          for await (const char of fallbackStream) {
            if (isFirstCharacter) {
              setIsLoading(false);
              isFirstCharacter = false;
            }
            buffer += char;
            if (!animationFrameRef) {
              animationFrameRef = requestAnimationFrame(updateUI);
            }
          }
          
          if (animationFrameRef) {
            cancelAnimationFrame(animationFrameRef);
          }
          updateUI(); // Final update
        } catch (fallbackError) {
          console.error('❌ CHAT - Fallback também falhou:', fallbackError);
          throw fallbackError;
        }
      }

      // Verificar se temos uma resposta válida
      if (!fullResponse || fullResponse.trim() === '') {
        console.warn('⚠️ CHAT - Resposta vazia, adicionando mensagem de erro');
        fullResponse = 'Desculpe, não consegui processar sua solicitação. Tente novamente.';
      }

      // Adicionar resposta ao histórico
      const newAssistantMessage: AIMessage = { role: 'assistant', content: fullResponse };
      setChatHistory(prev => [...prev, newAssistantMessage]);
      
      console.log('✅ CHAT - Resposta da IA processada');
      
    } catch (error) {
      console.error('❌ CHAT - Erro na IA:', error);
      
      // Remover mensagem de "digitando" se existir
      setMessages(prev => prev.filter(msg => !msg.isTyping));
      
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        type: 'assistant',
        content: `Desculpe, ocorreu um erro ao processar sua mensagem: ${error instanceof Error ? error.message : 'Erro desconhecido'}\n\nPor favor, tente novamente.`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setIsMinimized(false);
    }
  };

  const minimizeChat = () => {
    setIsMinimized(true);
  };

  const expandChat = () => {
    setIsMinimized(false);
  };

  return (
    <>
      {/* Botão flutuante do chat */}
      <button
        onClick={toggleChat}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center ${
          isOpen 
            ? 'bg-red-500 hover:bg-red-600 transform rotate-45' 
            : 'bg-blue-600 hover:bg-blue-700 transform hover:scale-110'
        }`}
        title={isOpen ? 'Fechar chat' : 'Abrir assistente IA'}
      >
        {isOpen ? (
          <span className="text-white text-xl font-bold">×</span>
        ) : (
          <span className="text-white text-2xl">🤖</span>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className={`fixed bottom-24 right-6 z-40 transition-all duration-300 ${
          isMinimized ? 'w-80 h-16' : 'w-96 h-[500px]'
        }`}>
          <div className="bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col h-full">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-lg flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <span className="text-lg">🤖</span>
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Assistente IA</h3>
                  <p className="text-xs text-blue-100">Deal: {dealCode}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={isMinimized ? expandChat : minimizeChat}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition-colors"
                  title={isMinimized ? 'Expandir' : 'Minimizar'}
                >
                  <span className="text-sm">
                    {isMinimized ? '⤢' : '⤡'}
                  </span>
                </button>
                <button
                  onClick={toggleChat}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition-colors"
                  title="Fechar"
                >
                  <span className="text-sm">×</span>
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-2 ${
                          message.type === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-800 border border-gray-200'
                        }`}
                      >
                        <div className="text-sm whitespace-pre-wrap">
                          {message.content}
                        </div>
                        <div
                          className={`text-xs mt-1 ${
                            message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                          }`}
                        >
                          {message.timestamp.toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Loading indicator */}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white text-gray-800 border border-gray-200 rounded-lg px-3 py-2">
                        <div className="flex items-center space-x-2">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                          <span className="text-xs text-gray-500">Assistente está digitando...</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-gray-200 bg-white rounded-b-lg">
                  <div className="flex space-x-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Digite sua pergunta sobre as ligações..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      disabled={isLoading}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!inputValue.trim() || isLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                    >
                      Enviar
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Pressione Enter para enviar, Shift+Enter para nova linha
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
