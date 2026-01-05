import React from 'react';
import { UserRole } from '../../types';
import type { UiUser, UserFunction } from '../../hooks/useUsersData';

export const UserRow: React.FC<{
  user: UiUser;
  canEdit: boolean;
  saving: boolean;
  onChange: (patch: Partial<Pick<UiUser, 'role' | 'func' | 'isActive'>>) => void;
  checked: boolean;
  onToggle: () => void;
}> = ({ user, canEdit, saving, onChange, checked, onToggle }) => {
  const isInactive = !user.isActive;
  
  return (
    <tr className={`border-b hover:bg-slate-50/60 ${saving ? 'opacity-70' : ''} ${isInactive ? 'bg-red-50/30' : ''}`}>
      <td className="py-2 px-2"><input type="checkbox" checked={checked} onChange={onToggle} /></td>
      <td className="py-2 font-medium text-slate-800">
        <div className="flex items-center gap-2">
          {user.name}
          {isInactive && (
            <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-normal">
              INATIVO
            </span>
          )}
        </div>
      </td>
      <td className="py-2 text-slate-600">{user.email}</td>
      <td className="py-2">
        <select
          value={user.role}
          disabled={!canEdit || saving || isInactive}
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
          disabled={!canEdit || saving || isInactive}
          onChange={e => onChange({ func: e.target.value as UserFunction })}
          className="border rounded-lg px-2 py-1.5 bg-white hover:bg-slate-50 disabled:opacity-60"
        >
          <option value="-">-</option>
          <option value="SDR">SDR</option>
          <option value="Closer">Closer</option>
          <option value="Gestor">Gestor</option>
          <option value="Analista de Marketing">Analista de Marketing</option>
        </select>
      </td>
      <td className="py-2">
        <button
          onClick={() => onChange({ isActive: !user.isActive })}
          disabled={!canEdit || saving}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 ${
            user.isActive
              ? 'bg-red-100 text-red-700 hover:bg-red-200'
              : 'bg-green-100 text-green-700 hover:bg-green-200'
          }`}
          title={user.isActive ? 'Desativar usuário' : 'Ativar usuário'}
        >
          {user.isActive ? '🔴 Desativar' : '🟢 Ativar'}
        </button>
      </td>
    </tr>
  );
};

export default UserRow;


