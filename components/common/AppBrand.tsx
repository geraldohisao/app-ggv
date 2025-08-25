import React from 'react';
import { GGVLogo } from '../ui/GGVLogo';

type AppBrandProps = {
  className?: string;
  size?: 'sm' | 'md' | 'md-compact' | 'lg';
};

const AppBrand: React.FC<AppBrandProps> = ({ className, size = 'md' }) => {
  // Mapear tamanhos do AppBrand para o GGVLogo
  const logoSize = size === 'sm' ? 'small' : size === 'md-compact' ? 'medium-compact' : size === 'lg' ? 'large' : 'medium';
  
  return (
    <div className={className || ''}>
      <GGVLogo size={logoSize} variant="horizontal" />
    </div>
  );
};

export default AppBrand;


