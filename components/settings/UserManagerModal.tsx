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

  // Realtime refresh
  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel('realtime-profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        data.refresh();
      })
      .subscribe();
    return () => { try { supabase.removeChannel(channel); } catch {} };
  }, []);

  const onChangeRow = (id: string, patch: any) => {
    setSavingIds(prev => new Set(prev).add(id));
    data.updateUser(id, patch).finally(() => setSavingIds(prev => { const n = new Set(prev); n.delete(id); return n; }));
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
        <div className="max-h-[70vh] overflow-y-auto">
          <UserToolbar
            total={data.total}
            search={data.search}
            setSearch={data.setSearch}
            roleFilter={data.roleFilter}
            setRoleFilter={data.setRoleFilter}
            funcFilter={data.funcFilter as any}
            setFuncFilter={data.setFuncFilter as any}
            onRefresh={data.refresh}
            onClear={() => { data.setSearch(''); data.setRoleFilter('ALL' as any); data.setFuncFilter('ALL' as any); }}
          />

          <UserTable
            users={data.users as any}
            canEdit={canEdit}
            savingIds={savingIds}
            onChangeRow={onChangeRow}
            onSelectionChange={setSelectedIds}
          />

          <BulkBar
            count={selectedIds.length}
            canEdit={canEdit}
            onApply={(patch) => data.bulkUpdate(selectedIds, patch as any)}
          />
        </div>
      )}
    </ModalBase>
  );
};

export default UserManagerModal;
