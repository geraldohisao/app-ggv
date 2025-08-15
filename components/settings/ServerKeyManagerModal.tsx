import React, { useState, useEffect } from 'react';
import { getGeminiApiKeyStatus, saveGeminiApiKey } from '../../services/supabaseService';
import { ModalBase } from './ModalBase';
import { FormGroup, formInputClass } from '../ui/Form';
import { LoadingSpinner } from '../ui/Feedback';

export const ServerKeyManagerModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [apiKey, setApiKey] = useState('');
    const [isKeySet, setIsKeySet] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const checkKeyStatus = async () => {
            setIsLoading(true);
            try {
                const status = await getGeminiApiKeyStatus();
                setIsKeySet(status);
            } catch (err) {
                setError('Não foi possível verificar o status da chave no banco de dados.');
            } finally {
                setIsLoading(false);
            }
        };
        checkKeyStatus();
    }, []);

    const handleSave = async () => {
        if (!apiKey.trim()) {
            setError('A chave da API não pode estar vazia.');
            return;
        }
        setIsSaving(true);
        setError('');
        try {
            await saveGeminiApiKey(apiKey);
            alert("Chave da API do Gemini salva com sucesso! Reinicie o servidor para aplicar as alterações.");
            onClose();
        } catch (err: any) {
            setError(err.message || 'Ocorreu um erro ao salvar a chave.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <ModalBase title="Gerenciar Chave de API do Gemini (Servidor)" onClose={onClose}>
            <div className="space-y-4">
                <p className="text-sm text-slate-600 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    Insira aqui a sua chave de API do Google Gemini. Esta chave será armazenada de forma segura no Supabase e utilizada pelo seu servidor para se conectar à IA.
                    <strong>Atenção:</strong> Após salvar, o seu servidor precisará ser reiniciado para carregar a nova chave.
                </p>

                {isLoading ? (
                    <LoadingSpinner />
                ) : (
                    <>
                        {isKeySet && (
                            <div className="p-3 bg-green-50 text-green-800 rounded-lg border border-green-200 text-sm font-semibold">
                                Uma chave de API já está configurada no banco de dados. Inserir uma nova chave irá sobrescrevê-la.
                            </div>
                        )}
                         <FormGroup>
                            <label htmlFor="gemini-api-key" className="block text-sm font-medium text-slate-700 mb-1.5">
                                Google Gemini API Key
                            </label>
                            <input
                                id="gemini-api-key"
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                className={formInputClass}
                                placeholder="Cole a chave da API do Google Gemini aqui"
                            />
                        </FormGroup>
                        {error && <p className="text-red-600 text-xs mt-1.5">{error}</p>}
                    </>
                )}
            </div>
             <div className="flex justify-end gap-4 mt-6 pt-4 border-t border-slate-200">
                <button type="button" onClick={onClose} className="bg-slate-200 text-slate-800 font-bold py-2 px-5 rounded-lg hover:bg-slate-300 transition-colors">
                    Cancelar
                </button>
                <button type="button" onClick={handleSave} disabled={isSaving || isLoading} className="bg-blue-900 text-white font-bold py-2 px-5 rounded-lg hover:bg-blue-800 transition-colors disabled:bg-slate-400">
                    {isSaving ? 'Salvando...' : 'Salvar Chave'}
                </button>
            </div>
        </ModalBase>
    );
};