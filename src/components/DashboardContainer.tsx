'use client';

import React, { useState, useEffect } from 'react';
import RosterGrid from './RosterGrid';
import RecommendationDrawer from './RecommendationDrawer';
import ShiftEditDrawer from './ShiftEditDrawer';
import MonthSelector from './MonthSelector';
import { supabaseClient } from '@/lib/supabase';
import { i18n } from '@/lib/i18n';
import { Staff, Shift, GapEvent } from '@/lib/scheduler-engine/types';

interface DashboardContainerProps {
  initialStaff: Staff[];
  initialShifts: Shift[];
  initialGapEvents: GapEvent[];
}

export default function DashboardContainer({
  initialStaff,
  initialShifts,
  initialGapEvents
}: DashboardContainerProps) {
  const [shifts, setShifts] = useState<Shift[]>(initialShifts);
  const [gapEvents, setGapEvents] = useState<GapEvent[]>(initialGapEvents);

  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonth, setCurrentMonth] = useState<number>(7); // July 2026 default
  
  const [activeSelection, setActiveSelection] = useState<{
    gapEvent: GapEvent;
    shift: Shift;
  } | null>(null);

  const [activeEditSelection, setActiveEditSelection] = useState<{
    shift: Shift;
    staff: Staff;
  } | null>(null);

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
              // Only add if not already present
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
      .subscribe();

    return () => {
      console.log('[DashboardContainer] Unsubscribing from real-time changes.');
      supabaseClient.removeChannel(channel);
    };
  }, []);

  // Fetch shifts for selected month
  const fetchMonthShifts = async (year: number, month: number) => {
    const formattedMonth = month.toString().padStart(2, '0');
    const totalDays = new Date(year, month, 0).getDate();
    const startDate = `${year}-${formattedMonth}-01`;
    const endDate = `${year}-${formattedMonth}-${totalDays.toString().padStart(2, '0')}`;

    const { data: monthShifts, error: shiftsErr } = await supabaseClient
      .from('shifts')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate);

    if (!shiftsErr && monthShifts) {
      setShifts(monthShifts as Shift[]);
    }
  };

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
    console.log('[DashboardContainer] Operation successful. Real-time updates should sync.');
  };

  // Compute stats
  const activeGapsCount = gapEvents.filter(g => g.status === 'Pending').length;

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Month Selector & Auto Generator */}
      <MonthSelector
        currentYear={currentYear}
        currentMonth={currentMonth}
        onMonthChange={handleMonthChange}
        onRefreshData={handleRefreshData}
      />

      {/* Top Banner Dashboard Stats */}
      <div className="mb-4 sm:mb-6 grid grid-cols-3 gap-2 sm:gap-4">
        <div className="p-2.5 sm:p-4 bg-slate-900 border border-slate-800 rounded-lg">
          <div className="text-[9px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {i18n.statsTotalStaff}
          </div>
          <div className="text-lg sm:text-2xl font-bold text-slate-200 mt-0.5 sm:mt-1">
            {initialStaff.length} <span className="hidden sm:inline">{i18n.statsTechnicians}</span>
          </div>
          <div className="hidden sm:block text-xs text-slate-400 mt-1">
            {i18n.statsStaffDetail}
          </div>
        </div>

        <div className="p-2.5 sm:p-4 bg-slate-900 border border-slate-800 rounded-lg">
          <div className="text-[9px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {i18n.statsGapsCount}
          </div>
          <div className="text-lg sm:text-2xl font-bold text-rose-500 mt-0.5 sm:mt-1 flex items-center gap-1 sm:gap-2">
            {activeGapsCount} <span className="hidden sm:inline">{i18n.statsGaps}</span>
            {activeGapsCount > 0 && (
              <span className="inline-block w-2 h-2 sm:w-2.5 sm:h-2.5 bg-rose-500 rounded-full animate-ping"></span>
            )}
          </div>
          <div className="hidden sm:block text-xs text-slate-400 mt-1">
            {i18n.statsGapsDetail}
          </div>
        </div>

        <div className="p-2.5 sm:p-4 bg-slate-900 border border-slate-800 rounded-lg">
          <div className="text-[9px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {i18n.statsSyncStatus}
          </div>
          <div className="text-lg sm:text-2xl font-bold text-emerald-400 mt-0.5 sm:mt-1">
            <span className="hidden sm:inline">Supabase Cloud</span>
            <span className="sm:hidden">Aktif</span>
          </div>
          <div className="hidden sm:block text-xs text-slate-400 mt-1">
            {i18n.statsSyncDetail}
          </div>
        </div>
      </div>

      {/* Main Roster Grid */}
      <RosterGrid
        initialStaff={initialStaff}
        shifts={shifts}
        gapEvents={gapEvents}
        currentYear={currentYear}
        currentMonth={currentMonth}
        onSelectGap={handleSelectGap}
        onSelectShift={handleSelectShift}
      />

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
          allStaff={initialStaff}
          onClose={handleCloseEditDrawer}
          onAssignSuccess={handleAssignSuccess}
        />
      )}
    </div>
  );
}
