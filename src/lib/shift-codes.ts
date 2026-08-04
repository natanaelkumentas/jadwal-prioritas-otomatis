/**
 * Centralized Shift Code Metadata (Kamus Kode Shift)
 * Single source of truth for shift code timings, durations, and color styles
 * used by the roster grid, the shift code reference modal, and the personal schedule page.
 */

export type StaffGroup = 'CNS' | 'ESS';
export type ShiftCategory = 'work' | 'off' | 'leave';

export interface ShiftCodeInfo {
  code: string;
  label: string;                                // e.g. 'Shift Pagi'
  category: ShiftCategory;
  time: Record<StaffGroup, string>;             // Operational hours per unit
  hours: Record<StaffGroup, number>;            // Duty duration in hours per unit
  badgeStyle: string;                           // Soft pill style (reference lists)
  cellStyle: string;                            // Solid cell style (roster & calendar)
  description: string;
}

const OFF_STYLE =
  'bg-slate-100 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700/50 font-medium';
const LEAVE_STYLE =
  'bg-purple-100 dark:bg-purple-500/20 text-purple-950 dark:text-purple-300 border border-purple-400 dark:border-purple-500/40 hover:bg-purple-200 font-bold';
const LEAVE_BADGE = 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30';
const OFF_BADGE = 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30';

export const SHIFT_CODES: Record<string, ShiftCodeInfo> = {
  P: {
    code: 'P',
    label: 'Shift Pagi',
    category: 'work',
    time: { CNS: '07:00 - 15:00 WITA', ESS: '07:00 - 13:00 WITA' },
    hours: { CNS: 8, ESS: 6 },
    badgeStyle: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    cellStyle:
      'bg-amber-100 dark:bg-amber-500/20 text-amber-950 dark:text-amber-300 border border-amber-400 dark:border-amber-500/40 hover:bg-amber-200 font-bold',
    description: 'Dinas operasional pagi hari untuk pemantauan fasilitas penerbangan.'
  },
  S: {
    code: 'S',
    label: 'Shift Siang',
    category: 'work',
    time: { CNS: '12:00 - 20:00 WITA', ESS: '13:00 - 19:00 WITA' },
    hours: { CNS: 8, ESS: 6 },
    badgeStyle: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    cellStyle:
      'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-950 dark:text-emerald-300 border border-emerald-400 dark:border-emerald-500/40 hover:bg-emerald-200 font-bold',
    description: 'Dinas operasional siang hingga malam hari.'
  },
  M: {
    code: 'M',
    label: 'Shift Malam',
    category: 'work',
    time: { CNS: '19:00 - 07:00 WITA', ESS: '19:00 - 07:00 WITA' },
    hours: { CNS: 12, ESS: 12 },
    badgeStyle: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
    cellStyle:
      'bg-indigo-100 dark:bg-indigo-500/25 text-indigo-950 dark:text-indigo-300 border border-indigo-400 dark:border-indigo-500/40 hover:bg-indigo-200 font-extrabold',
    description: 'Dinas operasional malam (12 jam) hingga pagi hari.'
  },
  PS: {
    code: 'PS',
    label: 'Shift Pagi-Siang (Long Day)',
    category: 'work',
    time: { CNS: '07:00 - 19:00 WITA', ESS: '07:00 - 19:00 WITA' },
    hours: { CNS: 12, ESS: 12 },
    badgeStyle: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
    cellStyle:
      'bg-rose-100 dark:bg-rose-500/20 text-rose-950 dark:text-rose-300 border border-rose-400 dark:border-rose-500/40 hover:bg-rose-200 font-bold',
    description: 'Dinas jam panjang (12 jam) mengover shift pagi dan siang.'
  },
  OH: {
    code: 'OH',
    label: 'Jam Kerja Kantor',
    category: 'work',
    time: { CNS: '08:00 - 17:00 WITA', ESS: '08:00 - 17:00 WITA' },
    hours: { CNS: 9, ESS: 9 },
    badgeStyle: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
    cellStyle:
      'bg-sky-100 dark:bg-sky-500/20 text-sky-950 dark:text-sky-300 border border-sky-400 dark:border-sky-500/40 hover:bg-sky-200 font-bold',
    description: 'Dinas jam kantor reguler Senin hingga Jumat.'
  },
  D: {
    code: 'D',
    label: 'Dinas Jam Kantor',
    category: 'work',
    time: { CNS: '08:00 - 17:00 WITA', ESS: '08:00 - 17:00 WITA' },
    hours: { CNS: 9, ESS: 9 },
    badgeStyle: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
    cellStyle:
      'bg-sky-100 dark:bg-sky-500/20 text-sky-950 dark:text-sky-300 border border-sky-400 dark:border-sky-500/40 hover:bg-sky-200 font-bold',
    description: 'Dinas jam kantor reguler Senin hingga Jumat.'
  },
  L: {
    code: 'L',
    label: 'Libur',
    category: 'off',
    time: { CNS: 'Libur Operasional', ESS: 'Libur Operasional' },
    hours: { CNS: 0, ESS: 0 },
    badgeStyle: OFF_BADGE,
    cellStyle: OFF_STYLE,
    description: 'Hari libur terjadwal sesuai pola rotasi.'
  },
  Y: {
    code: 'Y',
    label: 'Lepas Malam',
    category: 'off',
    time: { CNS: 'Pemulihan Pasca Malam', ESS: 'Pemulihan Pasca Malam' },
    hours: { CNS: 0, ESS: 0 },
    badgeStyle: OFF_BADGE,
    cellStyle: OFF_STYLE,
    description: 'Hari pemulihan wajib setelah menjalani shift malam.'
  },
  CUTI: {
    code: 'CUTI',
    label: 'Cuti Tahunan',
    category: 'leave',
    time: { CNS: 'Izin Resmi', ESS: 'Izin Resmi' },
    hours: { CNS: 0, ESS: 0 },
    badgeStyle: LEAVE_BADGE,
    cellStyle: LEAVE_STYLE,
    description: 'Cuti tahunan personel dengan persetujuan manajemen.'
  },
  'DINAS LUAR': {
    code: 'DINAS LUAR',
    label: 'Dinas Luar Kota',
    category: 'leave',
    time: { CNS: 'Tugas Operasional', ESS: 'Tugas Operasional' },
    hours: { CNS: 0, ESS: 0 },
    badgeStyle: LEAVE_BADGE,
    cellStyle: LEAVE_STYLE,
    description: 'Penugasan luar kota atau kunjungan lokasi fasilitas.'
  },
  DIKLAT: {
    code: 'DIKLAT',
    label: 'Pelatihan / Diklat',
    category: 'leave',
    time: { CNS: 'Pengembangan Diri', ESS: 'Pengembangan Diri' },
    hours: { CNS: 0, ESS: 0 },
    badgeStyle: LEAVE_BADGE,
    cellStyle: LEAVE_STYLE,
    description: 'Keikutsertaan dalam kursus, sertifikasi, atau diklat kompetensi.'
  },
  SAKIT: {
    code: 'SAKIT',
    label: 'Izin Sakit',
    category: 'leave',
    time: { CNS: 'Izin Kesehatan', ESS: 'Izin Kesehatan' },
    hours: { CNS: 0, ESS: 0 },
    badgeStyle: LEAVE_BADGE,
    cellStyle: LEAVE_STYLE,
    description: 'Ketidakhadiran karena alasan kesehatan dengan surat dokter.'
  }
};

