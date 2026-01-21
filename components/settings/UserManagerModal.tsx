import React, { useEffect, useState } from 'react';
import { ModalBase } from './ModalBase';
import { UserRole } from '../../types';
import { useUser } from '../../contexts/DirectUserContext';
import { LoadingSpinner, ErrorDisplay } from '../ui/Feedback';
import { useUsersData } from '../../hooks/useUsersData';
import UserToolbar from './UserToolbar';
import UserTable from './UserTable';
import BulkBar from './BulkBar';
import { supabase } from '../../services/supabaseClient';

export const UserManagerModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user } = useUser();
  const data = useUsersData();
  const canEdit = !!(user && (user.role === UserRole.SuperAdmin || user.role === UserRole.Admin));
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [localUsers, setLocalUsers] = useState<any[]>([]);
  
  // Carregar localUsers quando data.users chegar do servidor
  useEffect(() => {
    if (data.users && data.users.length > 0 && localUsers.length === 0) {
      console.log('📥 [UserManager] Carregando usuários inicial:', data.users.length);
      setLocalUsers(data.users);
    }
  }, [data.users, localUsers.length]);

  // Realtime refresh - DESABILITADO para não piscar
  // useEffect(() => {
  //   if (!supabase) return;
  //   const channel = supabase
  //     .channel('realtime-profiles')
  //     .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
  //       data.refresh();
  //     })
  //     .subscribe();
  //   return () => { try { supabase.removeChannel(channel); } catch {} };
  // }, []);

  const onChangeRow = async (id: string, patch: any) => {
    console.log('🔄 [UserManager] onChangeRow chamado:', { id, patch });
    
    // Evitar chamadas duplicadas
    if (savingIds.has(id)) {
      console.log('⚠️ [UserManager] Já está salvando este usuário, ignorando...');
      return;
    }
    
    setSavingIds(prev => new Set(prev).add(id));
    
    // UPDATE OTIMISTA: Atualizar localUsers imediatamente (sem piscar)
    setLocalUsers(prev => 
      prev.map(u => u.id === id ? { ...u, ...patch } : u)
    );
    
    // Guardar valor original para rollback
    const originalUsers = [...data.users];
    
    try {
      // Se for APENAS func (cargo), fazer via RPC direto (sem refresh para evitar flicker)
      if (patch.func !== undefined && !patch.department && !patch.role && patch.isActive === undefined) {
        const funcValue = patch.func === '-' ? null : patch.func;
        console.log('📞 [UserManager] Chamando RPC só para função:', funcValue);
        console.log('📞 [UserManager] user_uuid:', id);
        
        const { data: result, error } = await supabase.rpc('admin_update_user_dept_and_function', {
          user_uuid: id,
          new_department: null,
          new_function: funcValue,
        });
        
        console.log('📊 [UserManager] RPC response:', { result, error });
        
        if (error) {
          console.error('❌ [UserManager] RPC ERRO:', error);
          alert(`Erro na RPC: ${JSON.stringify(error)}`);
          throw error;
        }

        console.log('✅ [UserManager] Função atualizada (sem refresh para evitar piscada)');
        return;
      }
      
      // Se for department, fazer via RPC (sem refresh para evitar flicker)
      if (patch.department !== undefined) {
        console.log('📞 [UserManager] Chamando RPC para department:', patch.department);
        console.log('📞 [UserManager] user_uuid:', id);
        
        const { data: result, error } = await supabase.rpc('admin_update_user_dept_and_function', {
          user_uuid: id,
          new_department: patch.department,
          new_function: null,
        });
        
        console.log('📊 [UserManager] RPC response:', { result, error });
        
        if (error) {
          console.error('❌ [UserManager] RPC ERRO:', error);
          alert(`Erro na RPC: ${JSON.stringify(error)}`);
          throw error;
        }

        console.log('✅ [UserManager] Departamento atualizado (sem refresh para evitar piscada)');
        return;
      }
      
      // Se for cargo, atualizar via RPC (bypass RLS)
      if (patch.cargo !== undefined) {
        console.log('📝 [UserManager] Atualizando cargo via RPC:', patch.cargo);
        const cargoValue = patch.cargo === '-' ? null : patch.cargo;
        
        const { error } = await supabase.rpc('admin_update_user_cargo', {
          user_uuid: id,
          new_cargo: cargoValue
        });
        
        if (error) {
          console.error('❌ [UserManager] Erro ao atualizar cargo:', error);
          throw error;
        }
        
        console.log('✅ [UserManager] Cargo atualizado com sucesso via RPC (sem refresh)');
        return;
      }
      
      // Para role e isActive, usar as funções originais
      if (patch.role || patch.isActive !== undefined) {
        console.log('🔄 [UserManager] Usando updateUser do sistema para role/status');
        await data.updateUser(id, patch);
      }
      
    } catch (error: any) {
      console.error('❌ [UserManager] ERRO CAPTURADO:', error);
      console.error('❌ [UserManager] Error completo:', JSON.stringify(error, null, 2));
      alert(`Erro ao salvar: ${error.message || JSON.stringify(error)}`);
      
      // ROLLBACK: Reverter UI para valor anterior
      await data.refresh(); // Busca valores corretos do banco
    } finally {
      console.log('🏁 [UserManager] Finalizando...');
      setSavingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  return (
    <ModalBase title="Gerenciar Usuários" onClose={onClose}>
      {data.loading && (
        <div className="p-6"><LoadingSpinner text="Carregando usuários..." /></div>
      )}
      {!data.loading && data.error && (
        <div className="p-6"><ErrorDisplay message={data.error} onRetry={data.refresh} /></div>
      )}
      {!data.loading && !data.error && (
        <div className="flex flex-col h-[70vh]">
          <div className="flex-none px-1">
            <UserToolbar
              total={localUsers.length}
              search={data.search}
              setSearch={data.setSearch}
              roleFilter={data.roleFilter}
              setRoleFilter={data.setRoleFilter}
              funcFilter={data.funcFilter as any}
              setFuncFilter={data.setFuncFilter as any}
              statusFilter={data.statusFilter}
              setStatusFilter={data.setStatusFilter}
              onRefresh={() => {
                data.refresh().then(() => setLocalUsers(data.users));
              }}
              onClear={() => { 
                data.setSearch(''); 
                data.setRoleFilter('ALL' as any); 
                data.setFuncFilter('ALL' as any); 
                data.setStatusFilter('ACTIVE');
              }}
            />
          </div>

          <div className="flex-grow overflow-auto border rounded-lg">
            <UserTable
              users={localUsers as any}
              canEdit={canEdit}
              savingIds={savingIds}
              onChangeRow={onChangeRow}
              onSelectionChange={setSelectedIds}
            />
          </div>
          
          <div className="flex-none pt-4">
            <BulkBar
              count={selectedIds.length}
              canEdit={canEdit}
              onApply={(patch) => data.bulkUpdate(selectedIds, patch as any)}
            />
          </div>
        </div>
      )}
    </ModalBase>
  );
};

export default UserManagerModal;
