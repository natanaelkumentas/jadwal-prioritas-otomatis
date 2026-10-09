import React, { useState } from 'react';
import Link from 'next/link';
import { useTheme } from './ThemeProvider';
import Skeleton from './Skeleton';
import SkeletonOverlay from './SkeletonOverlay';
import { i18n } from '@/lib/i18n';
import { useToast } from '@/components/ToastProvider';
import { generateMonthlyRoster, resetMonthlyRoster } from '@/app/actions/generator';
import MonthYearPickerModal from './MonthYearPickerModal';
import CalendarSyncModal from './CalendarSyncModal';
import ResetMonthModal from './ResetMonthModal';
import { UserSession } from '@/lib/auth-types';
import { Staff } from '@/lib/scheduler-engine/types';
import {
  FiChevronLeft,
  FiChevronRight,
  FiCalendar,
  FiChevronDown,
  FiPlus,
  FiLoader,
  FiX,
  FiPrinter,
  FiUsers,
  FiUser,
  FiRotateCcw
} from 'react-icons/fi';

interface MonthSelectorProps {
  currentYear: number;
  currentMonth: number; // 1-12
  onMonthChange: (year: number, month: number) => void;
  onRefreshData?: () => void;
  staffCount?: number;
  onManagePersonnel?: () => void;
  hasExistingShifts?: boolean;
  currentUser?: UserSession | null;
  staffList?: Staff[];
}

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function MonthSelector({
  currentYear,
  currentMonth,
  onMonthChange,
  onRefreshData,
  staffCount,
  onManagePersonnel,
  hasExistingShifts = false,
  currentUser,
  staffList = []
}: MonthSelectorProps) {
  const { isThemeChanging } = useTheme();
  const [showModal, setShowModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showPickerModal, setShowPickerModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const toast = useToast();

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      onMonthChange(currentYear - 1, 12);
    } else {
      onMonthChange(currentYear, currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      onMonthChange(currentYear + 1, 1);
    } else {
      onMonthChange(currentYear, currentMonth + 1);
    }
  };

  const handleConfirmGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await generateMonthlyRoster({
        year: currentYear,
        month: currentMonth
      });

      if (res.success) {
        toast.success(`Berhasil membuat ${res.totalShifts} shift untuk bulan ${MONTH_NAMES_ID[currentMonth - 1]} ${currentYear}.`);
        setShowModal(false);
        onRefreshData?.();
      } else {
        if (res.error?.includes('sudah tersedia')) {
          toast.info(res.error);
          setShowModal(false);
          onRefreshData?.();
        } else {
          toast.error(res.error || 'Gagal membuat jadwal.');
        }
      }
    } catch (err: any) {
      toast.error('Terjadi kesalahan saat memproses pembuatan jadwal: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConfirmReset = async (mode: 'libur' | 'delete') => {
    setIsResetting(true);
    try {
      const res = await resetMonthlyRoster({
        year: currentYear,
        month: currentMonth,
        mode
      });

      if (res.success) {
        toast.success(
          mode === 'delete'
            ? `Berhasil mengosongkan seluruh shift untuk bulan ${MONTH_NAMES_ID[currentMonth - 1]} ${currentYear}.`
            : `Seluruh shift untuk bulan ${MONTH_NAMES_ID[currentMonth - 1]} ${currentYear} berhasil diubah menjadi Libur (L).`
        );
        setShowResetModal(false);
        onRefreshData?.();
      } else {
        toast.error(res.error || 'Gagal mereset jadwal.');
      }
    } catch (err: any) {
      toast.error('Terjadi kesalahan saat mereset jadwal: ' + err.message);
    } finally {
      setIsResetting(false);
    }
  };

  const handleTodayMonth = () => {
    const now = new Date();
    onMonthChange(now.getFullYear(), now.getMonth() + 1);
  };

  const isCurrentMonthNow = () => {
    const now = new Date();
    return currentYear === now.getFullYear() && currentMonth === (now.getMonth() + 1);
  };

  return (
    <div className="mb-4 sm:mb-6 p-2.5 sm:p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 sm:gap-3 shadow-xs">
      {/* Tier 1: Personnel Badge & Month Navigation */}
      <div className="flex items-center justify-between gap-2 w-full md:w-auto">
        {/* Personnel badge / Jadwal Saya */}
        {currentUser?.role === 'user' ? (
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 text-xs">
            <Link
              href={`/personel/${encodeURIComponent(currentUser.email || currentUser.staffId || '')}`}
              className="px-2.5 py-1 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-slate-700 rounded font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap"
              title="Lihat Jadwal Dinas Saya"
            >
              <FiUser className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden xs:inline">Jadwal Saya</span>
              <span className="xs:hidden">Saya</span>
            </Link>
          </div>
        ) : staffCount !== undefined && onManagePersonnel ? (
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 text-xs">
            <span className="px-2 sm:px-2.5 py-1 font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 sm:gap-1.5 whitespace-nowrap">
              <FiUsers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>{staffCount} <span className="hidden xs:inline">Personel</span></span>
            </span>
            <span className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />
            <button
              onClick={onManagePersonnel}
              className="px-2 sm:px-2.5 py-1 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-700 rounded font-semibold transition-colors whitespace-nowrap"
              title="Kelola data personel dan akun"
            >
              Kelola
            </button>
          </div>
        ) : <div />}

        {/* Month/Year Navigation */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Prev Month button */}
          <button
            onClick={handlePrevMonth}
            className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors flex items-center justify-center text-xs font-semibold"
            title="Bulan Sebelumnya"
            aria-label="Bulan Sebelumnya"
          >
            <FiChevronLeft className="w-4 h-4" />
          </button>

          {/* Clickable Month & Year Display */}
          <button
            onClick={() => setShowPickerModal(true)}
            className="text-center px-2.5 sm:px-3 py-1 bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg transition-all cursor-pointer group relative overflow-hidden"
            title="Klik untuk memilih bulan & tahun secara langsung"
          >
            {isThemeChanging && <SkeletonOverlay badgeOnly />}
            <div className="flex items-center justify-center gap-1 sm:gap-1.5">
              <FiCalendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors whitespace-nowrap">
                {MONTH_NAMES_ID[currentMonth - 1]} {currentYear}
              </span>
              <FiChevronDown className="w-3 h-3 text-slate-400" />
            </div>
          </button>

          {/* Next Month button */}
          <button
            onClick={handleNextMonth}
            className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors flex items-center justify-center text-xs font-semibold"
            title="Bulan Berikutnya"
            aria-label="Bulan Berikutnya"
          >
            <FiChevronRight className="w-4 h-4" />
          </button>

          {/* Today / Current Month Quick Jump Button */}
          {!isCurrentMonthNow() && (
            <button
              onClick={handleTodayMonth}
              className="px-2 py-1 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30 rounded-lg text-xs font-bold transition-all flex items-center gap-1 whitespace-nowrap"
              title="Kembali ke Bulan Ini"
            >
              <span>Bulan Ini</span>
            </button>
          )}
        </div>
      </div>

      {/* Tier 2: Action Buttons (Horizontal scrolling on small screens) */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 md:pb-0 no-scrollbar w-full md:w-auto flex-nowrap sm:flex-wrap">
        <Link
          href={`/cetak?tahun=${currentYear}&bulan=${currentMonth}`}
          className="py-1.5 px-2.5 sm:px-3 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs whitespace-nowrap flex-shrink-0"
          title="Buka halaman cetak & unduh jadwal bulanan (muat 1 halaman)"
        >
          <FiPrinter className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Cetak / Unduh</span>
        </Link>

        {/* Sync Calendar Button (Opens CalendarSyncModal) */}
        <button
          onClick={() => setShowSyncModal(true)}
          className="py-1.5 px-2.5 sm:px-3 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs whitespace-nowrap flex-shrink-0"
          title="Sinkronkan jadwal dinas ke Google Calendar"
        >
          <FiCalendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>Sync Kalender</span>
        </button>

        {/* Buat Jadwal Button (Only for Admin & Developer) */}
        {currentUser?.role !== 'user' && (
          <button
            onClick={() => setShowModal(true)}
            disabled={hasExistingShifts || isGenerating}
            className={`py-1.5 px-2.5 sm:px-3 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs whitespace-nowrap flex-shrink-0 ${
              hasExistingShifts
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                : 'bg-slate-900 dark:bg-slate-200 hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 cursor-pointer active:scale-95'
            }`}
            title={hasExistingShifts ? 'Jadwal untuk bulan ini sudah dibuat' : 'Buat jadwal otomatis untuk bulan ini'}
          >
            <FiPlus className="w-3.5 h-3.5" />
            <span>Buat Jadwal</span>
          </button>
        )}

        {/* Reset Jadwal Button (Only for Admin & Developer) */}
        {currentUser?.role !== 'user' && (
          <button
            onClick={() => setShowResetModal(true)}
            disabled={!hasExistingShifts || isResetting}
            className={`py-1.5 px-2.5 sm:px-3 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs whitespace-nowrap flex-shrink-0 ${
              !hasExistingShifts
                ? 'bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-slate-200 dark:border-slate-800'
                : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 dark:text-rose-300 dark:border-rose-800/50 cursor-pointer active:scale-95'
            }`}
            title={!hasExistingShifts ? 'Belum ada jadwal untuk direset' : 'Reset jadwal bulan ini (semua libur atau kosongkan)'}
          >
            <FiRotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
            <span>Reset Jadwal</span>
          </button>
        )}
      </div>

      {/* Direct Month & Year Picker Modal Popup */}
      {showPickerModal && (
        <MonthYearPickerModal
          currentYear={currentYear}
          currentMonth={currentMonth}
          onSelect={(year, month) => {
            onMonthChange(year, month);
          }}
          onClose={() => setShowPickerModal(false)}
        />
      )}

      {/* Calendar Sync Modal */}
      <CalendarSyncModal
        isOpen={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        staffList={staffList}
        currentUser={currentUser}
      />

      {/* Reset Month Schedule Modal */}
      <ResetMonthModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={handleConfirmReset}
        monthName={MONTH_NAMES_ID[currentMonth - 1]}
        year={currentYear}
        isSubmitting={isResetting}
      />

      {/* Generator Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-955/60 dark:bg-slate-955/80 backdrop-blur-xs sm:backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="fixed inset-0" onClick={() => setShowModal(false)} />
          <div className="relative z-[101] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-t-xl sm:rounded-xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-slide-in-right safe-area-bottom">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {i18n.modalGenerateTitle}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded"
                title="Tutup"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {i18n.modalGenerateDesc}
            </p>

            <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-600 dark:text-slate-400">
              Target Bulan: <strong className="text-slate-900 dark:text-slate-200">{MONTH_NAMES_ID[currentMonth - 1]} {currentYear}</strong>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowModal(false)}
                disabled={isGenerating}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 transition-colors"
              >
                {i18n.modalCancelBtn}
              </button>
              <button
                onClick={handleConfirmGenerate}
                disabled={isGenerating}
                className="px-4 py-2 bg-slate-900 dark:bg-slate-200 hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                {isGenerating ? (
                  <FiLoader className="w-4 h-4 animate-spin" />
                ) : null}
                <span>{isGenerating ? i18n.generatingStatus : i18n.modalConfirmBtn}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
