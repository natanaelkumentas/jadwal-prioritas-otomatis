'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  isThemeChanging: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within <ThemeProvider>');
  return ctx;
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Default to 'light' theme
  const [theme, setThemeState] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);
  const [isThemeChanging, setIsThemeChanging] = useState(false);

  useEffect(() => {
    // Read saved theme from localStorage, default to 'light'
    const savedTheme = localStorage.getItem('saps-theme') as Theme | null;
    const initialTheme = (savedTheme === 'dark' || savedTheme === 'light') ? savedTheme : 'light';
    setThemeState(initialTheme);
    setMounted(true);
  }, []);

  const triggerSkeletonAnimation = useCallback(() => {
    setIsThemeChanging(true);
    setTimeout(() => {
      setIsThemeChanging(false);
    }, 800);
  }, []);

  const updateTheme = useCallback((newTheme: Theme) => {
    triggerSkeletonAnimation();
    setThemeState(newTheme);
    const root = document.documentElement;
    if (newTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('saps-theme', newTheme);
  }, [triggerSkeletonAnimation]);

  const toggleTheme = useCallback(() => {
    triggerSkeletonAnimation();
    setThemeState(prev => {
      const nextTheme = prev === 'light' ? 'dark' : 'light';
      const root = document.documentElement;
      if (nextTheme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      localStorage.setItem('saps-theme', nextTheme);
      return nextTheme;
    });
  }, [triggerSkeletonAnimation]);

  const setTheme = useCallback((newTheme: Theme) => {
    updateTheme(newTheme);
  }, [updateTheme]);

  return (
    <ThemeContext.Provider value={{ theme, isThemeChanging, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
