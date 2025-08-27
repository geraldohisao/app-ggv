import React from 'react';

// Componente temporariamente simplificado para evitar erros de sintaxe
const FinalUnifiedDebugPanel: React.FC = () => {
  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm">
      <div className="text-sm text-gray-600">
        <div className="font-semibold mb-2">🔧 Debug Panel</div>
        <div>Status: Temporariamente desabilitado</div>
        <div>Hora: {new Date().toLocaleTimeString()}</div>
      </div>
    </div>
  );
};

export default FinalUnifiedDebugPanel;
