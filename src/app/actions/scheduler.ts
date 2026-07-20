'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

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
  actorId = 'Manager Teknik' // Default actor role for MVP
}: AssignParams) {
  console.log(`[actions/scheduler] Assigning replacement staff ${candidateStaffId} to shift ${shiftId}`);

  try {
    // 1. Update the shift record with the new staff ID and set status to Filled
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

    // 2. Update the gap event status to Resolved
    const { error: gapErr } = await supabaseAdmin!
      .from('gap_events')
      .update({
        status: 'Resolved'
      })
      .eq('id', gapEventId);

    if (gapErr) {
      throw new Error(`Failed to resolve gap event: ${gapErr.message}`);
    }

    // 3. Write record into audit log
    const { error: auditErr } = await supabaseAdmin!
      .from('audit_log')
      .insert({
        actor_id: actorId,
        action: 'APPROVED',
        entity: 'shifts',
        entity_id: shiftId,
        metadata: {
          gap_event_id: gapEventId,
          replacement_staff_id: candidateStaffId,
          recommendation_score: score,
          score_breakdown: breakdown,
          justification: reason,
          timestamp: new Date().toISOString()
        }
      });

    if (auditErr) {
      console.warn('[actions/scheduler] Warning writing to audit_log:', auditErr.message);
    }

    // Revalidate the main roster page to push new server components layout state
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
