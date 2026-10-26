import { NextResponse } from 'next/server';
import { getOpenApplicationForm } from '@/lib/api';

export const dynamic = 'force-dynamic';

/**
 * GET /api/open_application
 * Retrieves the open application form structure from OTYS API.
 */
export async function GET() {
  try {
    const formDef = await getOpenApplicationForm();
    return NextResponse.json(formDef, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve open application form';
    console.error('[GET /api/open_application Error]:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
