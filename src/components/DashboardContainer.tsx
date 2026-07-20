'use client';

import React, { useState, useEffect } from 'react';
import RosterGrid from './RosterGrid';
import RecommendationDrawer from './RecommendationDrawer';
import ShiftEditDrawer from './ShiftEditDrawer';
import { supabaseClient } from '@/lib/supabase';
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
          setShifts((prev) =>
            prev.map((s) => (s.id === updatedShift.id ? updatedShift : s))
          );
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
      {/* Top Banner Dashboard Stats */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Active Staff
          </div>
          <div className="text-2xl font-bold text-slate-200 mt-1">
            {initialStaff.length} Technicians
          </div>
          <div className="text-xs text-slate-400 mt-1">
            CNS Unit (17) & ESS Unit (10)
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Unstaffed Shift Gaps
          </div>
          <div className="text-2xl font-bold text-rose-500 mt-1 flex items-center gap-2">
            {activeGapsCount} Gaps
            {activeGapsCount > 0 && (
              <span className="inline-block w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping"></span>
            )}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Requires replacement assignments
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            System Database Sync
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            Supabase Cloud
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Connected & Real-time Active
          </div>
        </div>
      </div>

      {/* Main Roster Grid */}
      <RosterGrid
        initialStaff={initialStaff}
        shifts={shifts}
        gapEvents={gapEvents}
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
