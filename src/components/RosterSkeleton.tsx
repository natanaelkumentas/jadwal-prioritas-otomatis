'use client';

import React from 'react';

interface RosterSkeletonProps {
  daysInMonth?: number;
}

export default function RosterSkeleton({ daysInMonth = 31 }: RosterSkeletonProps) {
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const skeletonRows = Array.from({ length: 8 }, (_, i) => i);

  return (
    <div className="animate-pulse space-y-6">
      {/* Search & Legend Skeleton */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="h-9 bg-slate-900 border border-slate-800 rounded-lg w-full max-w-md"></div>
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-6 w-16 bg-slate-900 border border-slate-800 rounded"></div>
          ))}
        </div>
      </div>

      {/* Table Section Skeleton */}
      <div className="space-y-4">
        <div className="h-6 w-48 bg-slate-900 border border-slate-800 rounded"></div>
        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/40">
          <table className="min-w-full divide-y divide-slate-800">
            <thead className="bg-slate-950">
              <tr>
                <th className="px-3 py-3 w-32 sm:w-64 border-r border-slate-800 sticky left-0 bg-slate-950">
                  <div className="h-4 w-24 bg-slate-800 rounded"></div>
                </th>
                {days.map((day) => (
                  <th key={day} className="px-1 py-2 w-8 sm:w-10">
                    <div className="h-4 w-4 mx-auto bg-slate-800 rounded"></div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {skeletonRows.map((row) => (
                <tr key={row}>
                  <td className="px-3 py-3 border-r border-slate-800 sticky left-0 bg-slate-950/95">
                    <div className="space-y-1.5">
                      <div className="h-3.5 w-28 bg-slate-800 rounded"></div>
                      <div className="h-2.5 w-16 bg-slate-900 rounded"></div>
                    </div>
                  </td>
                  {days.map((day) => (
                    <td key={day} className="p-1 text-center">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 mx-auto bg-slate-800/60 rounded"></div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
