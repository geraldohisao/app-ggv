import { useEffect, useRef } from 'react';
import { StrategicMap } from '../../../types';

const DRAFT_KEY_PREFIX = 'okr-draft-';
const AUTO_SAVE_INTERVAL = 30000; // 30 segundos
const CHANGE_SAVE_DELAY = 2000; // salva 2s após mudança

/**
 * Hook para auto-save de OKR no localStorage
 */
export const useAutoSave = (map: StrategicMap, userId: string) => {
  const lastSavedRef = useRef<string>('');
  const intervalRef = useRef<NodeJS.Timeout>();
  const changeTimeoutRef = useRef<NodeJS.Timeout>();

  const safeUserId = userId || 'guest';
  const draftKey = `${DRAFT_KEY_PREFIX}${safeUserId}${map.id ? `-${map.id}` : '-new'}`;

  const saveDraft = (currentMap: StrategicMap) => {
    try {
      const mapString = JSON.stringify(currentMap);
      
      if (mapString !== lastSavedRef.current) {
        localStorage.setItem(draftKey, mapString);
        localStorage.setItem(`${draftKey}-timestamp`, new Date().toISOString());
        lastSavedRef.current = mapString;
        
        console.log('💾 Draft salvo localmente:', new Date().toLocaleTimeString());
      }
    } catch (error) {
      console.error('Erro ao salvar draft:', error);
    }
  };

  const loadDraft = (): StrategicMap | null => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const timestamp = localStorage.getItem(`${draftKey}-timestamp`);
        console.log('📥 Draft encontrado de:', timestamp ? new Date(timestamp).toLocaleString() : 'data desconhecida');
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Erro ao carregar draft:', error);
    }
    return null;
  };

  const clearDraft = () => {
    try {
      localStorage.removeItem(draftKey);
      localStorage.removeItem(`${draftKey}-timestamp`);
      console.log('🗑️ Draft removido');
    } catch (error) {
      console.error('Erro ao remover draft:', error);
    }
  };

  // Salva em intervalo fixo
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      saveDraft(map);
    }, AUTO_SAVE_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [map]);

  // Salva 2s após qualquer mudança (para não depender apenas do intervalo)
  useEffect(() => {
    if (changeTimeoutRef.current) clearTimeout(changeTimeoutRef.current);
    changeTimeoutRef.current = setTimeout(() => saveDraft(map), CHANGE_SAVE_DELAY);

    return () => {
      if (changeTimeoutRef.current) clearTimeout(changeTimeoutRef.current);
    };
  }, [map]);

  // Salva ao desmontar
  useEffect(() => {
    return () => {
      saveDraft(map);
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      saveDraft(map);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [map]);

  return {
    saveDraft,
    loadDraft,
    clearDraft
  };
};

