'use client';

import React, { useState, useEffect } from 'react';
import RosterGrid from './RosterGrid';
import RosterSkeleton from './RosterSkeleton';
import RecommendationDrawer from './RecommendationDrawer';
import ShiftEditDrawer from './ShiftEditDrawer';
import MonthSelector from './MonthSelector';
import PersonnelManagementModal from './PersonnelManagementModal';
import { getShiftsForMonth } from '@/app/actions/scheduler';
import { getStaffList } from '@/app/actions/personnel';
import { supabaseClient } from '@/lib/supabase';
import { i18n } from '@/lib/i18n';
import { Staff, Shift, GapEvent } from '@/lib/scheduler-engine/types';
import { FiUsers, FiShield, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';

interface DashboardContainerProps {
  initialStaff: Staff[];
  initialShifts: Shift[];
  initialGapEvents: GapEvent[];
  initialYear?: number;
  initialMonth?: number;
}

export default function DashboardContainer({
  initialStaff,
  initialShifts,
  initialGapEvents,
  initialYear,
  initialMonth
}: DashboardContainerProps) {
  const [staffList, setStaffList] = useState<Staff[]>(initialStaff);
  const [shifts, setShifts] = useState<Shift[]>(initialShifts);
  const [gapEvents, setGapEvents] = useState<GapEvent[]>(initialGapEvents);

  const now = new Date();
  const [currentYear, setCurrentYear] = useState<number>(initialYear ?? now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(initialMonth ?? (now.getMonth() + 1));
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showPersonnelModal, setShowPersonnelModal] = useState<boolean>(false);
  
  const [activeSelection, setActiveSelection] = useState<{
    gapEvent: GapEvent;
    shift: Shift;
  } | null>(null);

  const [activeEditSelection, setActiveEditSelection] = useState<{
    shift: Shift;
    staff: Staff;
  } | null>(null);

  // Fetch shifts & fresh staff list
  const fetchMonthShifts = async (year: number, month: number) => {
    setIsLoading(true);
    console.log(`[DashboardContainer] Fetching month shifts & staff list for ${year}-${month}`);
    try {
      const [shiftsRes, staffRes] = await Promise.all([
        getShiftsForMonth(year, month),
        getStaffList()
      ]);

      if (shiftsRes.success && shiftsRes.shifts) {
        setShifts(shiftsRes.shifts as Shift[]);
      }
      if (staffRes.success && staffRes.staff) {
        setStaffList(staffRes.staff);
      }
    } catch (err) {
      console.error('[DashboardContainer] Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Real-time listener for database changes
  useEffect(() => {
    console.log('[DashboardContainer] Subscribing to Supabase real-time changes on schema: jadwal...');
    const channel = supabaseClient
      .channel('dashboard-roster-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'jadwal', table: 'shifts' },
        (payload) => {
          console.log('[DashboardContainer] Real-time shift update received:', payload);
          const updatedShift = payload.new as Shift;
          setShifts((prev) => {
            if (payload.eventType === 'INSERT') {
              if (prev.some(s => s.id === updatedShift.id)) return prev;
              return [...prev, updatedShift];
            } else if (payload.eventType === 'UPDATE') {
              return prev.map((s) => (s.id === updatedShift.id ? updatedShift : s));
            } else if (payload.eventType === 'DELETE') {
              return prev.filter((s) => s.id !== (payload.old as any).id);
            }
            return prev;
          });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'jadwal', table: 'gap_events' },
        (payload) => {
          console.log('[DashboardContainer] Real-time gap event received:', payload);
          const updatedGap = payload.new as GapEvent;
          setGapEvents((prev) => {
            if (payload.eventType === 'INSERT') {
              return [...prev, updatedGap];
            } else if (payload.eventType === 'UPDATE') {
              return prev.map((g) => (g.id === updatedGap.id ? { ...g, ...updatedGap } : g));
            } else if (payload.eventType === 'DELETE') {
              return prev.filter((g) => g.id !== (payload.old as any).id);
            }
            return prev;
          });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'jadwal', table: 'staff' },
        () => {
          console.log('[DashboardContainer] Real-time staff update received. Refreshing staff directory...');
          getStaffList().then(res => {
            if (res.success && res.staff) setStaffList(res.staff);
          });
        }
      )
      .subscribe();

    return () => {
      console.log('[DashboardContainer] Unsubscribing from real-time changes.');
      supabaseClient.removeChannel(channel);
    };
  }, []);

  const handleMonthChange = (year: number, month: number) => {
    setCurrentYear(year);
    setCurrentMonth(month);
    fetchMonthShifts(year, month);
  };

  const handleRefreshData = () => {
    fetchMonthShifts(currentYear, currentMonth);
  };

  const handleSelectGap = (gapEvent: GapEvent, shift: Shift) => {
    setActiveSelection({ gapEvent, shift });
  };

  const handleCloseDrawer = () => {
    setActiveSelection(null);
  };

  const handleSelectShift = (shift: Shift, staff: Staff) => {
    setActiveEditSelection({ shift, staff });
  };

  const handleCloseEditDrawer = () => {
    setActiveEditSelection(null);
  };

  const handleAssignSuccess = () => {
    console.log('[DashboardContainer] Operation successful. Refreshing month shifts...');
    fetchMonthShifts(currentYear, currentMonth);
  };

  // Compute stats
  const activeGapsCount = gapEvents.filter(g => g.status === 'Pending').length;
  const daysInMonthCount = new Date(currentYear, currentMonth, 0).getDate();

  return (
    <div className="relative min-h-screen flex flex-col bg-transparent text-slate-900 dark:text-slate-100">
      {/* Month Selector & Auto Generator */}
      <MonthSelector
        currentYear={currentYear}
        currentMonth={currentMonth}
        onMonthChange={handleMonthChange}
        onRefreshData={handleRefreshData}
      />

      {/* Top Banner Dashboard Stats & Management Button */}
      <div className="mb-3 sm:mb-6 grid grid-cols-3 gap-1.5 sm:gap-4">
        {/* Total Staff Card (Clickable to manage personnel) */}
        <div 
          onClick={() => setShowPersonnelModal(true)}
          className="p-2 sm:p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-lg cursor-pointer transition-all group relative overflow-hidden shadow-xs"
          title="Klik untuk Kelola Data Personel"
        >
          <div className="flex items-center justify-between">
            <div className="text-[9px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider group-hover:text-slate-800 dark:group-hover:text-slate-300 transition-colors truncate">
              <span className="hidden sm:inline">{i18n.statsTotalStaff}</span>
              <span className="sm:hidden">Personel</span>
            </div>
            <span className="text-[9px] sm:text-xs bg-slate-100 dark:bg-slate-800 group-hover:bg-slate-200 dark:group-hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-1.5 sm:px-2 py-0.5 rounded font-bold transition-all border border-slate-200 dark:border-slate-700 flex items-center gap-1 flex-shrink-0">
              <FiUsers className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">Kelola</span>
            </span>
          </div>
          <div className="text-base sm:text-2xl font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors mt-0.5 sm:mt-1">
            {staffList.length} <span className="hidden sm:inline">{i18n.statsTechnicians}</span>
          </div>
          <div className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 mt-1">
            Klik untuk tambah, ubah, atau hapus personel
          </div>
        </div>

        {/* Shift Gaps Stat Card */}
        <div className="p-2 sm:p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xs">
          <div className="flex items-center justify-between">
            <div className="text-[9px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
              <span className="hidden sm:inline">{i18n.statsGapsCount}</span>
              <span className="sm:hidden">Gap Shift</span>
            </div>
            <FiAlertCircle className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400 flex-shrink-0" />
          </div>
          <div className="text-base sm:text-2xl font-bold text-rose-600 dark:text-rose-500 mt-0.5 sm:mt-1 flex items-center gap-1 sm:gap-2">
            {activeGapsCount} <span className="hidden sm:inline">{i18n.statsGaps}</span>
            {activeGapsCount > 0 && (
              <span className="inline-block w-2 h-2 sm:w-2.5 sm:h-2.5 bg-rose-500 rounded-full animate-ping"></span>
            )}
          </div>
          <div className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 mt-1">
            {i18n.statsGapsDetail}
          </div>
        </div>

        {/* Database Sync Status Card */}
        <div className="p-2 sm:p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xs">
          <div className="flex items-center justify-between">
            <div className="text-[9px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
              <span className="hidden sm:inline">{i18n.statsSyncStatus}</span>
              <span className="sm:hidden">Status DB</span>
            </div>
            <FiCheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          </div>
          <div className="text-base sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 sm:mt-1">
            <span className="hidden sm:inline">Supabase Cloud</span>
            <span className="sm:hidden">Aktif</span>
          </div>
          <div className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 mt-1">
            {i18n.statsSyncDetail}
          </div>
        </div>
      </div>

      {/* Main Content Area: Render Skeleton when loading, else RosterGrid */}
      {isLoading ? (
        <RosterSkeleton daysInMonth={daysInMonthCount} />
      ) : (
        <RosterGrid
          initialStaff={staffList}
          shifts={shifts}
          gapEvents={gapEvents}
          currentYear={currentYear}
          currentMonth={currentMonth}
          onSelectGap={handleSelectGap}
          onSelectShift={handleSelectShift}
        />
      )}

      {/* Personnel Management Modal Popup */}
      {showPersonnelModal && (
        <PersonnelManagementModal
          initialStaff={staffList}
          onClose={() => setShowPersonnelModal(false)}
          onRefreshData={handleRefreshData}
        />
      )}

      {/* Slide-out recommendation drawer panel */}
      {activeSelection && (
        <RecommendationDrawer
          gapEvent={activeSelection.gapEvent}
          shift={activeSelection.shift}
          onClose={handleCloseDrawer}
          onAssignSuccess={handleAssignSuccess}
        />
      )}

      {/* Slide-out shift edit drawer panel */}
      {activeEditSelection && (
        <ShiftEditDrawer
          shift={activeEditSelection.shift}
          staff={activeEditSelection.staff}
          allShifts={shifts}
          allStaff={staffList}
          onClose={handleCloseEditDrawer}
          onAssignSuccess={handleAssignSuccess}
        />
      )}
    </div>
  );
}
