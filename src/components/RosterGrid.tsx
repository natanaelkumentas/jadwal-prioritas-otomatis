'use client';

import React, { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabase';
import { Staff, Shift, GapEvent } from '@/lib/scheduler-engine/types';

interface RosterGridProps {
  initialStaff: Staff[];
  initialShifts: Shift[];
  initialGapEvents: GapEvent[];
  onSelectGap: (gapEvent: GapEvent, shift: Shift) => void;
}

export default function RosterGrid({
  initialStaff,
  initialShifts,
  initialGapEvents,
  onSelectGap
}: RosterGridProps) {
  const [staffList] = useState<Staff[]>(initialStaff);
  const [shifts, setShifts] = useState<Shift[]>(initialShifts);
  const [gapEvents, setGapEvents] = useState<GapEvent[]>(initialGapEvents);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Real-time listener for database changes
  useEffect(() => {
    console.log('[RosterGrid] Subscribing to Supabase real-time changes on schema: jadwal...');
    const channel = supabaseClient
      .channel('roster-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'jadwal', table: 'shifts' },
        (payload) => {
          console.log('[RosterGrid] Real-time shift update received:', payload);
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
          console.log('[RosterGrid] Real-time gap event received:', payload);
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
      console.log('[RosterGrid] Unsubscribing from real-time changes.');
      supabaseClient.removeChannel(channel);
    };
  }, []);

  // Filter staff by search term
  const filteredStaff = staffList.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group staff: CNS and ESS
  const cnsStaff = filteredStaff.filter(s => s.group === 'CNS');
  const essStaff = filteredStaff.filter(s => s.group === 'ESS');

  // Group CNS by sub-group
  const cnsSubGroups = Array.from(new Set(cnsStaff.map(s => s.sub_group))).sort();

  // Group ESS by sub-group
  const essSubGroups = Array.from(new Set(essStaff.map(s => s.sub_group))).sort();

  // Helper to render shift cell style
  const getShiftStyle = (shift: Shift | undefined, hasPendingGap: GapEvent | undefined) => {
    if (hasPendingGap) {
      // Red pulsing pulse for active gaps
      return 'bg-red-500/10 text-red-500 border border-red-500 animate-pulse font-bold hover:bg-red-500/20 cursor-pointer shadow-sm shadow-red-500/20';
    }

    if (!shift) {
      return 'bg-slate-800/20 text-slate-500 border border-slate-700/50';
    }

    const code = shift.shift_code.toUpperCase();
    
    switch (code) {
      case 'P':
        return 'bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20';
      case 'S':
        return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20';
      case 'M':
        return 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 hover:bg-indigo-500/20 font-bold';
      case 'PS':
        return 'bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20';
      case 'OH':
      case 'D':
        return 'bg-sky-500/10 text-sky-500 border border-sky-500/20 hover:bg-sky-500/20';
      case 'L':
      case 'Y':
      default:
        return 'bg-slate-800/10 text-slate-400 border border-slate-700/20 hover:bg-slate-800/20';
    }
  };

  const daysInMonth = Array.from({ length: 31 }, (_, i) => i + 1);

  // Helper to get day name label (R, K, J, S, M, S, S) starting Wednesday
  const getDayLabel = (dayNum: number) => {
    const dayLabels = ['R', 'K', 'J', 'S', 'M', 'S', 'S']; // Wed, Thu, Fri, Sat, Sun, Mon, Tue
    return dayLabels[(dayNum - 1) % 7];
  };

  const renderSection = (title: string, staffGroup: Staff[], key: string) => {
    if (staffGroup.length === 0) return null;

    return (
      <div key={key} className="mb-8">
        <h3 className="text-lg font-semibold text-slate-300 border-b border-slate-700 pb-2 mb-4">
          {title}
        </h3>
        <div className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-900/50 shadow-md">
          <table className="min-w-full divide-y divide-slate-800 text-sm">
            <thead className="bg-slate-950/80 sticky top-0 z-10">
              <tr>
                <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-300 w-64 border-r border-slate-800">
                  Name & Ratings
                </th>
                {daysInMonth.map(day => (
                  <th key={day} scope="col" className="px-1 py-2 text-center text-xs font-semibold text-slate-400 w-10">
                    <div>{day}</div>
                    <div className="text-[10px] text-slate-500 uppercase">{getDayLabel(day)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {staffGroup.map(staff => {
                return (
                  <tr key={staff.id} className="hover:bg-slate-900/30 transition-colors">
                    <td className="px-4 py-3 border-r border-slate-800 sticky left-0 bg-slate-950/30 z-1 w-64">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-200 truncate max-w-[180px]">
                          {staff.name}
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {staff.ratings?.map(r => (
                            <span 
                              key={r} 
                              className="px-1 py-0.5 text-[10px] font-mono font-bold bg-slate-800 border border-slate-700 text-slate-400 rounded"
                            >
                              {r}
                            </span>
                          ))}
                          <span className="px-1 py-0.5 text-[9px] bg-slate-900 border border-slate-800 text-slate-500 rounded truncate max-w-[80px]">
                            {staff.sub_group}
                          </span>
                        </div>
                      </div>
                    </td>
                    {daysInMonth.map(day => {
                      const dateStr = `2026-07-${day.toString().padStart(2, '0')}`;
                      const shift = shifts.find(s => s.staff_id === staff.id && s.date === dateStr);
                      const pendingGap = gapEvents.find(g => g.shift_id === shift?.id && g.status === 'Pending');

                      return (
                        <td key={day} className="p-1 text-center border-r border-slate-850">
                          <button
                            disabled={!pendingGap}
                            onClick={() => pendingGap && shift && onSelectGap(pendingGap, shift)}
                            className={`w-9 h-9 text-xs rounded transition-all flex items-center justify-center ${getShiftStyle(shift, pendingGap)}`}
                          >
                            {pendingGap ? (
                              <div className="flex flex-col items-center">
                                <span className="font-bold text-[9px] uppercase leading-none">{pendingGap.reason.split(' ')[0]}</span>
                                <span className="text-[10px] leading-none mt-0.5">⚠️</span>
                              </div>
                            ) : (
                              shift?.shift_code || 'L'
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search personnel by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-500 transition-colors"
          />
          <span className="absolute left-3 top-2.5 text-slate-500">🔍</span>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-slate-400">
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> P (Morning)
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> S (Afternoon)
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> M (Night)
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> PS (Long Day)
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 border border-red-500/20 text-red-500 rounded animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> GAP (Absence)
          </span>
        </div>
      </div>

      {cnsSubGroups.map(subGroup => {
        const staffInSubGroup = cnsStaff.filter(s => s.sub_group === subGroup);
        return renderSection(`CNS Technical Group - ${subGroup}`, staffInSubGroup, subGroup);
      })}

      {essSubGroups.map(subGroup => {
        const staffInSubGroup = essStaff.filter(s => s.sub_group === subGroup);
        return renderSection(`ESS Technical Group - ${subGroup}`, staffInSubGroup, subGroup);
      })}
    </div>
  );
}
