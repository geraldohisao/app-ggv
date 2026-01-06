import React from 'react';
import { StrategicMap } from '../../../types';

interface AdvancedAnalysisModalProps {
  map: StrategicMap;
  apiKey: string;
  onClose: () => void;
}

const AdvancedAnalysisModal: React.FC<AdvancedAnalysisModalProps> = ({
  map,
  apiKey,
  onClose
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-4xl">🎯</span>
            <div>
              <h2 className="text-2xl font-bold">Análise Estratégica Avançada</h2>
              <p className="text-sm text-blue-100">Análise SWOT + Tendências + Benchmarks</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-blue-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-8 text-center">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-bold text-slate-900 mb-3">
            Análise Avançada
          </h3>
          <p className="text-slate-600 mb-6">
            Funcionalidade em desenvolvimento.
          </p>
          <p className="text-sm text-slate-500 mb-8">
            Em breve você terá análise SWOT completa com tendências e benchmarks.
          </p>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdvancedAnalysisModal;

