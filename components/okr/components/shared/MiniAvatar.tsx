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

  // #region agent log
  const isGeraldo = user.name?.toLowerCase().includes('geraldo');
  if (isGeraldo) {
    fetch('http://127.0.0.1:7242/ingest/d9f25aad-ab08-4cdf-bf8b-99a2626827e0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MiniAvatar.tsx:55',message:'MiniAvatar rendering Geraldo',data:{userName:user.name,hasAvatarUrl:!!user.avatar_url,avatarUrl:user.avatar_url,imgError:imgError,size:size,isInherited:isInherited},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C,D'})}).catch(()=>{});
  }
  // #endregion

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
          onError={() => {
            // #region agent log
            if (isGeraldo) {
              fetch('http://127.0.0.1:7242/ingest/d9f25aad-ab08-4cdf-bf8b-99a2626827e0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MiniAvatar.tsx:72',message:'MiniAvatar Geraldo image ERROR',data:{userName:user.name,avatarUrl:user.avatar_url},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B,E'})}).catch(()=>{});
            }
            // #endregion
            setImgError(true);
          }}
          referrerPolicy="no-referrer"
          onLoad={(e) => {
            // #region agent log
            if (isGeraldo) {
              const img = e.currentTarget;
              const styles = getComputedStyle(img);
              fetch('http://127.0.0.1:7242/ingest/d9f25aad-ab08-4cdf-bf8b-99a2626827e0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MiniAvatar.tsx:81',message:'MiniAvatar Geraldo image loaded',data:{userName:user.name,avatarUrl:user.avatar_url},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B,E'})}).catch(()=>{});
              fetch('http://127.0.0.1:7242/ingest/d9f25aad-ab08-4cdf-bf8b-99a2626827e0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MiniAvatar.tsx:82',message:'MiniAvatar Geraldo metrics',data:{naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,clientWidth:img.clientWidth,clientHeight:img.clientHeight,display:styles.display,visibility:styles.visibility,opacity:styles.opacity},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
            }
            // #endregion
          }}
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
