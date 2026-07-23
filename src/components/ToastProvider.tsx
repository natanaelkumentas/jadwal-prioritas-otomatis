'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { FiCheckCircle, FiAlertCircle, FiInfo, FiX } from 'react-icons/fi';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

let toastIdCounter = 0;

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = ++toastIdCounter;
    setToasts(prev => [...prev, { id, type, message }]);

    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const contextValue: ToastContextValue = {
    success: (msg) => addToast('success', msg),
    error: (msg) => addToast('error', msg),
    info: (msg) => addToast('info', msg),
  };

  const getToastStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300';
      case 'error':
        return 'bg-red-500/15 border-red-500/40 text-red-300';
      case 'info':
        return 'bg-blue-500/15 border-blue-500/40 text-blue-300';
    }
  };

  const renderToastIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <FiCheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />;
      case 'error':
        return <FiAlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />;
      case 'info':
        return <FiInfo className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />;
    }
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}

      {/* Toast Container - fixed top-right */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-2.5 px-4 py-3 rounded-lg border backdrop-blur-md shadow-xl text-xs sm:text-sm leading-relaxed animate-slide-in-right ${getToastStyles(toast.type)}`}
          >
            {renderToastIcon(toast.type)}
            <span className="flex-1 font-medium">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-200 p-0.5 rounded flex-shrink-0 ml-1 transition-colors"
              title="Tutup"
            >
              <FiX className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Keyframe animation injected via style tag */}
      <style jsx global>{`
        @keyframes slide-in-right {
          0% { opacity: 0; transform: translateX(100%); }
          100% { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out forwards;
        }
      `}</style>
    </ToastContext.Provider>
  );
}
