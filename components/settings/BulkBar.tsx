import React from 'react';
import { UserRole } from '../../types';
import { UserFunction } from '../../hooks/useUsersData';

export const BulkBar: React.FC<{
  count: number;
  canEdit: boolean;
  onApply: (patch: { role?: UserRole; func?: UserFunction }) => void;
}> = ({ count, canEdit, onApply }) => {
  const [role, setRole] = React.useState<UserRole | ''>('');
  const [func, setFunc] = React.useState<UserFunction | ''>('');
  const apply = () => onApply({ role: role || undefined, func: (func || undefined) as any });
  if (count === 0) return null;
  return (
    <div className="sticky bottom-0 left-0 right-0 bg-white border-t p-2 flex items-center justify-between gap-2 text-xs">
      <div className="text-slate-600">Selecionados: <b>{count}</b></div>
      <div className="flex items-center gap-2">
        <select value={role} onChange={e => setRole(e.target.value as any)} className="px-2 py-1.5 border rounded-lg" disabled={!canEdit}>
          <option value="">Role...</option>
          <option value={UserRole.User}>USER</option>
          <option value={UserRole.Admin}>ADMIN</option>
          <option value={UserRole.SuperAdmin}>SUPER_ADMIN</option>
        </select>
        <select value={func} onChange={e => setFunc(e.target.value as any)} className="px-2 py-1.5 border rounded-lg" disabled={!canEdit}>
          <option value="">Função...</option>
          <option value="SDR">SDR</option>
          <option value="Closer">Closer</option>
          <option value="Gestor">Gestor</option>
        </select>
        <button onClick={apply} disabled={!canEdit} className="px-3 py-1.5 border rounded-lg hover:bg-slate-50 transition disabled:opacity-60">Aplicar</button>
      </div>
    </div>
  );
};

export default BulkBar;


