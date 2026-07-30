'use client';

import React from 'react';

interface SkeletonOverlayProps {
  className?: string;
  badgeOnly?: boolean;
}

export function SkeletonOverlay({ className = '', badgeOnly = false }: SkeletonOverlayProps) {
  return (
    <div
      className={`absolute inset-0 bg-slate-200/80 dark:bg-slate-800/80 backdrop-blur-[2px] animate-pulse z-20 rounded-lg flex items-center justify-center p-3 transition-opacity duration-300 pointer-events-none ${className}`}
    >
      <div className="w-full space-y-2 flex flex-col items-center justify-center">
        <div className="w-3/4 h-3 bg-slate-300/80 dark:bg-slate-700/80 rounded animate-pulse" />
        {!badgeOnly && (
          <div className="w-1/2 h-4 bg-slate-300/80 dark:bg-slate-700/80 rounded animate-pulse" />
        )}
      </div>
    </div>
  );
}

export default SkeletonOverlay;
