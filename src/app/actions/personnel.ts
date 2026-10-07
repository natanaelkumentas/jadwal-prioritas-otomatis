'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

import { Staff } from '@/lib/scheduler-engine/types';
import { getRotationShiftCode } from '@/lib/rotation';
import { StaffGroup } from '@/lib/shift-codes';

if (!supabaseAdmin) {
  throw new Error('Supabase Admin client must be initialized on the server (requires SUPABASE_SERVICE_ROLE_KEY)');
}

interface PersonnelPayload {
  id: string;
  originalId?: string;
  name: string;
  group: string;
  sub_group: string;
  role_level: string;
  location?: string;
  ratingIds?: string[];
}

/**
 * Fetch fresh staff directory list with ratings from database.
 */
export async function getStaffList() {
  try {
    const { data: staffData, error } = await supabaseAdmin!
      .from('staff')
      .select('*, staff_ratings(rating:ratings(code))')
      .eq('location', 'Cabang Manado')
      .order('name', { ascending: true });

    if (error) throw error;

    const staff: Staff[] = (staffData || []).map((s: any) => ({
      id: s.gmail || s.id,
      gmail: s.gmail || s.id,
      name: s.name,
      group: s.group,
      sub_group: s.sub_group,
      role_level: s.role_level,
      location: s.location,
      ratings: s.staff_ratings?.map((sr: any) => sr.rating?.code).filter(Boolean) || []
    }));

    return { success: true, staff };
  } catch (err: any) {
    console.error('[actions/personnel] Error fetching staff list:', err);
    return { success: false, error: err.message, staff: [] };
  }
}

/**
 * Fetch all available license rating definitions from database.
 */
