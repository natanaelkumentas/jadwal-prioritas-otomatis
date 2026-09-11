'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { getDaysDiff } from '@/lib/scheduler-engine/filters';

if (!supabaseAdmin) {
  throw new Error('Supabase Admin client must be initialized on the server (requires SUPABASE_SERVICE_ROLE_KEY)');
}

interface AssignParams {
  gapEventId: string;
  shiftId: string;
  candidateStaffId: string;
  score: number;
  breakdown: any;
  reason?: string;
  actorId?: string; // Optional: Track who did it (manager/admin)
}

/**
 * Server Action to assign a candidate replacement technician to a roster gap.
 */
export async function assignReplacement({
  gapEventId,
  shiftId,
  candidateStaffId,
  score,
  breakdown,
  reason = 'SYSTEM_RECOMMENDED',
  actorId = 'Manager Teknik'
}: AssignParams) {
  console.log(`[actions/scheduler] Assigning replacement staff ${candidateStaffId} to gap event ${gapEventId} (shift ${shiftId})`);

  try {
    // 1. Fetch details of gap event and target shift
    const { data: gapData, error: gapFetchErr } = await supabaseAdmin!
      .from('gap_events')
      .select('*')
      .eq('id', gapEventId)
      .single();

    if (gapFetchErr || !gapData) {
      throw new Error(`Failed to fetch gap event details: ${gapFetchErr?.message}`);
    }

    const { data: shiftData, error: shiftFetchErr } = await supabaseAdmin!
      .from('shifts')
      .select('*, staff:staff(*)')
      .eq('id', shiftId)
      .single();

    if (shiftFetchErr || !shiftData) {
      throw new Error(`Failed to fetch shift details: ${shiftFetchErr?.message}`);
    }

    const targetShift = shiftData as any;
    const leaveCodes = ['CUTI', 'DINAS LUAR', 'DIKLAT', 'SAKIT'];
    const gapReason = (gapData.reason || '').toUpperCase();
    const currentShiftCode = (targetShift.shift_code || '').toUpperCase();

    const isLeaveGap = leaveCodes.includes(gapReason) || leaveCodes.includes(currentShiftCode);

    if (isLeaveGap) {
      // Case A: Gap created due to leave/absence (e.g. CUTI)
      // 1a. Ensure absent technician's shift stays marked as leave and Filled
      const leaveCodeToKeep = leaveCodes.includes(currentShiftCode) ? currentShiftCode : (gapReason || 'CUTI');
      const { error: updateAbsentErr } = await supabaseAdmin!
        .from('shifts')
        .update({
          shift_code: leaveCodeToKeep,
          status: 'Filled'
        })
        .eq('id', shiftId);

      if (updateAbsentErr) {
        throw new Error(`Failed to update absent staff shift status: ${updateAbsentErr.message}`);
      }

      // 1b. Determine original work shift code to assign to replacement
      let workShiftCodeToAssign = 'P';
      if (!leaveCodes.includes(currentShiftCode) && currentShiftCode !== 'L' && currentShiftCode !== 'Y') {
        workShiftCodeToAssign = currentShiftCode;
      } else {
        const daysFromAnchor = Math.abs(getDaysDiff('2025-01-01', targetShift.date));
        if (targetShift.group === 'ESS') {
          const essPatterns: Record<string, string[]> = {
            'ESS Grup 1': ['M', 'Y', 'L', 'PS', 'P'],
            'ESS Grup 2': ['P', 'M', 'Y', 'L', 'PS'],
            'ESS Grup 3': ['PS', 'P', 'M', 'Y', 'L'],
            'ESS Grup 4': ['L', 'PS', 'P', 'M', 'Y'],
            'ESS Grup 5': ['Y', 'L', 'PS', 'P', 'M']
          };
          const pat = essPatterns[targetShift.staff?.sub_group] || ['M', 'Y', 'L', 'PS', 'P'];
          workShiftCodeToAssign = pat[daysFromAnchor % pat.length];
        } else {
          const cnsPatterns: Record<string, string[]> = {
            'Grup 1': ['L', 'P', 'S', 'M', 'Y'],
            'Grup 2': ['P', 'S', 'M', 'Y', 'L'],
            'Grup 3': ['S', 'M', 'Y', 'L', 'P'],
            'Grup 4': ['M', 'Y', 'L', 'P', 'S'],
            'Grup 5': ['Y', 'L', 'P', 'S', 'M']
          };
          const pat = cnsPatterns[targetShift.staff?.sub_group] || ['P', 'S', 'M', 'Y', 'L'];
          workShiftCodeToAssign = pat[daysFromAnchor % pat.length];
        }

        if (workShiftCodeToAssign === 'L' || workShiftCodeToAssign === 'Y') {
          workShiftCodeToAssign = 'P';
        }
      }

      // 1c. Find replacement staff's shift on the same date and group
      const { data: replShift } = await supabaseAdmin!
        .from('shifts')
        .select('id')
        .eq('staff_id', candidateStaffId)
        .eq('date', targetShift.date)
        .eq('group', targetShift.group)
        .maybeSingle();

      if (replShift) {
        const { error: updateReplErr } = await supabaseAdmin!
          .from('shifts')
          .update({
            shift_code: workShiftCodeToAssign,
            status: 'Filled'
          })
          .eq('id', replShift.id);

        if (updateReplErr) {
          throw new Error(`Failed to update replacement staff shift: ${updateReplErr.message}`);
        }
      }
    } else {
      // Case B: Unstaffed/empty shift gap — assign candidate directly to target shift
      const { error: shiftErr } = await supabaseAdmin!
        .from('shifts')
        .update({
          staff_id: candidateStaffId,
          status: 'Filled'
        })
        .eq('id', shiftId);

      if (shiftErr) {
        throw new Error(`Failed to update shift: ${shiftErr.message}`);
      }
    }

    // 2. Update the gap event status to Resolved
    const { error: gapErr } = await supabaseAdmin!
      .from('gap_events')
      .update({ status: 'Resolved' })
      .eq('id', gapEventId);

    if (gapErr) {
      throw new Error(`Failed to resolve gap event: ${gapErr.message}`);
    }

    // 3. Audit log
    await supabaseAdmin!
      .from('audit_log')
      .insert({
        actor_id: actorId,
        action: 'APPROVED',
        entity: 'shifts',
        entity_id: shiftId,
        metadata: {
          gap_event_id: gapEventId,
          replacement_staff_id: candidateStaffId,
          is_leave_gap: isLeaveGap,
          recommendation_score: score,
          score_breakdown: breakdown,
          justification: reason,
          timestamp: new Date().toISOString()
        }
      });

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('[actions/scheduler] Error during assignment:', error);
    return { success: false, error: error.message || 'Failed to complete assignment' };
  }
}

