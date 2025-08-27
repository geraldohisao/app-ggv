import React, { useMemo, useState } from 'react';
import { useUser } from '../../contexts/DirectUserContext';
import { UserRole } from '../../types';
import { PaperAirplaneIcon, FlagIcon, SparklesIcon, ChatBubbleLeftRightIcon, XMarkIcon } from './icons';
import { supabase } from '../../services/supabaseClient';

type FeedbackType = 'Bug' | 'Melhoria';

const MIN_DESC = 5;

const pillBase = 'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm border transition-colors';

const FeedbackWidget: React.FC = () => {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [type, setType] = useState<FeedbackType>('Melhoria');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sent, setSent] = useState(false);
  const [doneView, setDoneView] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<File[]>([]);

  const isSuperAdmin = user?.role === UserRole.SuperAdmin;

  // Show for all authenticated users; hide on public pages
  const shouldRender = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const forceFeedback = params.get('feedback') === '1' || localStorage.getItem('ggv-feedback-force') === '1';
    if (!user && !forceFeedback) return false;
    const path = window.location.pathname;
    const isPublic = path === '/resultado-diagnostico' || /^\/r\//.test(path);
    return !isPublic;
  }, [user, isSuperAdmin]);

  if (!shouldRender) return null;

  const canSubmit = description.trim().length >= MIN_DESC && !submitting;

  const onOpen = () => {
    setOpen(true);
    setSent(false);
    setError(null);
    setDoneView(false);
  };

  const onClose = () => {
    setOpen(false);
    setTimeout(() => {
      setTitle('');
      setDescription('');
      setType('Melhoria');
      setSubmitting(false);
      setSent(false);
      setError(null);
      setImages([]);
      setDoneView(false);
    }, 200);
  };

  const handleDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/'));
    if (files.length) setImages(prev => [...prev, ...files].slice(0, 6));
  };

  const handleFileInput: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
    if (files.length) setImages(prev => [...prev, ...files].slice(0, 6));
    e.currentTarget.value = '';
  };

  // Paste image from clipboard (like chat)
  React.useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
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
        setOpen(true);
      }
    };
    window.addEventListener('paste', onPaste as any);
    return () => window.removeEventListener('paste', onPaste as any);
  }, []);

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

      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      let endpoint = '/api/feedback';
      if (isLocalhost) {
        // Em desenvolvimento local, usar proxy do Vite
        endpoint = '/.netlify/functions/feedback';
      }
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
      setDoneView(true);
    } catch (e: any) {
      setError(e?.message || 'Falha ao enviar.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating trigger button - smaller/cleaner */}
      <button
        onClick={onOpen}
        className={`fixed bottom-20 right-4 z-40 bg-slate-900 text-white shadow-md rounded-full px-3 py-2 flex items-center gap-2 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400`}
        aria-label="Enviar feedback"
      >
        <ChatBubbleLeftRightIcon className="w-4 h-4" />
        <span className="hidden sm:inline text-sm">Feedback</span>
      </button>

      {/* Slide-over panel */}
      <div
        className={`fixed inset-0 z-50 ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
        aria-hidden={!open}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
          onClick={onClose}
        />

        {/* Panel */}
        <aside
          className={`absolute right-0 top-0 h-full w-full sm:w-[420px] bg-white shadow-2xl border-l border-slate-200 transform transition-transform ${open ? 'translate-x-0' : 'translate-x-full'}`}
          role="dialog"
          aria-modal="true"
        >
          <header className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Envie seu feedback</h2>
            <button onClick={onClose} aria-label="Fechar" className="p-1 text-slate-500 hover:text-slate-700">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </header>

          <div className="p-4 space-y-5 overflow-y-auto h-[calc(100%-120px)]">
            {doneView ? (
              <div className="h-full flex flex-col items-center justify-center text-center gap-3 p-6">
                <div className="text-5xl">✅</div>
                <div className="text-lg font-semibold text-slate-800">Feedback enviado!</div>
                <div className="text-slate-600 text-sm max-w-sm">Obrigado por contribuir. Suas informações nos ajudam a melhorar o produto.</div>
                <button onClick={onClose} className="mt-2 px-4 py-2 rounded-md bg-slate-900 text-white hover:bg-slate-800">Fechar</button>
              </div>
            ) : (
            <>
            {/* Type selector */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setType('Melhoria')}
                className={`${pillBase} ${type === 'Melhoria' ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 hover:bg-slate-50'}`}
                aria-pressed={type === 'Melhoria'}
              >
                <SparklesIcon className="w-4 h-4" /> Melhoria
              </button>
              <button
                type="button"
                onClick={() => setType('Bug')}
                className={`${pillBase} ${type === 'Bug' ? 'bg-rose-600 text-white border-rose-600' : 'border-slate-200 hover:bg-slate-50'}`}
                aria-pressed={type === 'Bug'}
              >
                <FlagIcon className="w-4 h-4" /> Bug
              </button>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Título (opcional)</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: Sugestão de melhoria no relatório"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                placeholder="Descreva claramente sua sugestão ou o problema encontrado."
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
              <div className="mt-1 text-xs text-slate-500">Mínimo de {MIN_DESC} caracteres.</div>
            </div>

            {/* Images */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border border-dashed border-slate-300 rounded-lg p-3 text-center text-sm text-slate-600 hover:bg-slate-50"
            >
              Clique para adicionar imagem ou arraste aqui
              <label className="ml-1 underline cursor-pointer">
                selecionar
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileInput} />
              </label>
              <div className="mt-2 flex flex-wrap gap-2 justify-center">
                {images.map((img, i) => {
                  const url = URL.createObjectURL(img);
                  return (
                    <div key={i} className="w-16 h-16 rounded overflow-hidden border">
                      <img src={url} alt="preview" className="w-full h-full object-cover" onLoad={() => URL.revokeObjectURL(url)} />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Status */}
            {error && (
              <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded p-2">{error}</div>
            )}
            {sent && !error && (
              <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded p-2">Feedback enviado com sucesso! Obrigado.</div>
            )}
            </>
            )}
          </div>

          {!doneView && (
          <footer className="sticky bottom-0 bg-white border-t border-slate-200 p-3 flex justify-end gap-2">
            <button onClick={onClose} className="px-3 py-2 rounded-md border hover:bg-slate-50 min-h-[40px] text-sm">Cancelar</button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`px-4 py-2 rounded-md text-white min-h-[40px] inline-flex items-center gap-2 text-sm ${canSubmit ? 'bg-slate-900 hover:bg-slate-800' : 'bg-slate-400 cursor-not-allowed'}`}
            >
              <PaperAirplaneIcon className="w-4 h-4" /> Enviar
            </button>
          </footer>
          )}
        </aside>
      </div>
    </>
  );
};

export default FeedbackWidget;

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
