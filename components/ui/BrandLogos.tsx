import React from 'react';
import { LOGO_URLS } from '../../config/logos';

// URLs fixas - não depende mais do Supabase
const useBrandLogos = () => {
  return {
    grupoGGVLogoUrl: LOGO_URLS.grupoGGVLogoUrl,
    ggvInteligenciaLogoUrl: LOGO_URLS.ggvInteligenciaLogoUrl,
  };
};

// Fallback simples em SVG para quando a URL do logo não estiver configurada
const GrupoGGVFallbackLogo: React.FC<{ className?: string; alt?: string }> = ({ className, alt }) => (
  <svg viewBox="0 0 180 40" className={className} role="img" aria-label={alt}>
    <title>{alt}</title>
    <rect x="0" y="6" rx="6" ry="6" width="40" height="28" fill="#0ea5b7" />
    <text x="50" y="28" fontFamily="Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif" fontWeight="800" fontSize="22" fill="#0f172a">Grupo GGV</text>
  </svg>
);

export const GrupoGGVBrand: React.FC<{ className?: string; alt?: string }>
  = ({ className, alt = 'Grupo GGV' }) => {
  const urls = useBrandLogos();
  
  return (
    <img 
      src={urls.grupoGGVLogoUrl} 
      alt={alt} 
      className={className}
      referrerPolicy="no-referrer" 
      loading="eager"
      onError={(e) => {
        console.warn('Logo Grupo GGV falhou, usando fallback');
        // Se a imagem falhar, substituir por fallback SVG
        const target = e.target as HTMLImageElement;
        target.style.display = 'none';
        const parent = target.parentNode;
        if (parent) {
          const fallback = document.createElement('div');
          fallback.innerHTML = `
            <svg viewBox="0 0 180 40" class="${className}" role="img" aria-label="${alt}">
              <title>${alt}</title>
              <rect x="0" y="6" rx="6" ry="6" width="40" height="28" fill="#0ea5b7" />
              <text x="50" y="28" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif" font-weight="800" font-size="22" fill="#0f172a">Grupo GGV</text>
            </svg>
          `;
          parent.appendChild(fallback);
        }
      }}
    />
  );
};

// Fallback SVG para GGV Inteligência
const GGVInteligenciaFallbackLogo: React.FC<{ className?: string; alt?: string }> = ({ className, alt }) => (
  <svg viewBox="0 0 200 60" className={className} role="img" aria-label={alt}>
    <title>{alt}</title>
    {/* Logo GGV */}
    <circle cx="30" cy="30" r="25" fill="#1e40af" />
    <text x="30" y="38" textAnchor="middle" fontFamily="Inter, system-ui, sans-serif" fontWeight="900" fontSize="20" fill="white">GGV</text>
    {/* Texto Inteligência */}
    <text x="70" y="25" fontFamily="Inter, system-ui, sans-serif" fontWeight="600" fontSize="16" fill="#1e40af">Inteligência</text>
    <text x="70" y="42" fontFamily="Inter, system-ui, sans-serif" fontWeight="400" fontSize="12" fill="#64748b">em Vendas</text>
  </svg>
);

export const GGVInteligenciaBrand: React.FC<{ className?: string; alt?: string }>
  = ({ className, alt = 'GGV Inteligência' }) => {
  const urls = useBrandLogos();
  
  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.warn('Logo GGV Inteligência falhou, usando fallback SVG');
    const target = e.target as HTMLImageElement;
    target.style.display = 'none';
    const parent = target.parentNode;
    if (parent) {
      const fallback = document.createElement('div');
      fallback.innerHTML = `
        <svg viewBox="0 0 200 60" class="${className}" role="img" aria-label="${alt}">
          <title>${alt}</title>
          <circle cx="30" cy="30" r="25" fill="#1e40af" />
          <text x="30" y="38" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-weight="900" font-size="20" fill="white">GGV</text>
          <text x="70" y="25" font-family="Inter, system-ui, sans-serif" font-weight="600" font-size="16" fill="#1e40af">Inteligência</text>
          <text x="70" y="42" font-family="Inter, system-ui, sans-serif" font-weight="400" font-size="12" fill="#64748b">em Vendas</text>
        </svg>
      `;
      parent.appendChild(fallback);
    }
  };
  
  return (
    <img 
      src={urls.ggvInteligenciaLogoUrl} 
      alt={alt} 
      className={className}
      referrerPolicy="no-referrer" 
      loading="eager" 
      decoding="async"
      onError={handleError}
    />
  );
};