interface ChangeShiftParams {
  shiftId: string;
  newShiftCode: string;
  justification?: string;
  actorId?: string;
}

/**
 * Server Action to update a shift code directly (e.g. changing work shift types or off days).
 */
export async function updateShiftCode({
  shiftId,
  newShiftCode,
  justification = 'MANUAL_EDIT',
  actorId = 'Manager Teknik'
}: ChangeShiftParams) {
  console.log(`[actions/scheduler] Updating shift ${shiftId} code to ${newShiftCode}`);

  try {
    // 1. Fetch current shift info for audit logging
    const { data: currentShift, error: fetchErr } = await supabaseAdmin!
      .from('shifts')
      .select('shift_code, status')
      .eq('id', shiftId)
      .single();

    if (fetchErr || !currentShift) {
      throw new Error(`Failed to fetch current shift info: ${fetchErr?.message}`);
    }

    // 2. Perform the update
    const { error: updateErr } = await supabaseAdmin!
      .from('shifts')
      .update({
        shift_code: newShiftCode,
        status: 'Filled' // Ensure status is marked Filled after manual edit
      })
      .eq('id', shiftId);

    if (updateErr) {
      throw new Error(`Failed to update shift: ${updateErr.message}`);
    }

    // 3. Resolve any pending gap event associated with this shift
    const { error: gapErr } = await supabaseAdmin!
      .from('gap_events')
      .update({ status: 'Resolved' })
      .eq('shift_id', shiftId)
      .eq('status', 'Pending');

    if (gapErr) {
      console.warn(`[actions/scheduler] Warning resolving associated gap event:`, gapErr.message);
    }

    // 4. Log the action
    await supabaseAdmin!
      .from('audit_log')
      .insert({
        actor_id: actorId,
        action: 'UPDATE',
        entity: 'shifts',
        entity_id: shiftId,
        metadata: {
          old_shift_code: currentShift.shift_code,
          new_shift_code: newShiftCode,
          justification,
          timestamp: new Date().toISOString()
        }
      });

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('[actions/scheduler] Error updating shift code:', error);
    return { success: false, error: error.message || 'Failed to update shift code' };
  }
}

