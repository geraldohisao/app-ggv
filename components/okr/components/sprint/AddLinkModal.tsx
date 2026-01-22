import React, { useState, useEffect } from 'react';
import { SprintAttachment, LinkType } from '../../types/sprint.types';
import { addLink, detectLinkType, extractNameFromUrl, getLinkTypeInfo } from '../../services/attachment.service';

interface AddLinkModalProps {
  sprintId: string;
  onClose: () => void;
  onAdded: (attachment: SprintAttachment) => void;
}

export const AddLinkModal: React.FC<AddLinkModalProps> = ({ sprintId, onClose, onAdded }) => {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [linkType, setLinkType] = useState<typeof LinkType[keyof typeof LinkType]>(LinkType.OTHER);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Detectar tipo de link e extrair nome automaticamente
  useEffect(() => {
    if (url) {
      const detected = detectLinkType(url);
      setLinkType(detected);
      
      // Auto-preencher nome se estiver vazio
      if (!title) {
        const extractedName = extractNameFromUrl(url);
        if (extractedName) {
          // Capitalizar primeira letra
          setTitle(extractedName.charAt(0).toUpperCase() + extractedName.slice(1));
        } else {
          // Fallback: usar tipo do link como nome
          const info = getLinkTypeInfo(detected);
          setTitle(info.label);
        }
      }
    }
  }, [url]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!url.trim()) {
      setError('URL é obrigatória');
      return;
    }

    if (!title.trim()) {
      setError('Título é obrigatório');
      return;
    }

    // Validar URL
    try {
      new URL(url);
    } catch {
      setError('URL inválida');
      return;
    }

    setSaving(true);
    try {
      // Obter nome do usuário do localStorage
      const userData = localStorage.getItem('ggv-user');
      const userName = userData ? JSON.parse(userData).name || 'Usuário' : 'Usuário';

      const result = await addLink({
        sprint_id: sprintId,
        url: url.trim(),
        link_type: linkType,
        title: title.trim(),
        description: description.trim() || undefined,
        created_by: userName,
      });

      if (result) {
        onAdded(result);
        onClose();
      }
    } catch (err) {
      console.error('Erro ao adicionar link:', err);
      setError('Erro ao adicionar link. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const linkTypes = Object.values(LinkType).map(type => ({
    value: type,
    ...getLinkTypeInfo(type),
  }));

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" 
      onMouseDown={(e) => {
        // Só fecha se clicar diretamente no backdrop (não em filhos)
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔗</span>
            <h3 className="font-bold text-slate-800">Adicionar Link</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* URL */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">
              URL *
            </label>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://drive.google.com/..."
              className="w-full bg-slate-50 rounded-xl px-4 py-3 border-none text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              autoFocus
            />
          </div>

          {/* Tipo de Link */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">
              Tipo de Link
            </label>
            <div className="grid grid-cols-5 gap-2">
              {linkTypes.map(type => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setLinkType(type.value)}
                  className={`p-2 rounded-xl text-center transition-all ${
                    linkType === type.value
                      ? 'ring-2 ring-indigo-500 bg-indigo-50'
                      : 'bg-slate-50 hover:bg-slate-100'
                  }`}
                  title={type.label}
                >
                  <span className="text-lg">{type.icon}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Título */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">
              Nome do Link *
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Apresentação Q1, Planilha de Metas, Design do App..."
              className="w-full bg-slate-50 rounded-xl px-4 py-3 border-none text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">
              Descrição (opcional)
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Adicione uma descrição..."
              rows={2}
              className="w-full bg-slate-50 rounded-xl px-4 py-3 border-none text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
            />
          </div>

          {/* Erro */}
          {error && (
            <div className="bg-rose-50 text-rose-600 text-sm px-4 py-2 rounded-xl">
              {error}
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Salvando...
                </>
              ) : (
                'Adicionar Link'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
