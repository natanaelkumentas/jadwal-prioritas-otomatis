'use client';

import React, { useState, useEffect } from 'react';
import { Staff } from '@/lib/scheduler-engine/types';
import { UserSession } from '@/lib/auth-types';
import { FiCalendar, FiCopy, FiCheck, FiExternalLink, FiDownload, FiX, FiInfo, FiUser } from 'react-icons/fi';

interface CalendarSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: Staff[];
  currentUser?: UserSession | null;
  initialStaffEmail?: string;
}

export default function CalendarSyncModal({
  isOpen,
  onClose,
  staffList,
  currentUser,
  initialStaffEmail,
}: CalendarSyncModalProps) {
  const [selectedEmail, setSelectedEmail] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    if (currentUser?.role === 'user') {
      // Force lock to logged in user's email
      setSelectedEmail(currentUser.email);
    } else if (initialStaffEmail) {
      setSelectedEmail(initialStaffEmail);
    } else if (staffList.length > 0 && !selectedEmail) {
      setSelectedEmail(staffList[0].gmail || staffList[0].id);
    }
  }, [isOpen, currentUser, initialStaffEmail, staffList]);

  if (!isOpen) return null;

  const currentStaff = staffList.find(
    (s) => (s.gmail || s.id).toLowerCase() === selectedEmail.toLowerCase()
  );

  const cleanHost = origin.replace(/^https?:\/\//, '');
  const webcalUrl = `webcal://${cleanHost}/api/calendar/${encodeURIComponent(selectedEmail)}.ics`;
  const httpsUrl = `${origin}/api/calendar/${encodeURIComponent(selectedEmail)}.ics`;
  const googleCalendarUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(webcalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const isUserRole = currentUser?.role === 'user';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-50/80 via-white to-white dark:from-blue-950/40 dark:via-slate-900 dark:to-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
              <FiCalendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Sinkronisasi Google Calendar</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Langganan jadwal dinas otomatis per individu (WebCal)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Personel Selection (Disabled/Hidden for regular users) */}
          {!isUserRole ? (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
                Pilih Personel Teknisi
              </label>
              <div className="relative">
                <select
                  value={selectedEmail}
                  onChange={(e) => setSelectedEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950/70 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                >
                  {staffList.map((s) => (
                    <option key={s.gmail || s.id} value={s.gmail || s.id}>
                      {s.name} ({s.group} - {s.gmail || s.id})
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <FiUser className="w-4 h-4" />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/50 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-600/20 text-blue-700 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
                {currentStaff?.name ? currentStaff.name[0] : 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                  {currentStaff?.name || currentUser?.name}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{selectedEmail}</div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 text-xs font-semibold border border-blue-200 dark:border-blue-500/20">
                Jadwal Pribadi
              </span>
            </div>
          )}

          {/* Guarantee Box */}
          <div className="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/50 flex items-start gap-3 text-xs text-sky-900 dark:text-sky-300 leading-relaxed">
            <FiInfo className="w-4 h-4 text-sky-600 dark:text-sky-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-sky-950 dark:text-white">Jadwal 100% Khusus:</strong> Kalender ini hanya akan memuat shift dinas milik{' '}
              <span className="text-sky-700 dark:text-sky-300 font-semibold">{currentStaff?.name || selectedEmail}</span>. Shift teknisi lain tidak akan muncul di kalender Anda.
            </div>
          </div>

          {/* Action 1: Direct Open in Google Calendar */}
          <div className="space-y-2">
            <a
              href={googleCalendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white font-semibold rounded-xl text-sm shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all transform active:scale-[0.99]"
            >
              <FiExternalLink className="w-4 h-4" />
              <span>Buka & Tambahkan ke Google Calendar (1-Klik)</span>
            </a>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
              Google Calendar akan langsung meminta konfirmasi untuk berlangganan feed kalender ini.
            </p>
          </div>

          {/* Action 2: Copy WebCal Feed Link */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Atau Salin Tautan Feed (WebCal)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={webcalUrl}
                className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-950/70 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 text-xs font-mono focus:outline-none select-all"
              />
              <button
                onClick={handleCopyLink}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  copied
                    ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700'
                }`}
              >
                {copied ? <FiCheck className="w-4 h-4" /> : <FiCopy className="w-4 h-4" />}
                <span>{copied ? 'Tersalin!' : 'Salin'}</span>
              </button>
            </div>
          </div>

          {/* Action 3: Direct Download .ICS */}
          <div className="pt-2 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800">
            <span>Ingin menyimpan file kalender offline?</span>
            <a
              href={httpsUrl}
              download={`${selectedEmail}.ics`}
              className="inline-flex items-center gap-1.5 text-blue-600 dark:text-sky-400 hover:text-blue-700 dark:hover:text-sky-300 font-semibold hover:underline"
            >
              <FiDownload className="w-3.5 h-3.5" />
              <span>Unduh .ICS</span>
            </a>
          </div>

          {/* Quick instructions accordion/box */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 space-y-1.5">
            <div className="font-semibold text-slate-800 dark:text-slate-300">Cara Tambah Manual di HP / Google Calendar:</div>
            <ol className="list-decimal pl-4 space-y-1">
              <li>Buka <strong>calendar.google.com</strong> di browser (atau Apple Calendar di iPhone).</li>
              <li>Pilih tanda <strong>+</strong> pada bagian <em>Other calendars</em> (Kalender lain).</li>
              <li>Pilih <strong>From URL</strong> (Dari URL), lalu tempel tautan yang disalin di atas.</li>
              <li>Jadwal akan otomatis muncul di aplikasi Google Calendar di HP Anda dan ter-update secara berkala.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
