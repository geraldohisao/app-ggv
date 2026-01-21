import React from 'react';

interface BadgeProps {
  label: string;
  color: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ label, color, className = '' }) => {
  return (
    <span
      className={`
        inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest
        ${color} ${className}
      `}
    >
      {label}
    </span>
  );
};
