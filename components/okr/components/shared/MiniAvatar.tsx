import React, { useState } from 'react';
import type { OKRUser } from '../../hooks/useOKRUsers';

interface MiniAvatarProps {
  user: OKRUser | null;
  size?: 'xs' | 'sm' | 'md';
  showTooltip?: boolean;
  isInherited?: boolean; // Se é herdado do OKR pai
}

const sizeClasses = {
  xs: 'w-5 h-5 text-[8px]',
  sm: 'w-6 h-6 text-[9px]',
  md: 'w-8 h-8 text-xs',
};

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

const getAvatarColor = (name: string) => {
  const colors = [
    'bg-indigo-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-violet-500',
    'bg-cyan-500',
    'bg-pink-500',
    'bg-teal-500',
  ];
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  return colors[index];
};

export const MiniAvatar: React.FC<MiniAvatarProps> = ({
  user,
  size = 'sm',
  showTooltip = true,
  isInherited = false,
}) => {
  const [imgError, setImgError] = useState(false);
  
  if (!user) return null;

  const tooltipText = isInherited 
    ? `${user.name} (responsável do OKR)`
    : user.name;

  const showImage = user.avatar_url && !imgError;

  return (
    <div 
      className={`
        relative flex-shrink-0 rounded-full flex items-center justify-center
        ${sizeClasses[size]}
        ${isInherited ? 'ring-1 ring-slate-300 ring-offset-1' : ''}
      `}
      title={showTooltip ? tooltipText : undefined}
    >
      {showImage ? (
        <img
          src={user.avatar_url}
          alt={user.name}
          className={`rounded-full object-cover ${sizeClasses[size]} ${isInherited ? 'opacity-70' : ''}`}
          onError={() => setImgError(true)}
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className={`
          rounded-full flex items-center justify-center font-bold text-white
          ${sizeClasses[size]}
          ${getAvatarColor(user.name)}
          ${isInherited ? 'opacity-70' : ''}
        `}>
          {getInitials(user.name)}
        </div>
      )}
      {isInherited && (
        <div 
          className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-slate-400 rounded-full border border-white flex items-center justify-center"
          title="Herdado do OKR"
        >
          <svg className="w-1.5 h-1.5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </div>
  );
};
