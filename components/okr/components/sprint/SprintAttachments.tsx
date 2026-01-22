import React, { useState, useEffect } from 'react';
import { SprintAttachment, AttachmentType } from '../../types/sprint.types';
import { parseLocalDate } from '../../utils/date';
import {
  listAttachments,
  deleteAttachment,
  getLinkTypeInfo,
} from '../../services/attachment.service';
import { AddLinkModal } from './AddLinkModal';

interface SprintAttachmentsProps {
  sprintId: string;
  readOnly?: boolean;
}

export const SprintAttachments: React.FC<SprintAttachmentsProps> = ({ sprintId, readOnly = false }) => {
  const [attachments, setAttachments] = useState<SprintAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Carregar anexos
  const loadAttachments = async () => {
    setLoading(true);
    try {
      const data = await listAttachments(sprintId);
      setAttachments(data);
    } catch (error) {
      console.error('Erro ao carregar anexos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttachments();
  }, [sprintId]);

  // Abrir link
  const handleOpen = (attachment: SprintAttachment) => {
    if (attachment.url) {
      window.open(attachment.url, '_blank');
    }
  };

  // Remover anexo
  const handleDelete = async (attachment: SprintAttachment) => {
    if (!confirm(`Remover "${attachment.title}"?`)) return;

    setDeleting(attachment.id!);
    try {
      await deleteAttachment(attachment);
      setAttachments(prev => prev.filter(a => a.id !== attachment.id));
    } catch (error) {
      console.error('Erro ao remover anexo:', error);
      alert('Erro ao remover anexo');
    } finally {
      setDeleting(null);
    }
  };

  // Callback após adicionar
  const handleAdded = (newAttachment: SprintAttachment) => {
    setAttachments(prev => [newAttachment, ...prev]);
  };

  // Renderizar ícone do link
  const renderLinkIcon = (attachment: SprintAttachment) => {
    if (attachment.link_type) {
      const info = getLinkTypeInfo(attachment.link_type);
      return (
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${info.color}`}>
          {info.icon}
        </div>
      );
    }
    return (
      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg bg-slate-100 text-slate-600">
        🔗
      </div>
    );
  };

  // Formatar data
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = parseLocalDate(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">🔗</span>
          <h3 className="font-bold text-slate-800">Links e Referências</h3>
          {attachments.length > 0 && (
            <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
              {attachments.length}
            </span>
          )}
        </div>
        {!readOnly && (
          <button
            onClick={() => setShowLinkModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            + Link
          </button>
        )}
      </div>

      {/* Lista de anexos */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full" />
          </div>
        ) : attachments.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-400 text-sm">Nenhum link adicionado</p>
            {!readOnly && (
              <p className="text-slate-300 text-xs mt-1">
                Adicione links do Drive, Notion, Figma, Miro, YouTube, etc.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {attachments.map(attachment => (
              <div
                key={attachment.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors group"
              >
                {renderLinkIcon(attachment)}
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-slate-800 text-sm truncate">
                    {attachment.title}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                    {attachment.link_type && (
                      <span>{getLinkTypeInfo(attachment.link_type).label}</span>
                    )}
                    {attachment.created_by && (
                      <>
                        <span>•</span>
                        <span>por {attachment.created_by}</span>
                      </>
                    )}
                    {attachment.created_at && (
                      <>
                        <span>•</span>
                        <span>{formatDate(attachment.created_at)}</span>
                      </>
                    )}
                  </div>
                  {attachment.description && (
                    <p className="text-xs text-slate-500 mt-1 truncate">{attachment.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleOpen(attachment)}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Abrir"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </button>
                  {!readOnly && (
                    <button
                      onClick={() => handleDelete(attachment)}
                      disabled={deleting === attachment.id}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Remover"
                    >
                      {deleting === attachment.id ? (
                        <div className="w-4 h-4 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Link */}
      {showLinkModal && (
        <AddLinkModal
          sprintId={sprintId}
          onClose={() => setShowLinkModal(false)}
          onAdded={handleAdded}
        />
      )}
    </div>
  );
};
