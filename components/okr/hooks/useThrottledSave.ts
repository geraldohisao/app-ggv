import { useRef, useCallback } from 'react';

const THROTTLE_INTERVAL = 60000; // 1 minuto

/**
 * Hook para throttle de salvamento no servidor
 */
export const useThrottledSave = () => {
  const lastSaveTimeRef = useRef<number>(0);
  const pendingSaveRef = useRef<(() => Promise<void>) | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const throttledSave = useCallback(async (saveFn: () => Promise<void>) => {
    const now = Date.now();
    const timeSinceLastSave = now - lastSaveTimeRef.current;

    if (timeSinceLastSave >= THROTTLE_INTERVAL) {
      lastSaveTimeRef.current = now;
      await saveFn();
      return;
    }

    pendingSaveRef.current = saveFn;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const remainingTime = THROTTLE_INTERVAL - timeSinceLastSave;
    
    timeoutRef.current = setTimeout(async () => {
      if (pendingSaveRef.current) {
        lastSaveTimeRef.current = Date.now();
        await pendingSaveRef.current();
        pendingSaveRef.current = null;
      }
    }, remainingTime);

    console.log(`⏱️ Salvamento agendado para daqui a ${Math.ceil(remainingTime / 1000)}s`);
  }, []);

  const forceSave = useCallback(async (saveFn: () => Promise<void>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    lastSaveTimeRef.current = Date.now();
    pendingSaveRef.current = null;
    await saveFn();
  }, []);

  return {
    throttledSave,
    forceSave
  };
};

