'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

import { Staff } from '@/lib/scheduler-engine/types';
import { getDaysDiff } from '@/lib/scheduler-engine/filters';

if (!supabaseAdmin) {
  throw new Error('Supabase Admin client must be initialized on the server (requires SUPABASE_SERVICE_ROLE_KEY)');
}

interface PersonnelPayload {
  id: string;
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
      .order('id', { ascending: true });

    if (error) throw error;

    const staff: Staff[] = (staffData || []).map((s: any) => ({
      id: s.id,
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
  console.log(`[actions/personnel] Creating new personnel ${id} - ${name}`);

  try {
    // 1. Check ID uniqueness
    const { count, error: checkErr } = await supabaseAdmin!
      .from('staff')
      .select('id', { count: 'exact', head: true })
      .eq('id', id);

    if (checkErr) {
      throw new Error(`Failed to check existing ID: ${checkErr.message}`);
    }

    if (count && count > 0) {
      return { success: false, error: `ID Personel "${id}" sudah digunakan. Gunakan ID lain.` };
    }

    // 2. Insert into staff table
    const { error: insertErr } = await supabaseAdmin!
      .from('staff')
      .insert({
        id: id.trim().toUpperCase(),
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
    const cleanId = id.trim().toUpperCase();
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
    const cnsPatterns: Record<string, string[]> = {
      'Grup 1': ['L', 'P', 'S', 'M', 'Y'],
      'Grup 2': ['P', 'S', 'M', 'Y', 'L'],
      'Grup 3': ['S', 'M', 'Y', 'L', 'P'],
      'Grup 4': ['M', 'Y', 'L', 'P', 'S'],
      'Grup 5': ['Y', 'L', 'P', 'S', 'M']
    };

    const essPatterns: Record<string, string[]> = {
      'ESS Grup 1': ['M', 'Y', 'L', 'PS', 'P'],
      'ESS Grup 2': ['P', 'M', 'Y', 'L', 'PS'],
      'ESS Grup 3': ['PS', 'P', 'M', 'Y', 'L'],
      'ESS Grup 4': ['L', 'PS', 'P', 'M', 'Y'],
      'ESS Grup 5': ['Y', 'L', 'PS', 'P', 'M']
    };

    const { data: existingShiftDates } = await supabaseAdmin!
      .from('shifts')
      .select('date');

    if (existingShiftDates && existingShiftDates.length > 0) {
      const uniqueDates = Array.from(new Set(existingShiftDates.map(d => d.date))).sort();
      const isManager = role_level === 'Manager Teknik';

      const newShiftsToInsert = uniqueDates.map(dateStr => {
        const dateObj = new Date(dateStr);
        const dayOfWeek = dateObj.getDay();
        const daysFromAnchor = Math.abs(getDaysDiff('2025-01-01', dateStr));

        let shiftCode = 'L';
        if (isManager) {
          shiftCode = (dayOfWeek === 0 || dayOfWeek === 6) ? 'L' : 'D';
        } else if (group === 'CNS') {
          const pattern = cnsPatterns[sub_group] || ['P', 'S', 'M', 'Y', 'L'];
          shiftCode = pattern[daysFromAnchor % pattern.length];
        } else if (group === 'ESS') {
          const pattern = essPatterns[sub_group] || ['M', 'Y', 'L', 'PS', 'P'];
          shiftCode = pattern[daysFromAnchor % pattern.length];
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
  name,
  group,
  sub_group,
  role_level,
  location = 'Cabang Manado',
  ratingIds = []
}: PersonnelPayload) {
  console.log(`[actions/personnel] Updating personnel ${id}`);

  try {
    // 1. Update staff table
    const { error: updateErr } = await supabaseAdmin!
      .from('staff')
      .update({
        name: name.trim(),
        group,
        sub_group,
        role_level,
        location
      })
      .eq('id', id);

    if (updateErr) {
      throw new Error(`Gagal memperbarui data personel: ${updateErr.message}`);
    }

    // 2. Sync staff_ratings: Delete existing and insert new
    await supabaseAdmin!
      .from('staff_ratings')
      .delete()
      .eq('staff_id', id);

    if (ratingIds.length > 0) {
      const staffRatingsInsert = ratingIds.map(ratingId => ({
        staff_id: id,
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
    const cnsPatterns: Record<string, string[]> = {
      'Grup 1': ['L', 'P', 'S', 'M', 'Y'],
      'Grup 2': ['P', 'S', 'M', 'Y', 'L'],
      'Grup 3': ['S', 'M', 'Y', 'L', 'P'],
      'Grup 4': ['M', 'Y', 'L', 'P', 'S'],
      'Grup 5': ['Y', 'L', 'P', 'S', 'M']
    };

    const essPatterns: Record<string, string[]> = {
      'ESS Grup 1': ['M', 'Y', 'L', 'PS', 'P'],
      'ESS Grup 2': ['P', 'M', 'Y', 'L', 'PS'],
      'ESS Grup 3': ['PS', 'P', 'M', 'Y', 'L'],
      'ESS Grup 4': ['L', 'PS', 'P', 'M', 'Y'],
      'ESS Grup 5': ['Y', 'L', 'PS', 'P', 'M']
    };

    const { data: staffShifts } = await supabaseAdmin!
      .from('shifts')
      .select('id, date, shift_code')
      .eq('staff_id', id);

    if (staffShifts && staffShifts.length > 0) {
      const isManager = role_level === 'Manager Teknik';
      const leaveCodes = ['CUTI', 'DINAS LUAR', 'DIKLAT', 'SAKIT'];

      for (const shift of staffShifts) {
        const currentCode = (shift.shift_code || '').toUpperCase();
        if (leaveCodes.includes(currentCode)) continue; // Keep approved leaves intact

        const dateObj = new Date(shift.date);
        const dayOfWeek = dateObj.getDay();
        const daysFromAnchor = Math.abs(getDaysDiff('2025-01-01', shift.date));

        let newShiftCode = 'L';
        if (isManager) {
          newShiftCode = (dayOfWeek === 0 || dayOfWeek === 6) ? 'L' : 'D';
        } else if (group === 'CNS') {
          const pattern = cnsPatterns[sub_group] || ['P', 'S', 'M', 'Y', 'L'];
          newShiftCode = pattern[daysFromAnchor % pattern.length];
        } else if (group === 'ESS') {
          const pattern = essPatterns[sub_group] || ['M', 'Y', 'L', 'PS', 'P'];
          newShiftCode = pattern[daysFromAnchor % pattern.length];
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

    // 2. Delete linked shifts (or keep history)
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
