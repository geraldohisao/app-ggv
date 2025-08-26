export const AUTO_APPLY_KEY = 'ggv:autoApplySuggestions';
export const AUTO_APPLY_CONFIRMED_KEY = 'ggv:autoApplyConfirmed';

export function getAutoApplySuggestions(): boolean {
  try {
    const raw = localStorage.getItem(AUTO_APPLY_KEY);
    return raw === 'true';
  } catch {
    return false;
  }
}

export function setAutoApplySuggestions(value: boolean): void {
  try {
    localStorage.setItem(AUTO_APPLY_KEY, value ? 'true' : 'false');
  } catch {
    // ignore
  }
}

export function isAutoApplyConfirmed(): boolean {
  try {
    return localStorage.getItem(AUTO_APPLY_CONFIRMED_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setAutoApplyConfirmed(): void {
  try {
    localStorage.setItem(AUTO_APPLY_CONFIRMED_KEY, 'true');
  } catch {
    // ignore
  }
}

// ------- Saved filters (per user & view) -------
const SAVED_FILTERS_KEY = 'ggv:savedFilters';
const FAVORITE_SDRS_KEY = 'ggv:favSdrs';

export interface SavedFilter {
  id: string;           // uuid or stable id
  name: string;         // label shown in UI
  view: 'calls' | 'dashboard';
  params: Record<string, string>; // e.g., { sdr: '...', start: '...', end: '...' }
  createdAt: string;
}

export function listSavedFilters(): SavedFilter[] {
  try {
    const raw = localStorage.getItem(SAVED_FILTERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveFilter(item: SavedFilter): void {
  try {
    const list = listSavedFilters();
    const idx = list.findIndex((x) => x.id === item.id);
    if (idx >= 0) list[idx] = item; else list.push(item);
    localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

export function removeFilter(id: string): void {
  try {
    const list = listSavedFilters().filter((x) => x.id !== id);
    localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

export function listFavoriteSdrs(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITE_SDRS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function toggleFavoriteSdr(id: string): string[] {
  try {
    const list = new Set(listFavoriteSdrs());
    if (list.has(id)) list.delete(id); else list.add(id);
    const arr = Array.from(list);
    localStorage.setItem(FAVORITE_SDRS_KEY, JSON.stringify(arr));
    return arr;
  } catch {
    return listFavoriteSdrs();
  }
}


