/**
 * Centralized Bahasa Indonesia Localization Dictionary (100% Bahasa Indonesia)
 * Contextually tailored for PERUM LPPNPI / AirNav Indonesia Cabang Manado - Unit Teknik ATS
 */
export const i18n = {
  // Page Header & Branding
  appTitle: 'Sistem Penjadwalan Otomatis Prioritas ATS Engineering',
  appSubtitle: 'Perum LPPNPI - Cabang Manado (AirNav Indonesia)',
  unitCNS: 'Unit Telekomunikasi & Navigasi Penerbangan (CNS)',
  unitESS: 'Unit Fasilitas Listrik & Sistem Penunjang (ESS)',

  // Dashboard Metric Summary Cards
  statsTotalStaff: 'Total Personel Aktif',
  statsStaffDetail: 'Unit Teknik CNS (17) & Unit Teknik ESS (10)',
  statsGapsCount: 'Kekosongan Jadwal (Gap Shift)',
  statsGapsDetail: 'Memerlukan penugasan teknisi pengganti',
  statsSyncStatus: 'Sinkronisasi Basis Data',
  statsSyncDetail: 'Terhubung & Aktif Real-time (Supabase Cloud)',
  statsTechnicians: 'Teknisi',
  statsGaps: 'Kekosongan',

  // Month Selector & Generator UI
  monthSelectLabel: 'Pilih Bulan & Tahun:',
  btnGenerateNextMonth: 'Buat Jadwal Bulan Ini',
  modalGenerateTitle: 'Penjanaan Jadwal Shift Otomatis',
  modalGenerateDesc: 'Sistem akan membuat proyeksi rotasi shift bulanan untuk seluruh 27 personel teknik berdasarkan pola rotasi standar.',
  modalConfirmBtn: 'Proses Penjanaan Jadwal',
  modalCancelBtn: 'Batal',
  generatingStatus: 'Sedang memproses pembuatan jadwal...',

  // Search & Filter
  searchPlaceholder: 'Cari personel berdasarkan nama...',
  filterAllGroups: 'Semua Sub-Grup',

  // Shift Legend
  legendMorning: 'P (Pagi: 07:00-15:00)',
  legendAfternoon: 'S (Siang: 12:00-20:00)',
  legendNight: 'M (Malam: 19:00-07:00)',
  legendLongDay: 'PS (Pagi-Siang / Dinas Panjang)',
  legendOffice: 'D / OH (Dinas Kantor / Jam Kerja)',
  legendGap: 'GAP (Kekosongan Shift)',
  legendOff: 'L / Y (Libur / Lepas Malam)',

  // Roster Table Section Titles
  sectionManagement: 'Manajemen / Kepala Unit Teknik',
  sectionCNSGroup: 'Grup Teknis CNS',
  sectionESSGroup: 'Grup Teknis ESS',
  tableColName: 'Nama & Rating Lisensi',

  // Gap Resolution Drawer (RecommendationDrawer)
  gapDrawerTitle: 'Resolusi Kekosongan Shift (Gap)',
  gapDrawerSub: 'Shift:',
  gapDrawerReason: 'Alasan Absen:',
  gapLoadingText: 'Menjalankan filter aturan & model penilaian MCDA...',
  gapCriticalAlertTitle: 'Peringatan Kekosongan Shift (0 Kandidat Layak)',
  gapCriticalAlertDesc: 'Tidak ada personel yang memenuhi seluruh syarat batasan kerja (jam istirahat, ketersediaan, dan lisensi rating). Silakan atur manual.',
  gapCandidatesTitle: 'Kandidat Pengganti Layak (Berdasarkan Skor MCDA)',
  gapBadgeRecommended: '★ DIREKOMENDASIKAN',
  gapScoreBreakdownTitle: 'Rincian Skor MCDA:',
  gapFactorRating: 'Perlindungan Rating Lisensi',
  gapFactorWorkload: 'Keseimbangan Beban Kerja',
  gapFactorFatigue: 'Margin Istirahat / Kelelahan',
  gapFactorRecency: 'Pencegahan Repetisi Night Shift',
  gapFactorGroup: 'Kontinuitas Sub-Grup',
  gapJustificationLabel: 'Justifikasi / Alasan Pembatalan Rekomendasi #1',
  gapJustificationPlaceholder: 'Wajib diisi jika Anda memilih kandidat selain urutan #1...',
  gapJustificationRequiredError: 'Wajib memasukkan alasan justifikasi jika memilih kandidat di luar rekomendasi #1.',
  btnConfirmAssignment: 'Setujui & Tugaskan Pengganti',
  btnCancelLeaveOverride: 'Batalkan Cuti & Ubah Ke Shift Kerja',
  cancelLeaveOverrideDesc: 'Jika cuti/izin ditetapkan secara keliru, Anda dapat membatalkannya dan menetapkan shift kerja kembali kepada personel ini.',
  tabDssRecommendations: 'Rekomendasi DSS (MCDA)',
  tabManualOverride: 'Penugasan Manual (Semua Personel)',
  manualOverrideNotice: 'Wewenang Penuh Manager/Admin: Pilih personel manapun dari direktori secara manual untuk mengisi kekosongan shift ini.',
  btnConfirmManualAssignment: 'Tugaskan Personel Ini (Override Admin)',
  btnResetShiftToOff: 'Kosongkan Shift (Reset ke Libur L)',

  // Shift Edit Drawer (ShiftEditDrawer)
  editDrawerTitle: 'Ubah Kode Shift Personel',
  editSelectCodeLabel: 'Pilih Kode Shift Baru:',
  conflictDetectedTitle: 'Konflik Jadwal Terdeteksi:',
  conflictDetectedMsg: 'sudah terdaftar pada shift tersebut di tanggal ini.',
  optionSwapTitle: 'Opsi 1: Tukar Shift Langsung',
  optionSwapDesc: 'Tukar jadwal shift secara langsung antara kedua personel ini.',
  btnConfirmSwap: 'Konfirmasi Tukar Shift',
  optionDisplaceTitle: 'Opsi 2: Ganti & Rekomendasi Otomatis',
  optionDisplaceDesc: 'Ubah jadwal personel ini dan cari teknisi lain yang tersedia untuk mengisi kekosongan.',
  displaceRecsTitle: 'Rekomendasi Pengganti Shift:',
  btnDisplaceAndAssign: 'Konfirmasi Perubahan & Selesaikan Kekosongan',
  
  vacatingShiftAlertTitle: 'Informasi Penjadwalan Cuti / Izin:',
  vacatingShiftAlertMsg: 'Mengubah jadwal menjadi izin/cuti akan mengosongkan jadwal shift kerja yang sebelumnya terisi.',
  vacatedRecsTitle: 'Kandidat Pengganti Shift Yang Ditinggalkan',
  btnConfirmLeaveWithReplacement: 'Konfirmasi Cuti & Tugaskan Pengganti',
  btnConfirmLeaveOnly: 'Konfirmasi Cuti Saja (Tandai Sebagai Kekosongan Shift)',

  editJustificationLabel: 'Catatan Operasional / Justifikasi:',
  editJustificationPlaceholder: 'Opsional: Masukkan alasan operasional perubahan shift ini...',
  btnSaveShiftCode: 'Simpan Perubahan Shift',
  btnCloseDrawer: 'Tutup Panel',

  // Fallback Notice Badges
  fallbackBadgeSameGroup: '⚠️ Anggota Sub-Grup Sama',
  fallbackBadgeEmergency: '⚠️ Rotasi Darurat',
  fallbackBadgeNoRating: '⚠️ Darurat Tanpa Rating',
  fallbackBadgeAllBusy: '⚠️ Darurat Semua Terisi',

  // Shift Code Full Descriptions
  shiftCodeDesc: {
    P: 'P — Shift Pagi (07:00-15:00 CNS / 07:00-13:00 ESS)',
    S: 'S — Shift Siang (12:00-20:00 CNS / 13:00-19:00 ESS)',
    M: 'M — Shift Malam (19:00-07:00)',
    PS: 'PS — Shift Pagi-Siang / Long Day (07:00-19:00)',
    OH: 'OH — Jam Kerja Kantor (Office Hours)',
    D: 'D — Dinas Jam Kerja (08:00-17:00)',
    L: 'L — Libur / Off',
    Y: 'Y — Lepas Malam (Post-Night Recovery)',
    CUTI: 'CUTI — Cuti Tahunan (Annual Leave)',
    'DINAS LUAR': 'DINAS LUAR — Tugas Luar Kota (External Duty)',
    DIKLAT: 'DIKLAT — Pelatihan / Diklat (Training)',
    SAKIT: 'SAKIT — Sakit (Sick Leave)'
  },

  // Personnel CRUD Management UI
  personnelManageTitle: 'Kelola Data Personel Teknik',
  personnelManageDesc: 'Tambah personel baru, ubah sub-grup rotasi, tetapkan Manager Teknik, atur rating lisensi, atau hapus data.',
  btnManagePersonnel: 'Kelola Personel',
  btnAddPersonnel: 'Tambah Personel Baru',
  btnEditPersonnel: 'Ubah Data',
  btnAssignManager: 'Jadikan Manager',
  btnDeletePersonnel: 'Hapus Personel',
  personnelColId: 'ID / NIP',
  personnelColName: 'Nama Personel',
  personnelColGroup: 'Kelompok Utama',
  personnelColSubGroup: 'Sub-Grup Rotasi',
  personnelColRole: 'Peran / Jabatan',
  personnelColRatings: 'Rating Lisensi Kompetensi',
  personnelColActions: 'Aksi',
  modalAddPersonnelTitle: 'Tambah Personel Teknik Baru',
  modalEditPersonnelTitle: 'Ubah Data Personel Teknik',
  confirmDeleteTitle: 'Hapus Data Personel',
  confirmDeleteDesc: 'Apakah Anda yakin ingin menghapus data personel ini? Data shift yang terkait akan dihapus.',
  btnSavePersonnel: 'Simpan Data Personel',
  btnUpdatePersonnel: 'Simpan Perubahan'
};
