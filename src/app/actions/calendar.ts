'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { isGoogleCalendarConfigured, syncShiftToGoogleCalendar } from '@/lib/google-calendar';
import { StaffGroup } from '@/lib/shift-codes';

/**
 * Server Action: Sync all filled working shifts for a month to personnel's Google Calendar.
 */
export async function syncMonthScheduleToGoogleCalendar(year: number, month: number) {
  if (!supabaseAdmin) {
    return { success: false, error: 'Database service role client not initialized.' };
  }

  if (!isGoogleCalendarConfigured()) {
    return {
      success: false,
      configured: false,
      error: 'Google Service Account belum dikonfigurasi di file .env (GOOGLE_SERVICE_ACCOUNT_EMAIL dan GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY).'
    };
  }

  try {
    const totalDays = new Date(year, month, 0).getDate();
    const formattedMonth = month.toString().padStart(2, '0');
    const startDate = `${year}-${formattedMonth}-01`;
    const endDate = `${year}-${formattedMonth}-${totalDays.toString().padStart(2, '0')}`;

    // 1. Fetch staff directory for Gmail lookups
    const { data: staffList, error: staffErr } = await supabaseAdmin!
      .from('staff')
      .select('gmail, id, name, "group"');

    if (staffErr) throw staffErr;

    const staffMap = new Map<string, { name: string; gmail: string; group: StaffGroup }>();
    (staffList || []).forEach((s: any) => {
      const email = s.gmail || s.id;
      staffMap.set(email, { name: s.name, gmail: email, group: s.group as StaffGroup });
      if (s.id && s.id !== email) {
        staffMap.set(s.id, { name: s.name, gmail: email, group: s.group as StaffGroup });
      }
    });

    // 2. Fetch filled working shifts for this month
    const { data: shifts, error: shiftsErr } = await supabaseAdmin!
      .from('shifts')
      .select('id, staff_id, date, shift_code, "group", status')
      .gte('date', startDate)
      .lte('date', endDate)
      .eq('status', 'Filled')
      .not('staff_id', 'is', null);

    if (shiftsErr) throw shiftsErr;

    if (!shifts || shifts.length === 0) {
      return { success: true, synced: 0, message: 'Tidak ada shift terisi pada bulan ini.' };
    }

    // Filter out off/leave shifts (L, Y, CUTI, etc.) unless desirable
    const workShifts = shifts.filter(s => !['L', 'Y'].includes((s.shift_code || '').toUpperCase()));

    let syncedCount = 0;
    let failedCount = 0;

    for (const shift of workShifts) {
      const staffInfo = shift.staff_id ? staffMap.get(shift.staff_id) : null;
      if (!staffInfo || !staffInfo.gmail || !staffInfo.gmail.includes('@')) {
        continue;
      }

      const res = await syncShiftToGoogleCalendar({
        shiftId: shift.id,
        staffName: staffInfo.name,
        staffGmail: staffInfo.gmail,
        group: (shift.group as StaffGroup) || staffInfo.group,
        shiftCode: shift.shift_code,
        dateStr: shift.date
      });

      if (res.success) {
        syncedCount++;
      } else {
        failedCount++;
      }
    }

    return {
      success: true,
      configured: true,
      synced: syncedCount,
      failed: failedCount,
      total: workShifts.length
    };
  } catch (err: any) {
    console.error('[actions/calendar] Error syncing month schedule:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Server Action: Test sync specifically for natanaelkumentas11@gmail.com.
 * If a staff profile with this email exists, syncs their working shifts for this month.
 * If not, takes a sample working shift from the month to test-fire an event to natanaelkumentas11@gmail.com.
 */
export async function testSyncGoogleCalendar(
  year: number,
  month: number,
  targetEmail: string = 'natanaelkumentas11@gmail.com'
) {
  if (!supabaseAdmin) {
    return { success: false, error: 'Database service role client not initialized.' };
  }

  if (!isGoogleCalendarConfigured()) {
    return {
      success: false,
      configured: false,
      error: 'Google Service Account belum dikonfigurasi di file .env (GOOGLE_SERVICE_ACCOUNT_EMAIL dan GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY).'
    };
  }

  try {
    const totalDays = new Date(year, month, 0).getDate();
    const formattedMonth = month.toString().padStart(2, '0');
    const startDate = `${year}-${formattedMonth}-01`;
    const endDate = `${year}-${formattedMonth}-${totalDays.toString().padStart(2, '0')}`;
    const cleanEmail = targetEmail.trim().toLowerCase();

    // 1. Fetch staff directory
    const { data: staffList, error: staffErr } = await supabaseAdmin!
      .from('staff')
      .select('gmail, id, name, "group"');

    if (staffErr) throw staffErr;

    const matchedStaff = (staffList || []).find(
      (s: any) => (s.gmail || '').trim().toLowerCase() === cleanEmail
    );

    let shiftsToSync: Array<{
      id: string;
      staff_id: string;
      staffName: string;
      staffGmail: string;
      group: StaffGroup;
      shiftCode: string;
      dateStr: string;
    }> = [];

    if (matchedStaff) {
      // Fetch filled working shifts for matched staff
      const { data: shifts, error: shiftsErr } = await supabaseAdmin!
        .from('shifts')
        .select('id, staff_id, date, shift_code, "group", status')
        .eq('staff_id', matchedStaff.id || matchedStaff.gmail)
        .gte('date', startDate)
        .lte('date', endDate)
        .eq('status', 'Filled');

      if (shiftsErr) throw shiftsErr;

      const workShifts = (shifts || []).filter(s => !['L', 'Y'].includes((s.shift_code || '').toUpperCase()));

      if (workShifts.length > 0) {
        shiftsToSync = workShifts.map(s => ({
          id: s.id,
          staff_id: s.staff_id,
          staffName: matchedStaff.name,
          staffGmail: cleanEmail,
          group: (s.group as StaffGroup) || matchedStaff.group,
          shiftCode: s.shift_code,
          dateStr: s.date
        }));
      } else {
        // If matched staff doesn't have shifts scheduled in this month, use 1 sample shift to test delivery
        const { data: sampleShifts } = await supabaseAdmin!
          .from('shifts')
          .select('id, staff_id, date, shift_code, "group", status')
          .gte('date', startDate)
          .lte('date', endDate)
          .eq('status', 'Filled')
          .not('staff_id', 'is', null)
          .limit(10);

        const validShift = (sampleShifts || []).find(s => !['L', 'Y'].includes((s.shift_code || '').toUpperCase()));

        if (validShift) {
          shiftsToSync = [{
            id: validShift.id,
            staff_id: validShift.staff_id,
            staffName: `[Uji Coba] ${matchedStaff.name}`,
            staffGmail: cleanEmail,
            group: (validShift.group as StaffGroup) || matchedStaff.group,
            shiftCode: validShift.shift_code,
            dateStr: validShift.date
          }];
        } else {
          return {
            success: false,
            targetEmail: cleanEmail,
            error: `Belum ada shift terisi pada bulan ${month}/${year}. Buat jadwal terlebih dahulu.`
          };
        }
      }
    } else {
      // If no staff with that email, use the first available active working shift to test Calendar API
      const { data: sampleShifts, error: sampleErr } = await supabaseAdmin!
        .from('shifts')
        .select('id, staff_id, date, shift_code, "group", status')
        .gte('date', startDate)
        .lte('date', endDate)
        .eq('status', 'Filled')
        .not('staff_id', 'is', null)
        .limit(10);

      if (sampleErr) throw sampleErr;

      const validShift = (sampleShifts || []).find(s => !['L', 'Y'].includes((s.shift_code || '').toUpperCase()));

      if (!validShift) {
        return {
          success: false,
          targetEmail: cleanEmail,
          error: `Belum ada shift terisi pada bulan ${month}/${year}. Buat jadwal terlebih dahulu sebelum menguji.`
        };
      }

      const dummyStaff = (staffList || []).find((s: any) => s.id === validShift.staff_id);

      shiftsToSync = [{
        id: validShift.id,
        staff_id: validShift.staff_id,
        staffName: dummyStaff?.name ? `[Uji Coba] ${dummyStaff.name}` : `[Uji Coba] Shift Personel`,
        staffGmail: cleanEmail,
        group: (validShift.group as StaffGroup) || 'CNS',
        shiftCode: validShift.shift_code,
        dateStr: validShift.date
      }];
    }

    let syncedCount = 0;
    let failedCount = 0;
    let lastError = '';

    for (const item of shiftsToSync) {
      const res = await syncShiftToGoogleCalendar({
        shiftId: item.id,
        staffName: item.staffName,
        staffGmail: item.staffGmail,
        group: item.group,
        shiftCode: item.shiftCode,
        dateStr: item.dateStr
      });

      if (res.success) {
        syncedCount++;
      } else {
        failedCount++;
        lastError = res.error || '';
      }
    }

    if (syncedCount > 0) {
      return {
        success: true,
        configured: true,
        synced: syncedCount,
        failed: failedCount,
        targetEmail: cleanEmail,
        message: `Berhasil menguji sinkronisasi ${syncedCount} shift ke ${cleanEmail}!`
      };
    } else {
      return {
        success: false,
        configured: true,
        targetEmail: cleanEmail,
        error: lastError || `Gagal menyinkronkan shift ke ${cleanEmail}.`
      };
    }
  } catch (err: any) {
    console.error('[actions/calendar] Error in testSyncGoogleCalendar:', err);
    return { success: false, error: err.message, targetEmail };
  }
}
