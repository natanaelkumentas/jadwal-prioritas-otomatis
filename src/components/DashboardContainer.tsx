'use client';

import React, { useState } from 'react';
import RosterGrid from './RosterGrid';
import RecommendationDrawer from './RecommendationDrawer';
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
  const [activeSelection, setActiveSelection] = useState<{
    gapEvent: GapEvent;
    shift: Shift;
  } | null>(null);

  const handleSelectGap = (gapEvent: GapEvent, shift: Shift) => {
    setActiveSelection({ gapEvent, shift });
  };

  const handleCloseDrawer = () => {
    setActiveSelection(null);
  };

  const handleAssignSuccess = () => {
    console.log('[DashboardContainer] Assignment successful. Real-time updates should sync.');
  };

  // Compute stats
  const activeGapsCount = initialGapEvents.filter(g => g.status === 'Pending').length;

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
        initialShifts={initialShifts}
        initialGapEvents={initialGapEvents}
        onSelectGap={handleSelectGap}
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
    </div>
  );
}
