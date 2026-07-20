import { NextRequest, NextResponse } from 'next/server';
import { getReplacementRecommendations } from '@/lib/scheduler-engine';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gapEventId = searchParams.get('gap_event_id');

    if (!gapEventId) {
      return NextResponse.json(
        { error: 'Missing gap_event_id parameter' },
        { status: 400 }
      );
    }

    console.log(`[api/recommendations] Fetching replacements for gap: ${gapEventId}`);
    const recommendations = await getReplacementRecommendations(gapEventId);
    return NextResponse.json(recommendations);
  } catch (error: any) {
    console.error('[api/recommendations] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
export const dynamic = 'force-dynamic';
