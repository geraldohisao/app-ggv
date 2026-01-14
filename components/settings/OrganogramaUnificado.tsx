import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../services/supabaseClient';
import { UserRole } from '../../types';
import { createPublicOrgChartLink } from '../../services/organogramaService';
import { copyToClipboard } from '../../src/utils/clipboard';

// ============================================
// TIPOS
// ============================================

interface Cargo {
  name: string;
  level: number;
}

interface Usuario {
  id: string;
  name: string;
  email: string;
  cargo: string;
  department: string;
  role: UserRole;
  is_active: boolean;
  avatar_url?: string;
}

interface UsuarioComNivel extends Usuario {
  nivel: number;
}

export interface OrganogramaStaticData {
  usuarios: Usuario[];
  cargos: Cargo[];
}

interface OrganogramaUnificadoProps {
  isFullscreen?: boolean;
  staticData?: OrganogramaStaticData;
  disableRealtime?: boolean;
  enableShare?: boolean;
  allowManualRefresh?: boolean;
}

// ============================================
// COMPONENTE: CARD DO USUÁRIO
// ============================================

const OrgCard: React.FC<{ user: UsuarioComNivel }> = ({ user }) => {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  const getLevelColor = (level: number) => {
    const colors = {
      1: 'from-purple-600 to-indigo-600 ring-purple-200', // C-Level
      2: 'from-blue-600 to-cyan-600 ring-blue-200',       // Diretoria
      3: 'from-teal-500 to-emerald-500 ring-teal-200',     // Head
      4: 'from-orange-500 to-amber-500 ring-orange-200',   // Gerência
      5: 'from-slate-500 to-gray-500 ring-slate-200',      // Coordenação
      6: 'from-gray-400 to-gray-500 ring-gray-200',        // Operacional
      7: 'from-gray-300 to-gray-400 ring-gray-100',        // Estagiários
    };
    return colors[level as keyof typeof colors] || colors[5];
  };

  const getRoleBadge = (role: UserRole) => {
    if (role === UserRole.SuperAdmin) return <span title="Super Admin">🛡️</span>;
    if (role === UserRole.Admin) return <span title="Admin">⚡</span>;
    return null;
  };

  return (
    <div className="relative group z-10 transition-transform duration-300 hover:scale-105">
      <div className="bg-white rounded-xl shadow-md hover:shadow-xl p-4 w-[200px] border border-slate-200 flex flex-col items-center gap-2 relative overflow-hidden">
        
        {/* Faixa superior colorida por nível */}
        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${getLevelColor(user.nivel).split(' ')[0]}`}></div>

        {/* Avatar (Foto ou Iniciais) */}
        <div className={`w-12 h-12 rounded-full overflow-hidden shadow-sm ring-4 ring-white mb-1 ${!user.avatar_url ? `bg-gradient-to-br ${getLevelColor(user.nivel).split(' ')[0]} flex items-center justify-center text-white font-bold text-sm` : ''}`}>
          {user.avatar_url ? (
            <img 
              src={user.avatar_url} 
              alt={user.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback: se foto não carregar, mostrar iniciais
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  parent.className = `w-12 h-12 rounded-full bg-gradient-to-br ${getLevelColor(user.nivel).split(' ')[0]} flex items-center justify-center text-white font-bold text-sm shadow-sm ring-4 ring-white mb-1`;
                  parent.innerHTML = getInitials(user.name);
                }
              }}
            />
          ) : (
            getInitials(user.name)
          )}
        </div>

        {/* Informações */}
        <div className="text-center w-full">
          <h3 className="font-bold text-slate-800 text-sm leading-tight mb-1 truncate px-1" title={user.name}>
            {user.name} {getRoleBadge(user.role)}
          </h3>
          <p className="text-xs font-semibold text-slate-600 truncate px-1" title={user.cargo || 'Sem cargo'}>
            {user.cargo || 'Sem cargo'}
          </p>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-1 truncate">
            {user.department || 'Geral'}
          </p>
        </div>
      </div>
    </div>
  );
};

// ============================================
// COMPONENTE: CONECTOR (LINHAS)
// ============================================

const ConnectorV: React.FC<{ height?: string }> = ({ height = 'h-8' }) => (
  <div className={`w-px ${height} bg-slate-300`}></div>
);

// ============================================
// COMPONENTE: GRUPO DE DEPARTAMENTO
// ============================================

const DeptGroup: React.FC<{
  name: string;
  users: UsuarioComNivel[];
  color: string;
}> = ({ name, users, color }) => {
  // Agrupar por nível dentro do departamento (2-7)
  const byLevel = useMemo(() => {
    const groups = { 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] } as Record<number, UsuarioComNivel[]>;
    users.forEach(u => {
      if (u.nivel >= 2 && u.nivel <= 7) {
        if (!groups[u.nivel]) groups[u.nivel] = [];
        groups[u.nivel].push(u);
      }
    });
    return groups;
  }, [users]);

  if (users.length === 0) return null;

  return (
    <div className="flex flex-col items-center">
      {/* Conector vindo do Pai (CEO/COO) */}
      <div className="w-px h-8 bg-slate-300"></div>
      
      {/* Badge do Departamento */}
      <div className={`px-4 py-1 rounded-full text-xs font-bold text-white uppercase tracking-wider shadow-sm mb-4`} style={{ backgroundColor: color }}>
        {name}
      </div>

      {/* Árvore Hierárquica Interna */}
      <div className="flex flex-col items-center gap-4">
        {/* Nível 2 - Diretoria */}
        {byLevel[2]?.length > 0 && (
          <>
            <div className="flex gap-4">
              {byLevel[2].map(u => <OrgCard key={u.id} user={u} />)}
            </div>
            {/* Linha para baixo se houver próximos níveis */}
            {(byLevel[3]?.length || byLevel[4]?.length || byLevel[5]?.length) ? <ConnectorV /> : null}
          </>
        )}

        {/* Nível 3 - Heads */}
        {byLevel[3]?.length > 0 && (
          <>
             {/* Se não teve nível 2, precisamos de um conector inicial do badge */}
            {!byLevel[2]?.length && <div className="hidden"></div>}
            
            <div className="flex gap-4">
              {byLevel[3].map(u => <OrgCard key={u.id} user={u} />)}
            </div>
            {(byLevel[4]?.length || byLevel[5]?.length) ? <ConnectorV /> : null}
          </>
        )}

        {/* Nível 4 - Gerência */}
        {byLevel[4]?.length > 0 && (
          <>
            <div className="flex gap-4">
              {byLevel[4].map(u => <OrgCard key={u.id} user={u} />)}
            </div>
            {byLevel[5]?.length ? <ConnectorV /> : null}
          </>
        )}

        {/* Nível 5 - Coordenadores/Analistas Sênior */}
        {byLevel[5]?.length > 0 && (
          <>
            <div className="flex gap-4 flex-wrap justify-center">
              {byLevel[5].map(u => <OrgCard key={u.id} user={u} />)}
            </div>
            {(byLevel[6]?.length || byLevel[7]?.length) ? <ConnectorV /> : null}
          </>
        )}

        {/* Nível 6 - Operacional/Júnior (Grid para economizar espaço) */}
        {byLevel[6]?.length > 0 && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {byLevel[6].map(u => <OrgCard key={u.id} user={u} />)}
            </div>
            {byLevel[7]?.length ? <ConnectorV /> : null}
          </>
        )}

        {/* Nível 7 - Estagiários */}
        {byLevel[7]?.length > 0 && (
          <div className="grid grid-cols-2 gap-4">
            {byLevel[7].map(u => <OrgCard key={u.id} user={u} />)}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// COMPONENTE PRINCIPAL: ORGANOGRAMA UNIFICADO
// ============================================

export const OrganogramaUnificado: React.FC<OrganogramaUnificadoProps> = ({
  isFullscreen,
  staticData,
  disableRealtime = false,
  enableShare = false,
  allowManualRefresh = true,
}) => {
  const [usuarios, setUsuarios] = useState<Usuario[]>(staticData?.usuarios || []);
  const [cargos, setCargos] = useState<Cargo[]>(staticData?.cargos || []);
  const [loading, setLoading] = useState(!staticData);
  const [searchTerm, setSearchTerm] = useState('');
  const [missingCargos, setMissingCargos] = useState<string[]>([]);
  const [showLegend, setShowLegend] = useState(true);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const isStatic = Boolean(staticData);

  // 🔄 Busca de dados
  const fetchData = async () => {
    setLoading(true);
    try {
      if (!supabase) {
        setUsuarios([]);
        setCargos([]);
        return;
      }
      const { data: usersData } = await supabase
        .from('profiles')
        .select('id, name, email, cargo, department, role, is_active, avatar_url')
        .eq('is_active', true)
        .order('name');

      const { data: cargosData } = await supabase
        .from('cargos')
        .select('name, level')
        .eq('is_active', true);

      setUsuarios(usersData || []);
      setCargos(cargosData || []);
    } catch (error) {
      console.error('Erro ao carregar organograma:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateShareLink = async () => {
    if (loading || isStatic) return;
    setShareStatus('loading');
    setShareError(null);
    setShareCopied(false);
    try {
      const { url } = await createPublicOrgChartLink({
        usuarios: usuarios,
        cargos: cargos,
      });
      setShareUrl(url);
      setShareStatus('ready');
      const copied = await copyToClipboard(url);
      setShareCopied(copied);
    } catch (error: any) {
      setShareStatus('error');
      setShareError(error?.message || 'Falha ao gerar link público.');
    }
  };

  // 📡 Realtime
  useEffect(() => {
    if (staticData) {
      setUsuarios(staticData.usuarios || []);
      setCargos(staticData.cargos || []);
      setLoading(false);
      return;
    }

    fetchData();

    if (disableRealtime) return;

    const channel = supabase.channel('org_unificado')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cargos' }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [staticData, disableRealtime]);

  // 🧠 Processamento dos dados
  const { cLevel, deptGroups } = useMemo(() => {
    console.log(`🔍 [Organograma] Processando dados: ${usuarios.length} usuários, ${cargos.length} cargos, busca: "${searchTerm || 'vazia'}"`);
    
    // 1. Anexar nível (com validação anti-crash)
    const missing: string[] = [];
    
    const withLevel = usuarios.map(u => {
      const cargoInfo = cargos.find(c => c.name === u.cargo);
      
      // 🛡️ PROTEÇÃO: Se cargo não existe, logar e usar nível padrão
      if (!cargoInfo && u.cargo && !missing.includes(u.cargo)) {
        console.warn(`⚠️ Cargo "${u.cargo}" não encontrado na tabela cargos para usuário ${u.name}`);
        missing.push(u.cargo);
      }
      
      return {
        ...u,
        nivel: cargoInfo?.level || 5  // Fallback: nível 5 (operacional)
      };
    });
    
    // Atualizar lista de cargos faltantes
    setMissingCargos(missing);

    // 2. Filtrar busca
    const filtered = withLevel.filter(u => 
      !searchTerm || 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.cargo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.department?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    console.log(`🔍 [Organograma] Após filtro de busca: ${filtered.length} usuários (de ${withLevel.length})`);

    // 3. Separar C-Level (Nível 1)
    const cLevel = {
      ceo: filtered.filter(u => u.nivel === 1 && (u.cargo?.toUpperCase().includes('CEO') || u.cargo === 'Sócio')),
      coo: filtered.filter(u => u.nivel === 1 && u.cargo?.toUpperCase().includes('COO')),
      others: filtered.filter(u => u.nivel === 1 && !u.cargo?.toUpperCase().includes('CEO') && !u.cargo?.toUpperCase().includes('COO'))
    };

    // 4. Agrupar Departamentos (Nível > 1)
    const rest = filtered.filter(u => u.nivel > 1);
    const groups: Record<string, UsuarioComNivel[]> = {};
    
    rest.forEach(u => {
      const dept = u.department ? u.department.toLowerCase() : 'geral';
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(u);
    });

    const deptSummary = Object.entries(groups).map(([d, users]) => `${d}: ${users.length}`).join(', ');
    console.log(`🔍 [Organograma] Departamentos: ${Object.keys(groups).length} total`);
    console.log(`📊 [Organograma] Por dept: ${deptSummary}`);
    console.log(`👑 [Organograma] C-Level: CEO=${cLevel.ceo.length}, COO=${cLevel.coo.length}, Others=${cLevel.others.length}`);

    return { cLevel, deptGroups: groups };
  }, [usuarios, cargos, searchTerm]);

  // Definição da estrutura da árvore (Quem cuida de quê)
  const treeStructure = {
    ceoDepts: ['comercial', 'marketing', 'financeiro'],
    cooDepts: ['projetos', 'inovação', 'sucesso do cliente'],
    otherDepts: Object.keys(deptGroups).filter(d => 
      !['comercial', 'marketing', 'financeiro', 'projetos', 'inovação', 'sucesso do cliente'].includes(d)
    )
  };

  const deptColors: Record<string, string> = {
    'comercial': '#3B82F6',   // Blue
    'marketing': '#8B5CF6',   // Purple
    'financeiro': '#10B981',  // Emerald
    'projetos': '#F59E0B',    // Amber
    'inovação': '#EC4899',    // Pink
    'sucesso do cliente': '#06B6D4', // Cyan
    'geral': '#64748B'        // Slate
  };

  if (loading) return <div className="p-12 text-center text-slate-500 animate-pulse">Carregando estrutura organizacional...</div>;

  return (
    <div className="h-full flex flex-col relative">
      {/* Alerta de Cargos Faltantes */}
      {missingCargos.length > 0 && (
        <div className="absolute top-4 left-4 right-4 z-30 bg-red-50 border-l-4 border-red-500 p-3 rounded-r shadow-lg">
          <div className="flex items-start gap-2">
            <svg className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-800">⚠️ Cargos não encontrados!</h3>
              <p className="text-xs text-red-700 mt-1">
                Cargos atribuídos mas não existem na tabela: <strong>{missingCargos.join(', ')}</strong>
              </p>
              <p className="text-xs text-red-600 mt-1">
                💡 Execute <code className="bg-red-100 px-1 rounded">emergency_fix_cargos.sql</code> ou crie-os em Settings → Gerenciar Cargos
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Toolbar Flutuante */}
      <div className="absolute top-4 left-4 z-20 flex gap-2">
          <div className="bg-white/90 backdrop-blur p-1.5 rounded-lg shadow-sm border border-slate-200 flex items-center gap-2">
            <input 
                type="text" 
                placeholder="Buscar..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="px-2 py-1.5 bg-transparent text-sm w-48 focus:outline-none placeholder:text-slate-400"
            />
            <div className="w-px h-4 bg-slate-200"></div>
            {!isStatic && allowManualRefresh && (
              <button 
                  onClick={fetchData} 
                  className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                  title="Atualizar dados"
              >
                  🔄
              </button>
            )}
          </div>
          {enableShare && !isStatic && (
            <button
              onClick={handleGenerateShareLink}
              disabled={shareStatus === 'loading' || loading}
              className="bg-indigo-600 text-white text-sm font-semibold px-3 py-2 rounded-lg shadow-sm hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {shareStatus === 'loading' ? 'Gerando link...' : 'Gerar link público'}
            </button>
          )}
      </div>

      {/* Legenda Flutuante (Collapsible) */}
      <div className={`absolute top-4 right-4 z-20 transition-all duration-300 ${showLegend ? 'w-48' : 'w-auto'}`}>
          <div className="bg-white/90 backdrop-blur rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              <div 
                className="flex items-center justify-between p-2 cursor-pointer hover:bg-slate-50"
                onClick={() => setShowLegend(!showLegend)}
              >
                  <h4 className={`font-bold text-xs text-slate-700 ${!showLegend && 'hidden'}`}>Legenda</h4>
                  <span className="text-slate-400 text-xs">{showLegend ? '▼' : 'ℹ️'}</span>
              </div>
              
              {showLegend && (
                <div className="p-3 pt-0 text-xs space-y-1.5 border-t border-slate-100">
                    <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> Nível 1 - C-Level</div>
                    <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Nível 2 - Diretoria</div>
                    <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span> Nível 3 - Heads</div>
                    <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span> Nível 4 - Gerência</div>
                    <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span> Nível 5 - Coordenação</div>
                    <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-gray-400"></span> Nível 6 - Operacional</div>
                    <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-gray-300"></span> Nível 7 - Estagiários</div>
                </div>
              )}
          </div>
      </div>

      {/* Aviso de link público */}
      {enableShare && shareUrl && shareStatus === 'ready' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 max-w-xl w-[90%]">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl shadow-md px-4 py-3 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-emerald-800">Link público gerado</p>
                <p className="text-xs text-emerald-700">O link já foi copiado para a área de transferência.</p>
              </div>
              <a
                href={shareUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-semibold text-emerald-800 hover:text-emerald-900 underline"
              >
                Abrir
              </a>
            </div>
            <div className="bg-white border border-emerald-100 rounded-lg px-3 py-2 text-xs text-emerald-800 truncate">
              {shareUrl}
            </div>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  const copied = await copyToClipboard(shareUrl);
                  setShareCopied(copied);
                }}
                className="px-3 py-2 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold hover:bg-emerald-200 transition-colors"
              >
                {shareCopied ? 'Copiado!' : 'Copiar novamente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {enableShare && shareStatus === 'error' && shareError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 max-w-xl w-[90%]">
          <div className="bg-red-50 border border-red-200 rounded-xl shadow-md px-4 py-3 text-sm text-red-700">
            {shareError}
          </div>
        </div>
      )}

      {/* Área do Organograma (Scrollável) */}
      <div className="flex-1 overflow-auto bg-slate-50 p-8 pt-20 shadow-inner custom-scrollbar">
        <div className="min-w-max flex flex-col items-center pb-20 scale-90 origin-top">
          
          {/* 1. TOPO: CEO e COO */}
          <div className="flex gap-24 items-start relative">
            
            {/* Grupo CEO */}
            <div className="flex flex-col items-center">
              <div className="mb-2 text-xs font-bold text-indigo-900 uppercase tracking-widest bg-indigo-100 px-3 py-1 rounded-full">Gestão Estratégica</div>
              <div className="flex gap-4">
                {cLevel.ceo.map(u => <OrgCard key={u.id} user={u} />)}
              </div>
              
              {/* Linha conectora para departamentos do CEO */}
              {treeStructure.ceoDepts.some(d => deptGroups[d]?.length) && (
                <div className="flex flex-col items-center w-full">
                  <div className="w-px h-8 bg-slate-400"></div>
                  {/* Barra horizontal distribuidora */}
                  <div className="h-px bg-slate-400 w-[90%] relative">
                     {/* Conectores descendo para cada depto serão desenhados nos DeptGroups se alinhados, 
                         mas aqui fazemos um container flex abaixo */}
                  </div>
                </div>
              )}
            </div>

            {/* Grupo COO */}
            <div className="flex flex-col items-center">
              <div className="mb-2 text-xs font-bold text-amber-900 uppercase tracking-widest bg-amber-100 px-3 py-1 rounded-full">Gestão Operacional</div>
              <div className="flex gap-4">
                {cLevel.coo.map(u => <OrgCard key={u.id} user={u} />)}
              </div>

               {/* Linha conectora para departamentos do COO */}
               {treeStructure.cooDepts.some(d => deptGroups[d]?.length) && (
                <div className="flex flex-col items-center w-full">
                  <div className="w-px h-8 bg-slate-400"></div>
                  <div className="h-px bg-slate-400 w-[90%]"></div>
                </div>
              )}
            </div>
          </div>

          {/* 2. DEPARTAMENTOS */}
          <div className="flex gap-16 mt-0 items-start justify-center">
            
            {/* Lado Esquerdo (CEO Depts) */}
            <div className="flex gap-6 items-start">
              {treeStructure.ceoDepts.map(dept => (
                deptGroups[dept] && (
                  <DeptGroup 
                    key={dept} 
                    name={dept} 
                    users={deptGroups[dept]} 
                    color={deptColors[dept] || '#64748B'} 
                  />
                )
              ))}
            </div>

            {/* Separador Central (se necessário) */}
            <div className="w-12"></div>

            {/* Lado Direito (COO Depts) */}
            <div className="flex gap-6 items-start">
              {treeStructure.cooDepts.map(dept => (
                deptGroups[dept] && (
                  <DeptGroup 
                    key={dept} 
                    name={dept} 
                    users={deptGroups[dept]} 
                    color={deptColors[dept] || '#64748B'} 
                  />
                )
              ))}
            </div>
          </div>

          {/* 3. OUTROS DEPARTAMENTOS (Geral, etc) */}
          {treeStructure.otherDepts.some(d => deptGroups[d]?.length) && (
            <div className="mt-16 flex flex-col items-center border-t border-slate-200 pt-8 w-full">
              <h3 className="text-sm font-semibold text-slate-400 uppercase mb-6">Outros Departamentos</h3>
              <div className="flex gap-6 flex-wrap justify-center">
                {treeStructure.otherDepts.map(dept => (
                  <DeptGroup 
                    key={dept} 
                    name={dept} 
                    users={deptGroups[dept]} 
                    color={deptColors[dept] || '#64748B'} 
                  />
                ))}
              </div>
            </div>
          )}

          {/* Legenda (Removida daqui pois agora é flutuante no topo) */}
        </div>
      </div>
    </div>
  );
};

export default OrganogramaUnificado;

