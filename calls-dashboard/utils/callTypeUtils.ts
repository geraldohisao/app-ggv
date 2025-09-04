/**
 * Utilitários para formatação e categorização de call_type
 * Agora com etapas reais do Pipedrive
 */

// Mapeamento de call_type para categorias e cores
export const CALL_TYPE_CONFIG = {
  // Etapas de Qualificação
  'Lead (Qualificação)': {
    category: 'qualification',
    label: '🎯 Lead Qualificação',
    color: 'bg-blue-100 text-blue-700',
    priority: 1,
    description: 'Lead em processo de qualificação'
  },
  
  // Etapas de Apresentação
  'Apresentação de Proposta': {
    category: 'presentation',
    label: '📋 Apresentação',
    color: 'bg-purple-100 text-purple-700',
    priority: 2,
    description: 'Apresentação da proposta comercial'
  },
  
  // Etapas de Oportunidade
  'Oportunidade': {
    category: 'opportunity',
    label: '🚀 Oportunidade',
    color: 'bg-green-100 text-green-700',
    priority: 3,
    description: 'Oportunidade identificada e qualificada'
  },
  
  // Etapas de Negociação
  'Negociação': {
    category: 'negotiation',
    label: '🤝 Negociação',
    color: 'bg-yellow-100 text-yellow-700',
    priority: 4,
    description: 'Em processo de negociação'
  },
  
  // Etapas de Fechamento
  'Proposta Enviada': {
    category: 'proposal_sent',
    label: '📤 Proposta Enviada',
    color: 'bg-indigo-100 text-indigo-700',
    priority: 5,
    description: 'Proposta formal enviada'
  },
  
  'Fechamento': {
    category: 'closing',
    label: '🎉 Fechamento',
    color: 'bg-green-100 text-green-800',
    priority: 6,
    description: 'Processo de fechamento'
  },
  
  // Etapas perdidas
  'Perdido': {
    category: 'lost',
    label: '❌ Perdido',
    color: 'bg-red-100 text-red-700',
    priority: 0,
    description: 'Oportunidade perdida'
  }
};

// Função para obter configuração do call_type
export function getCallTypeConfig(callType: string) {
  return CALL_TYPE_CONFIG[callType as keyof typeof CALL_TYPE_CONFIG] || {
    category: 'unknown',
    label: callType,
    color: 'bg-gray-100 text-gray-700',
    priority: 0,
    description: 'Etapa não categorizada'
  };
}

// Função para formatar call_type para exibição
export function formatCallType(callType: string): string {
  const config = getCallTypeConfig(callType);
  return config.label;
}

// Função para obter cor do call_type
export function getCallTypeColor(callType: string): string {
  const config = getCallTypeConfig(callType);
  return config.color;
}

// Função para categorizar call_types
export function categorizeCallTypes(calls: any[]) {
  const categories = {
    qualification: [],
    presentation: [],
    opportunity: [],
    negotiation: [],
    proposal_sent: [],
    closing: [],
    lost: [],
    unknown: []
  };
  
  calls.forEach(call => {
    const config = getCallTypeConfig(call.call_type);
    const category = config.category as keyof typeof categories;
    categories[category].push(call);
  });
  
  return categories;
}

// Função para obter estatísticas por etapa
export function getCallTypeStats(calls: any[]) {
  const stats = Object.entries(CALL_TYPE_CONFIG).map(([callType, config]) => {
    const count = calls.filter(call => call.call_type === callType).length;
    const percentage = calls.length > 0 ? Math.round((count / calls.length) * 100) : 0;
    
    return {
      callType,
      config,
      count,
      percentage
    };
  });
  
  // Adicionar "outros" para call_types não mapeados
  const mappedCallTypes = Object.keys(CALL_TYPE_CONFIG);
  const otherCount = calls.filter(call => !mappedCallTypes.includes(call.call_type)).length;
  
  if (otherCount > 0) {
    stats.push({
      callType: 'Outros',
      config: {
        category: 'unknown',
        label: '📋 Outros',
        color: 'bg-gray-100 text-gray-700',
        priority: 999,
        description: 'Outras etapas não categorizadas'
      },
      count: otherCount,
      percentage: calls.length > 0 ? Math.round((otherCount / calls.length) * 100) : 0
    });
  }
  
  return stats.sort((a, b) => b.count - a.count);
}

// Função para obter próxima etapa sugerida
export function getNextSuggestedStage(currentCallType: string): string | null {
  const currentConfig = getCallTypeConfig(currentCallType);
  
  const stageProgression = [
    'Lead (Qualificação)',
    'Apresentação de Proposta', 
    'Oportunidade',
    'Negociação',
    'Proposta Enviada',
    'Fechamento'
  ];
  
  const currentIndex = stageProgression.indexOf(currentCallType);
  
  if (currentIndex >= 0 && currentIndex < stageProgression.length - 1) {
    return stageProgression[currentIndex + 1];
  }
  
  return null;
}
