'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

if (!supabaseAdmin) {
  throw new Error('Supabase Admin client must be initialized on the server (requires SUPABASE_SERVICE_ROLE_KEY)');
}

interface GenerateRosterParams {
  year: number;
  month: number; // 1-12 (1 = January, 8 = August)
  actorId?: string;
}

/**
 * Server Action to auto-generate initial monthly shift roster projections for future months.
 */
export async function generateMonthlyRoster({
  year,
  month,
  actorId = 'Manager Teknik'
}: GenerateRosterParams) {
  console.log(`[actions/generator] Generating monthly roster for ${year}-${month.toString().padStart(2, '0')}`);

  try {
    // 1. Calculate number of days in target month
    const totalDays = new Date(year, month, 0).getDate();
    const formattedMonth = month.toString().padStart(2, '0');
    const startDate = `${year}-${formattedMonth}-01`;
    const endDate = `${year}-${formattedMonth}-${totalDays.toString().padStart(2, '0')}`;

    // 2. Check if shifts already exist for this month
    const { count, error: countErr } = await supabaseAdmin!
      .from('shifts')
      .select('id', { count: 'exact', head: true })
      .gte('date', startDate)
      .lte('date', endDate);

    if (countErr) {
      throw new Error(`Failed to check existing shifts: ${countErr.message}`);
    }

    if (count && count > 0) {
      return { 
        success: false, 
        error: `Jadwal shift untuk bulan ${formattedMonth}/${year} sudah tersedia (${count} shift).` 
      };
    }

    // 3. Fetch all staff members
    const { data: staffList, error: staffErr } = await supabaseAdmin!
      .from('staff')
      .select('*')
      .order('id');

    if (staffErr || !staffList || staffList.length === 0) {
      throw new Error(`Failed to fetch staff members: ${staffErr?.message}`);
    }

    // 4. Shift rotation patterns for 5 subgroups
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

    // 5. Generate shifts for every staff member for days 1 to totalDays
    const shiftsToInsert: any[] = [];

    for (const staff of staffList) {
      const isManager = staff.role_level === 'Manager Teknik';

      for (let day = 1; day <= totalDays; day++) {
        const dateStr = `${year}-${formattedMonth}-${day.toString().padStart(2, '0')}`;
        const dayOfWeek = new Date(year, month - 1, day).getDay(); // 0 = Sun, 6 = Sat

        let shiftCode = 'L';

        if (isManager) {
          // Manager Teknik: Fixed office hours D Monday-Friday, L Saturday-Sunday
          shiftCode = (dayOfWeek === 0 || dayOfWeek === 6) ? 'L' : 'D';
        } else if (staff.group === 'CNS') {
          const pattern = cnsPatterns[staff.sub_group] || ['P', 'S', 'M', 'Y', 'L'];
          shiftCode = pattern[(day - 1) % pattern.length];
        } else if (staff.group === 'ESS') {
          const pattern = essPatterns[staff.sub_group] || ['M', 'Y', 'L', 'PS', 'P'];
          shiftCode = pattern[(day - 1) % pattern.length];
        }

        shiftsToInsert.push({
          staff_id: staff.id,
          date: dateStr,
          shift_code: shiftCode,
          group: staff.group,
          status: 'Filled'
        });
      }
    }

    // 6. Insert in chunks of 100 to prevent payload timeout
    const chunkSize = 100;
    for (let i = 0; i < shiftsToInsert.length; i += chunkSize) {
      const chunk = shiftsToInsert.slice(i, i + chunkSize);
      const { error: insertErr } = await supabaseAdmin!
        .from('shifts')
        .insert(chunk);

      if (insertErr) {
        throw new Error(`Failed to insert shift chunk ${i}: ${insertErr.message}`);
      }
    }

    // 7. Audit log record
    await supabaseAdmin!
      .from('audit_log')
      .insert({
        actor_id: actorId,
        action: 'GENERATE_MONTHLY_ROSTER',
        entity: 'shifts',
        entity_id: `${year}-${formattedMonth}`,
        metadata: {
          year,
          month,
          total_days: totalDays,
          total_staff: staffList.length,
          shifts_created: shiftsToInsert.length,
          timestamp: new Date().toISOString()
        }
      });

    revalidatePath('/');
    return { 
      success: true, 
      totalShifts: shiftsToInsert.length, 
      monthName: `${formattedMonth}/${year}` 
    };
  } catch (error: any) {
    console.error('[actions/generator] Error generating roster:', error);
    return { success: false, error: error.message || 'Gagal membuat jadwal bulanan.' };
  }
}
