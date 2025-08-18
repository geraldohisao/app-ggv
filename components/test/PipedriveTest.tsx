import React, { useState } from 'react';

const PIPEDRIVE_ENDPOINT = 'https://app.grupoggv.com/api/webhook/diag-ggv-register';

interface TestResult {
  success: boolean;
  data?: any;
  error?: string;
  status?: number;
}

export const PipedriveTest: React.FC = () => {
  const [dealId, setDealId] = useState('569934');
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(false);

  const testPipedriveRequest = async () => {
    setLoading(true);
    setResult(null);

    try {
      console.log('🧪 TESTE - Iniciando teste do Pipedrive...');
      console.log('🔗 TESTE - Endpoint:', PIPEDRIVE_ENDPOINT);
      console.log('🆔 TESTE - Deal ID:', dealId);

      const url = `${PIPEDRIVE_ENDPOINT}?deal_id=${encodeURIComponent(dealId)}`;
      console.log('📍 TESTE - URL completa:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      console.log('📊 TESTE - Status da resposta:', response.status);
      console.log('📋 TESTE - Headers da resposta:', Object.fromEntries(response.headers.entries()));

      const responseText = await response.text();
      console.log('📄 TESTE - Resposta raw:', responseText);

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ TESTE - Erro ao fazer parse JSON:', parseError);
        responseData = { raw: responseText };
      }

      if (response.ok) {
        setResult({
          success: true,
          data: responseData,
          status: response.status,
        });
        console.log('✅ TESTE - Sucesso:', responseData);
      } else {
        setResult({
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          data: responseData,
          status: response.status,
        });
        console.error('❌ TESTE - Erro HTTP:', response.status, response.statusText);
      }

    } catch (error: any) {
      console.error('❌ TESTE - Erro na requisição:', error);
      setResult({
        success: false,
        error: error.message || 'Erro desconhecido',
      });
    } finally {
      setLoading(false);
    }
  };

  const getCurrentDealId = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('deal_id') || '';
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4">🧪 Teste da Integração Pipedrive</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Deal ID para teste:
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={dealId}
            onChange={(e) => setDealId(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Digite o deal_id"
          />
          <button
            onClick={() => setDealId(getCurrentDealId())}
            className="px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
          >
            Usar da URL
          </button>
        </div>
        {getCurrentDealId() && (
          <p className="text-sm text-gray-600 mt-1">
            Deal ID atual na URL: <code>{getCurrentDealId()}</code>
          </p>
        )}
      </div>

      <button
        onClick={testPipedriveRequest}
        disabled={loading || !dealId}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        {loading ? 'Testando...' : 'Testar Requisição GET'}
      </button>

      {result && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Resultado:</h3>
          
          <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-lg ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                {result.success ? '✅' : '❌'}
              </span>
              <span className={`font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                {result.success ? 'Sucesso!' : 'Erro na requisição'}
              </span>
              {result.status && (
                <span className="text-sm text-gray-600">
                  (HTTP {result.status})
                </span>
              )}
            </div>

            {result.error && (
              <p className="text-red-700 text-sm mb-2">
                <strong>Erro:</strong> {result.error}
              </p>
            )}

            {result.data && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Dados recebidos:</h4>
                <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-60">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-700 mb-2">Informações do Teste:</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li><strong>Endpoint:</strong> <code className="bg-white px-1 rounded">{PIPEDRIVE_ENDPOINT}</code></li>
          <li><strong>Método:</strong> GET</li>
          <li><strong>Parâmetro:</strong> deal_id</li>
          <li><strong>Headers:</strong> Content-Type: application/json</li>
        </ul>
      </div>
    </div>
  );
};
