import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getPublicOrgChart, OrgChartSnapshot } from '../services/organogramaService';
import OrganogramaUnificado from './settings/OrganogramaUnificado';
import { LoadingSpinner, ErrorDisplay } from './ui/Feedback';
import AppBrand from './common/AppBrand';

const PublicOrganogramaPage: React.FC = () => {
  const [params] = useSearchParams();
  const tokenFromPath = window.location.pathname.startsWith('/organograma-publico/')
    ? window.location.pathname.replace('/organograma-publico/', '')
    : '';
  const token = params.get('t') || tokenFromPath || '';

  const [snapshot, setSnapshot] = useState<OrgChartSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!token) {
        setError('Token inválido.');
        setLoading(false);
        return;
      }
      try {
        const snap = await getPublicOrgChart(token);
        if (!snap) {
          setError('Organograma não encontrado ou expirado.');
          return;
        }
        setSnapshot(snap);
      } catch (e: any) {
        setError(e?.message || 'Falha ao carregar organograma público.');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (!token) return <ErrorDisplay message="Token inválido." />;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingSpinner text="Carregando organograma público..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-xl w-full">
          <ErrorDisplay message={error} />
        </div>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <ErrorDisplay message="Organograma não encontrado ou expirado." />
      </div>
    );
  }

  const generatedAt = snapshot.generatedAt
    ? new Date(snapshot.generatedAt).toLocaleString('pt-BR')
    : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <header className="flex items-center justify-between gap-4 flex-wrap">
          <AppBrand className="h-10" />
          <div className="text-right text-sm text-slate-600">
            <p className="font-semibold text-slate-800">Organograma Público</p>
            {generatedAt && <p>Gerado em {generatedAt}</p>}
          </div>
        </header>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <OrganogramaUnificado
            isFullscreen
            staticData={{ usuarios: snapshot.usuarios, cargos: snapshot.cargos }}
            disableRealtime
            enableShare={false}
            allowManualRefresh={false}
          />
        </div>
      </div>
    </div>
  );
};

export default PublicOrganogramaPage;
