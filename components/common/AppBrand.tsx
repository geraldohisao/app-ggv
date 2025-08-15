import React from 'react';
import { GrupoGGVBrand } from '../ui/BrandLogos';

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
    <GrupoGGVBrand className={`${sizeToHeight[size]} w-auto object-contain`} />
  </div>
);

export default AppBrand;


