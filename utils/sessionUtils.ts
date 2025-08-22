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
 * Limpa completamente a sessão do usuário
 */
export const clearSession = (): void => {
  localStorage.removeItem('ggv-user');
  localStorage.removeItem('ggv-user-timestamp');
  sessionStorage.removeItem('ggv-user');
  sessionStorage.removeItem('ggv-user-timestamp');
  console.log('🧹 SESSION UTILS - Sessão completamente limpa');
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
