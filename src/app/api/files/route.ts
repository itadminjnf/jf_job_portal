import { NextRequest, NextResponse } from 'next/server';
import { uploadOtysFileRaw } from '@/lib/api';

export const dynamic = 'force-dynamic';

/**
 * POST /api/files
 * Uploads a file to OTYS file resource and returns its generated file resource response.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file || !(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: 'A valid file is required in multipart form data.' },
        { status: 400 }
      );
    }

    const otysResponse = await uploadOtysFileRaw(file, file.name || 'resume.pdf');
    console.log('[OTYS File Upload Response]:', JSON.stringify(otysResponse));

    return NextResponse.json(otysResponse, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[POST /api/files Error]:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