interface BulkChangeShiftParams {
  shiftIds: string[];
  newShiftCode: string;
  justification?: string;
  actorId?: string;
}

const BULK_LEAVE_CODES = ['CUTI', 'DINAS LUAR', 'DIKLAT', 'SAKIT'];
const BULK_OFF_CODES = ['L', 'Y'];

/**
 * Server Action to apply one shift code to many shifts at once (multi-select bulk edit).
 * Work shifts vacated by a leave code become Pending gaps, mirroring assignLeaveAndReplacement
 * Case B; every other change is a plain code update that resolves any pending gap on that shift.
 */
export async function updateShiftCodesBulk({
  shiftIds,
  newShiftCode,
  justification = 'BULK_MANUAL_EDIT',
  actorId = 'Manager Teknik'
}: BulkChangeShiftParams) {
  const uniqueIds = Array.from(new Set(shiftIds.filter(Boolean)));
  const targetCode = newShiftCode.trim().toUpperCase();
  console.log(`[actions/scheduler] Bulk updating ${uniqueIds.length} shifts to ${targetCode}`);

  if (uniqueIds.length === 0) {
    return { success: false, error: 'Tidak ada shift yang dipilih.' };
  }

  try {
    // 1. Fetch current shift info for audit logging & gap handling
    const { data: currentShifts, error: fetchErr } = await supabaseAdmin!
      .from('shifts')
      .select('id, staff_id, shift_code, status')
      .in('id', uniqueIds);

    if (fetchErr) {
      throw new Error(`Failed to fetch current shifts info: ${fetchErr.message}`);
    }
    if (!currentShifts || currentShifts.length === 0) {
      throw new Error('Shift yang dipilih tidak ditemukan di database.');
    }

    // Work shifts (anything other than L/Y) being changed to a leave code leave a hole in the roster
    const isLeaveTarget = BULK_LEAVE_CODES.includes(targetCode);
    const vacatedIds = isLeaveTarget
      ? currentShifts
          .filter(s => !BULK_OFF_CODES.includes((s.shift_code || '').toUpperCase()))
          .map(s => s.id)
      : [];
    const vacatedSet = new Set(vacatedIds);
    const filledIds = currentShifts.map(s => s.id).filter(id => !vacatedSet.has(id));

    // 2. Perform the updates (one query per status bucket)
    if (filledIds.length > 0) {
      const { error: updateErr } = await supabaseAdmin!
        .from('shifts')
        .update({ shift_code: targetCode, status: 'Filled' })
        .in('id', filledIds);

      if (updateErr) {
        throw new Error(`Failed to update shifts: ${updateErr.message}`);
      }
    }

    if (vacatedIds.length > 0) {
      const { error: updateErr } = await supabaseAdmin!
        .from('shifts')
        .update({ shift_code: targetCode, status: 'Gap' })
        .in('id', vacatedIds);

      if (updateErr) {
        throw new Error(`Failed to update vacated shifts: ${updateErr.message}`);
      }
    }

    // 3. Gap events: resolve pending ones on shifts now Filled, open new ones for vacated work shifts
    if (filledIds.length > 0) {
      const { error: gapErr } = await supabaseAdmin!
        .from('gap_events')
        .update({ status: 'Resolved' })
        .in('shift_id', filledIds)
        .eq('status', 'Pending');

      if (gapErr) {
        console.warn(`[actions/scheduler] Warning resolving associated gap events:`, gapErr.message);
      }
    }

    if (vacatedIds.length > 0) {
      const { data: existingGaps } = await supabaseAdmin!
        .from('gap_events')
        .select('shift_id')
        .in('shift_id', vacatedIds)
        .eq('status', 'Pending');

      const alreadyOpen = new Set((existingGaps || []).map(g => g.shift_id));
      const newGaps = vacatedIds
        .filter(id => !alreadyOpen.has(id))
        .map(id => ({ shift_id: id, reason: targetCode, status: 'Pending' }));

      if (newGaps.length > 0) {
        const { error: createGapErr } = await supabaseAdmin!
          .from('gap_events')
          .insert(newGaps);

        if (createGapErr) {
          console.warn(`[actions/scheduler] Warning creating gap events:`, createGapErr.message);
        }
      }
    }

    // 4. Log the action (one row per shift, single insert)
    const timestamp = new Date().toISOString();
    await supabaseAdmin!
      .from('audit_log')
      .insert(
        currentShifts.map(s => ({
          actor_id: actorId,
          action: vacatedSet.has(s.id) ? 'LEAVE_PENDING_GAP' : 'UPDATE',
          entity: 'shifts',
          entity_id: s.id,
          metadata: {
            old_shift_code: s.shift_code,
            new_shift_code: targetCode,
            justification,
            bulk_size: currentShifts.length,
            timestamp
          }
        }))
      );

    revalidatePath('/');
    return { success: true, updated: currentShifts.length, gapsCreated: vacatedIds.length };
  } catch (error: any) {
    console.error('[actions/scheduler] Error during bulk shift update:', error);
    return { success: false, error: error.message || 'Failed to update shifts' };
  }
}

