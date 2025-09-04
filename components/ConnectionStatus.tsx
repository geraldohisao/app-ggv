
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import Tooltip from './ui/Tooltip';

type Status = 'pending' | 'success' | 'error';

const ConnectionStatus: React.FC = () => {
    const [status, setStatus] = useState<Status>('pending');
    const [statusText, setStatusText] = useState("🔄 Verificando conexão...");

    useEffect(() => {
        let isMounted = true;

        const checkConnection = async () => {
            if (!supabase) {
                if (isMounted) {
                    setStatus('error');
                    setStatusText('❌ Supabase não configurado');
                }
                return;
            }

            try {
                // Primeiro testa a conectividade básica com timeout explícito
                const selectPromise = supabase
                    .from('ai_personas')
                    .select('id')
                    .limit(1);
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout(8s)')), 8000));
                const { data, error } = await Promise.race([selectPromise as any, timeoutPromise]) as any;

                if (isMounted) {
                    if (error) {
                        // Se houver erro, verifica se é um problema de configuração ou RLS
                        if (error.code === '42P01') {
                            setStatus('error');
                            setStatusText('❌ Tabelas não encontradas');
                        } else if (error.message.includes('RLS')) {
                            setStatus('error');
                            setStatusText('❌ Erro de permissão RLS');
                        } else {
                            throw error;
                        }
                    } else {
                        setStatus('success');
                        setStatusText('✅ Conectado ao Banco de Dados');
                    }
                }
            } catch (error: any) {
                if (isMounted) {
                    setStatus('error');
                    const msg = String(error?.message || 'Erro de conexão');
                    const hint = msg.includes('Timeout') ? ' (tempo esgotado)' : '';
                    setStatusText(`❌ Erro de conexão${hint}`);
                }
            }
        };

        // Adiciona um pequeno atraso para que o usuário perceba a verificação
        const timer = setTimeout(checkConnection, 500);

        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, []);
        
    const colorClass = {
        pending: 'bg-yellow-400 animate-pulse',
        success: 'bg-green-500',
        error: 'bg-red-500',
    }[status];

    return (
        <Tooltip text={statusText}>
            <span className={`flex h-3 w-3 rounded-full ${colorClass} transition-colors duration-500`}></span>
        </Tooltip>
    );
};

export default ConnectionStatus;
