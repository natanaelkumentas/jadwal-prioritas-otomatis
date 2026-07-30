'use client';

import React from 'react';
import { useTheme } from './ThemeProvider';
import { FiSun, FiMoon } from 'react-icons/fi';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg text-[10px] sm:text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs group"
      title={`Beralih ke ${theme === 'light' ? 'Mode Gelap (Dark Mode)' : 'Mode Terang (Light Mode)'}`}
      aria-label="Toggle Theme"
    >
      {theme === 'light' ? (
        <>
          <FiMoon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 group-hover:rotate-12 transition-transform" />
          <span className="hidden sm:inline">Mode Gelap</span>
        </>
      ) : (
        <>
          <FiSun className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-45 transition-transform" />
          <span className="hidden sm:inline">Mode Terang</span>
        </>
      )}
    </button>
  );
}