/** Compact labels used inside narrow roster/calendar cells. */
export const SHIFT_SHORT_CODES: Record<string, string> = {
  CUTI: 'CT',
  'DINAS LUAR': 'DL',
  DIKLAT: 'DK',
  SAKIT: 'SK'
};

const FALLBACK: ShiftCodeInfo = SHIFT_CODES.L;

/** Resolve shift code metadata, tolerant of casing and unknown codes. */
export function getShiftInfo(code?: string | null): ShiftCodeInfo {
  if (!code) return FALLBACK;
  return SHIFT_CODES[code.trim().toUpperCase()] || FALLBACK;
}

/** Shorten long leave codes for narrow cells (e.g. 'DINAS LUAR' → 'DL'). */
export function getShortCode(code?: string | null): string {
  const normalized = (code || 'L').trim().toUpperCase();
  return SHIFT_SHORT_CODES[normalized] || normalized;
}

/** Operational hours text for a code, adjusted for the technician's unit. */
export function getShiftTime(code: string | null | undefined, group: StaffGroup): string {
  return getShiftInfo(code).time[group] ?? getShiftInfo(code).time.CNS;
}

/** Duty duration in hours for a code, adjusted for the technician's unit. */
export function getShiftHours(code: string | null | undefined, group: StaffGroup): number {
  return getShiftInfo(code).hours[group] ?? 0;
}

export interface ShiftReferenceEntry {
  key: string;
  badgeCode: string;
  title: string;
  cnsTime: string;
  essTime: string;
  badgeStyle: string;
  description: string;
}

/**
 * Grouped listing for the shift code dictionary UI — aliased codes
 * (OH/D, L/Y) are presented as a single entry.
 */
export const SHIFT_REFERENCE: ShiftReferenceEntry[] = [
  { key: 'P', badgeCode: 'P', title: 'Shift Pagi' },
  { key: 'S', badgeCode: 'S', title: 'Shift Siang' },
  { key: 'M', badgeCode: 'M', title: 'Shift Malam' },
  { key: 'PS', badgeCode: 'PS', title: 'Shift Pagi-Siang (Long Day)' },
  { key: 'OH', badgeCode: 'OH / D', title: 'Jam Kerja Kantor / Dinas' },
  { key: 'L', badgeCode: 'L / Y', title: 'Libur / Lepas Malam' },
  { key: 'CUTI', badgeCode: 'CUTI', title: 'Cuti Tahunan' },
  { key: 'DINAS LUAR', badgeCode: 'DINAS LUAR', title: 'Dinas Luar Kota' },
  { key: 'DIKLAT', badgeCode: 'DIKLAT', title: 'Pelatihan / Diklat' },
  { key: 'SAKIT', badgeCode: 'SAKIT', title: 'Izin Sakit' }
].map(entry => {
  const info = SHIFT_CODES[entry.key];
  return {
    ...entry,
    cnsTime: info.time.CNS,
    essTime: info.time.ESS,
    badgeStyle: info.badgeStyle,
    description:
      entry.key === 'L'
        ? 'Hari libur terjadwal atau pemulihan setelah shift malam.'
        : info.description
  };
});

export const DAY_NAMES_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
export const DAY_SHORT_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
export const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];
