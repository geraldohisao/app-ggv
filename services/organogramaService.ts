import { UserRole } from '../types';
import { createPublicReport, getPublicReport, PublicReportRow } from './supabaseService';

export interface OrgChartUser {
  id: string;
  name: string;
  email: string;
  cargo: string;
  department: string;
  role: UserRole;
  is_active: boolean;
  avatar_url?: string;
}

export interface OrgChartCargo {
  name: string;
  level: number;
}

export interface OrgChartSnapshot {
  type: 'organograma';
  version: number;
  generatedAt: string;
  usuarios: OrgChartUser[];
  cargos: OrgChartCargo[];
}

const resolveBaseUrl = () => {
  if (typeof window === 'undefined') return 'https://app.grupoggv.com';
  return window.location.hostname === 'app.grupoggv.com'
    ? 'https://app.grupoggv.com'
    : window.location.origin;
};

export async function createPublicOrgChartLink(params: {
  usuarios: OrgChartUser[];
  cargos: OrgChartCargo[];
  expiresAt?: string;
}): Promise<{ token: string; url: string; snapshot: OrgChartSnapshot }> {
  const { usuarios, cargos, expiresAt } = params;

  if (!usuarios || usuarios.length === 0) {
    throw new Error('Nenhum usuário encontrado para gerar o link público.');
  }

  const snapshot: OrgChartSnapshot = {
    type: 'organograma',
    version: 1,
    generatedAt: new Date().toISOString(),
    usuarios,
    cargos: cargos || [],
  };

  const { token } = await createPublicReport(snapshot, undefined, expiresAt);
  const url = `${resolveBaseUrl()}/organograma-publico?t=${token}`;

  return { token, url, snapshot };
}

export async function getPublicOrgChart(token: string): Promise<OrgChartSnapshot | null> {
  if (!token) return null;

  // Preferir endpoint público via Netlify Function (sem exigir auth)
  try {
    const res = await fetch(`/.netlify/functions/organograma-publico?token=${encodeURIComponent(token)}`);
    if (res.ok) {
      const payload = await res.json();
      if (payload?.report) return payload.report as OrgChartSnapshot;
    }
  } catch {
    // fallback abaixo
  }

  const row: PublicReportRow | null = await getPublicReport(token);
  if (!row || !row.report) return null;

  if (row.report.type && row.report.type !== 'organograma') {
    throw new Error('Este link não corresponde a um organograma.');
  }

  return row.report as OrgChartSnapshot;
}
