import React from 'react';

interface GGVLogoProps {
  className?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'horizontal' | 'vertical' | 'icon-only';
}

export const GGVLogo: React.FC<GGVLogoProps> = ({ 
  className = '', 
  size = 'medium',
  variant = 'horizontal'
}) => {
  // URLs fixas dos logos (confirmadas e validadas)
  const logoUrls = {
    horizontal: 'https://ggvinteligencia.com.br/wp-content/uploads/2025/08/Logo-Grupo-GGV-Preto-Vertical-1.png', // Usando a vertical como padrão
    vertical: 'https://ggvinteligencia.com.br/wp-content/uploads/2025/08/Logo-Grupo-GGV-Preto-Vertical-1.png',
  };

  // Definir tamanhos
  const sizeClasses = {
    small: 'h-8',
    medium: 'h-12',
    large: 'h-16'
  };

  // Fallback SVG caso a imagem não carregue
  const FallbackLogo = () => (
    <div className={`flex items-center gap-2 ${sizeClasses[size]}`}>
      <div className={`${size === 'small' ? 'w-8 h-8' : size === 'medium' ? 'w-12 h-12' : 'w-16 h-16'} rounded-xl bg-gradient-to-br from-teal-600 to-teal-700 flex items-center justify-center shadow-lg`}>
        <span className={`text-white font-bold ${size === 'small' ? 'text-sm' : size === 'medium' ? 'text-xl' : 'text-2xl'}`}>
          G
        </span>
      </div>
      {variant !== 'icon-only' && (
        <div className="flex flex-col">
          <span className={`font-extrabold text-slate-900 leading-none ${size === 'small' ? 'text-lg' : size === 'medium' ? 'text-2xl' : 'text-3xl'}`}>
            GRUPO
          </span>
          <span className={`font-extrabold text-teal-600 leading-none ${size === 'small' ? 'text-lg' : size === 'medium' ? 'text-2xl' : 'text-3xl'}`}>
            GGV
          </span>
        </div>
      )}
    </div>
  );

  // Se for apenas ícone, usar o fallback sempre
  if (variant === 'icon-only') {
    return (
      <div className={className}>
        <div className={`${sizeClasses[size]} w-12 rounded-xl bg-gradient-to-br from-teal-600 to-teal-700 flex items-center justify-center shadow-lg`}>
          <span className="text-white font-bold text-xl">G</span>
        </div>
      </div>
    );
  }

  const logoUrl = variant === 'vertical' ? logoUrls.vertical : logoUrls.horizontal;

  return (
    <div className={className}>
      <img
        src={logoUrl}
        alt="Grupo GGV"
        className={`${sizeClasses[size]} w-auto object-contain`}
        loading="eager"
        onError={(e) => {
          console.warn('🖼️ Logo externo falhou, usando fallback');
          const target = e.target as HTMLImageElement;
          const parent = target.parentNode as HTMLElement;
          if (parent) {
            // Substituir por fallback
            target.style.display = 'none';
            const fallbackDiv = document.createElement('div');
            fallbackDiv.innerHTML = `
              <div class="flex items-center gap-2">
                <div class="${size === 'small' ? 'w-8 h-8' : size === 'medium' ? 'w-12 h-12' : 'w-16 h-16'} rounded-xl bg-gradient-to-br from-teal-600 to-teal-700 flex items-center justify-center shadow-lg">
                  <span class="text-white font-bold ${size === 'small' ? 'text-sm' : size === 'medium' ? 'text-xl' : 'text-2xl'}">G</span>
                </div>
                <div class="flex flex-col">
                  <span class="font-extrabold text-slate-900 leading-none ${size === 'small' ? 'text-lg' : size === 'medium' ? 'text-2xl' : 'text-3xl'}">GRUPO</span>
                  <span class="font-extrabold text-teal-600 leading-none ${size === 'small' ? 'text-lg' : size === 'medium' ? 'text-2xl' : 'text-3xl'}">GGV</span>
                </div>
              </div>
            `;
            parent.appendChild(fallbackDiv);
          }
        }}
      />
    </div>
  );
};
