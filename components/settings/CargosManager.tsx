import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';

interface Cargo {
  id: string;
  name: string;
  description: string;
  level: number;
  is_active: boolean;
}

export const CargosManager: React.FC = () => {
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Cargo>>({});
  const [newCargo, setNewCargo] = useState({ name: '', description: '', level: 5 });

  const fetchCargos = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('cargos')
      .select('*')
      .order('level, name');
    setCargos(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchCargos();
  }, []);

  const handleCreate = async () => {
    if (!newCargo.name.trim()) {
      alert('Nome é obrigatório');
      return;
    }

    const { error } = await supabase
      .from('cargos')
      .insert({ ...newCargo });

    if (error) {
      alert(`Erro: ${error.message}`);
    } else {
      setNewCargo({ name: '', description: '', level: 5 });
      fetchCargos();
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('cargos')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    if (!error) {
      fetchCargos();
    }
  };

  const handleEdit = (cargo: Cargo) => {
    setEditing(cargo.id);
    setEditData({ name: cargo.name, description: cargo.description, level: cargo.level });
  };

  const handleSaveEdit = async (id: string) => {
    const { error } = await supabase
      .from('cargos')
      .update(editData)
      .eq('id', id);

    if (error) {
      alert(`Erro: ${error.message}`);
    } else {
      setEditing(null);
      fetchCargos();
    }
  };

  const handleCancelEdit = () => {
    setEditing(null);
    setEditData({});
  };

  const getLevelLabel = (level: number) => {
    const labels: Record<number, string> = {
      1: 'C-Level',
      2: 'Diretoria',
      3: 'Head/Liderança',
      4: 'Gerência',
      5: 'Operacional',
    };
    return labels[level] || 'Outro';
  };

  if (loading) return <div className="p-6 text-slate-500">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-900 mb-4">Cargos</h3>
        
        {/* Formulário de Criar */}
        <div className="bg-slate-50 rounded-xl p-4 mb-4 grid grid-cols-5 gap-3">
          <input
            value={newCargo.name}
            onChange={(e) => setNewCargo({ ...newCargo, name: e.target.value })}
            placeholder="Nome (ex: Head Comercial)"
            className="border rounded-lg px-3 py-2 text-sm col-span-2"
          />
          <input
            value={newCargo.description}
            onChange={(e) => setNewCargo({ ...newCargo, description: e.target.value })}
            placeholder="Descrição (opcional)"
            className="border rounded-lg px-3 py-2 text-sm"
          />
          <select
            value={newCargo.level}
            onChange={(e) => setNewCargo({ ...newCargo, level: Number(e.target.value) })}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value={1}>C-Level</option>
            <option value={2}>Diretoria</option>
            <option value={3}>Head/Liderança</option>
            <option value={4}>Gerência</option>
            <option value={5}>Operacional</option>
          </select>
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
              <th className="py-2 px-3">Nível</th>
              <th className="py-2 px-3">Status</th>
              <th className="py-2 px-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {cargos.map((cargo) => {
              const isEditing = editing === cargo.id;
              
              return (
                <tr key={cargo.id} className={`border-b ${!cargo.is_active ? 'opacity-50' : ''}`}>
                  <td className="py-2 px-3">
                    {isEditing ? (
                      <input
                        value={editData.name || ''}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        className="border rounded px-2 py-1 text-sm w-full"
                      />
                    ) : (
                      <span className="font-medium">{cargo.name}</span>
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
                      <span className="text-slate-600">{cargo.description || '—'}</span>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    {isEditing ? (
                      <select
                        value={editData.level || 5}
                        onChange={(e) => setEditData({ ...editData, level: Number(e.target.value) })}
                        className="border rounded px-2 py-1 text-xs"
                      >
                        <option value={1}>C-Level</option>
                        <option value={2}>Diretoria</option>
                        <option value={3}>Head/Liderança</option>
                        <option value={4}>Gerência</option>
                        <option value={5}>Operacional</option>
                      </select>
                    ) : (
                      <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium">
                        {getLevelLabel(cargo.level)}
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    <button
                      onClick={() => handleToggleActive(cargo.id, cargo.is_active)}
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        cargo.is_active 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {cargo.is_active ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                  <td className="py-2 px-3">
                    {isEditing ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(cargo.id)}
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
                        onClick={() => handleEdit(cargo)}
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

