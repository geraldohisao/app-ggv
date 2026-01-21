import React, { useEffect, useState } from 'react';
import { UserRole } from '../../types';
import type { UiUser } from '../../hooks/useUsersData';
import { supabase } from '../../services/supabaseClient';
import { useUser } from '../../contexts/DirectUserContext';

// Simple Toggle Switch Component
const ToggleSwitch: React.FC<{
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}> = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={onChange}
    disabled={disabled}
    className={`
      relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
      transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2
      ${checked ? 'bg-green-500' : 'bg-gray-200'}
      ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    `}
  >
    <span
      className={`
        pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 
        transition duration-200 ease-in-out
        ${checked ? 'translate-x-5' : 'translate-x-0'}
      `}
    />
  </button>
);

export const UserRow: React.FC<{
  user: UiUser;
  canEdit: boolean;
  saving: boolean;
  onChange: (patch: Partial<Pick<UiUser, 'role' | 'func' | 'isActive' | 'department' | 'cargo'>>) => void;
  checked: boolean;
  onToggle: () => void;
}> = ({ user, canEdit, saving, onChange, checked, onToggle }) => {
  const { user: currentUser } = useUser();
  const isInactive = !user.isActive;
  const isOwnProfile = currentUser?.id === user.id;
  const isProtectedEmail = user.email === 'geraldo@grupoggv.com';
  const [cargos, setCargos] = useState<Array<{ name: string }>>([]);
  const [departments, setDepartments] = useState<Array<{ name: string }>>([]);

  useEffect(() => {
    const fetchLists = async () => {
      const [cargosData, deptsData] = await Promise.all([
        supabase.from('cargos').select('name').eq('is_active', true).order('level, name'),
        supabase.from('departments').select('name').eq('is_active', true).order('name'),
      ]);
      setCargos(cargosData.data || []);
      setDepartments(deptsData.data || []);
    };
    fetchLists();
  }, []);
  
  return (
    <tr className={`group transition-colors ${saving ? 'opacity-50 pointer-events-none' : ''} ${isInactive ? 'bg-gray-50' : 'hover:bg-slate-50'}`}>
      <td className="py-3 px-4">
        <input 
          type="checkbox" 
          checked={checked} 
          onChange={onToggle}
          className="rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
        />
      </td>
      
      {/* User Info Column */}
      <td className="py-3 px-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className={`font-medium ${isInactive ? 'text-gray-500' : 'text-slate-900'}`}>
              {user.name}
            </span>
            {isInactive && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                Inativo
              </span>
            )}
          </div>
          <span className="text-xs text-slate-500 truncate max-w-[200px]" title={user.email}>
            {user.email}
          </span>
        </div>
      </td>

      {/* Role Column */}
      <td className="py-3 px-4">
        <select
          value={user.role}
          disabled={!canEdit || saving || isInactive || isOwnProfile || isProtectedEmail}
          onChange={e => onChange({ role: e.target.value as UserRole })}
          className={`
            block w-full rounded-md border-gray-300 py-1.5 text-xs shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm
            ${user.role === UserRole.SuperAdmin ? 'text-purple-700 bg-purple-50 border-purple-200' : ''}
            ${user.role === UserRole.Admin ? 'text-blue-700 bg-blue-50 border-blue-200' : ''}
            ${user.role === UserRole.User ? 'text-slate-700 bg-white' : ''}
            disabled:opacity-60 disabled:bg-gray-100
          `}
        >
          <option value={UserRole.User}>USER</option>
          <option value={UserRole.Admin}>ADMIN</option>
          <option value={UserRole.SuperAdmin}>SUPER ADMIN</option>
        </select>
      </td>

      {/* Department Column */}
      <td className="py-3 px-4">
        <select
          value={(user as any).department || 'geral'}
          disabled={!canEdit || saving || isInactive}
          onChange={e => onChange({ department: e.target.value } as any)}
          className="block w-full rounded-md border-gray-300 py-1.5 text-xs shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm disabled:opacity-60 disabled:bg-gray-100"
        >
          <option value="">- Selecione -</option>
          {departments.map(dept => (
            <option key={dept.name} value={dept.name.toLowerCase()}>
              {dept.name}
            </option>
          ))}
        </select>
      </td>

      {/* Cargo Column */}
      <td className="py-3 px-4">
        <select
          value={user.cargo || '-'}
          disabled={!canEdit || saving || isInactive}
          onChange={e => onChange({ cargo: e.target.value === '-' ? undefined : e.target.value } as any)}
          className="block w-full rounded-md border-gray-300 py-1.5 text-xs shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm disabled:opacity-60 disabled:bg-gray-100"
        >
          <option value="-">- Selecione -</option>
          {cargos.map(cargo => (
            <option key={cargo.name} value={cargo.name}>
              {cargo.name}
            </option>
          ))}
        </select>
      </td>

      {/* Status Column */}
      <td className="py-3 px-4 text-center">
        <div className="flex justify-center" title={
          isOwnProfile ? 'Você não pode desativar seu próprio usuário' : 
          isProtectedEmail ? 'Usuário protegido' : 
          user.isActive ? 'Clique para desativar' : 'Clique para ativar'
        }>
          <ToggleSwitch
            checked={user.isActive}
            onChange={() => onChange({ isActive: !user.isActive })}
            disabled={!canEdit || saving || isOwnProfile || isProtectedEmail}
          />
        </div>
      </td>
    </tr>
  );
};

export default UserRow;
