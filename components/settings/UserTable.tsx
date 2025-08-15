import React, { useMemo, useState } from 'react';
import { UiUser } from '../../hooks/useUsersData';
import { UserRow } from './UserRow';

export const UserTable: React.FC<{
  users: UiUser[];
  canEdit: boolean;
  savingIds: Set<string>;
  onChangeRow: (id: string, patch: Partial<Pick<UiUser, 'role' | 'func'>>) => void;
  onSelectionChange: (ids: string[]) => void;
}> = ({ users, canEdit, savingIds, onChangeRow, onSelectionChange }) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allSelected = useMemo(() => users.length > 0 && users.every(u => selected.has(u.id)), [users, selected]);

  const toggleAll = () => {
    const next = new Set<string>();
    if (!allSelected) users.forEach(u => next.add(u.id));
    setSelected(next);
    onSelectionChange(Array.from(next));
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
    onSelectionChange(Array.from(next));
  };

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left border-b text-slate-500 sticky top-0 bg-white">
          <th className="py-2 px-2"><input type="checkbox" checked={allSelected} onChange={toggleAll} /></th>
          <th className="py-2 font-semibold">Nome</th>
          <th className="py-2 font-semibold">Email</th>
          <th className="py-2 font-semibold">Role</th>
          <th className="py-2 font-semibold">Função</th>
        </tr>
      </thead>
      <tbody>
        {users.map(u => (
          <UserRow
            key={u.id}
            user={u}
            canEdit={canEdit}
            saving={savingIds.has(u.id)}
            onChange={(patch) => onChangeRow(u.id, patch)}
            checked={selected.has(u.id)}
            onToggle={() => toggleOne(u.id)}
          />
        ))}
        {users.length === 0 && (
          <tr>
            <td colSpan={5} className="py-6 text-center text-slate-500">Nenhum usuário encontrado.</td>
          </tr>
        )}
      </tbody>
    </table>
  );
};

export default UserTable;


