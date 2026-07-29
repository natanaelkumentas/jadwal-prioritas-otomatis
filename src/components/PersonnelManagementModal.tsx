'use client';

import React, { useState, useEffect } from 'react';
import { Staff } from '@/lib/scheduler-engine/types';
import { i18n } from '@/lib/i18n';
import { useToast } from '@/components/ToastProvider';
import {
  getAllRatings,
  createPersonnel,
  updatePersonnel,
  assignManager,
  deletePersonnel
} from '@/app/actions/personnel';
import {
  FiUsers,
  FiUserPlus,
  FiSearch,
  FiEdit3,
  FiShield,
  FiTrash2,
  FiCheck,
  FiX,
  FiAlertTriangle,
  FiLoader
} from 'react-icons/fi';

interface RatingOption {
  id: string;
  code: string;
  group: string;
  description: string;
}

interface PersonnelManagementModalProps {
  initialStaff: Staff[];
  onClose: () => void;
  onRefreshData: () => void;
}

export default function PersonnelManagementModal({
  initialStaff,
  onClose,
  onRefreshData
}: PersonnelManagementModalProps) {
  const toast = useToast();
  const [staffList, setStaffList] = useState<Staff[]>(initialStaff);
  const [searchTerm, setSearchTerm] = useState('');
  const [groupFilter, setGroupFilter] = useState<'ALL' | 'CNS' | 'ESS' | 'Management'>('ALL');

  // Form State
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [formId, setFormId] = useState('');
  const [formName, setFormName] = useState('');
  const [formGroup, setFormGroup] = useState<'CNS' | 'ESS'>('CNS');
  const [formSubGroup, setFormSubGroup] = useState('Grup 1');
  const [formRoleLevel, setFormRoleLevel] = useState('Teknisi');
  const [selectedRatingIds, setSelectedRatingIds] = useState<string[]>([]);

  // Available Ratings
  const [availableRatings, setAvailableRatings] = useState<RatingOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Confirm State
  const [deletingStaff, setDeletingStaff] = useState<Staff | null>(null);

  useEffect(() => {
    async function loadRatings() {
      const res = await getAllRatings();
      if (res.success && res.ratings) {
        setAvailableRatings(res.ratings as RatingOption[]);
      }
    }
    loadRatings();
  }, []);

  // Update list when initialStaff changes
  useEffect(() => {
    setStaffList(initialStaff);
  }, [initialStaff]);

  // Filter staff list
  const filteredStaff = staffList.filter(s => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.id.toLowerCase().includes(searchTerm.toLowerCase());

    if (groupFilter === 'ALL') return matchesSearch;
    if (groupFilter === 'Management') return matchesSearch && s.role_level === 'Manager Teknik';
    return matchesSearch && s.group === groupFilter;
  });

  // Helper to auto-suggest next ID based on group (T-0XX for CNS, E-0XX for ESS)
  const generateNextId = (group: 'CNS' | 'ESS', list: Staff[]) => {
    const prefix = group === 'CNS' ? 'T-' : 'E-';
    const groupStaff = list.filter(s => s.id.startsWith(prefix));
    let maxNum = 0;
    for (const s of groupStaff) {
      const numStr = s.id.replace(prefix, '');
      const num = parseInt(numStr, 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
    const nextNum = maxNum + 1;
    return `${prefix}${nextNum.toString().padStart(3, '0')}`;
  };

  const openAddForm = () => {
    const defaultGrp: 'CNS' | 'ESS' = 'CNS';
    const nextId = generateNextId(defaultGrp, staffList);
    setEditingStaff(null);
    setFormId(nextId);
    setFormName('');
    setFormGroup(defaultGrp);
    setFormSubGroup('Grup 1');
    setFormRoleLevel('Teknisi');
    setSelectedRatingIds([]);
    setShowFormModal(true);
  };

  const openEditForm = (staff: Staff) => {
    setEditingStaff(staff);
    setFormId(staff.id);
    setFormName(staff.name);
    const grp = (staff.group as 'CNS' | 'ESS') || 'CNS';
    setFormGroup(grp);
    setFormSubGroup(staff.sub_group);
    setFormRoleLevel(staff.role_level);

    // Map existing staff ratings to rating IDs matching staff group
    const currentRatingIds = availableRatings
      .filter(r => r.group === grp && staff.ratings?.includes(r.code))
      .map(r => r.id);
    setSelectedRatingIds(currentRatingIds);
    setShowFormModal(true);
  };

  const toggleRatingSelection = (ratingId: string) => {
    setSelectedRatingIds(prev =>
      prev.includes(ratingId)
        ? prev.filter(id => id !== ratingId)
        : [...prev, ratingId]
    );
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formId.trim()) {
      toast.error('ID / NIP dan Nama Lengkap wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingStaff) {
        const res = await updatePersonnel({
          id: formId,
          name: formName,
          group: formGroup,
          sub_group: formSubGroup,
          role_level: formRoleLevel,
          ratingIds: selectedRatingIds
        });

        if (res.success) {
          toast.success(`Berhasil memperbarui data personel ${formName}.`);
          setShowFormModal(false);
          onRefreshData();
        } else {
          toast.error(res.error || 'Gagal memperbarui personel.');
        }
      } else {
        const res = await createPersonnel({
          id: formId,
          name: formName,
          group: formGroup,
          sub_group: formSubGroup,
          role_level: formRoleLevel,
          ratingIds: selectedRatingIds
        });

        if (res.success) {
          toast.success(`Berhasil menambahkan personel ${formName}.`);
          setShowFormModal(false);
          onRefreshData();
        } else {
          toast.error(res.error || 'Gagal menambahkan personel.');
        }
      }
    } catch (err: any) {
      toast.error('Terjadi kesalahan: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignManagerAction = async (staff: Staff) => {
    if (!confirm(`Apakah Anda yakin ingin menetapkan "${staff.name}" sebagai Manager Teknik baru?`)) {
      return;
    }

    try {
      const res = await assignManager(staff.id);
      if (res.success) {
        toast.success(`Berhasil menetapkan ${staff.name} sebagai Manager Teknik!`);
        onRefreshData();
      } else {
        toast.error(res.error || 'Gagal menetapkan Manager Teknik.');
      }
    } catch (err: any) {
      toast.error('Terjadi kesalahan: ' + err.message);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingStaff) return;
    setIsSubmitting(true);
    try {
      const res = await deletePersonnel(deletingStaff.id);
      if (res.success) {
        toast.success(`Berhasil menghapus personel ${deletingStaff.name}.`);
        setDeletingStaff(null);
        onRefreshData();
      } else {
        toast.error(res.error || 'Gagal menghapus personel.');
      }
    } catch (err: any) {
      toast.error('Terjadi kesalahan: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSubGroupOptions = () => {
    if (formGroup === 'CNS') {
      return ['Grup 1', 'Grup 2', 'Grup 3', 'Grup 4', 'Grup 5', 'Management'];
    } else {
      return ['ESS Grup 1', 'ESS Grup 2', 'ESS Grup 3', 'ESS Grup 4', 'ESS Grup 5', 'Management'];
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-955/85 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4">
      {/* Click outside backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative bg-slate-900 border border-slate-700 rounded-xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-slide-in-right z-10">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div>
            <h2 className="text-base sm:text-xl font-bold text-slate-100 flex items-center gap-2">
              <FiUsers className="w-5 h-5 text-emerald-400" />
              <span>{i18n.personnelManageTitle}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">
              {i18n.personnelManageDesc}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 text-base rounded-lg bg-slate-800 border border-slate-700"
            title="Tutup"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-3 sm:p-4 border-b border-slate-800 bg-slate-900/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {(['ALL', 'CNS', 'ESS', 'Management'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setGroupFilter(tab)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all whitespace-nowrap ${
                  groupFilter === tab
                    ? 'bg-slate-200 text-slate-900 border-slate-100 font-bold'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                {tab === 'ALL' ? 'Semua' : tab}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                placeholder="Cari NIP / Nama..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-slate-500"
              />
              <FiSearch className="absolute left-2.5 top-2 text-slate-500 w-3.5 h-3.5" />
            </div>

            <button
              onClick={openAddForm}
              className="py-1.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-md whitespace-nowrap"
            >
              <FiUserPlus className="w-4 h-4" />
              <span>Tambah</span>
            </button>
          </div>
        </div>

        {/* Directory Content List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
          
          {/* Mobile View: Cards */}
          <div className="sm:hidden space-y-2.5">
            {filteredStaff.map(staff => (
              <div key={staff.id} className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">{staff.id}</span>
                    <h4 className="text-xs font-bold text-slate-100">{staff.name}</h4>
                  </div>
                  <span className={`px-2 py-0.5 text-[9px] font-bold rounded border ${
                    staff.role_level === 'Manager Teknik' 
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}>
                    {staff.role_level}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-900">
                  <div>
                    Grup: <strong className="text-slate-200">{staff.group} ({staff.sub_group})</strong>
                  </div>
                  <div className="flex items-center gap-1">
                    {staff.ratings?.map(r => (
                      <span key={r} className="px-1 py-0.2 bg-slate-800 border border-slate-700 text-slate-300 rounded font-mono">
                        {r}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Mobile Icon-Only Actions Bar */}
                <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-900">
                  {staff.role_level !== 'Manager Teknik' && (
                    <button
                      onClick={() => handleAssignManagerAction(staff)}
                      className="p-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded transition-colors"
                      title="Jadikan Manager Teknik"
                      aria-label="Jadikan Manager Teknik"
                    >
                      <FiShield className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => openEditForm(staff)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded transition-colors"
                    title="Edit Personel"
                    aria-label="Edit Personel"
                  >
                    <FiEdit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeletingStaff(staff)}
                    className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded transition-colors"
                    title="Hapus Personel"
                    aria-label="Hapus Personel"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop View: Table with Icon-Only Action Buttons */}
          <div className="hidden sm:block overflow-x-auto rounded-lg border border-slate-800">
            <table className="min-w-full divide-y divide-slate-800 text-xs">
              <thead className="bg-slate-950 font-semibold text-slate-400">
                <tr>
                  <th className="px-3 py-2.5 text-left w-20">{i18n.personnelColId}</th>
                  <th className="px-3 py-2.5 text-left">{i18n.personnelColName}</th>
                  <th className="px-3 py-2.5 text-left w-24">{i18n.personnelColGroup}</th>
                  <th className="px-3 py-2.5 text-left w-32">{i18n.personnelColSubGroup}</th>
                  <th className="px-3 py-2.5 text-left w-32">{i18n.personnelColRole}</th>
                  <th className="px-3 py-2.5 text-left">{i18n.personnelColRatings}</th>
                  <th className="px-3 py-2.5 text-right w-28">{i18n.personnelColActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/40">
                {filteredStaff.map(staff => (
                  <tr key={staff.id} className="hover:bg-slate-900/80 transition-colors">
                    <td className="px-3 py-2.5 font-mono text-slate-400 font-bold">{staff.id}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-100">{staff.name}</td>
                    <td className="px-3 py-2.5 text-slate-300">{staff.group}</td>
                    <td className="px-3 py-2.5 text-slate-400">{staff.sub_group}</td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        staff.role_level === 'Manager Teknik'
                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}>
                        {staff.role_level}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {staff.ratings?.map(r => (
                          <span key={r} className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 text-slate-300 rounded font-mono text-[10px]">
                            {r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {/* Icon-Only Action Buttons */}
                      <div className="flex items-center justify-end gap-1.5">
                        {staff.role_level !== 'Manager Teknik' && (
                          <button
                            onClick={() => handleAssignManagerAction(staff)}
                            className="p-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded transition-colors"
                            title="Jadikan Manager Teknik"
                            aria-label="Jadikan Manager Teknik"
                          >
                            <FiShield className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => openEditForm(staff)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded transition-colors"
                          title="Edit Personel"
                          aria-label="Edit Personel"
                        >
                          <FiEdit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingStaff(staff)}
                          className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded transition-colors"
                          title="Hapus Personel"
                          aria-label="Hapus Personel"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400 safe-area-bottom">
          <span>Total: <strong className="text-slate-200">{filteredStaff.length} Personel</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 font-semibold"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* Add / Edit Form Dialog Modal */}
      {showFormModal && (
        <div className="fixed inset-0 bg-slate-955/90 backdrop-blur-md z-60 flex items-center justify-center p-3">
          <form
            onSubmit={handleFormSubmit}
            className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100">
                {editingStaff ? i18n.modalEditPersonnelTitle : i18n.modalAddPersonnelTitle}
              </h3>
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded"
                title="Tutup"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            {/* ID & Name */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  ID / NIP
                </label>
                <input
                  type="text"
                  value={formId}
                  disabled={!!editingStaff}
                  onChange={e => setFormId(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 font-mono text-xs focus:outline-none disabled:opacity-60"
                  required
                />
              </div>

              <div className="col-span-2">
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g. SUBHAN A. SYAWIE"
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-slate-500"
                  required
                />
              </div>
            </div>

            {/* Group & SubGroup */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Kelompok Utama
                </label>
                <select
                  value={formGroup}
                  onChange={e => {
                    const grp = e.target.value as 'CNS' | 'ESS';
                    setFormGroup(grp);
                    setFormSubGroup(grp === 'CNS' ? 'Grup 1' : 'ESS Grup 1');
                    if (!editingStaff) {
                      setFormId(generateNextId(grp, staffList));
                    }
                    // Filter selected ratings matching new group
                    const validRatingIds = availableRatings.filter(r => r.group === grp).map(r => r.id);
                    setSelectedRatingIds(prev => prev.filter(id => validRatingIds.includes(id)));
                  }}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none"
                >
                  <option value="CNS">CNS</option>
                  <option value="ESS">ESS</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Sub-Grup Rotasi
                </label>
                <select
                  value={formSubGroup}
                  onChange={e => setFormSubGroup(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none"
                >
                  {getSubGroupOptions().map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Role Level */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                Tingkat Peran / Jabatan
              </label>
              <select
                value={formRoleLevel}
                onChange={e => setFormRoleLevel(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none"
              >
                <option value="Teknisi">Teknisi</option>
                <option value="Senior Teknisi">Senior Teknisi</option>
                <option value="Manager Teknik">Manager Teknik</option>
              </select>
            </div>

            {/* License Ratings Multiselect Grid */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                Rating Lisensi Kompetensi:
              </label>
              <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-950 border border-slate-800 rounded-lg max-h-36 overflow-y-auto">
                {availableRatings
                  .filter(r => r.group === formGroup)
                  .map(rating => {
                    const isChecked = selectedRatingIds.includes(rating.id);
                    return (
                      <button
                        type="button"
                        key={rating.id}
                        onClick={() => toggleRatingSelection(rating.id)}
                        className={`px-2 py-1.5 rounded text-left border flex items-center justify-between text-xs transition-all ${
                          isChecked
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <span className="font-mono">{rating.code} - {rating.description}</span>
                        {isChecked ? <FiCheck className="w-3.5 h-3.5 text-emerald-400" /> : <span className="text-slate-600">+</span>}
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                disabled={isSubmitting}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-100 text-slate-900 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-md"
              >
                {isSubmitting ? <FiLoader className="w-4 h-4 animate-spin" /> : null}
                <span>{editingStaff ? i18n.btnUpdatePersonnel : i18n.btnSavePersonnel}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingStaff && (
        <div className="fixed inset-0 bg-slate-955/90 backdrop-blur-md z-60 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <FiAlertTriangle className="w-5 h-5 text-rose-500" />
              <span>{i18n.confirmDeleteTitle}</span>
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed">
              {i18n.confirmDeleteDesc}
            </p>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs">
              Personel: <strong className="text-slate-100">{deletingStaff.name} ({deletingStaff.id})</strong>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeletingStaff(null)}
                disabled={isSubmitting}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isSubmitting}
                className="px-4 py-1.5 bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-1.5"
              >
                {isSubmitting ? <FiLoader className="w-4 h-4 animate-spin" /> : null}
                <span>Ya, Hapus Personel</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