interface SwapShiftsParams {
  shiftAId: string;
  shiftBId: string;
  justification?: string;
  actorId?: string;
}

/**
 * Server Action to swap assignees of two shifts on the same day.
 */
export async function swapShifts({
  shiftAId,
  shiftBId,
  justification = 'MUTUAL_SWAP',
  actorId = 'Manager Teknik'
}: SwapShiftsParams) {
  console.log(`[actions/scheduler] Swapping assignees between shift ${shiftAId} and ${shiftBId}`);

  try {
    // 1. Fetch both shifts details
    const { data: shiftA, error: errA } = await supabaseAdmin!
      .from('shifts')
      .select('staff_id, shift_code, date')
      .eq('id', shiftAId)
      .single();

    const { data: shiftB, error: errB } = await supabaseAdmin!
      .from('shifts')
      .select('staff_id, shift_code, date')
      .eq('id', shiftBId)
      .single();

    if (errA || errB || !shiftA || !shiftB) {
      throw new Error(`Failed to fetch shifts info for swapping.`);
    }

    if (shiftA.date !== shiftB.date) {
      throw new Error('Can only swap shifts occurring on the same date.');
    }

    // 2. Perform the swap
    const { error: swapAErr } = await supabaseAdmin!
      .from('shifts')
      .update({ staff_id: shiftB.staff_id, status: 'Filled' })
      .eq('id', shiftAId);

    const { error: swapBErr } = await supabaseAdmin!
      .from('shifts')
      .update({ staff_id: shiftA.staff_id, status: 'Filled' })
      .eq('id', shiftBId);

    if (swapAErr || swapBErr) {
      throw new Error(`Database error occurred during swap transaction.`);
    }

    // 3. Resolve any pending gap events associated with either shift
    await supabaseAdmin!
      .from('gap_events')
      .update({ status: 'Resolved' })
      .in('shift_id', [shiftAId, shiftBId])
      .eq('status', 'Pending');

    // 4. Log the swap transaction in audit log
    await supabaseAdmin!
      .from('audit_log')
      .insert({
        actor_id: actorId,
        action: 'SWAP',
        entity: 'shifts',
        entity_id: shiftAId,
        metadata: {
          shift_a_id: shiftAId,
          shift_b_id: shiftBId,
          original_staff_a: shiftA.staff_id,
          original_staff_b: shiftB.staff_id,
          shift_a_code: shiftA.shift_code,
          shift_b_code: shiftB.shift_code,
          justification,
          timestamp: new Date().toISOString()
        }
      });

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('[actions/scheduler] Error swapping shifts:', error);
    return { success: false, error: error.message || 'Failed to complete swap' };
  }
}

