import React, { useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useUser } from '../../contexts/DirectUserContext';

interface WorkspaceUser {
  googleId: string;
  email: string;
  name: string;
  cargo: string;
  department: string;
  organizationalUnit: string;
  isActive: boolean;
  photoUrl?: string | null;  // Foto do Google Workspace
  action: 'create' | 'update' | 'skip';
}

export const WorkspaceImportModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user } = useUser();
  const [step, setStep] = useState<'initial' | 'loading' | 'preview' | 'importing' | 'done'>('initial');
  const [users, setUsers] = useState<WorkspaceUser[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState({ imported: 0, updated: 0, skipped: 0, errors: 0 });
  const isImportSuccess = stats.errors === 0;
  const isImportFailed = stats.errors > 0 && (stats.imported + stats.updated) === 0;
  const doneIcon = isImportFailed ? '❌' : isImportSuccess ? '🎉' : '⚠️';
  const doneTitle = isImportFailed
    ? 'Importação não foi concluída com sucesso'
    : isImportSuccess
      ? 'Importação concluída!'
      : 'Importação concluída com erros';
  const doneSubtitle = isImportFailed
    ? 'Não foi possível importar/atualizar nenhum usuário. Verifique os erros abaixo.'
    : isImportSuccess
      ? 'Tudo certo! Os usuários selecionados foram processados.'
      : 'Alguns usuários não puderam ser importados/atualizados. Verifique os erros abaixo.';

  // MOCK - Dados de exemplo (depois substituir por chamada real ao Google)
  const mockGoogleUsers = [
    {
      googleId: '1',
      email: 'teste@grupoggv.com',
      name: 'Teste Usuario',
      cargo: 'SDR',
      department: 'comercial',
      organizationalUnit: 'Grupo GGV',
      isActive: true,
      action: 'create' as const,
    }
  ];

  const handleFetch = async () => {
    setStep('loading');
    
    try {
      const supabaseUrl = (window as any).APP_CONFIG?.SUPABASE_URL || 'https://mwlekwyxbfbxfxskywgx.supabase.co';
      const supabaseKey = (window as any).APP_CONFIG?.SUPABASE_ANON_KEY || '';
      
      console.log('🔍 [Workspace Import] Supabase URL:', supabaseUrl);
      console.log('🔍 [Workspace Import] Key disponível:', !!supabaseKey);
      
      const productionUrl = `${supabaseUrl}/functions/v1/fetch-workspace-users`;
      console.log('🌐 [Workspace Import] Chamando:', productionUrl);
      
      const response = await fetch(productionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
      });
      
      console.log('📡 [Workspace Import] Response status:', response?.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📦 [Workspace Import] Data received:', data);
        
        if (data.success && data.users && data.users.length > 0) {
          const { data: existingUsers } = await supabase
            .from('profiles')
            .select('email');
          
          const existingEmails = new Set(existingUsers?.map(u => u.email) || []);
          
          const mappedUsers = data.users.map((u: any) => ({
            ...u,
            action: existingEmails.has(u.email) ? 'update' as const : 'create' as const,
          }));
          
          setUsers(mappedUsers);
          setSelected(new Set(mappedUsers.map((u: any) => u.email)));
          setStep('preview');
          return;
        }
      }
      
      // Se chegou aqui, usar mock
      const errorData = await response.text();
      console.error('❌ [Workspace Import] Error response:', errorData);
      
      alert('⚠️ Edge Function com erro!\n\nUsando dados mock para teste.\n\nVeja o console para detalhes.');
      
      setTimeout(() => {
        setUsers(mockGoogleUsers);
        setSelected(new Set(mockGoogleUsers.map(u => u.email)));
        setStep('preview');
      }, 1000);
      
    } catch (error: any) {
      console.error('❌ [Workspace Import] Exception:', error);
      alert('Erro: ' + error.message);
      
      setTimeout(() => {
        setUsers(mockGoogleUsers);
        setSelected(new Set(mockGoogleUsers.map(u => u.email)));
        setStep('preview');
      }, 1000);
    }
  };

  const handleImport = async () => {
    setStep('importing');
    
    try {
      const usersToImport = users.filter(u => selected.has(u.email));
      let imported = 0;
      let updated = 0;
      let errors = 0;

      for (const user of usersToImport) {
        try {
          console.log(`📥 Importando ${user.email}...`);
          
          const { data, error } = await supabase.rpc('workspace_sync_user', {
            p_google_id: user.googleId,
            p_email: user.email,
            p_name: user.name,
            p_cargo: user.cargo,
            p_department: user.department,
            p_organizational_unit: user.organizationalUnit,
            p_is_active: user.isActive,
            p_avatar_url: user.photoUrl || null,  // Foto do Google
          });

          if (error) {
            console.error(`❌ Erro ao importar ${user.email}:`, error);
            // #region agent log
            const host = typeof window !== 'undefined' ? window.location.hostname : '';
            const isLocal = host === 'localhost' || host === '127.0.0.1';
            if (isLocal) {
              fetch('http://127.0.0.1:7242/ingest/d9f25aad-ab08-4cdf-bf8b-99a2626827e0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'WorkspaceImportModal.tsx:132',message:'workspace_sync_user RPC error',data:{email:user.email,code:(error as any)?.code,message:(error as any)?.message,details:(error as any)?.details,hint:(error as any)?.hint},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
            }
            // #endregion
            errors++;
            continue; // Pula para próximo
          }
          
          console.log(`✅ ${user.email} importado com sucesso!`);
          if (user.action === 'create') imported++;
          else updated++;
          
        } catch (err: any) {
          console.error(`❌ Exception ao importar ${user.email}:`, err);
          errors++;
        }
      }

      setStats({ imported, updated, skipped: users.length - usersToImport.length, errors });
      
      console.log(`📊 Resumo: ${imported} importados, ${updated} atualizados, ${errors} erros`);
      
      if (errors > 0 && (imported + updated) === 0) {
        alert(`❌ Falha na importação!\n\n${errors} erro(s) encontrado(s).\n\nVerifique:\n1. Se executou fix_profiles_id_default.sql\n2. Console para detalhes dos erros`);
      }
      
      setStep('done');
      
    } catch (error) {
      console.error('Erro na importação:', error);
      alert('Erro durante a importação');
      setStep('preview');
    }
  };

  const toggleUser = (email: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(email)) {
      newSelected.delete(email);
    } else {
      newSelected.add(email);
    }
    setSelected(newSelected);
  };

  const toggleAll = () => {
    if (selected.size === users.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(users.map(u => u.email)));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">🔄 Importar do Google Workspace</h2>
              <p className="text-indigo-100 text-sm mt-1">
                Sincronize usuários, cargos e departamentos automaticamente
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          
          {/* STEP: Initial */}
          {step === 'initial' && (
            <div className="text-center py-12">
              <div className="text-6xl mb-6">☁️</div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">
                Pronto para importar do Google Workspace?
              </h3>
              <p className="text-slate-600 mb-8 max-w-2xl mx-auto">
                Vamos buscar todos os usuários do Google Workspace e você escolhe quais importar.
                O sistema vai trazer: nome, email, cargo, departamento e unidade organizacional.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 max-w-2xl mx-auto mb-8">
                <h4 className="font-bold text-blue-900 mb-3">ℹ️ Importante:</h4>
                <ul className="text-sm text-blue-800 space-y-2 text-left">
                  <li>✅ Roles (SUPER_ADMIN/ADMIN/USER) são gerenciados no sistema</li>
                  <li>✅ Usuários existentes serão atualizados (cargo, dept, status)</li>
                  <li>✅ Novos usuários serão criados com role = USER</li>
                  <li>✅ Roles editados manualmente serão preservados</li>
                </ul>
              </div>
              <button
                onClick={handleFetch}
                className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-lg hover:shadow-xl transition-all"
              >
                🚀 Buscar Usuários do Google
              </button>
            </div>
          )}

          {/* STEP: Loading */}
          {step === 'loading' && (
            <div className="text-center py-20">
              <div className="animate-spin text-6xl mb-6">⏳</div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Buscando usuários do Google Workspace...
              </h3>
              <p className="text-slate-600">Isso pode levar alguns segundos</p>
            </div>
          )}

          {/* STEP: Preview */}
          {step === 'preview' && (
            <div>
              <div className="mb-6">
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  📋 Preview: {users.length} usuários encontrados
                </h3>
                <p className="text-slate-600">
                  Selecione quais usuários deseja importar
                </p>
              </div>

              <div className="mb-4 flex gap-3">
                <button
                  onClick={toggleAll}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-semibold"
                >
                  {selected.size === users.length ? '☐ Desmarcar todos' : '☑️ Selecionar todos'}
                </button>
                <div className="flex-1"></div>
                <div className="text-sm text-slate-600 bg-slate-100 px-4 py-2 rounded-lg">
                  {selected.size} de {users.length} selecionados
                </div>
              </div>

              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="py-3 px-4 text-left">
                        <input
                          type="checkbox"
                          checked={selected.size === users.length}
                          onChange={toggleAll}
                        />
                      </th>
                      <th className="py-3 px-4 text-left">Foto</th>
                      <th className="py-3 px-4 text-left">Email</th>
                      <th className="py-3 px-4 text-left">Nome</th>
                      <th className="py-3 px-4 text-left">Cargo</th>
                      <th className="py-3 px-4 text-left">Departamento</th>
                      <th className="py-3 px-4 text-left">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user.email} className="border-t hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={selected.has(user.email)}
                            onChange={() => toggleUser(user.email)}
                          />
                        </td>
                        <td className="py-3 px-4">
                          {user.photoUrl ? (
                            <img 
                              src={user.photoUrl} 
                              alt={user.name} 
                              className="w-8 h-8 rounded-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
                              {user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">{user.email}</td>
                        <td className="py-3 px-4 font-medium">{user.name}</td>
                        <td className="py-3 px-4">{user.cargo}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                            {user.department}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            user.action === 'create' ? 'bg-green-100 text-green-800' :
                            user.action === 'update' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {user.action === 'create' ? '✨ Criar' :
                             user.action === 'update' ? '🔄 Atualizar' :
                             '⏭️ Pular'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex gap-3 justify-end">
                <button
                  onClick={() => setStep('initial')}
                  className="px-6 py-3 border border-slate-300 rounded-lg font-semibold hover:bg-slate-50"
                >
                  ← Voltar
                </button>
                <button
                  onClick={handleImport}
                  disabled={selected.size === 0}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                >
                  📥 Importar {selected.size} usuários
                </button>
              </div>
            </div>
          )}

          {/* STEP: Importing */}
          {step === 'importing' && (
            <div className="text-center py-20">
              <div className="animate-bounce text-6xl mb-6">📥</div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Importando usuários...
              </h3>
              <p className="text-slate-600">Aguarde, isso pode levar alguns segundos</p>
            </div>
          )}

          {/* STEP: Done */}
          {step === 'done' && (
            <div className="text-center py-12">
              <div className="text-6xl mb-6">{doneIcon}</div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">
                {doneTitle}
              </h3>
              <p className="text-slate-600 mb-8 max-w-2xl mx-auto">
                {doneSubtitle}
              </p>
              <div className="grid grid-cols-4 gap-4 max-w-2xl mx-auto mb-8">
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="text-3xl font-bold text-green-800">{stats.imported}</div>
                  <div className="text-sm text-green-600">Importados</div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <div className="text-3xl font-bold text-yellow-800">{stats.updated}</div>
                  <div className="text-sm text-yellow-600">Atualizados</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="text-3xl font-bold text-slate-800">{stats.skipped}</div>
                  <div className="text-sm text-slate-600">Pulados</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="text-3xl font-bold text-red-800">{stats.errors}</div>
                  <div className="text-sm text-red-600">Erros</div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700"
              >
                Fechar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkspaceImportModal;

