/**
 * Utilitários para gerenciamento de sessão
 */

/**
 * Renova o timestamp da sessão para manter o usuário logado
 * Deve ser chamado em qualquer atividade significativa do usuário
 */
export const renewSessionTimestamp = (): void => {
  const savedUser = localStorage.getItem('ggv-user');
  if (savedUser) {
    const newTimestamp = Date.now().toString();
    localStorage.setItem('ggv-user-timestamp', newTimestamp);
    sessionStorage.setItem('ggv-user-timestamp', newTimestamp);
    console.log('🔄 SESSION UTILS - Timestamp renovado por atividade');
  }
};

/**
 * Verifica se a sessão ainda é válida (100 horas)
 */
export const isSessionValid = (): boolean => {
  const savedTimestamp = localStorage.getItem('ggv-user-timestamp') || sessionStorage.getItem('ggv-user-timestamp');
  if (!savedTimestamp) return false;
  
  const timestamp = parseInt(savedTimestamp);
  const now = Date.now();
  const oneHundredHours = 100 * 60 * 60 * 1000; // 100 horas
  
  return (now - timestamp) < oneHundredHours;
};

/**
 * Obtém informações sobre a sessão atual
 */
export const getSessionInfo = () => {
  const savedUser = localStorage.getItem('ggv-user');
  const savedTimestamp = localStorage.getItem('ggv-user-timestamp');
  
  if (!savedUser || !savedTimestamp) {
    return { isLoggedIn: false, user: null, ageHours: 0 };
  }
  
  const user = JSON.parse(savedUser);
  const timestamp = parseInt(savedTimestamp);
  const now = Date.now();
  const ageHours = Math.floor((now - timestamp) / (1000 * 60 * 60));
  
  return {
    isLoggedIn: true,
    user,
    ageHours,
    isValid: isSessionValid()
  };
};
