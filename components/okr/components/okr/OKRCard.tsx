import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ProgressBar } from '../shared/ProgressBar';
import type { OKRWithKeyResults, KeyResultStatus, KeyResult } from '../../types/okr.types';
import { calculateOKRProgress, isOKROverdue } from '../../types/okr.types';
import { parseLocalDate } from '../../utils/date';
import { calculateKRProgress, formatKRValue } from '../../utils/krProgress';
import * as okrService from '../../services/okr.service';
import { KREditModal } from './KREditModal';
import { useOKRUsers } from '../../hooks/useOKRUsers';
import { MiniAvatar } from '../shared/MiniAvatar';
import { usePermissions } from '../../hooks/usePermissions';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface OKRCardProps {
  okr: OKRWithKeyResults;
  onClick?: () => void;
  ownerAvatarUrl?: string | null;
  readOnly?: boolean;
}

// Componente para KR arrastável
interface SortableKRItemProps {
  kr: KeyResult;
  index: number;
  krProgress: number;
  risk: string;
  okrOwnerUser: any;
  users: any[];
  editingKR: string | null;
  tempValue: string;
  saving: boolean;
  setEditingKR: (id: string | null) => void;
  setTempValue: (value: string) => void;
  handleInlineUpdate: (kr: KeyResult) => void;
  onKRClick: (kr: KeyResult) => void;
  formatKRValue: (value: number | null | undefined, type: string, unit?: string) => string;
  getKRStatusColor: (status: string) => string;
  renderSparkline: (history: any) => React.ReactNode;
  readOnly: boolean;
}

