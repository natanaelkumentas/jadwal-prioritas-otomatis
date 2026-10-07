import { getShiftHoursWindow, getShiftInfo, StaffGroup } from './shift-codes';
import { supabaseAdmin } from './supabase';

/**
 * Checks whether Google Service Account credentials are configured in environment.
 */
export function isGoogleCalendarConfigured(): boolean {
  return !!(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  );
}

/**
 * Returns authenticated Google Calendar client using Service Account credentials.
 */
async function getCalendarClient() {
  if (!isGoogleCalendarConfigured()) {
    throw new Error(
      'Kredensial Google Service Account belum dikonfigurasi di .env (GOOGLE_SERVICE_ACCOUNT_EMAIL dan GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY).'
    );
  }

  let google: any;
  try {
    const googleapis = await import('googleapis');
    google = googleapis.google;
  } catch {
    throw new Error(
      'Paket "googleapis" belum terinstal. Silakan jalankan: npm install googleapis'
    );
  }

  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  // Handle escaped \n characters in private key string
  const privateKey = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n');

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/calendar']
  });

  return google.calendar({ version: 'v3', auth });
}

export interface ShiftCalendarEventData {
  shiftId: string;
  staffName: string;
  staffGmail: string;
  group: StaffGroup;
  shiftCode: string;
  dateStr: string; // YYYY-MM-DD
}

/**
 * Builds Google Calendar event parameters for a single shift.
 */
export function buildShiftEventPayload(data: ShiftCalendarEventData) {
  const codeInfo = getShiftInfo(data.shiftCode);
  const hoursWindow = getShiftHoursWindow(data.shiftCode, data.group);

  // Timezone: WITA (Asia/Makassar, UTC+8)
  const timeZone = 'Asia/Makassar';

  if (!hoursWindow) {
    // Non-timed or all-day (e.g. Leave or Off)
    return {
      summary: `[${data.shiftCode}] ${codeInfo.label} - ${data.staffName}`,
      description: `Jadwal ${codeInfo.label} (${data.group})\nPersonel: ${data.staffName} (${data.staffGmail})\nStatus: ${codeInfo.description}`,
      start: { date: data.dateStr },
      end: { date: data.dateStr }
    };
  }

  const startHour = Math.floor(hoursWindow.start);
  const startMin = Math.round((hoursWindow.start - startHour) * 60);

  const endHourRaw = hoursWindow.end;
  const isNextDay = endHourRaw >= 24;
  const endHour = Math.floor(isNextDay ? endHourRaw - 24 : endHourRaw);
  const endMin = Math.round((endHourRaw - Math.floor(endHourRaw)) * 60);

  const [year, month, day] = data.dateStr.split('-').map(Number);
  const startDate = new Date(Date.UTC(year, month - 1, day, startHour - 8, startMin)); // Adjust for UTC+8

  let endDate: Date;
  if (isNextDay) {
    endDate = new Date(Date.UTC(year, month - 1, day + 1, endHour - 8, endMin));
  } else {
    endDate = new Date(Date.UTC(year, month - 1, day, endHour - 8, endMin));
  }

  return {
    summary: `[Shift ${data.shiftCode}] Dinas Operasional ${data.group} - ${data.staffName}`,
    description: `Dinas Operasional ${codeInfo.label} (${data.group})\nPersonel: ${data.staffName}\nEmail: ${data.staffGmail}\nDurasi: ${codeInfo.hours[data.group]} jam\nJam Operasional: ${codeInfo.time[data.group]}`,
    start: {
      dateTime: startDate.toISOString(),
      timeZone
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 120 }, // 2 hours before duty
        { method: 'popup', minutes: 30 }   // 30 mins before duty
      ]
    }
  };
}

/**
 * Creates or updates an event in Google Calendar for a given shift.
 */
export async function syncShiftToGoogleCalendar(data: ShiftCalendarEventData) {
  if (!isGoogleCalendarConfigured()) {
    return {
      success: false,
      configured: false,
      error: 'Google Service Account belum dikonfigurasi di environment.'
    };
  }

  try {
    const calendar = await getCalendarClient();
    const eventBody = buildShiftEventPayload(data);

    // Check if event was already synced previously
    const { data: existingSync } = await supabaseAdmin!
      .from('calendar_sync_events')
      .select('google_event_id')
      .eq('shift_id', data.shiftId)
      .maybeSingle();

    let eventId = existingSync?.google_event_id;

    const targetCalendarId = data.staffGmail;

    if (eventId) {
      // Update existing Google Calendar event
      const res = await calendar.events.update({
        calendarId: targetCalendarId,
        eventId,
        requestBody: eventBody
      });
      eventId = res.data.id;
    } else {
      // Create new Google Calendar event
      const res = await calendar.events.insert({
        calendarId: targetCalendarId,
        requestBody: eventBody
      });
      eventId = res.data.id;

      if (eventId) {
        await supabaseAdmin!.from('calendar_sync_events').upsert({
          shift_id: data.shiftId,
          google_event_id: eventId,
          staff_gmail: data.staffGmail,
          synced_at: new Date().toISOString()
        });
      }
    }

    return { success: true, eventId };
  } catch (err: any) {
    console.error(`[google-calendar] Error syncing shift ${data.shiftId}:`, err);

    const errMsg = err?.message || '';
    if (errMsg.includes('Not Found') || err?.code === 404 || err?.status === 404 || errMsg.includes('notFound')) {
      return {
        success: false,
        error: `Kalender "${data.staffGmail}" belum dibagikan ke bot. Di Google Calendar ${data.staffGmail}, buka Settings kalender > "Share with specific people" > tambahkan email Service Account dengan izin "Make changes to events".`
      };
    }

    return { success: false, error: err.message };
  }
}

/**
 * Deletes a calendar event when a shift is cleared or deleted.
 */
export async function deleteShiftFromGoogleCalendar(shiftId: string) {
  if (!isGoogleCalendarConfigured()) return { success: false };

  try {
    const { data: existingSync } = await supabaseAdmin!
      .from('calendar_sync_events')
      .select('google_event_id, staff_gmail')
      .eq('shift_id', shiftId)
      .maybeSingle();

    if (!existingSync?.google_event_id) return { success: true };

    const calendar = await getCalendarClient();
    const targetCalendarId = existingSync.staff_gmail || 'primary';

    await calendar.events.delete({
      calendarId: targetCalendarId,
      eventId: existingSync.google_event_id
    });

    await supabaseAdmin!
      .from('calendar_sync_events')
      .delete()
      .eq('shift_id', shiftId);

    return { success: true };
  } catch (err: any) {
    console.error(`[google-calendar] Error deleting calendar event for shift ${shiftId}:`, err);
    return { success: false, error: err.message };
  }
}
