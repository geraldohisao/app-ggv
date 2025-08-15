import React, { useState } from 'react';
import { SUPABASE_URL, SUPABASE_ANON_KEY, saveConfig } from '../../services/config';
import { ModalBase } from './ModalBase';
import { FormGroup, FormInput, formLabelClass, formInputClass } from '../ui/Form';

export const ApiKeyManagerModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [keys, setKeys] = useState({
        SUPABASE_URL: SUPABASE_URL || '',
        SUPABASE_ANON_KEY: SUPABASE_ANON_KEY || '',
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setKeys({ ...keys, [e.target.name]: e.target.value });
    };

    const handleSave = () => {
        setIsSaving(true);
        saveConfig(keys);
        alert("Chaves salvas com sucesso! A aplicação será recarregada para aplicar as alterações.");
        setTimeout(() => {
            window.location.reload();
        }, 500);
    };

    return (
        <ModalBase title="Gerenciar Chaves do Supabase" onClose={onClose}>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                <p className="text-sm text-slate-600 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    Insira as chaves do Supabase abaixo. Elas serão salvas de forma segura no seu navegador (`localStorage`) e terão prioridade sobre as configurações do `index.html`.
                    <strong>Atenção:</strong> Após salvar, a página será recarregada.
                </p>

                <FormGroup>
                    <label htmlFor="SUPABASE_URL" className={formLabelClass}>Supabase URL</label>
                    <input id="SUPABASE_URL" name="SUPABASE_URL" value={keys.SUPABASE_URL} onChange={handleChange} className={formInputClass} placeholder="Cole a URL do projeto Supabase aqui" />
                </FormGroup>

                <FormGroup>
                    <label htmlFor="SUPABASE_ANON_KEY" className={formLabelClass}>Supabase Anon Key</label>
                    <input id="SUPABASE_ANON_KEY" name="SUPABASE_ANON_KEY" value={keys.SUPABASE_ANON_KEY} onChange={handleChange} className={formInputClass} placeholder="Cole a chave anônima (anon key) do Supabase aqui" />
                </FormGroup>

            </div>
            <div className="flex justify-end gap-4 mt-6 pt-4 border-t border-slate-200">
                <button type="button" onClick={onClose} className="bg-slate-200 text-slate-800 font-bold py-2 px-5 rounded-lg hover:bg-slate-300 transition-colors">Cancelar</button>
                <button type="button" onClick={handleSave} disabled={isSaving} className="bg-blue-900 text-white font-bold py-2 px-5 rounded-lg hover:bg-blue-800 transition-colors disabled:bg-slate-400">
                    {isSaving ? 'Salvando...' : 'Salvar e Recarregar'}
                </button>
            </div>
        </ModalBase>
    );
};
