'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { logout } from '@/app/actions/auth';
import type { UserSession } from '@/lib/auth-types';
import DeveloperAdminModal from '@/components/DeveloperAdminModal';
import { FiLogOut, FiShield, FiUser } from 'react-icons/fi';

interface NavbarUserPillProps {
  user: UserSession | null;
}

export default function NavbarUserPill({ user }: NavbarUserPillProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [showDevModal, setShowDevModal] = useState(false);

  if (!user) return null;

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    await logout();
    router.push('/login');
    router.refresh();
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'developer':
        return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/40';
      case 'admin':
        return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/40';
      default:
        return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40';
    }
  };

  const roleLabel = user.role === 'developer' ? 'Developer' : user.role === 'admin' ? 'Admin' : 'Teknisi';

  return (
    <>
      <div className="flex items-center gap-2">
        {/* User Card Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs text-xs transition-colors">
          <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-600/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center font-bold text-[11px]">
            {user.name ? user.name[0].toUpperCase() : <FiUser className="w-3.5 h-3.5" />}
          </div>
          <div className="flex flex-col text-left">
            <span className="font-semibold text-slate-800 dark:text-slate-100 leading-tight max-w-[130px] truncate" title={user.name}>
              {user.name}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold uppercase tracking-wider border ${getRoleBadge(user.role)}`}>
                {roleLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Developer Admin Management Button */}
        {user.role === 'developer' && (
          <button
            onClick={() => setShowDevModal(true)}
            className="px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-600/20 dark:hover:bg-purple-600/30 dark:text-purple-300 dark:border-purple-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
            title="Kelola Akun Admin"
          >
            <FiShield className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span className="hidden sm:inline">Kelola Admin</span>
          </button>
        )}

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/20 text-xs transition-all disabled:opacity-50 shadow-xs"
          title="Keluar (Logout)"
        >
          <FiLogOut className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Developer Admin Modal */}
      {user.role === 'developer' && (
        <DeveloperAdminModal
          isOpen={showDevModal}
          onClose={() => setShowDevModal(false)}
        />
      )}
    </>
  );
}