interface AssignLeaveAndReplacementParams {
  shiftId: string;
  leaveCode: string;
  replacementStaffId?: string | null;
  justification?: string;
  actorId?: string;
}

/**
 * Server Action to assign leave (CUTI, DINAS LUAR, DIKLAT, SAKIT) to a technician
 * and optionally assign a recommended replacement to cover their vacated work shift.
 */
export async function assignLeaveAndReplacement({
  shiftId,
  leaveCode,
  replacementStaffId = null,
  justification = 'LEAVE_ASSIGNMENT',
  actorId = 'Manager Teknik'
}: AssignLeaveAndReplacementParams) {
  console.log(`[actions/scheduler] Assigning leave ${leaveCode} to shift ${shiftId}, replacement: ${replacementStaffId || 'None'}`);

  try {
    // 1. Fetch current shift details (absent technician's shift)
    const { data: currentShift, error: fetchErr } = await supabaseAdmin!
      .from('shifts')
      .select('*')
      .eq('id', shiftId)
      .single();

    if (fetchErr || !currentShift) {
      throw new Error(`Failed to fetch current shift info: ${fetchErr?.message}`);
    }

    const originalShiftCode = currentShift.shift_code;
    const absentStaffId = currentShift.staff_id;
    const shiftDate = currentShift.date;
    const group = currentShift.group;

    if (replacementStaffId) {
      // Case A: Replacement candidate selected
      // Update absent technician's shift to leaveCode and Filled status
      const { error: updateAbsentErr } = await supabaseAdmin!
        .from('shifts')
        .update({
          shift_code: leaveCode,
          status: 'Filled'
        })
        .eq('id', shiftId);

      if (updateAbsentErr) {
        throw new Error(`Failed to update absent staff shift: ${updateAbsentErr.message}`);
      }

      // Find replacement staff's shift on the same date and group
      const { data: replacementShift, error: replFetchErr } = await supabaseAdmin!
        .from('shifts')
        .select('*')
        .eq('staff_id', replacementStaffId)
        .eq('date', shiftDate)
        .eq('group', group)
        .maybeSingle();

      if (replFetchErr) {
        throw new Error(`Failed to find shift for replacement staff on date ${shiftDate}: ${replFetchErr.message}`);
      }

      if (replacementShift) {
        // Update existing replacement staff's shift to originalShiftCode and status Filled
        const { error: updateReplErr } = await supabaseAdmin!
          .from('shifts')
          .update({
            shift_code: originalShiftCode,
            status: 'Filled'
          })
          .eq('id', replacementShift.id);

        if (updateReplErr) {
          throw new Error(`Failed to update replacement staff shift: ${updateReplErr.message}`);
        }
      } else {
        // No existing shift row — insert a new one for the replacement staff
        const { error: insertReplErr } = await supabaseAdmin!
          .from('shifts')
          .insert({
            staff_id: replacementStaffId,
            date: shiftDate,
            shift_code: originalShiftCode,
            group,
            status: 'Filled'
          });

        if (insertReplErr) {
          throw new Error(`Failed to create shift for replacement staff: ${insertReplErr.message}`);
        }
      }

      // Resolve any pending gap event for either shift
      await supabaseAdmin!
        .from('gap_events')
        .update({ status: 'Resolved' })
        .in('shift_id', [shiftId, replacementShift.id])
        .eq('status', 'Pending');

      // Log in audit_log
      await supabaseAdmin!
        .from('audit_log')
        .insert({
          actor_id: actorId,
          action: 'LEAVE_WITH_REPLACEMENT',
          entity: 'shifts',
          entity_id: shiftId,
          metadata: {
            absent_staff_id: absentStaffId,
            leave_code: leaveCode,
            original_shift_code: originalShiftCode,
            replacement_staff_id: replacementStaffId,
            replacement_shift_id: replacementShift.id,
            justification,
            timestamp: new Date().toISOString()
          }
        });
    } else {
      // Case B: No replacement selected (leave assigned, pending gap created)
      // Update absent technician's shift to leaveCode and status Gap
      const { error: updateAbsentErr } = await supabaseAdmin!
        .from('shifts')
        .update({
          shift_code: leaveCode,
          status: 'Gap'
        })
        .eq('id', shiftId);

      if (updateAbsentErr) {
        throw new Error(`Failed to update absent staff shift: ${updateAbsentErr.message}`);
      }

      // Create a pending gap_event
      const { error: createGapErr } = await supabaseAdmin!
        .from('gap_events')
        .insert({
          shift_id: shiftId,
          reason: leaveCode,
          status: 'Pending'
        });

      if (createGapErr) {
        console.warn(`[actions/scheduler] Warning creating gap event:`, createGapErr.message);
      }

      // Log in audit_log
      await supabaseAdmin!
        .from('audit_log')
        .insert({
          actor_id: actorId,
          action: 'LEAVE_PENDING_GAP',
          entity: 'shifts',
          entity_id: shiftId,
          metadata: {
            absent_staff_id: absentStaffId,
            leave_code: leaveCode,
            original_shift_code: originalShiftCode,
            justification,
            timestamp: new Date().toISOString()
          }
        });
    }

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('[actions/scheduler] Error during leave assignment:', error);
    return { success: false, error: error.message || 'Failed to assign leave' };
  }
}

