import React from 'react';

type AppBrandProps = {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
};

const sizeToHeight: Record<NonNullable<AppBrandProps['size']>, string> = {
  sm: 'h-6',
  md: 'h-8',
  lg: 'h-12',
};

const AppBrand: React.FC<AppBrandProps> = ({ className, size = 'md' }) => (
  <div className={`flex items-center gap-3 ${className || ''}`}>
    <img 
      src="https://ggvinteligencia.com.br/wp-content/uploads/2025/08/Logo-Grupo-GGV-Preto-Vertical-1.png"
      alt="Grupo GGV"
      className={`${sizeToHeight[size]} w-auto object-contain`}
      loading="eager"
      referrerPolicy="no-referrer"
    />
  </div>
);

export default AppBrand;