export async function getAllRatings() {
  try {
    const { data: ratings, error } = await supabaseAdmin!
      .from('ratings')
      .select('*')
      .order('group', { ascending: true })
      .order('code', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch ratings: ${error.message}`);
    }

    return { success: true, ratings: ratings || [] };
  } catch (err: any) {
    console.error('[actions/personnel] Error fetching ratings:', err);
    return { success: false, error: err.message, ratings: [] };
  }
}

/**
 * Server Action: Create a new personnel member along with license ratings.
 */
export async function createPersonnel({
  id,
  name,
  group,
  sub_group,
  role_level,
  location = 'Cabang Manado',
  ratingIds = []
}: PersonnelPayload) {
  const cleanId = id.trim().toLowerCase();
  console.log(`[actions/personnel] Creating new personnel ${cleanId} - ${name}`);

  try {
    // 1. Check ID/Gmail uniqueness
    const { count, error: checkErr } = await supabaseAdmin!
      .from('staff')
      .select('gmail', { count: 'exact', head: true })
      .or(`gmail.eq.${cleanId},id.eq.${cleanId}`);

    if (checkErr) {
      throw new Error(`Failed to check existing ID: ${checkErr.message}`);
    }

    if (count && count > 0) {
      return { success: false, error: `Email/ID Personel "${cleanId}" sudah digunakan. Gunakan email lain.` };
    }

    // 2. Insert into staff table
    const { error: insertErr } = await supabaseAdmin!
      .from('staff')
      .insert({
        gmail: cleanId,
        id: cleanId,
        name: name.trim(),
        group,
        sub_group,
        role_level,
        location
      });

    if (insertErr) {
      throw new Error(`Gagal menyimpan data personel: ${insertErr.message}`);
    }

    // 3. Insert staff ratings if selected
    if (ratingIds.length > 0) {
      const staffRatingsInsert = ratingIds.map(ratingId => ({
        staff_id: cleanId,
        rating_id: ratingId
      }));

      const { error: ratingErr } = await supabaseAdmin!
        .from('staff_ratings')
        .insert(staffRatingsInsert);

      if (ratingErr) {
        console.warn(`[actions/personnel] Warning inserting staff ratings:`, ratingErr.message);
      }
    }

    // 4. Auto-generate roster shift rows for newly created technician for existing roster dates
    const { data: existingShiftDates } = await supabaseAdmin!
      .from('shifts')
      .select('date');

    if (existingShiftDates && existingShiftDates.length > 0) {
      const uniqueDates = Array.from(new Set(existingShiftDates.map(d => d.date))).sort();
      const isManager = role_level === 'Manager Teknik';

      const newShiftsToInsert = uniqueDates.map(dateStr => {
        const dateObj = new Date(dateStr);
        const dayOfWeek = dateObj.getDay();

        let shiftCode = 'L';
        if (isManager) {
          shiftCode = (dayOfWeek === 0 || dayOfWeek === 6) ? 'L' : 'D';
        } else {
          shiftCode = getRotationShiftCode(sub_group, group as StaffGroup, dateStr);
        }

        return {
          staff_id: cleanId,
          date: dateStr,
          shift_code: shiftCode,
          group,
          status: 'Filled'
        };
      });

      if (newShiftsToInsert.length > 0) {
        await supabaseAdmin!.from('shifts').insert(newShiftsToInsert);
      }
    }

    // 5. Audit log
    await supabaseAdmin!
      .from('audit_log')
      .insert({
        actor_id: 'Manager Teknik',
        action: 'CREATE_PERSONNEL',
        entity: 'staff',
        entity_id: cleanId,
        metadata: { name, group, sub_group, role_level, rating_count: ratingIds.length }
      });

    revalidatePath('/');
    return { success: true };
  } catch (err: any) {
    console.error('[actions/personnel] Error creating personnel:', err);
    return { success: false, error: err.message || 'Gagal menambahkan personel.' };
  }
}

/**
 * Server Action: Update an existing personnel record and rating associations.
 */
export async function updatePersonnel({
  id,
  originalId,
  name,
  group,
  sub_group,
  role_level,
  location = 'Cabang Manado',
  ratingIds = []
}: PersonnelPayload) {
  const targetNewGmail = id.trim().toLowerCase();
  const targetOldGmail = (originalId || id).trim().toLowerCase();
  const isGmailChanged = targetOldGmail !== targetNewGmail;

  console.log(`[actions/personnel] Updating personnel ${targetOldGmail} -> ${targetNewGmail}`);

  try {
    // If Gmail changed, ensure new Gmail is not already taken
    if (isGmailChanged) {
      const { data: existingStaff } = await supabaseAdmin!
        .from('staff')
        .select('gmail')
        .or(`gmail.eq.${targetNewGmail},id.eq.${targetNewGmail}`)
        .maybeSingle();

      if (existingStaff) {
        return { success: false, error: `Email Gmail "${targetNewGmail}" sudah digunakan oleh personel lain.` };
      }
    }

    // 1. Update staff table
    const { error: updateErr } = await supabaseAdmin!
      .from('staff')
      .update({
        gmail: targetNewGmail,
        id: targetNewGmail,
        name: name.trim(),
        group,
        sub_group,
        role_level,
        location
      })
      .or(`gmail.eq.${targetOldGmail},id.eq.${targetOldGmail}`);

    if (updateErr) {
      throw new Error(`Gagal memperbarui data personel: ${updateErr.message}`);
    }

    // If Gmail changed, cascade update shifts, calendar events, recommendations
    if (isGmailChanged) {
      await supabaseAdmin!
        .from('shifts')
        .update({ staff_id: targetNewGmail })
        .eq('staff_id', targetOldGmail);

      await supabaseAdmin!
        .from('calendar_sync_events')
        .update({ staff_gmail: targetNewGmail })
        .eq('staff_gmail', targetOldGmail);

      await supabaseAdmin!
        .from('recommendations')
        .update({ candidate_staff_id: targetNewGmail })
        .eq('candidate_staff_id', targetOldGmail);
    }

    // 2. Sync staff_ratings: Delete existing and insert new
    await supabaseAdmin!
      .from('staff_ratings')
      .delete()
      .or(`staff_id.eq.${targetNewGmail},staff_id.eq.${targetOldGmail}`);

    if (ratingIds.length > 0) {
      const staffRatingsInsert = ratingIds.map(ratingId => ({
        staff_id: targetNewGmail,
        rating_id: ratingId
      }));

      const { error: ratingErr } = await supabaseAdmin!
        .from('staff_ratings')
        .insert(staffRatingsInsert);

      if (ratingErr) {
        console.warn(`[actions/personnel] Warning updating staff ratings:`, ratingErr.message);
      }
    }

    // 3. Recalculate shift rotation pattern for future shifts if group/subgroup/role changed
    const { data: staffShifts } = await supabaseAdmin!
      .from('shifts')
      .select('id, date, shift_code')
      .eq('staff_id', targetNewGmail);

    if (staffShifts && staffShifts.length > 0) {
      const isManager = role_level === 'Manager Teknik';
      const leaveCodes = ['CUTI', 'DINAS LUAR', 'DIKLAT', 'SAKIT'];

      for (const shift of staffShifts) {
        const currentCode = (shift.shift_code || '').toUpperCase();
        if (leaveCodes.includes(currentCode)) continue; // Keep approved leaves intact

        const dateObj = new Date(shift.date);
        const dayOfWeek = dateObj.getDay();

        let newShiftCode = 'L';
        if (isManager) {
          newShiftCode = (dayOfWeek === 0 || dayOfWeek === 6) ? 'L' : 'D';
        } else {
          newShiftCode = getRotationShiftCode(sub_group, group as StaffGroup, shift.date);
        }

        if (newShiftCode !== currentCode) {
          await supabaseAdmin!
            .from('shifts')
            .update({ shift_code: newShiftCode, group })
            .eq('id', shift.id);
        }
      }
    }

    // 3. Audit log
    await supabaseAdmin!
      .from('audit_log')
      .insert({
        actor_id: 'Manager Teknik',
        action: 'UPDATE_PERSONNEL',
        entity: 'staff',
        entity_id: id,
        metadata: { name, group, sub_group, role_level, rating_count: ratingIds.length }
      });

    revalidatePath('/');
    return { success: true };
  } catch (err: any) {
    console.error('[actions/personnel] Error updating personnel:', err);
    return { success: false, error: err.message || 'Gagal mengubah data personel.' };
  }
}

/**
 * Server Action: Assign/promote a personnel to Manager Teknik.
 */
export async function assignManager(staffId: string) {
  console.log(`[actions/personnel] Promoting staff ${staffId} to Manager Teknik`);

  try {
    // 1. Demote any current Manager Teknik to Senior Teknisi
    const { data: currentManagers } = await supabaseAdmin!
      .from('staff')
      .select('id')
      .eq('role_level', 'Manager Teknik');

    if (currentManagers && currentManagers.length > 0) {
      for (const mgr of currentManagers) {
        if (mgr.id !== staffId) {
          await supabaseAdmin!
            .from('staff')
            .update({
              role_level: 'Senior Teknisi',
              sub_group: 'Grup 1'
            })
            .eq('id', mgr.id);

          // Recalculate shift records for demoted manager (Grup 1 rotation)
          const { data: demotedShifts } = await supabaseAdmin!
            .from('shifts')
            .select('id, date, shift_code')
            .eq('staff_id', mgr.id);

          if (demotedShifts) {
            const leaveCodes = ['CUTI', 'DINAS LUAR', 'DIKLAT', 'SAKIT'];
            const pattern = ['L', 'P', 'S', 'M', 'Y'];
            for (const s of demotedShifts) {
              if (leaveCodes.includes((s.shift_code || '').toUpperCase())) continue;
              const daysFromAnchor = Math.abs(getDaysDiff('2025-01-01', s.date));
              const newCode = pattern[daysFromAnchor % pattern.length];
              if (newCode !== s.shift_code) {
                await supabaseAdmin!.from('shifts').update({ shift_code: newCode }).eq('id', s.id);
              }
            }
          }
        }
      }
    }

    // 2. Update target staff member to Manager Teknik & Management subgroup
    const { error: promoteErr } = await supabaseAdmin!
      .from('staff')
      .update({
        role_level: 'Manager Teknik',
        sub_group: 'Management'
      })
      .eq('id', staffId);

    if (promoteErr) {
      throw new Error(`Gagal memperbarui peran Manager Teknik: ${promoteErr.message}`);
    }

    // Recalculate shift records for new Manager Teknik (D on weekdays, L on weekends)
    const { data: newManagerShifts } = await supabaseAdmin!
      .from('shifts')
      .select('id, date, shift_code')
      .eq('staff_id', staffId);

    if (newManagerShifts) {
      const leaveCodes = ['CUTI', 'DINAS LUAR', 'DIKLAT', 'SAKIT'];
      for (const s of newManagerShifts) {
        if (leaveCodes.includes((s.shift_code || '').toUpperCase())) continue;
        const dayOfWeek = new Date(s.date).getDay();
        const newCode = (dayOfWeek === 0 || dayOfWeek === 6) ? 'L' : 'D';
        if (newCode !== s.shift_code) {
          await supabaseAdmin!.from('shifts').update({ shift_code: newCode }).eq('id', s.id);
        }
      }
    }

    // 3. Audit log
    await supabaseAdmin!
      .from('audit_log')
      .insert({
        actor_id: 'System',
        action: 'ASSIGN_MANAGER',
        entity: 'staff',
        entity_id: staffId,
        metadata: { promoted_to: 'Manager Teknik', timestamp: new Date().toISOString() }
      });

    revalidatePath('/');
    return { success: true };
  } catch (err: any) {
    console.error('[actions/personnel] Error assigning manager:', err);
    return { success: false, error: err.message || 'Gagal menetapkan Manager Teknik baru.' };
  }
}

/**
 * Server Action: Delete a personnel member and associated records.
 */
export async function deletePersonnel(staffId: string) {
  console.log(`[actions/personnel] Deleting personnel ${staffId}`);

  try {
    // 1. Delete linked staff_ratings
    await supabaseAdmin!
      .from('staff_ratings')
      .delete()
      .eq('staff_id', staffId);

    // 2. Delete linked gap_events referencing this staff's shifts
    const { data: staffShifts } = await supabaseAdmin!
      .from('shifts')
      .select('id')
      .eq('staff_id', staffId);

    if (staffShifts && staffShifts.length > 0) {
      const shiftIds = staffShifts.map(s => s.id);
      await supabaseAdmin!
        .from('gap_events')
        .delete()
        .in('shift_id', shiftIds);
    }

    // 3. Delete linked shifts
    await supabaseAdmin!
      .from('shifts')
      .delete()
      .eq('staff_id', staffId);

    // 3. Delete from staff table
    const { error: deleteErr } = await supabaseAdmin!
      .from('staff')
      .delete()
      .eq('id', staffId);

    if (deleteErr) {
      throw new Error(`Gagal menghapus personel: ${deleteErr.message}`);
    }

    // 4. Audit log
    await supabaseAdmin!
      .from('audit_log')
      .insert({
        actor_id: 'Manager Teknik',
        action: 'DELETE_PERSONNEL',
        entity: 'staff',
        entity_id: staffId
      });

    revalidatePath('/');
    return { success: true };
  } catch (err: any) {
    console.error('[actions/personnel] Error deleting personnel:', err);
    return { success: false, error: err.message || 'Gagal menghapus personel.' };
  }
}
