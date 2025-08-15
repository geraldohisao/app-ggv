import { getLogosFromCache } from '../utils/fetchLogosFromDatabase';

// URLs fixas como fallback final
const DEFAULT_LOGOS = {
  grupoGGVLogoUrl: 'https://ggvinteligencia.com.br/wp-content/uploads/2025/08/Logo-Grupo-GGV-Preto-Vertical-1.png',
  ggvInteligenciaLogoUrl: 'https://ggvinteligencia.com.br/wp-content/uploads/2023/12/Logo-GGV-Inteligencia.svg',
  // URLs alternativas
  grupoGGVHorizontalUrl: 'https://ggvinteligencia.com.br/wp-content/uploads/2025/08/Logo-Grupo-GGV-Preto_Vertical-1.png',
  ggvInteligenciaAltUrl: 'https://ggvinteligencia.com.br/wp-content/uploads/2023/12/image_1.svg',
  // Fallback local para casos de erro
  fallbackLogo: '/favicon.ico'
} as const;

// Pegar URLs em ordem de prioridade:
// 1. Cache local (dados do banco)
// 2. window.APP_CONFIG
// 3. URLs fixas como fallback
const getLogoUrls = () => {
  try {
    // Tentar cache local primeiro (dados do banco)
    const cachedLogos = getLogosFromCache();
    if (cachedLogos.grupoGGVLogoUrl && cachedLogos.ggvInteligenciaLogoUrl) {
      return {
        ...DEFAULT_LOGOS,
        grupoGGVLogoUrl: cachedLogos.grupoGGVLogoUrl,
        ggvInteligenciaLogoUrl: cachedLogos.ggvInteligenciaLogoUrl,
      };
    }
  } catch (error) {
    console.warn('⚠️ LOGOS - Erro ao buscar cache, usando fallback:', error);
  }

  // Fallback para window.APP_CONFIG
  if (typeof window !== 'undefined' && (window as any).APP_CONFIG?.LOGOS) {
    const windowLogos = (window as any).APP_CONFIG.LOGOS;
    return {
      ...DEFAULT_LOGOS,
      grupoGGVLogoUrl: windowLogos.grupoGGVLogoUrl || DEFAULT_LOGOS.grupoGGVLogoUrl,
      ggvInteligenciaLogoUrl: windowLogos.ggvInteligenciaLogoUrl || DEFAULT_LOGOS.ggvInteligenciaLogoUrl,
    };
  }
  
  // Fallback final para URLs fixas
  return DEFAULT_LOGOS;
};

export const LOGO_URLS = getLogoUrls();

export type LogoConfig = typeof LOGO_URLS;
