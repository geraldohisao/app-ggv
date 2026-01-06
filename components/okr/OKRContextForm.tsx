import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';

interface OKRContextFormProps {
  onSubmit: (context: string) => void;
  onBack: () => void;
}

const OKRContextForm: React.FC<OKRContextFormProps> = ({ onSubmit, onBack }) => {
  const [context, setContext] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [apiKeyConfigured, setApiKeyConfigured] = useState<boolean | null>(null);
  const [checkingApiKey, setCheckingApiKey] = useState(true);

  // Verificar API Key ao montar componente
  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    try {
      setCheckingApiKey(true);
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'openai_api_key')
        .maybeSingle();

      if (error || !data || !data.value) {
        setApiKeyConfigured(false);
      } else {
        setApiKeyConfigured(true);
      }
    } catch (error) {
      console.error('Erro ao verificar API Key:', error);
      setApiKeyConfigured(false);
    } finally {
      setCheckingApiKey(false);
    }
  };

  const handleSubmit = async () => {
    if (!context.trim()) {
      alert('Por favor, forneça um contexto para gerar o plano estratégico.');
      return;
    }

    if (context.trim().length < 50) {
      alert('Por favor, forneça mais detalhes. O contexto deve ter pelo menos 50 caracteres.');
      return;
    }

    // Verificar API Key novamente antes de gerar
    if (apiKeyConfigured === false) {
      const proceed = window.confirm(
        '⚠️ API Key da OpenAI não configurada!\n\n' +
        'Sem a API Key, não é possível gerar o mapa com IA.\n\n' +
        'Deseja criar o mapa manualmente (do zero)?'
      );
      
      if (proceed) {
        onBack(); // Volta para escolher "Construir do Zero"
      }
      return;
    }

    setIsGenerating(true);
    try {
      onSubmit(context);
    } catch (error) {
      console.error('Erro ao gerar plano:', error);
      alert('Erro ao gerar plano. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-4xl mx-auto py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Voltar
          </button>
          <h1 className="text-3xl font-bold text-slate-900">
            Contexto da Empresa
          </h1>
          <p className="text-slate-600 mt-2">
            Descreva sua empresa, seus objetivos e desafios. Quanto mais detalhes, melhor será o plano estratégico gerado.
          </p>
        </div>

        {/* API Key Warning */}
        {!checkingApiKey && apiKeyConfigured === false && (
          <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <h3 className="font-bold text-orange-900 mb-2">⚠️ API Key da OpenAI não configurada</h3>
                <p className="text-sm text-orange-800 mb-3">
                  Para gerar mapas estratégicos com IA, você precisa configurar a API Key da OpenAI em Configurações → API Settings.
                </p>
                <p className="text-sm text-orange-800">
                  <strong>Alternativa:</strong> Você pode criar o mapa estratégico manualmente usando a opção "Construir do Zero".
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="space-y-6">
            {/* Context Input */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Contexto Empresarial
              </label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                className="w-full h-64 px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all resize-none text-slate-700"
                placeholder="Exemplo: Somos uma consultoria de vendas B2B que atende empresas de médio e grande porte. Nosso principal desafio é escalar o time comercial mantendo a qualidade do atendimento. Queremos dobrar o faturamento nos próximos 12 meses, passando de R$ 2M para R$ 4M. Atualmente temos 5 consultores e queremos chegar a 10..."
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-slate-500">
                  {context.length} caracteres
                </span>
                <span className="text-sm text-slate-500">
                  Recomendado: 300+ caracteres
                </span>
              </div>
            </div>

            {/* Upload Documents (Optional) */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Documentos (Opcional)
              </label>
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer">
                <svg className="w-12 h-12 text-slate-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm text-slate-600 mb-1">
                  Arraste arquivos ou clique para fazer upload
                </p>
                <p className="text-xs text-slate-500">
                  PDF, DOC, DOCX até 10MB
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                onClick={onBack}
                className="px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={isGenerating || !context.trim()}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Gerando Plano...
                  </>
                ) : (
                  <>
                    ✨ Gerar Plano Estratégico
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Tips Card */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Dicas para um melhor resultado
          </h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Descreva claramente o momento atual da empresa e onde você quer chegar</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Inclua dados quantitativos (faturamento, equipe, metas)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Mencione seus principais desafios e prioridades</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Quanto mais contexto, mais personalizado será o plano gerado</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default OKRContextForm;

