import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function formatIcsDateTime(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Calculate UTC start and end Date for a given shift code and date string (YYYY-MM-DD)
 * Local timezone is WITA (UTC+8)
 */
function getShiftUtcDates(dateStr: string, shiftCode: string): { start: Date; end: Date } | null {
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1; // 0-indexed
  const day = parseInt(dayStr, 10);

  // Skip off / leave codes
  const upper = shiftCode.toUpperCase().trim();
  if (['L', 'Y', 'OFF'].includes(upper)) {
    return null;
  }

  // Local hours in WITA (UTC+8)
  let startHourWita = 7;
  let startMinWita = 0;
  let endHourWita = 13;
  let endMinWita = 0;
  let isNextDay = false;

  switch (upper) {
    case 'P': // Pagi: 07:00 - 13:00 WITA
      startHourWita = 7;
      endHourWita = 13;
      break;
    case 'S': // Siang: 13:00 - 19:00 WITA
      startHourWita = 13;
      endHourWita = 19;
      break;
    case 'M': // Malam: 19:00 - 07:00 WITA (next day)
      startHourWita = 19;
      endHourWita = 7;
      isNextDay = true;
      break;
    case 'D': // Normal Dinas: 07:30 - 16:30 WITA
    case 'K':
      startHourWita = 7;
      startMinWita = 30;
      endHourWita = 16;
      endMinWita = 30;
      break;
    case 'OH': // On Call / Overhaul
      startHourWita = 8;
      endHourWita = 17;
      break;
    default:
      startHourWita = 7;
      endHourWita = 15;
      break;
  }

  // Convert WITA (UTC+8) to UTC by subtracting 8 hours
  const startUtc = new Date(Date.UTC(year, month, day, startHourWita - 8, startMinWita));
  const endUtc = new Date(Date.UTC(year, month, day + (isNextDay ? 1 : 0), endHourWita - 8, endMinWita));

  return { start: startUtc, end: endUtc };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { staffId: string } }
) {
  try {
    let identifier = params.staffId || '';
    // Strip trailing .ics
    identifier = identifier.replace(/\.ics$/i, '');
    identifier = decodeURIComponent(identifier).trim();

    if (!identifier) {
      return new NextResponse('Staff identifier or email is required', { status: 400 });
    }

    // 1. Find staff by gmail (email) or name
    const { data: staffList, error: staffErr } = await supabaseAdmin!
      .from('staff')
      .select('gmail, name, group, sub_group, role_level, location');

    if (staffErr || !staffList || staffList.length === 0) {
      return new NextResponse('Database connection error or no staff found', { status: 500 });
    }

    const targetStaff = staffList.find(
      (s: any) =>
        (s.gmail && s.gmail.toLowerCase() === identifier.toLowerCase()) ||
        (s.name && s.name.toLowerCase() === identifier.toLowerCase())
    );

    if (!targetStaff) {
      return new NextResponse(`Personel dengan email/ID "${identifier}" tidak ditemukan.`, {
        status: 404,
      });
    }

    // 2. Query shifts strictly filtered by staff_id = targetStaff.gmail
    const now = new Date();
    const pastWindow = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const futureWindow = new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data: shifts, error: shiftsErr } = await supabaseAdmin!
      .from('shifts')
      .select('id, date, shift_code, group, status')
      .eq('staff_id', targetStaff.gmail)
      .eq('status', 'Filled')
      .gte('date', pastWindow)
      .lte('date', futureWindow)
      .order('date', { ascending: true });

    if (shiftsErr) {
      return new NextResponse('Gagal mengambil jadwal dinas', { status: 500 });
    }

    // 3. Build RFC 5545 iCalendar stream
    const dtstamp = formatIcsDateTime(new Date());
    const calName = `Jadwal Dinas - ${targetStaff.name}`;

    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//AirNav Indonesia//SAPS Manado 2026//ID',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${calName}`,
      'X-WR-TIMEZONE:Asia/Makassar',
      'REFRESH-INTERVAL;VALUE=DURATION:PT2H',
      'X-PUBLISHED-TTL:PT2H',
    ];

    for (const shift of shifts || []) {
      const dates = getShiftUtcDates(shift.date, shift.shift_code);
      if (!dates) continue; // Skip off days

      const uid = `shift-${shift.id}@saps.airnav.co.id`;
      const startStr = formatIcsDateTime(dates.start);
      const endStr = formatIcsDateTime(dates.end);

      let shiftTitle = `Shift ${shift.shift_code}`;
      if (shift.shift_code === 'P') shiftTitle = 'Shift Pagi (07:00 - 13:00)';
      if (shift.shift_code === 'S') shiftTitle = 'Shift Siang (13:00 - 19:00)';
      if (shift.shift_code === 'M') shiftTitle = 'Shift Malam (19:00 - 07:00)';
      if (shift.shift_code === 'D') shiftTitle = 'Dinas Normal (07:30 - 16:30)';

      const summary = `[${shift.shift_code}] Dinas Operasional ${targetStaff.group}`;
      const description = `Personel: ${targetStaff.name}\\nUnit: ${targetStaff.group} (Subgrup ${targetStaff.sub_group})\\nJadwal: ${shiftTitle}\\nLokasi: AirNav Cabang Manado\\nStatus: Resmi Terjadwal`;
      const location = 'AirNav Indonesia Cabang Manado (Unit Teknik ATS)';

      lines.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART:${startStr}`,
        `DTEND:${endStr}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${description}`,
        `LOCATION:${location}`,
        'STATUS:CONFIRMED',
        'BEGIN:VALARM',
        'TRIGGER:-PT2H',
        'ACTION:DISPLAY',
        `DESCRIPTION:Pengingat 2 Jam Sebelum Dinas: ${summary}`,
        'END:VALARM',
        'BEGIN:VALARM',
        'TRIGGER:-PT30M',
        'ACTION:DISPLAY',
        `DESCRIPTION:Pengingat 30 Menit Sebelum Dinas: ${summary}`,
        'END:VALARM',
        'END:VEVENT'
      );
    }

    lines.push('END:VCALENDAR');

    const icsContent = lines.join('\r\n');

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `inline; filename="${encodeURIComponent(targetStaff.gmail)}.ics"`,
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (err: any) {
    console.error('[API/calendar] Error:', err);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
