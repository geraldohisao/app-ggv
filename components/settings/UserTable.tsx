import React, { useMemo, useState } from 'react';
import { UiUser } from '../../hooks/useUsersData';
import { UserRow } from './UserRow';

export const UserTable: React.FC<{
  users: UiUser[];
  canEdit: boolean;
  savingIds: Set<string>;
  onChangeRow: (id: string, patch: Partial<Pick<UiUser, 'role' | 'func' | 'isActive' | 'department' | 'cargo'>>) => void;
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
    <table className="w-full text-left text-sm border-collapse">
      <thead>
        <tr className="border-b text-slate-500 bg-slate-50 sticky top-0 z-10">
          <th className="py-3 px-4 w-10">
            <input 
              type="checkbox" 
              checked={allSelected} 
              onChange={toggleAll}
              className="rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer" 
            />
          </th>
          <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider">Usuário</th>
          <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider w-32">Role</th>
          <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider w-40">Departamento</th>
          <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider w-40">Cargo</th>
          <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider w-24 text-center">Status</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
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
            <td colSpan={6} className="py-8 text-center text-slate-500">
              Nenhum usuário encontrado.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
};

export default UserTable;