/**
 * Server Action to fetch the personal monthly duty schedule of a single technician,
 * including any pending gap events attached to their shifts.
 */
export async function getStaffMonthlySchedule(staffId: string, year: number, month: number) {
  const formattedMonth = month.toString().padStart(2, '0');
  const totalDays = new Date(year, month, 0).getDate();
  const startDate = `${year}-${formattedMonth}-01`;
  const endDate = `${year}-${formattedMonth}-${totalDays.toString().padStart(2, '0')}`;

  try {
    const { data: shiftsData, error } = await supabaseAdmin!
      .from('shifts')
      .select('*')
      .eq('staff_id', staffId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    const shifts = (shiftsData || []) as any[];
    let gapEvents: any[] = [];

    if (shifts.length > 0) {
      const { data: gapData } = await supabaseAdmin!
        .from('gap_events')
        .select('*')
        .eq('status', 'Pending')
        .in('shift_id', shifts.map(s => s.id));

      gapEvents = gapData || [];
    }

    return { success: true, shifts, gapEvents };
  } catch (err: any) {
    console.error('[actions/scheduler] Error fetching personal schedule:', err);
    return { success: false, error: err.message, shifts: [], gapEvents: [] };
  }
}

/**
 * Server Action to fetch shifts for a specific month using Supabase Admin client.
 */
export async function getShiftsForMonth(year: number, month: number) {
  const formattedMonth = month.toString().padStart(2, '0');
  const totalDays = new Date(year, month, 0).getDate();
  const startDate = `${year}-${formattedMonth}-01`;
  const endDate = `${year}-${formattedMonth}-${totalDays.toString().padStart(2, '0')}`;

  try {
    const { data: monthShifts, error } = await supabaseAdmin!
      .from('shifts')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) {
      console.error('[actions/scheduler] Error fetching month shifts:', error);
      return { success: false, error: error.message, shifts: [] };
    }

    return { success: true, shifts: (monthShifts || []) as any[] };
  } catch (err: any) {
    console.error('[actions/scheduler] Error in getShiftsForMonth:', err);
    return { success: false, error: err.message, shifts: [] };
  }
}


