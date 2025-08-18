import React, { useState } from 'react';

export const BasicDebugPanel: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 z-50 flex items-center justify-center text-xl"
        title="Debug"
      >
        🐛
      </button>
    );
  }

  return (
    <div className="fixed top-0 right-0 w-80 h-full bg-white shadow-2xl border-l border-gray-200 z-50 flex flex-col">
      <div className="p-4 border-b border-gray-200 bg-blue-50">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">🐛 Debug Básico</h2>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
      </div>
      
      <div className="p-4">
        <div className="space-y-2">
          <div className="text-sm">
            <strong>Status:</strong> Sistema funcionando ✅
          </div>
          <div className="text-sm">
            <strong>URL:</strong> {window.location.href}
          </div>
          <div className="text-sm">
            <strong>Timestamp:</strong> {new Date().toLocaleString()}
          </div>
        </div>
        
        <div className="mt-4">
          <button
            onClick={() => {
              console.log('🐛 Teste de debug básico');
              alert('Debug funcionando!');
            }}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Testar Debug
          </button>
        </div>
      </div>
    </div>
  );
};

export default BasicDebugPanel;
