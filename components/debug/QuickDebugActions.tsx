import React from 'react';
import { useSuperDebug } from '../../hooks/useSuperDebug';

interface QuickDebugActionsProps {
  componentName?: string;
  className?: string;
}

/**
 * Componente para ações rápidas de debug
 * Pode ser usado em qualquer lugar para facilitar testes
 */
export const QuickDebugActions: React.FC<QuickDebugActionsProps> = ({
  componentName = 'Unknown',
  className = ''
}) => {
  const { isSuperAdmin, addDebugLog, testUtils } = useSuperDebug();

  // Se não for super admin, não renderizar
  if (!isSuperAdmin) {
    return null;
  }

  const quickActions = [
    {
      label: '📝 Log Info',
      action: () => addDebugLog('info', componentName, 'Ação rápida executada'),
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      label: '⚠️ Log Warning', 
      action: () => addDebugLog('warn', componentName, 'Warning de teste gerado'),
      color: 'bg-yellow-500 hover:bg-yellow-600'
    },
    {
      label: '❌ Simular Erro',
      action: () => {
        try {
          testUtils.simulateError(`Erro simulado em ${componentName}`);
        } catch (e) {
          // Erro já foi logado automaticamente
        }
      },
      color: 'bg-red-500 hover:bg-red-600'
    },
    {
      label: '🧪 Dados Teste',
      action: () => {
        const testData = testUtils.generateTestData('diagnostic');
        addDebugLog('success', componentName, 'Dados de teste gerados', testData);
      },
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      label: '📊 Info Sistema',
      action: () => testUtils.logSystemInfo(),
      color: 'bg-purple-500 hover:bg-purple-600'
    }
  ];

  return (
    <div className={`fixed top-4 right-4 bg-white border-2 border-red-300 rounded-lg shadow-lg p-3 z-50 ${className}`}>
      <div className="text-xs font-semibold text-red-600 mb-2 flex items-center gap-1">
        🛡️ Debug: {componentName}
      </div>
      <div className="grid grid-cols-1 gap-1">
        {quickActions.map((action, index) => (
          <button
            key={index}
            onClick={action.action}
            className={`px-2 py-1 text-white rounded text-xs font-medium transition-colors ${action.color}`}
            title={`Executar: ${action.label}`}
          >
            {action.label}
          </button>
        ))}
      </div>
      <div className="text-xs text-gray-500 mt-2 text-center">
        Ctrl+Shift+D para painel completo
      </div>
    </div>
  );
};

export default QuickDebugActions;
