import React from 'react';

// URLs fixas para o GrupoGGV (mantido para compatibilidade)
const FIXED_LOGOS = {
  grupoGGVLogoUrl: 'https://ggvinteligencia.com.br/wp-content/uploads/2025/08/Logo-Grupo-GGV-Preto-Vertical-1.png',
  ggvInteligenciaLogoUrl: 'https://ggvinteligencia.com.br/wp-content/uploads/2023/12/Logo-GGV-Inteligencia.svg',
};

const useBrandLogos = () => {
  return FIXED_LOGOS;
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



export const GGVInteligenciaBrand: React.FC<{ className?: string; alt?: string }>
  = ({ className, alt = 'GGV Inteligência' }) => {
  return (
    <img 
      src="https://ggvinteligencia.com.br/wp-content/uploads/2023/12/image-1.svg"
      alt={alt}
      className={className}
      loading="eager"
      referrerPolicy="no-referrer"
    />
  );
};