const SortableKRItem: React.FC<SortableKRItemProps> = ({
  kr,
  index,
  krProgress,
  risk,
  okrOwnerUser,
  users,
  editingKR,
  tempValue,
  saving,
  setEditingKR,
  setTempValue,
  handleInlineUpdate,
  onKRClick,
  formatKRValue: formatValue,
  getKRStatusColor,
  renderSparkline,
  readOnly,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: kr.id || `kr-${index}`, disabled: readOnly });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 'auto',
  };

  const krResponsible = kr.responsible_user_id 
    ? users.find((u: any) => u.id === kr.responsible_user_id) 
    : null;
  const displayUser = krResponsible || okrOwnerUser;
  const isInherited = !krResponsible && !!okrOwnerUser;

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`flex flex-col xl:flex-row xl:items-center gap-4 py-2 border-b border-slate-100 last:border-0 hover:bg-white/80 transition-colors rounded-xl px-2 group/kr ${isDragging ? 'bg-white shadow-lg' : ''}`}
    >
      {/* Drag Handle */}
      {!readOnly && (
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 flex-shrink-0 touch-none"
          title="Arraste para reordenar"
          onClick={(e) => e.stopPropagation()}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
          </svg>
        </div>
      )}

      {/* Conteúdo clicável */}
      <div 
        className={`flex items-center gap-3 flex-1 min-w-0 ${readOnly ? '' : 'cursor-pointer'}`} 
        title={kr.description || kr.title}
        onClick={(e) => { 
          if (readOnly) return; 
          e.stopPropagation(); 
          onKRClick(kr); 
        }}
      >
        {/* Avatar do responsável - sempre existe (KR ou OKR) */}
        <MiniAvatar user={displayUser!} size="sm" isInherited={isInherited} />
        
        {/* Status indicator */}
        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
          krProgress >= 85 ? 'bg-emerald-500 shadow-[0_0_8px_#10B981]' : 
          krProgress >= 75 ? 'bg-amber-500 shadow-[0_0_8px_#F59E0B]' : 
          'bg-rose-500 shadow-[0_0_8px_#F43F5E]'
        }`} />
        
        <div className="flex flex-col min-w-0">
          <p className="text-sm font-bold text-slate-700 leading-snug truncate">{kr.title}</p>
          {kr.description && (
            <p className="text-[10px] text-slate-400 truncate hidden sm:block" title={kr.description}>{kr.description}</p>
          )}
          {kr.updated_at && (
            <p className="text-[10px] text-slate-400 mt-1">Última atualização: {new Date(kr.updated_at).toLocaleDateString('pt-BR')}</p>
          )}
          {risk && (
            <p className="text-[10px] text-amber-600 mt-1 font-semibold">{risk}</p>
          )}
        </div>
      </div>

      {/* Valores e Progresso */}
      <div className="flex items-center gap-4 w-full xl:w-auto mt-2 xl:mt-0">
        <div className="flex flex-col items-end min-w-[80px]">
          <span className="text-sm font-black text-slate-900">
            {formatValue(kr.current_value, kr.type, kr.unit)}
          </span>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            Meta: {formatValue(kr.target_value, kr.type, kr.unit)}
          </span>
          <span className={`mt-1 px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${getKRStatusColor(kr.status)}`}>
            {kr.status}
          </span>
          {typeof kr.weight === 'number' && (
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              Peso: {kr.weight}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-[100px]">
          <div className="flex-1">
            <ProgressBar 
              percentage={krProgress} 
              color={krProgress >= 85 ? 'green' : krProgress >= 75 ? 'yellow' : 'red'} 
            />
          </div>
          <span className="text-[10px] font-bold text-slate-500 min-w-[35px] text-right">
            {krProgress.toFixed(0)}%
          </span>
          {renderSparkline(kr.history)}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-auto xl:ml-0">
          {editingKR === kr.id && !readOnly ? (
            <>
              <input
                type="number"
                className="w-24 bg-slate-50 rounded-xl px-3 py-2 text-sm border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                placeholder={String(kr.current_value ?? 0)}
                onClick={(e) => e.stopPropagation()}
              />
              <button
                type="button"
                disabled={saving}
                onClick={(e) => { e.stopPropagation(); handleInlineUpdate(kr); }}
                className="text-xs font-bold text-white bg-indigo-500 px-3 py-2 rounded-xl hover:brightness-110 disabled:opacity-60"
              >
                {saving ? '...' : 'Salvar'}
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setEditingKR(null); setTempValue(''); }}
                className="text-xs font-bold text-slate-400 px-2"
              >
                ✕
              </button>
            </>
          ) : (
            !readOnly && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setEditingKR(kr.id || `kr-${index}`); setTempValue(String(kr.current_value ?? '')); }}
              className="text-xs font-bold text-indigo-600 hover:underline opacity-0 group-hover/kr:opacity-100 transition-opacity"
              title="Atualização rápida do valor"
            >
              Atualizar
            </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export const OKRCard: React.FC<OKRCardProps> = ({ okr, onClick, ownerAvatarUrl, readOnly }) => {
  const [imgError, setImgError] = useState(false);
  const [localOKR, setLocalOKR] = useState<OKRWithKeyResults>(okr);
  const [editingKR, setEditingKR] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [editingKRModal, setEditingKRModal] = useState<KeyResult | null>(null);
  const krScrollRef = useRef<number>(0);
  const { users } = useOKRUsers();
  const [isReordering, setIsReordering] = useState(false);
  const permissions = usePermissions();
  const canEditOKR = permissions.okr.canEdit(okr);
  const isReadOnly = typeof readOnly === 'boolean' ? readOnly : !canEditOKR;

  // Sincronizar estado local quando OKR externo mudar (ex: novo KR)
  useEffect(() => {
    setLocalOKR(okr);
  }, [okr]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Handler para reordenar KRs
  const handleDragEnd = async (event: DragEndEvent) => {
    if (isReadOnly) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sortedKeyResults.findIndex(kr => kr.id === active.id);
    const newIndex = sortedKeyResults.findIndex(kr => kr.id === over.id);
    
    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedKRs = arrayMove(sortedKeyResults, oldIndex, newIndex);
    
    // Atualizar posições localmente
    const updatedKRs = reorderedKRs.map((kr, index) => ({
      ...kr,
      position: index + 1
    }));

    setLocalOKR(prev => ({
      ...prev,
      key_results: updatedKRs
    }));

    // Salvar no banco
    setIsReordering(true);
    try {
      await Promise.all(
        updatedKRs.map(kr => 
          okrService.updateKeyResult(kr.id!, { position: kr.position })
        )
      );
    } catch (error) {
      console.error('Erro ao reordenar KRs:', error);
      // Reverter em caso de erro
      setLocalOKR(prev => ({
        ...prev,
        key_results: sortedKeyResults
      }));
    } finally {
      setIsReordering(false);
    }
  };

  // Encontrar o owner do OKR na lista de usuários (para fallback dos KRs)
  const okrOwnerUser = useMemo(() => {
    if (!okr.owner || users.length === 0) return null;
    return users.find(u => 
      u.name.toLowerCase() === okr.owner?.toLowerCase() ||
      u.name.toLowerCase().includes(okr.owner?.toLowerCase() || '') ||
      okr.owner?.toLowerCase().includes(u.name.toLowerCase())
    ) || null;
  }, [okr.owner, users]);

  const progress = calculateOKRProgress(localOKR);
  const overdue = isOKROverdue(localOKR);
  const isCycleEnded = okr.end_date && parseLocalDate(okr.end_date) < new Date() && okr.status !== 'concluído';
  const hasKrUpdate = useMemo(() => {
    if (!localOKR.key_results) return false;
    return localOKR.key_results.some((kr) => {
      if (kr.last_checkin_at) return true;
      if (kr.type === 'activity') {
        const activityProgress = kr.activity_progress ?? (kr.activity_done ? 100 : 0);
        return activityProgress > 0;
      }
      if (kr.current_value === null || kr.current_value === undefined) return false;
      if (kr.start_value === null || kr.start_value === undefined) {
        return kr.current_value > 0;
      }
      return kr.current_value !== kr.start_value;
    });
  }, [localOKR.key_results]);
  const displayStatus = okr.status;

  // Ordenar KRs por position
  const sortedKeyResults = useMemo(() => {
    if (!localOKR.key_results) return [];
    return [...localOKR.key_results].sort((a, b) => (a.position ?? 999) - (b.position ?? 999));
  }, [localOKR.key_results]);

  const formatDateRange = (start?: string, end?: string) => {
    if (!start || !end) return 'Período não definido';
    const s = new Date(`${start}T00:00:00`).toLocaleDateString('pt-BR');
    const e = new Date(`${end}T00:00:00`).toLocaleDateString('pt-BR');
    return `${s} — ${e}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'concluído':
        return 'bg-emerald-50 text-emerald-600';
      case 'em andamento':
        return 'bg-blue-50 text-blue-600';
      default:
        return 'bg-slate-50 text-slate-500';
    }
  };

  const getKRStatusColor = (status: KeyResultStatus) => {
    switch (status) {
      case 'verde':
        return 'bg-emerald-50 text-emerald-600';
      case 'amarelo':
        return 'bg-amber-50 text-amber-600';
      case 'vermelho':
        return 'bg-rose-50 text-rose-600';
      default:
        return 'bg-slate-50 text-slate-500';
    }
  };

  const displayProgress = hasKrUpdate ? progress : 0;
  const summaryColor =
    displayProgress >= 85 ? 'text-emerald-600 bg-emerald-50' :
    displayProgress >= 70 ? 'text-amber-600 bg-amber-50' :
    'text-rose-600 bg-rose-50';

  const setKrLocal = (krId: string, updater: (kr: KeyResult) => KeyResult) => {
    setLocalOKR((prev) => ({
      ...prev,
      key_results: prev.key_results.map((k) => (k.id === krId ? updater(k) : k)),
    }));
  };

  const handleInlineUpdate = async (kr: KeyResult) => {
    if (isReadOnly) return;
    if (!tempValue.trim()) {
      alert('Informe um valor');
      return;
    }
    const newValue = Number(tempValue.replace(',', '.'));
    if (Number.isNaN(newValue)) {
      alert('Valor inválido');
      return;
    }
    setSaving(true);
    try {
      const updated = await okrService.updateKeyResult(kr.id!, {
        current_value: newValue,
        updated_at: new Date().toISOString(),
      });
      if (updated) {
        setKrLocal(kr.id!, (k) => ({
          ...k,
          current_value: newValue,
          updated_at: updated.updated_at || new Date().toISOString(),
        }));
        setEditingKR(null);
        setTempValue('');
      } else {
        alert('Não foi possível atualizar o KR.');
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao atualizar o KR.');
    } finally {
      setSaving(false);
    }
  };

  const calcRisk = (kr: KeyResult) => {
    if (!localOKR.start_date || !localOKR.end_date) return '';
    const start = parseLocalDate(localOKR.start_date).getTime();
    const end = parseLocalDate(localOKR.end_date).getTime();
    const now = Date.now();
    const pctTime = Math.min(1, Math.max(0, (now - start) / (end - start)));
    const pctProgress = calculateKRProgress(kr) / 100;
    if (pctTime > 0.7 && pctProgress < 0.4) return 'Risco: atraso';
    if (pctTime > 1 && pctProgress < 1) return 'Atrasado';
    return '';
  };

  const renderSparkline = (history?: { date: string; value: number }[]) => {
    if (!history || history.length === 0) return null;
    const points = history.slice(-12);
    const values = points.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const width = 80;
    const height = 24;
    const step = points.length > 1 ? width / (points.length - 1) : width;
    const path = points
      .map((p, idx) => {
        const x = idx * step;
        const y = height - ((p.value - min) / range) * height;
        return `${idx === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-20 h-6 text-indigo-500">
        <path d={path} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  };

  return (
    <div
      onClick={isReadOnly ? undefined : onClick}
      className={`
        bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100
        ${isReadOnly ? 'cursor-default' : 'hover:shadow-md cursor-pointer'} transition-all group
        relative items-start
      `}
    >
      <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-6">
        <div className="flex-1 min-w-0">
          <div className="flex gap-2 mb-3">
            <span className="px-3 py-1 bg-slate-50 text-slate-500 text-[10px] font-black uppercase rounded-full tracking-widest">
              {okr.department}
            </span>
            <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full tracking-widest ${getStatusColor(displayStatus)}`}>
              {displayStatus}
            </span>
            {overdue && (
              <span className="px-3 py-1 bg-rose-50 text-rose-600 text-[10px] font-black uppercase rounded-full tracking-widest">
                Atrasado
              </span>
            )}
            {isCycleEnded && (
              <span className="px-3 py-1 bg-amber-50 text-amber-700 text-[10px] font-black uppercase rounded-full tracking-widest border border-amber-200">
                Ciclo Encerrado
              </span>
            )}
          </div>
          <h3 className="text-2xl font-bold text-slate-900 leading-tight group-hover:text-[#5B5FF5] transition-colors mb-2">
            {okr.objective}
          </h3>
          {okr.notes && (
            <p className="text-sm text-slate-500 line-clamp-2 mb-3" title={okr.notes}>
              {okr.notes}
            </p>
          )}
          <div className="flex flex-wrap gap-2 text-[11px] font-black uppercase tracking-[0.15em] text-slate-500">
            <span className="px-3 py-1 rounded-full bg-slate-50 border border-slate-100">
              {formatDateRange(okr.start_date, okr.end_date)}
            </span>
            <span className={`px-3 py-1 rounded-full border ${summaryColor === 'text-emerald-600 bg-emerald-50' ? 'border-emerald-100' : summaryColor === 'text-amber-600 bg-amber-50' ? 'border-amber-100' : 'border-rose-100'} ${summaryColor}`}>
              Progresso: {displayProgress.toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Responsável Compacto */}
        <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-2 border border-slate-100 shrink-0">
          <div className="w-8 h-8 bg-white rounded-full shadow-sm flex items-center justify-center text-slate-400 overflow-hidden shrink-0">
            {ownerAvatarUrl && !imgError ? (
              <img 
                src={ownerAvatarUrl} 
                alt={okr.owner} 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer"
                loading="lazy"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-indigo-100 text-indigo-600 font-bold text-[10px]">
                {okr.owner.charAt(0).toUpperCase() + (okr.owner.split(' ')[1]?.[0]?.toUpperCase() || '')}
              </div>
            )}
          </div>
          <div className="text-left">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Resp.</p>
            <p className="text-[10px] font-bold text-slate-800 leading-tight truncate max-w-[80px]" title={okr.owner}>{okr.owner}</p>
          </div>
        </div>
      </div>

        {/* Lista de Key Results (Layout em Linha) com Drag and Drop */}
        <div 
          className={`space-y-1 bg-slate-50/50 rounded-3xl p-5 border border-slate-100 overflow-x-auto ${isReordering ? 'opacity-70' : ''}`}
          onClick={(e) => e.stopPropagation()}
        >
          {sortedKeyResults.length > 0 ? (
            isReadOnly ? (
              <>
                {sortedKeyResults.map((kr, i) => (
                  <SortableKRItem
                    key={kr.id || i}
                    kr={kr}
                    index={i}
                    krProgress={calculateKRProgress(kr)}
                    risk={calcRisk(kr)}
                    okrOwnerUser={okrOwnerUser}
                    users={users}
                    editingKR={editingKR}
                    tempValue={tempValue}
                    saving={saving}
                    setEditingKR={setEditingKR}
                    setTempValue={setTempValue}
                    handleInlineUpdate={handleInlineUpdate}
                    onKRClick={() => {}}
                    formatKRValue={formatKRValue}
                    getKRStatusColor={getKRStatusColor}
                    renderSparkline={renderSparkline}
                    readOnly
                  />
                ))}
              </>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={sortedKeyResults.map(kr => kr.id || `kr-temp-${sortedKeyResults.indexOf(kr)}`)}
                  strategy={verticalListSortingStrategy}
                >
                  {sortedKeyResults.map((kr, i) => (
                    <SortableKRItem
                      key={kr.id || i}
                      kr={kr}
                      index={i}
                      krProgress={calculateKRProgress(kr)}
                      risk={calcRisk(kr)}
                      okrOwnerUser={okrOwnerUser}
                      users={users}
                      editingKR={editingKR}
                      tempValue={tempValue}
                      saving={saving}
                      setEditingKR={setEditingKR}
                      setTempValue={setTempValue}
                      handleInlineUpdate={handleInlineUpdate}
                      onKRClick={(kr) => { krScrollRef.current = window.scrollY || 0; setEditingKRModal(kr); }}
                      formatKRValue={formatKRValue}
                      getKRStatusColor={getKRStatusColor}
                      renderSparkline={renderSparkline}
                      readOnly={false}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )
          ) : (
            <p className="text-center text-xs text-slate-400 font-medium py-2">Nenhum Key Result cadastrado.</p>
          )}
        </div>

        {/* Modal de Edição de KR */}
        {editingKRModal && !isReadOnly && (
          <KREditModal
            kr={editingKRModal}
            defaultResponsibleUserId={okrOwnerUser?.id}
            onClose={() => {
              setEditingKRModal(null);
              setTimeout(() => window.scrollTo({ top: krScrollRef.current || 0, behavior: 'auto' }), 0);
            }}
            onSave={(updatedKR) => {
              setKrLocal(updatedKR.id!, () => updatedKR);
              setEditingKRModal(null);
              setTimeout(() => window.scrollTo({ top: krScrollRef.current || 0, behavior: 'auto' }), 0);
            }}
          />
        )}
    </div>
  );
};
