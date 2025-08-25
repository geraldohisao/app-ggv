import React from 'react';

interface GGVLogoProps {
  className?: string;
  size?: 'small' | 'medium' | 'medium-compact' | 'large';
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
    'medium-compact': 'h-10', // 15% menor que medium (h-12 = 48px, h-10 = 40px ≈ 15% redução)
    large: 'h-16'
  };

  // Fallback SVG caso a imagem não carregue
  const FallbackLogo = () => {
    const getIconSize = () => {
      if (size === 'small') return 'w-8 h-8';
      if (size === 'medium-compact') return 'w-10 h-10';
      if (size === 'medium') return 'w-12 h-12';
      return 'w-16 h-16';
    };

    const getTextSize = () => {
      if (size === 'small') return 'text-sm';
      if (size === 'medium-compact') return 'text-lg';
      if (size === 'medium') return 'text-xl';
      return 'text-2xl';
    };

    const getBrandTextSize = () => {
      if (size === 'small') return 'text-lg';
      if (size === 'medium-compact') return 'text-xl';
      if (size === 'medium') return 'text-2xl';
      return 'text-3xl';
    };

    return (
      <div className={`flex items-center gap-2 ${sizeClasses[size]}`}>
        <div className={`${getIconSize()} rounded-xl bg-gradient-to-br from-teal-600 to-teal-700 flex items-center justify-center shadow-lg`}>
          <span className={`text-white font-bold ${getTextSize()}`}>
            G
          </span>
        </div>
        {variant !== 'icon-only' && (
          <div className="flex flex-col">
            <span className={`font-extrabold text-slate-900 leading-none ${getBrandTextSize()}`}>
              GRUPO
            </span>
            <span className={`font-extrabold text-teal-600 leading-none ${getBrandTextSize()}`}>
              GGV
            </span>
          </div>
        )}
      </div>
    );
  };

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
            const getIconSizeClass = () => {
              if (size === 'small') return 'w-8 h-8';
              if (size === 'medium-compact') return 'w-10 h-10';
              if (size === 'medium') return 'w-12 h-12';
              return 'w-16 h-16';
            };

            const getTextSizeClass = () => {
              if (size === 'small') return 'text-sm';
              if (size === 'medium-compact') return 'text-lg';
              if (size === 'medium') return 'text-xl';
              return 'text-2xl';
            };

            const getBrandTextSizeClass = () => {
              if (size === 'small') return 'text-lg';
              if (size === 'medium-compact') return 'text-xl';
              if (size === 'medium') return 'text-2xl';
              return 'text-3xl';
            };

            fallbackDiv.innerHTML = `
              <div class="flex items-center gap-2">
                <div class="${getIconSizeClass()} rounded-xl bg-gradient-to-br from-teal-600 to-teal-700 flex items-center justify-center shadow-lg">
                  <span class="text-white font-bold ${getTextSizeClass()}">G</span>
                </div>
                <div class="flex flex-col">
                  <span class="font-extrabold text-slate-900 leading-none ${getBrandTextSizeClass()}">GRUPO</span>
                  <span class="font-extrabold text-teal-600 leading-none ${getBrandTextSizeClass()}">GGV</span>
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
