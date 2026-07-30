'use client';

import React from 'react';
import { FiLoader } from 'react-icons/fi';

interface SkeletonOverlayProps {
  className?: string;
  badgeOnly?: boolean;
}

export function SkeletonOverlay({ className = '', badgeOnly = false }: SkeletonOverlayProps) {
  return (
    <div
      className={`absolute inset-0 bg-slate-100/90 dark:bg-slate-900/90 backdrop-blur-xs animate-pulse z-40 rounded-lg flex flex-col items-center justify-center p-3 transition-opacity duration-300 pointer-events-none border border-emerald-500/30 ${className}`}
    >
      <div className="flex items-center gap-2 mb-2 px-2.5 py-1 bg-white/90 dark:bg-slate-800/90 rounded-full border border-slate-200 dark:border-slate-700 shadow-xs">
        <FiLoader className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 animate-spin" />
        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 tracking-wide uppercase">
          Memuat Tema...
        </span>
      </div>

      <div className="w-full space-y-2 flex flex-col items-center justify-center max-w-[80%]">
        <div className="w-full h-3 bg-slate-300 dark:bg-slate-700 rounded-full animate-pulse" />
        {!badgeOnly && (
          <div className="w-2/3 h-2.5 bg-slate-300 dark:bg-slate-700 rounded-full animate-pulse" />
        )}
      </div>
    </div>
  );
}

export default SkeletonOverlay;
