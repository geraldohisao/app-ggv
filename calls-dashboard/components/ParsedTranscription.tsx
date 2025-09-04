import React, { useMemo } from 'react';

interface ParsedSegment {
  speaker: string;
  text: string;
  timestamp?: string;
}

interface ParsedTranscriptionProps {
  transcription: string;
  sdrName?: string;
  clientName?: string;
}

export default function ParsedTranscription({ 
  transcription, 
  sdrName = 'SDR', 
  clientName = 'Cliente' 
}: ParsedTranscriptionProps) {
  
  // Utilitários precisam estar definidos antes do parser (evita TDZ)
  // Normalizar nome do falante
  const normalizeSpeakerName = (rawName: string, sdrNameParam: string, clientNameParam: string): string => {
    const normalized = rawName.toLowerCase().trim();
    // Verificar se é SDR
    if (normalized.includes(sdrNameParam.toLowerCase()) || 
        normalized.includes('sdr') || 
        normalized.includes('vendedor') ||
        normalized.includes('atendente') ||
        normalized.includes('consultor')) {
      return sdrNameParam;
    }
    // Verificar se é cliente
    if (normalized.includes(clientNameParam.toLowerCase()) || 
        normalized.includes('cliente') || 
        normalized.includes('prospect') ||
        normalized.includes('lead')) {
      return clientNameParam;
    }
    // Padrões comuns
    if (normalized.match(/^(speaker|falante)\s*[12]$/)) {
      return normalized.includes('1') ? sdrNameParam : clientNameParam;
    }
    // Retornar nome original se não conseguir identificar
    return rawName;
  };

  // Identificar falante por contexto (fallback)
  const identifySpeakerByContext = (text: string, sdrNameParam: string, clientNameParam: string): string => {
    const lowerText = text.toLowerCase();
    const sdrKeywords = [
      'meu nome é', 'sou da', 'trabalho na', 'empresa', 'ligação', 'contato',
      'gostaria de', 'poderia me', 'agenda', 'reunião', 'proposta'
    ];
    const clientKeywords = [
      'aqui é', 'sim', 'não', 'tudo bem', 'oi', 'alô', 'entendi',
      'nossa empresa', 'trabalhamos com', 'nosso negócio'
    ];
    const sdrScore = sdrKeywords.reduce((score, keyword) => 
      score + (lowerText.includes(keyword) ? 1 : 0), 0);
    const clientScore = clientKeywords.reduce((score, keyword) => 
      score + (lowerText.includes(keyword) ? 1 : 0), 0);
    if (sdrScore > clientScore) return sdrNameParam;
    if (clientScore > sdrScore) return clientNameParam;
    return 'Não identificado';
  };

  const parsedSegments = useMemo(() => {
    if (!transcription) return [];
    
    const segments: ParsedSegment[] = [];
    
    // Padrões comuns de separação de falantes
    const patterns = [
      // Padrão: "Nome: texto 00:12" (timestamp ao final)
      /^([^:]+):\s*(.+?)\s*(\b\d{2}:\d{2}(?::\d{2})?\b)?$/gm,
      // Padrão: "[Nome] texto"
      /^\[([^\]]+)\]\s*(.+)$/gm,
      // Padrão: "Nome - texto"
      /^([^-]+)-\s*(.+)$/gm,
      // Padrão: "Speaker 1: texto"
      /^(Speaker\s+\d+|Falante\s+\d+):\s*(.+)$/gm
    ];
    
    let foundPattern = false;
    
    // Tentar cada padrão
    for (const pattern of patterns) {
      const matches = Array.from(transcription.matchAll(pattern));
      
      if (matches.length > 0) {
        foundPattern = true;
        
        for (const match of matches) {
          const speakerName = match[1].trim();
          const text = match[2].trim();
          const ts = (match[3] || '').trim();
          
          if (text.length > 5) { // Ignorar segmentos muito curtos
            segments.push({
              speaker: normalizeSpeakerName(speakerName, sdrName, clientName),
              text: text,
              timestamp: ts || undefined
            });
          }
        }
        break; // Usar apenas o primeiro padrão que funcionar
      }
    }
    
    // Se não encontrou padrão, tentar separação por linhas
    if (!foundPattern) {
      const lines = transcription.split('\n').filter(line => line.trim().length > 10);
      
      for (const line of lines) {
        // Tentar identificar falante por contexto
        const speaker = identifySpeakerByContext(line.trim(), sdrName, clientName);
        // Tentar extrair timestamp ao final ou início
        const tsMatch = line.match(/\b(\d{2}:\d{2}(?::\d{2})?)\b/);
        segments.push({
          speaker: speaker,
          text: line.trim(),
          timestamp: tsMatch ? tsMatch[1] : undefined
        });
      }
    }
    
    return segments;
  }, [transcription, sdrName, clientName]);

  // Calcular estatísticas
  const stats = useMemo(() => {
    const sdrSegments = parsedSegments.filter(s => s.speaker === sdrName);
    const clientSegments = parsedSegments.filter(s => s.speaker === clientName);
    const unknownSegments = parsedSegments.filter(s => 
      s.speaker !== sdrName && s.speaker !== clientName
    );
    
    const sdrTextLength = sdrSegments.reduce((acc, s) => acc + s.text.length, 0);
    const clientTextLength = clientSegments.reduce((acc, s) => acc + s.text.length, 0);
    const totalTextLength = sdrTextLength + clientTextLength;
    
    return {
      totalSegments: parsedSegments.length,
      sdrSegments: sdrSegments.length,
      clientSegments: clientSegments.length,
      unknownSegments: unknownSegments.length,
      sdrPercentage: totalTextLength > 0 ? Math.round((sdrTextLength / totalTextLength) * 100) : 0,
      clientPercentage: totalTextLength > 0 ? Math.round((clientTextLength / totalTextLength) * 100) : 0
    };
  }, [parsedSegments, sdrName, clientName]);

  const getSpeakerColor = (speaker: string) => {
    if (speaker === sdrName) return 'bg-blue-50 border-l-4 border-blue-400';
    if (speaker === clientName) return 'bg-green-50 border-l-4 border-green-400';
    return 'bg-gray-50 border-l-4 border-gray-400';
  };

  const getSpeakerIcon = (speaker: string) => {
    if (speaker === sdrName) return '👩‍💼';
    if (speaker === clientName) return '👤';
    return '❓';
  };

  const getSpeakerBadgeColor = (speaker: string) => {
    if (speaker === sdrName) return 'bg-blue-100 text-blue-700';
    if (speaker === clientName) return 'bg-green-100 text-green-700';
    return 'bg-gray-100 text-gray-700';
  };

  if (parsedSegments.length === 0) {
    return (
      <div className="bg-slate-50 rounded-lg p-4">
        <div className="text-slate-600 text-sm">
          Não foi possível identificar separação de falantes na transcrição.
        </div>
        <div className="mt-2 bg-white rounded border p-3 text-sm text-slate-700 max-h-64 overflow-y-auto whitespace-pre-wrap">
          {transcription}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Estatísticas */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <h4 className="font-medium text-slate-800 mb-2">📊 Resumo da Conversa</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-slate-500">Segmentos:</span>
            <span className="ml-1 font-medium">{stats.totalSegments}</span>
          </div>
          <div>
            <span className="text-slate-500">{sdrName} falou:</span>
            <span className="ml-1 font-medium text-blue-600">{stats.sdrPercentage}%</span>
          </div>
          <div>
            <span className="text-slate-500">{clientName} falou:</span>
            <span className="ml-1 font-medium text-green-600">{stats.clientPercentage}%</span>
          </div>
          <div>
            <span className="text-slate-500">Não identificado:</span>
            <span className="ml-1 font-medium text-gray-600">{stats.unknownSegments}</span>
          </div>
        </div>
      </div>

      {/* Transcrição Separada */}
      <div className="bg-slate-50 rounded-lg p-4 max-h-96 overflow-y-auto">
        <div className="space-y-3">
          {parsedSegments.map((segment, index) => (
            <div key={index} className={`p-3 rounded-lg ${getSpeakerColor(segment.speaker)}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-medium px-2 py-1 rounded ${getSpeakerBadgeColor(segment.speaker)}`}>
                  {getSpeakerIcon(segment.speaker)} {segment.speaker}
                </span>
                {segment.timestamp && (
                  <span className="text-xs text-slate-500">{segment.timestamp}</span>
                )}
              </div>
              <p className="text-sm whitespace-pre-wrap">{segment.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Dicas de Melhoria */}
      {stats.unknownSegments > stats.totalSegments * 0.3 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <span className="text-yellow-600">💡</span>
            <div className="text-sm">
              <div className="font-medium text-yellow-800">Sugestão de Melhoria</div>
              <div className="text-yellow-700">
                Muitos segmentos não foram identificados ({stats.unknownSegments}). 
                Considere melhorar a qualidade da transcrição ou usar IA para diarização.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
