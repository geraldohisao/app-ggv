import React, { useEffect, useState } from 'react';
import { AiInsight, CallItem } from '../types';
import { analyzeCallWithAI } from '../services/geminiService';

interface Props { call: CallItem }

export default function AiAssistant({ call }: Props) {
  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    analyzeCallWithAI(call).then((r) => {
      if (!cancelled) setInsights(r);
    }).finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [call]);

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-800">Análise IA</h3>
        {loading && <span className="text-xs text-slate-500">Analisando...</span>}
      </div>
      <div className="space-y-2">
        {insights.map((i, idx) => (
          <div key={idx} className={`p-3 rounded border text-sm ${
            i.severity === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
            i.severity === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
            i.severity === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <div className="font-medium">{i.title}</div>
            <div className="text-slate-700">{i.content}</div>
          </div>
        ))}
        {!loading && insights.length === 0 && (
          <div className="text-sm text-slate-500">Sem insights no momento.</div>
        )}
      </div>
    </div>
  );
}


