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
