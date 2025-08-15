// Simple cache buster & reset for local dev/testing

export async function clearAllCaches(): Promise<void> {
  try { localStorage.clear(); } catch {}
  try { sessionStorage.clear(); } catch {}
  try {
    // delete app IndexedDBs commonly used by Supabase and app
    if (indexedDB && indexedDB.databases) {
      const dbs: any = await (indexedDB as any).databases();
      for (const db of dbs) {
        if (db && db.name) try { indexedDB.deleteDatabase(db.name as string); } catch {}
      }
    } else {
      // fallback: attempt known names
      ['localforage', 'supabase-auth', 'knowledge_documents', 'ggv-cache'].forEach(name => {
        try { indexedDB.deleteDatabase(name); } catch {}
      });
    }
  } catch {}

  // unregister service workers (DEV)
  try {
    if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister().catch(()=>{})));
    }
  } catch {}
}

export async function cacheBustIfVersionChanged(currentVersion: string): Promise<boolean> {
  try {
    const key = 'app_version';
    const prev = localStorage.getItem(key);
    if (prev !== currentVersion) {
      await clearAllCaches();
      localStorage.setItem(key, currentVersion);
      return true;
    }
  } catch {}
  return false;
}


