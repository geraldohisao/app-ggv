import React, { useState, useEffect } from 'react';
import { UserRole } from '../../types';
import { useUser } from '../../contexts/DirectUserContext';

type FeedbackType = 'Bug' | 'Melhoria';

const MIN_DESC = 5;

// Utilitário: compressão para WebP com resize
async function compressImageToWebP(file: File, opts: { maxWidth: number; maxHeight: number; quality: number }): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(opts.maxWidth / bitmap.width, opts.maxHeight / bitmap.height, 1);
  const targetW = Math.round(bitmap.width * ratio);
  const targetH = Math.round(bitmap.height * ratio);
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unsupported');
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Blob fail'))), 'image/webp', opts.quality);
  });
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  return dataUrl;
}

interface FeedbackSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const FeedbackSidebar: React.FC<FeedbackSidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useUser();
  const [submitting, setSubmitting] = useState(false);
  const [type, setType] = useState<FeedbackType>('Melhoria');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const canSubmit = description.trim().length >= MIN_DESC && !submitting;

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setTitle('');
      setDescription('');
      setType('Melhoria');
      setSubmitting(false);
      setSent(false);
      setError(null);
      setImages([]);
    }, 300);
  };

  const handleDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/'));
    if (files.length) setImages(prev => [...prev, ...files].slice(0, 6));
  };

  const handleDragOver: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleFileInput: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
    if (files.length) setImages(prev => [...prev, ...files].slice(0, 6));
    e.currentTarget.value = '';
  };

  // Paste image from clipboard
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (!isOpen) return;
      const items = e.clipboardData?.items || [];
      const imgs: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (it.type.startsWith('image/')) {
          const f = it.getAsFile();
          if (f) imgs.push(f);
        }
      }
      if (imgs.length) {
        setImages(prev => [...prev, ...imgs].slice(0, 6));
      }
    };
    window.addEventListener('paste', onPaste as any);
    return () => window.removeEventListener('paste', onPaste as any);
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    
    try {
      const imageUrls: string[] = [];
      const imagesBase64: string[] = [];
      
      try {
        if (images.length) {
          for (const file of images.slice(0, 6)) {
            const dataUrl = await compressImageToWebP(file, { maxWidth: 1600, maxHeight: 1600, quality: 0.82 });
            imagesBase64.push(dataUrl);
          }
        }
      } catch {}

      const payload = {
        type,
        title: title.trim(),
        description: description.trim(),
        includeMeta: true,
        context: {
          user: user ? { name: user.name, email: user.email, role: user.role } : undefined,
          url: window.location.href,
          userAgent: navigator.userAgent,
          appVersion: (window as any).__APP_VERSION__ || ''
        },
        images: imageUrls,
        imagesBase64
      };

      // Em desenvolvimento local, usar o endpoint de produção
      // pois as Netlify Functions não estão disponíveis localmente
      const endpoint = '/api/feedback';
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      setSent(true);
    } catch (e: any) {
      setError(e?.message || 'Falha ao enviar.');
    } finally {
      setSubmitting(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={handleClose}
      />
      
      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Melhorias e Bugs</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {sent ? (
              <div className="text-center py-8">
                <div className="text-green-500 text-6xl mb-4">✅</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Feedback enviado!</h3>
                <p className="text-gray-600">Obrigado pela sua contribuição.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Tipo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Tipo
                  </label>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setType('Melhoria')}
                      className={`flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                        type === 'Melhoria'
                          ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                          : 'bg-gray-100 text-gray-600 border-2 border-gray-300 hover:bg-gray-200'
                      }`}
                    >
                      💡 Melhoria
                    </button>
                    <button
                      onClick={() => setType('Bug')}
                      className={`flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                        type === 'Bug'
                          ? 'bg-red-100 text-red-700 border-2 border-red-300'
                          : 'bg-gray-100 text-gray-600 border-2 border-gray-300 hover:bg-gray-200'
                      }`}
                    >
                      🐛 Bug
                    </button>
                  </div>
                </div>

                {/* Título */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Título (opcional)
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Resumo do feedback..."
                  />
                </div>

                {/* Descrição */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descrição <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Descreva detalhadamente sua sugestão ou o problema encontrado..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Mínimo de 5 caracteres
                  </p>
                </div>

                {/* Upload de Imagens */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Imagens (opcional)
                  </label>
                  
                  {/* Drop Zone */}
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                      isDragOver 
                        ? 'border-blue-400 bg-blue-50' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileInput}
                      className="hidden"
                      id="image-upload"
                    />
                    <label htmlFor="image-upload" className="cursor-pointer block">
                      <div className="space-y-2">
                        {isDragOver ? (
                          <>
                            <svg className="mx-auto h-12 w-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <div className="text-sm font-medium text-blue-600">
                              Solte as imagens aqui!
                            </div>
                          </>
                        ) : (
                          <>
                            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <div className="text-sm text-gray-600">
                              <span className="font-medium text-blue-600 hover:text-blue-500">
                                Clique para selecionar
                              </span>
                              {' '}ou arraste imagens aqui
                            </div>
                            <p className="text-xs text-gray-500">
                              PNG, JPG, GIF até 10MB cada (máx. 6 imagens)
                            </p>
                          </>
                        )}
                      </div>
                    </label>
                  </div>

                  {/* Imagens Preview */}
                  {images.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      {images.map((file, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg border border-gray-200"
                          />
                          <button
                            onClick={() => removeImage(index)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                          >
                            ×
                          </button>
                          <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                            {(file.size / 1024 / 1024).toFixed(1)}MB
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Erro */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-red-800">{error}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {!sent && (
            <div className="border-t border-gray-200 p-4">
              <div className="flex space-x-3">
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default FeedbackSidebar;
