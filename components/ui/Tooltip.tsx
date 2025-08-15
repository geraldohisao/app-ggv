
import React from 'react';

interface TooltipProps {
  children: React.ReactNode;
  text: string;
}

const Tooltip: React.FC<TooltipProps> = ({ children, text }) => {
  return (
    <div className="relative flex items-center group">
      {children}
      {/* Tooltip que aparece abaixo e à esquerda para evitar corte */}
      <div className="absolute right-0 top-full mt-2 w-36 px-2 py-1.5 bg-gray-900 text-white text-xs rounded-md shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-50 pointer-events-none">
        {text}
        {/* Seta apontando para cima */}
        <div className="absolute bottom-full right-3 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-b-4 border-b-gray-900"></div>
      </div>
    </div>
  );
};

export default Tooltip;
