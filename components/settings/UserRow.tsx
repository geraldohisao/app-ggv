import React from 'react';
import { UserRole } from '../../types';
import type { UiUser, UserFunction } from '../../hooks/useUsersData';

export const UserRow: React.FC<{
  user: UiUser;
  canEdit: boolean;
  saving: boolean;
  onChange: (patch: Partial<Pick<UiUser, 'role' | 'func'>>) => void;
  checked: boolean;
  onToggle: () => void;
}> = ({ user, canEdit, saving, onChange, checked, onToggle }) => {
  return (
    <tr className={`border-b hover:bg-slate-50/60 ${saving ? 'opacity-70' : ''}`}>
      <td className="py-2 px-2"><input type="checkbox" checked={checked} onChange={onToggle} /></td>
      <td className="py-2 font-medium text-slate-800">{user.name}</td>
      <td className="py-2 text-slate-600">{user.email}</td>
      <td className="py-2">
        <select
          value={user.role}
          disabled={!canEdit || saving}
          onChange={e => onChange({ role: e.target.value as UserRole })}
          className="border rounded-lg px-2 py-1.5 bg-white hover:bg-slate-50 disabled:opacity-60"
        >
          <option value={UserRole.User}>USER</option>
          <option value={UserRole.Admin}>ADMIN</option>
          <option value={UserRole.SuperAdmin}>SUPER_ADMIN</option>
        </select>
      </td>
      <td className="py-2">
        <select
          value={user.func || '-'}
          disabled={!canEdit || saving}
          onChange={e => onChange({ func: e.target.value as UserFunction })}
          className="border rounded-lg px-2 py-1.5 bg-white hover:bg-slate-50 disabled:opacity-60"
        >
          <option value="-">-</option>
          <option value="SDR">SDR</option>
          <option value="Closer">Closer</option>
          <option value="Gestor">Gestor</option>
        </select>
      </td>
    </tr>
  );
};

export default UserRow;


