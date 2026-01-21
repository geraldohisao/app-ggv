import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';

interface Department {
  id: string;
  name: string;
  description: string;
  color: string;
  is_active: boolean;
}

export const DepartmentsManager: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Department>>({});
  const [newDept, setNewDept] = useState({ name: '', description: '', color: '#5B5FF5' });

  const fetchDepartments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('departments')
      .select('*')
      .order('name');
    setDepartments(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleCreate = async () => {
    if (!newDept.name.trim()) {
      alert('Nome é obrigatório');
      return;
    }

    const { error } = await supabase
      .from('departments')
      .insert({ ...newDept });

    if (error) {
      alert(`Erro: ${error.message}`);
    } else {
      setNewDept({ name: '', description: '', color: '#5B5FF5' });
      fetchDepartments();
    }
  };

  const handleUpdate = async (id: string, patch: Partial<Department>) => {
    const { error } = await supabase
      .from('departments')
      .update(patch)
      .eq('id', id);

    if (error) {
      alert(`Erro: ${error.message}`);
    } else {
      fetchDepartments();
      setEditing(null);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    await handleUpdate(id, { is_active: !currentStatus });
  };

  const handleEdit = (dept: Department) => {
    setEditing(dept.id);
    setEditData({ name: dept.name, description: dept.description, color: dept.color });
  };

  const handleSaveEdit = async (id: string) => {
    const { error } = await supabase
      .from('departments')
      .update(editData)
      .eq('id', id);

    if (error) {
      alert(`Erro: ${error.message}`);
    } else {
      setEditing(null);
      fetchDepartments();
    }
  };

  const handleCancelEdit = () => {
    setEditing(null);
    setEditData({});
  };

  if (loading) return <div className="p-6 text-slate-500">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-900 mb-4">Departamentos</h3>
        
        {/* Formulário de Criar */}
        <div className="bg-slate-50 rounded-xl p-4 mb-4 grid grid-cols-4 gap-3">
          <input
            value={newDept.name}
            onChange={(e) => setNewDept({ ...newDept, name: e.target.value })}
            placeholder="Nome (ex: Comercial)"
            className="border rounded-lg px-3 py-2 text-sm"
          />
          <input
            value={newDept.description}
            onChange={(e) => setNewDept({ ...newDept, description: e.target.value })}
            placeholder="Descrição (opcional)"
            className="border rounded-lg px-3 py-2 text-sm col-span-2"
          />
          <button
            onClick={handleCreate}
            className="bg-indigo-600 text-white rounded-lg px-4 py-2 font-semibold text-sm hover:bg-indigo-700"
          >
            + Adicionar
          </button>
        </div>

        {/* Tabela */}
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-left">
            <tr>
              <th className="py-2 px-3">Nome</th>
              <th className="py-2 px-3">Descrição</th>
              <th className="py-2 px-3">Cor</th>
              <th className="py-2 px-3">Status</th>
              <th className="py-2 px-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {departments.map((dept) => {
              const isEditing = editing === dept.id;
              
              return (
                <tr key={dept.id} className={`border-b ${!dept.is_active ? 'opacity-50' : ''}`}>
                  <td className="py-2 px-3">
                    {isEditing ? (
                      <input
                        value={editData.name || ''}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        className="border rounded px-2 py-1 text-sm w-full"
                      />
                    ) : (
                      <span className="font-medium">{dept.name}</span>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    {isEditing ? (
                      <input
                        value={editData.description || ''}
                        onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                        className="border rounded px-2 py-1 text-sm w-full"
                      />
                    ) : (
                      <span className="text-slate-600">{dept.description || '—'}</span>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    {isEditing ? (
                      <input
                        type="color"
                        value={editData.color || '#5B5FF5'}
                        onChange={(e) => setEditData({ ...editData, color: e.target.value })}
                        className="border rounded h-8 w-20"
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded" style={{ backgroundColor: dept.color }} />
                        <span className="text-xs text-slate-500">{dept.color}</span>
                      </div>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    <button
                      onClick={() => handleToggleActive(dept.id, dept.is_active)}
                      disabled={isEditing}
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        dept.is_active 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {dept.is_active ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                  <td className="py-2 px-3">
                    {isEditing ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(dept.id)}
                          className="bg-indigo-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-indigo-700"
                        >
                          Salvar
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="bg-slate-200 text-slate-700 px-3 py-1 rounded text-xs font-medium hover:bg-slate-300"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEdit(dept)}
                        className="text-indigo-600 hover:text-indigo-800 text-xs font-medium"
                      >
                        Editar
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

