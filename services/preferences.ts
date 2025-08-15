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


