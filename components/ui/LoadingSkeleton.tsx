import React from 'react';

/**
 * Loading Skeleton genérico
 */
export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`animate-pulse bg-slate-200 rounded ${className}`} />
);

/**
 * Skeleton para item de lista de OS
 */
export const OSListItemSkeleton: React.FC = () => (
    <div className="p-3 md:p-4 border-b border-slate-100">
        <div className="flex items-start gap-3 md:gap-4">
            {/* Icon skeleton */}
            <Skeleton className="w-10 h-10 md:w-12 md:h-12 rounded-lg shrink-0" />
            
            {/* Content skeleton */}
            <div className="flex-1 space-y-2">
                {/* Title */}
                <Skeleton className="h-5 w-3/4" />
                
                {/* Subtitle */}
                <Skeleton className="h-4 w-1/2" />
                
                {/* OS Number */}
                <Skeleton className="h-3 w-1/4" />
                
                {/* Progress bar */}
                <div className="pt-2">
                    <Skeleton className="h-2 w-full rounded-full" />
                </div>
                
                {/* Meta info */}
                <div className="flex gap-4">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-24" />
                </div>
            </div>
            
            {/* Action button skeleton */}
            <Skeleton className="w-20 h-8 rounded-lg shrink-0 hidden sm:block" />
        </div>
    </div>
);

/**
 * Skeleton para lista completa
 */
export const OSListSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
    <div className="bg-white rounded-xl shadow-lg divide-y divide-slate-100">
        {Array.from({ length: count }).map((_, i) => (
            <OSListItemSkeleton key={i} />
        ))}
    </div>
);

/**
 * Skeleton para detalhes de OS
 */
export const OSDetailSkeleton: React.FC = () => (
    <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-2/3" />
        <div className="pt-4">
            <Skeleton className="h-32 w-full" />
        </div>
        <div className="flex gap-3">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 flex-1" />
        </div>
    </div>
);

