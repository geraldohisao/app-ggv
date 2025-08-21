import React, { useEffect, useMemo, useState } from 'react';
import { ModalBase } from './ModalBase';
import { listAppSettingsMasked, getAppSetting, upsertAppSetting, saveGeminiApiKey } from '../../services/supabaseService';
import { vectorHealth } from '../../utils/vectorHealth';
import { setUseRemoteEmbeddings } from '../../services/embeddingService';
import { useUser } from '../../contexts/DirectUserContext';
import { UserRole } from '../../types';

const maskValue = (full?: string | null) => {
  if (!full) return '';
  const s = String(full);
  if (s.length <= 6) return '******';
  return '****' + s.slice(-6);
};

export const Preferences: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user } = useUser();
  const isAdmin = !!(user && (user.role === UserRole.SuperAdmin || user.role === UserRole.Admin));

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Array<{ key: string; value_preview: string; updated_at: string }>>([]);
  const [geminiPreview, setGeminiPreview] = useState<string>('');
  const [geminiInput, setGeminiInput] = useState<string>('');
  const [revealedSuffix, setRevealedSuffix] = useState<string>('');
  const [useRemote, setUseRemote] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [useWeb, setUseWeb] = useState<boolean>(false);
  const [webHint, setWebHint] = useState<string>('');
  const [webTopK, setWebTopK] = useState<number>(2);
  const [webTimeout, setWebTimeout] = useState<number>(5000);
  const [cseKey, setCseKey] = useState<string>('');
  const [cseCx, setCseCx] = useState<string>('');
  const [webProvider, setWebProvider] = useState<string>('google_cse');
  const [tavilyKey, setTavilyKey] = useState<string>('');
  const [tavilyActive, setTavilyActive] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      try {
        const masked = await listAppSettingsMasked();
        setItems(masked);
        const g = masked.find(i => i.key === 'gemini_api_key');
        setGeminiPreview(g?.value_preview || '');
        try {
          const flag = await getAppSetting('USE_REMOTE_EMBEDDINGS');
          setUseRemote(typeof flag === 'boolean' ? flag : String(flag) === 'true');
        } catch {}
        // Web search
        try {
          const wEnabled = await getAppSetting('USE_WEB_SEARCH');
          setUseWeb(Boolean(wEnabled === true || String(wEnabled).toLowerCase() === 'true'));
        } catch {}
        try { const hint = await getAppSetting('WEB_CONTEXT_HINT'); setWebHint(typeof hint === 'string' ? hint : ''); } catch {}
        try { const tk = await getAppSetting('WEB_TOPK'); setWebTopK(Number(tk || 2) || 2); } catch {}
        try { const to = await getAppSetting('WEB_TIMEOUT_MS'); setWebTimeout(Number(to || 5000) || 5000); } catch {}
        try { const ak = await getAppSetting('G_CSE_API_KEY'); setCseKey(typeof ak === 'string' ? ak : ''); } catch {}
        try { const cx = await getAppSetting('G_CSE_CX'); setCseCx(typeof cx === 'string' ? cx : ''); } catch {}
        try { const prov = await getAppSetting('WEB_PROVIDER'); setWebProvider(String(prov || 'google_cse')); } catch {}
        try { const tv = await getAppSetting('TAVILY_API_KEY'); const s = typeof tv === 'string' ? tv : ''; setTavilyKey(s); setTavilyActive(!!s && s.trim().length>0); } catch {}
      } catch (e) {
        console.warn('Preferências (masked) falhou:', (e as any)?.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onReveal = async () => {
    if (!isAdmin) return;
    try {
      const raw = await getAppSetting('gemini_api_key');
      const sfx = maskValue(raw).replace(/^\*+/, '');
      setRevealedSuffix(sfx);
    } catch (e: any) {
      alert(e?.message || 'Falha ao revelar.');
    }
  };

  const onSaveGemini = async () => {
    if (!isAdmin) return;
    if (!geminiInput || !geminiInput.trim()) {
      alert('Insira a chave antes de salvar.');
      return;
    }
    if (!confirm('Sobrescrever a chave atual?')) return;
    setSaving(true);
    try {
      await saveGeminiApiKey(geminiInput.trim());
      setGeminiPreview(maskValue(geminiInput.trim()));
      setGeminiInput('');
      setRevealedSuffix('');
      const t = (window as any).toast;
      if (t?.success) t.success('Chave salva com sucesso.'); else alert('Chave salva com sucesso.');
    } catch (e: any) {
      const t = (window as any).toast;
      if (t?.error) t.error(e?.message || 'Falha ao salvar.'); else alert(e?.message || 'Falha ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const onToggleRemote = async (v: boolean) => {
    if (!isAdmin) return;
    setUseRemote(v);
    setUseRemoteEmbeddings(v); // efeito imediato
    try {
      await upsertAppSetting('USE_REMOTE_EMBEDDINGS', v as any);
    } catch (e: any) {
      // rollback visual e de runtime
      setUseRemote(!v);
      setUseRemoteEmbeddings(!v);
      const t = (window as any).toast;
      if (t?.error) t.error(e?.message || 'Falha ao salvar preferência.'); else alert(e?.message || 'Falha ao salvar preferência.');
    }
  };

  const onToggleWeb = async (v: boolean) => {
    if (!isAdmin) return;
    setUseWeb(v);
    try {
      await upsertAppSetting('USE_WEB_SEARCH', v as any);
    } catch (e: any) {
      setUseWeb(!v);
      const t = (window as any).toast; if (t?.error) t.error(e?.message || 'Falha ao salvar.'); else alert(e?.message || 'Falha ao salvar.');
    }
  };

  const onSaveWeb = async () => {
    if (!isAdmin) return;
    const hasTavily = !!(tavilyKey && tavilyKey.trim().length > 0);
    if (useWeb && webProvider === 'google_cse' && !hasTavily && (!cseKey || !cseCx)) {
      const t = (window as any).toast; if (t?.error) t.error('Informe API Key e CX do Google CSE.'); else alert('Informe API Key e CX do Google CSE.');
      return;
    }
    try {
      await Promise.all([
        upsertAppSetting('WEB_CONTEXT_HINT', webHint as any),
        upsertAppSetting('WEB_TOPK', webTopK as any),
        upsertAppSetting('WEB_TIMEOUT_MS', webTimeout as any),
        upsertAppSetting('G_CSE_API_KEY', cseKey as any),
        upsertAppSetting('G_CSE_CX', cseCx as any),
        upsertAppSetting('WEB_PROVIDER', webProvider as any),
        upsertAppSetting('TAVILY_API_KEY', tavilyKey as any),
      ]);
      const t = (window as any).toast; if (t?.success) t.success('Preferências de Web salvas.'); else alert('Preferências de Web salvas.');
    } catch (e: any) {
      const t = (window as any).toast; if (t?.error) t.error(e?.message || 'Falha ao salvar.'); else alert(e?.message || 'Falha ao salvar.');
    }
  };

  return (
    <ModalBase title="Preferências" onClose={onClose}>
      {loading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-5 bg-slate-200 rounded" />
          <div className="h-5 bg-slate-200 rounded" />
          <div className="h-5 bg-slate-200 rounded" />
        </div>
      ) : (
        <div className="space-y-8">
          <section className="space-y-3">
            <h3 className="font-semibold text-slate-800">Chaves & Integrações</h3>
            <div className="bg-white border rounded-xl p-4 space-y-3">
              <div className="text-sm text-slate-600">Gemini API Key</div>
              <div className="flex items-center gap-2">
                <input type="password" className="border rounded px-3 py-1.5 w-72" placeholder="••••••"
                  value={geminiInput} onChange={e => setGeminiInput(e.target.value)} disabled={!isAdmin || saving} />
                <button onClick={onSaveGemini} disabled={!isAdmin || saving} className="px-3 py-1.5 border rounded hover:bg-slate-50 disabled:opacity-60">Salvar</button>
                <button onClick={onReveal} disabled={!isAdmin} className="px-3 py-1.5 border rounded hover:bg-slate-50 disabled:opacity-60">Revelar (admin)</button>
              </div>
              <div className="text-xs text-slate-500">
                Preview: {geminiPreview || '<vazio>'} {revealedSuffix && <span>(••••{revealedSuffix})</span>}<br/>
                A chave é ofuscada e não é exibida integralmente.
              </div>
              {isAdmin && (
                <div>
                  <button
                    onClick={async () => {
                      try {
                        const info = await vectorHealth();
                        alert(`Vector Health\nDocs: ${info.docsCount}${info.extversion ? `\npgvector: ${info.extversion}` : ''}${typeof info.explainPlanUsedIvf === 'boolean' ? `\nIVF usado: ${info.explainPlanUsedIvf}` : ''}`);
                      } catch (e: any) {
                        alert(e?.message || 'Falha ao verificar vetor.');
                      }
                    }}
                    className="mt-2 px-3 py-1.5 border rounded hover:bg-slate-50"
                  >
                    Verificar vetor (admin)
                  </button>
                </div>
              )}
            </div>

            <div className="bg-white border rounded-xl p-4 space-y-2">
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={useRemote} onChange={e => onToggleRemote(e.target.checked)} disabled={!isAdmin} />
                <span>Usar embeddings remotos (Gemini)</span>
              </label>
              <div className="text-xs text-slate-500">Quando desabilitado, o app usa embeddings locais determinísticos (768d) para estabilidade.</div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="font-semibold text-slate-800">Assistente</h3>
            <div className="bg-white border rounded-xl p-4 space-y-3">
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={useWeb} onChange={e => onToggleWeb(e.target.checked)} disabled={!isAdmin} />
                <span>Permitir consulta a dados externos (web)</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-slate-600 mb-1">Provider</div>
                  <select className="w-full border rounded px-3 py-1.5" value={webProvider} onChange={e=>setWebProvider(e.target.value)} disabled={!isAdmin}>
                    <option value="google_cse">Google CSE</option>
                    <option value="serpapi" disabled>SerpAPI (em breve)</option>
                    <option value="tavily">Tavily (prioritário automático)</option>
                  </select>
                </div>
                <div>
                  <div className="text-xs text-slate-600 mb-1">Dica de contexto (opcional)</div>
                  <input className="w-full border rounded px-3 py-1.5" value={webHint} onChange={e=>setWebHint(e.target.value)} placeholder="Ex.: vendas B2B Brasil, 2024, SaaS" disabled={!isAdmin} />
                </div>
                <div>
                  <div className="text-xs text-slate-600 mb-1">Resultados (topK)</div>
                  <input type="number" className="w-full border rounded px-3 py-1.5" value={webTopK} onChange={e=>setWebTopK(parseInt(e.target.value || '2') || 2)} disabled={!isAdmin} />
                </div>
                <div>
                  <div className="text-xs text-slate-600 mb-1">Timeout (ms)</div>
                  <input type="number" className="w-full border rounded px-3 py-1.5" value={webTimeout} onChange={e=>setWebTimeout(parseInt(e.target.value || '5000') || 5000)} disabled={!isAdmin} />
                </div>
                <div>
                  <div className="text-xs text-slate-600 mb-1">Google CSE API Key</div>
                  <input className="w-full border rounded px-3 py-1.5" value={cseKey} onChange={e=>setCseKey(e.target.value)} placeholder="opcional" disabled={!isAdmin} />
                </div>
                <div>
                  <div className="text-xs text-slate-600 mb-1">Google CSE CX</div>
                  <input className="w-full border rounded px-3 py-1.5" value={cseCx} onChange={e=>setCseCx(e.target.value)} placeholder="opcional" disabled={!isAdmin} />
                </div>
                <div>
                  <div className="text-xs text-slate-600 mb-1">Tavily API Key</div>
                  <input type="password" className="w-full border rounded px-3 py-1.5" value={tavilyKey} onChange={e=>setTavilyKey(e.target.value)} placeholder="opcional" disabled={!isAdmin} />
                  {tavilyActive && (
                    <span className="inline-block mt-1 text-[11px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">Tavily ativo</span>
                  )}
                </div>
              </div>
              <div className="flex justify-end">
                <button onClick={onSaveWeb} disabled={!isAdmin} className="px-3 py-1.5 border rounded hover:bg-slate-50 disabled:opacity-60">Salvar Preferências Web</button>
              </div>
              <div className="text-xs text-slate-500">Quando habilitado, o assistente pode buscar resumos na web como complemento ao cérebro. A base interna continua sendo priorizada.</div>
            </div>
          </section>
        </div>
      )}
    </ModalBase>
  );
};

export default Preferences;


