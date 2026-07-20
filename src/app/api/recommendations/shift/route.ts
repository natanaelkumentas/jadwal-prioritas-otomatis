import { NextRequest, NextResponse } from 'next/server';
import { getShiftReplacementRecommendations } from '@/lib/scheduler-engine';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shiftId = searchParams.get('shift_id');

    if (!shiftId) {
      return NextResponse.json(
        { error: 'Missing shift_id parameter' },
        { status: 400 }
      );
    }

    console.log(`[api/recommendations/shift] Fetching replacements for shift: ${shiftId}`);
    const recommendations = await getShiftReplacementRecommendations(shiftId);
    return NextResponse.json(recommendations);
  } catch (error: any) {
    console.error('[api/recommendations/shift] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
export const dynamic = 'force-dynamic';
