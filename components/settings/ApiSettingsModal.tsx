import React, { useState, useEffect } from 'react';
import { testSupabaseApi, TestResult } from '../../services/apiTests';
import { isValidKey, SUPABASE_URL, SUPABASE_ANON_KEY } from '../../services/config';
import { ModalBase } from './ModalBase';
import { CheckCircleIcon } from '../ui/icons';

type TestStatus = 'idle' | 'testing' | 'success' | 'error';
interface TestState {
    status: TestStatus;
    message: string;
}

export const ApiSettingsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [isTesting, setIsTesting] = useState(false);

    const getInitialStatus = (isKeySet: boolean, varName: string): TestState => ({
        status: isKeySet ? 'idle' : 'error',
        message: isKeySet ? '' : `A variável ${varName} não foi configurada.`,
    });

    const [supabaseResult, setSupabaseResult] = useState<TestState>(
        getInitialStatus(isValidKey(SUPABASE_URL) && isValidKey(SUPABASE_ANON_KEY), 'SUPABASE_URL & SUPABASE_ANON_KEY')
    );

    const handleRunTests = async () => {
        setIsTesting(true);

        const supabaseCheck = await testSupabaseApi();
        setSupabaseResult({
            status: supabaseCheck.success ? 'success' : 'error',
            message: supabaseCheck.success ? 'Conexão bem-sucedida!' : supabaseCheck.error!,
        });

        setIsTesting(false);
    };

    return (
        <ModalBase title="Diagnóstico de Conexões" onClose={onClose}>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <p className="text-slate-600 text-sm">
                        Use este painel para verificar a conectividade com o Supabase.
                    </p>
                    <button
                        onClick={handleRunTests}
                        disabled={isTesting}
                        className="flex-shrink-0 flex items-center justify-center gap-2 bg-slate-700 text-white font-bold py-2 px-5 rounded-lg hover:bg-slate-800 transition-colors disabled:bg-slate-400 disabled:cursor-wait"
                    >
                        {isTesting ? (
                            <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <CheckCircleIcon className="w-5 h-5" />
                        )}
                        <span>{isTesting ? 'Testando...' : 'Executar Testes'}</span>
                    </button>
                </div>
                <div className="space-y-3">
                    <ApiTestRow title="API Supabase (Banco de Dados & Auth)" envVar="SUPABASE_URL & SUPABASE_ANON_KEY" result={supabaseResult} />
                </div>
                <div className="text-xs text-slate-500 bg-slate-100 p-3 rounded-md">
                    <strong>Nota:</strong> O teste verifica a comunicação com o Supabase. As chaves devem estar configuradas corretamente.
                </div>
            </div>
        </ModalBase>
    );
};

const StatusIndicator: React.FC<{ result: TestState }> = ({ result }) => {
    const colors = {
        idle: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
        testing: { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500 animate-pulse' },
        success: { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },
        error: { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500' },
    };

    const color = colors[result.status];

    return (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-md ${color.bg} ${color.text}`}>
            <div className={`w-2 h-2 rounded-full ${color.dot}`}></div>
            <span className="text-xs font-medium">{result.message}</span>
        </div>
    );
};

const ApiTestRow: React.FC<{ title: string, envVar: string, result: TestState }> = ({ title, envVar, result }) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white border border-slate-200 rounded-lg">
        <div className="flex-1">
            <h3 className="font-semibold text-slate-800 text-sm">{title}</h3>
            <p className="text-xs text-slate-500 mt-1">Variável: <code className="bg-slate-100 px-1 rounded">{envVar}</code></p>
        </div>
        <StatusIndicator result={result} />
    </div>
);
