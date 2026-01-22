/**
 * Utilitários para gerenciamento de sessão - Sistema de 100 horas
 */

// Constante para duração da sessão (100 horas)
const SESSION_DURATION_MS = 100 * 60 * 60 * 1000; // 100 horas em milliseconds

/**
 * Renova o timestamp da sessão para manter o usuário logado
 * Deve ser chamado em qualquer atividade significativa do usuário
 */
export const renewSessionTimestamp = (): boolean => {
  const savedUser = localStorage.getItem('ggv-user');
  if (savedUser) {
    const newTimestamp = Date.now().toString();
    localStorage.setItem('ggv-user-timestamp', newTimestamp);
    sessionStorage.setItem('ggv-user-timestamp', newTimestamp);
    console.log('🔄 SESSION UTILS - Timestamp renovado por atividade (100h resetadas)');
    return true;
  }
  return false;
};

/**
 * Verifica se a sessão ainda é válida (100 horas desde última atividade)
 */
export const isSessionValid = (): boolean => {
  const savedTimestamp = localStorage.getItem('ggv-user-timestamp') || sessionStorage.getItem('ggv-user-timestamp');
  if (!savedTimestamp) return false;
  
  const timestamp = parseInt(savedTimestamp);
  const now = Date.now();
  
  return (now - timestamp) < SESSION_DURATION_MS;
};

/**
 * Obtém informações detalhadas sobre a sessão atual
 */
export const getSessionInfo = () => {
  const savedUser = localStorage.getItem('ggv-user');
  const savedTimestamp = localStorage.getItem('ggv-user-timestamp');
  
  if (!savedUser || !savedTimestamp) {
    return { 
      isLoggedIn: false, 
      user: null, 
      ageHours: 0, 
      remainingHours: 0,
      isValid: false 
    };
  }
  
  try {
    const user = JSON.parse(savedUser);
    const timestamp = parseInt(savedTimestamp);
    const now = Date.now();
    const ageMs = now - timestamp;
    const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
    const remainingMs = SESSION_DURATION_MS - ageMs;
    const remainingHours = Math.max(0, Math.floor(remainingMs / (1000 * 60 * 60)));
    const isValid = remainingMs > 0;
    
    return {
      isLoggedIn: true,
      user,
      ageHours,
      remainingHours,
      isValid
    };
  } catch (error) {
    console.error('❌ SESSION UTILS - Erro ao parsear dados da sessão:', error);
    return { 
      isLoggedIn: false, 
      user: null, 
      ageHours: 0, 
      remainingHours: 0,
      isValid: false 
    };
  }
};

/**
 * Limpa completamente a sessão do usuário (incluindo impersonação)
 */
export const clearSession = (): void => {
  localStorage.removeItem('ggv-user');
  localStorage.removeItem('ggv-user-timestamp');
  localStorage.removeItem('ggv-impersonation');
  sessionStorage.removeItem('ggv-user');
  sessionStorage.removeItem('ggv-user-timestamp');
  sessionStorage.removeItem('ggv-impersonation');
  console.log('🧹 SESSION UTILS - Sessão completamente limpa (incluindo impersonação)');
};

/**
 * Verifica e renova a sessão se ainda for válida
 * Retorna true se a sessão foi renovada, false se expirou
 */
export const checkAndRenewSession = (): boolean => {
  if (isSessionValid()) {
    renewSessionTimestamp();
    return true;
  } else {
    clearSession();
    return false;
  }
};

/**
 * Salva uma nova sessão com timestamp atual
 */
export const saveSession = (user: any): void => {
  const userJson = JSON.stringify(user);
  const timestamp = Date.now().toString();
  
  localStorage.setItem('ggv-user', userJson);
  localStorage.setItem('ggv-user-timestamp', timestamp);
  sessionStorage.setItem('ggv-user', userJson);
  sessionStorage.setItem('ggv-user-timestamp', timestamp);
  
  console.log('💾 SESSION UTILS - Nova sessão salva (100h de duração)');
};

// ========================================
// IMPERSONATION (Troca de visão de usuário)
// ========================================

const IMPERSONATION_KEY = 'ggv-impersonation';

// Emails autorizados a usar impersonação
export const IMPERSONATION_ALLOWED_EMAILS = [
  'geraldo@grupoggv.com',
  'geraldo@ggvinteligencia.com.br',
];

/**
 * Verifica se o email tem permissão para usar impersonação
 */
export const canImpersonate = (email: string | undefined): boolean => {
  if (!email) return false;
  return IMPERSONATION_ALLOWED_EMAILS.includes(email.toLowerCase());
};

interface ImpersonationState {
  originalUser: any;
  impersonatedUser: any;
}

/**
 * Salva o estado de impersonação
 */
export const saveImpersonation = (originalUser: any, impersonatedUser: any): void => {
  const state: ImpersonationState = { originalUser, impersonatedUser };
  const stateJson = JSON.stringify(state);
  
  localStorage.setItem(IMPERSONATION_KEY, stateJson);
  sessionStorage.setItem(IMPERSONATION_KEY, stateJson);
  
  console.log('👤 SESSION UTILS - Impersonação salva:', impersonatedUser.email);
};

/**
 * Obtém o estado de impersonação atual
 */
export const getImpersonation = (): ImpersonationState | null => {
  const stateJson = localStorage.getItem(IMPERSONATION_KEY) || sessionStorage.getItem(IMPERSONATION_KEY);
  
  if (!stateJson) return null;
  
  try {
    return JSON.parse(stateJson) as ImpersonationState;
  } catch (error) {
    console.error('❌ SESSION UTILS - Erro ao parsear impersonação:', error);
    return null;
  }
};

/**
 * Limpa o estado de impersonação
 */
export const clearImpersonation = (): void => {
  localStorage.removeItem(IMPERSONATION_KEY);
  sessionStorage.removeItem(IMPERSONATION_KEY);
  console.log('🧹 SESSION UTILS - Impersonação limpa');
};
