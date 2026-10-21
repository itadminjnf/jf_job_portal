import { NextRequest, NextResponse } from 'next/server';
import { uploadOtysFileRaw } from '@/lib/api';
import { loginOws, uploadFileToOws, logoutOws } from '@/lib/otys-ows';

export const dynamic = 'force-dynamic';

/**
 * POST /api/files
 * Uploads a file to BOTH:
 * 1. OTYS REST /files endpoint (for the dynamic questionnaire answer ID)
 * 2. OTYS OWS fileService.php (for binding directly to candidate dossier in OTYS Go!)
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

    const fileName = file.name || 'resume.pdf';

    // 1. Upload to OTYS REST endpoint
    const otysResponse = await uploadOtysFileRaw(file, fileName);
    console.log('[OTYS REST File Upload Response]:', JSON.stringify(otysResponse));

    // 2. Upload to OWS fileService.php for Dossier binding (Page 37 of OWS Manual)
    let owsFileUid: string | null = null;
    try {
      const sessionToken = await loginOws();
      try {
        owsFileUid = await uploadFileToOws(sessionToken, file, fileName);
        console.log('[OTYS OWS File Upload OUID]:', owsFileUid);
      } finally {
        await logoutOws(sessionToken);
      }
    } catch (owsErr) {
      console.warn('[OTYS OWS Upload Warning (non-fatal)]:', owsErr);
    }

    let restId = '';
    if (Array.isArray(otysResponse) && otysResponse[0]?.id) {
      restId = String(otysResponse[0].id);
    } else if (otysResponse && typeof otysResponse === 'object' && (otysResponse as any).id) {
      restId = String((otysResponse as any).id);
    }

    const mergedResponse = {
      ...(typeof otysResponse === 'object' && otysResponse !== null ? otysResponse : {}),
      id: restId || owsFileUid || '',
      owsFileUid: owsFileUid || null,
      name: fileName,
    };

    return NextResponse.json(mergedResponse, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[POST /api/files Error]:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

