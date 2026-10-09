'use client';

import React, { useState, useEffect } from 'react';
import { getAdminUsers, createAdminUser, deleteAdminUser, syncDatabaseUsersAction } from '@/app/actions/auth';
import { generateRandomPassword } from '@/lib/auth-types';
import { FiShield, FiPlus, FiTrash2, FiDownload, FiX, FiCheck, FiRefreshCw, FiDatabase } from 'react-icons/fi';

interface DeveloperAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function downloadCredentialsFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function DeveloperAdminModal({ isOpen, onClose }: DeveloperAdminModalProps) {
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [syncingUsers, setSyncingUsers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadAdmins = async () => {
    setLoading(true);
    const res = await getAdminUsers();
    if (res.success) {
      setAdmins(res.admins);
    }
    setLoading(false);
  };

  const handleSyncAll = async () => {
    setSyncingUsers(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res: any = await syncDatabaseUsersAction();
      if (res.success) {
        setSuccessMsg(`Berhasil menyinkronkan ${res.totalUsers} pengguna dari users.csv ke database Supabase!`);
        await loadAdmins();
      } else {
        setError(res.error || 'Gagal menyinkronkan akun pengguna.');
      }
    } catch (e: any) {
      setError(e.message || 'Terjadi kesalahan sistem saat sinkronisasi.');
    } finally {
      setSyncingUsers(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAdmins();
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGeneratePassword = () => {
    setPassword(generateRandomPassword(10));
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      const res = await createAdminUser({ name, email, password });
      if (!res.success) {
        setError(res.error || 'Gagal membuat akun admin.');
        setSubmitting(false);
        return;
      }

      // Auto download credentials file
      const credText = `=========================================
KREDENSIAL AKUN ADMINISTRATOR SAPS
AirNav Indonesia - Cabang Manado
=========================================
Nama Akun : ${name}
Email     : ${email}
Kata Sandi: ${password}
Peran     : admin
Dibuat    : ${new Date().toLocaleString('id-ID')}
=========================================
URL Login : ${window.location.origin}/login
=========================================
Simpan kredensial ini dengan aman!
`;
      downloadCredentialsFile(`kredensial-admin-${email.replace(/[^a-z0-9]/gi, '_')}.txt`, credText);

      setSuccessMsg(`Admin "${email}" berhasil dibuat! File kredensial telah otomatis diunduh.`);
      setName('');
      setEmail('');
      setPassword('');
      await loadAdmins();
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, adminEmail: string) => {
    if (!confirm(`Hapus hak akses admin untuk "${adminEmail}"?`)) return;

    const res = await deleteAdminUser(id);
    if (res.success) {
      await loadAdmins();
    } else {
      alert(res.error || 'Gagal menghapus admin.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-gradient-to-r from-purple-50 via-white to-white dark:from-purple-950/60 dark:via-slate-900 dark:to-slate-900 border-b border-purple-200/60 dark:border-purple-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="p-2 sm:p-2.5 rounded-xl bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20">
              <FiShield className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Kelola Akun Administrator</h2>
              <p className="text-[11px] sm:text-xs text-purple-700/80 dark:text-purple-300/80">Menu Khusus Hak Akses Developer</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <FiX className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto">
          {/* Create Admin Form */}
          <div className="p-4 rounded-xl bg-purple-50/40 dark:bg-slate-800/60 border border-purple-100 dark:border-slate-700/60">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <FiPlus className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              Tambah Administrator Baru
            </h3>

            {error && (
              <div className="mb-3 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs">
                {error}
              </div>
            )}
            {successMsg && (
              <div className="mb-3 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                <FiCheck className="w-4 h-4" />
                {successMsg}
              </div>
            )}

            <form onSubmit={handleCreateAdmin} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Admin Operasional"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin.baru@gmail.com"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Kata Sandi</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 8 karakter..."
                    className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 border border-purple-200 dark:bg-purple-600/20 dark:hover:bg-purple-600/30 dark:text-purple-300 dark:border-purple-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <FiRefreshCw className="w-3.5 h-3.5" />
                    Acak Sandi
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-lg shadow-purple-500/20 transition-all disabled:opacity-50"
                >
                  <FiDownload className="w-4 h-4" />
                  <span>{submitting ? 'Memproses...' : 'Buat & Unduh Kredensial Admin'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Admin List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Daftar Akun Pengelola ({admins.length})
              </h3>
              <button
                type="button"
                onClick={handleSyncAll}
                disabled={syncingUsers}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                title="Sinkronkan semua kredensial dari users.csv ke database Supabase"
              >
                <FiRefreshCw className={`w-3.5 h-3.5 ${syncingUsers ? 'animate-spin' : ''}`} />
                <span>{syncingUsers ? 'Menyinkronkan...' : 'Sinkronkan users.csv'}</span>
              </button>
            </div>
            <div className="space-y-2">
              {admins.map((adm) => (
                <div
                  key={adm.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs transition-colors hover:border-slate-300 dark:hover:border-slate-700"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 dark:text-white">{adm.name}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                          adm.role === 'developer'
                            ? 'bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30'
                            : 'bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30'
                        }`}
                      >
                        {adm.role}
                      </span>
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 mt-0.5 truncate">{adm.email}</div>
                  </div>

                  {adm.role !== 'developer' && (
                    <button
                      onClick={() => handleDelete(adm.id, adm.email)}
                      className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:text-rose-300 dark:hover:bg-rose-500/10 rounded-lg transition-colors ml-3"
                      title="Hapus Hak Admin"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
