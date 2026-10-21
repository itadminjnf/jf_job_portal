import { NextRequest, NextResponse } from 'next/server';
import {
  getVacancyApplicationForm,
  submitVacancyApplication,
  OtysRawFormResponse,
} from '@/lib/api';
import {
  loginOws,
  logoutOws,
  getOrCreateCandidateOuid,
  attachDocumentToCandidateDossier,
  uploadFileToOws,
} from '@/lib/otys-ows';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{
    vacancyId: string;
  }>;
}

/**
 * Dynamically resolves OTYS question IDs from the vacancy form structure.
 */
function resolveQuestionIds(formDef?: OtysRawFormResponse | null) {
  const result = {
    firstNameId: 'q1356387',
    lastNameId: 'q1356388',
    emailId: 'q1356389',
    phoneId: 'q1356390',
    resumeId: 'q1356391',
    termsId: 'q1356392',
    retentionId: 'q-666',
  };

  if (!formDef || !Array.isArray(formDef.pages)) {
    return result;
  }

  for (const page of formDef.pages) {
    if (!Array.isArray(page.questions)) continue;

    for (const q of page.questions) {
      if (!q || !q.id) continue;
      const qText = (q.question || '').toLowerCase();
      const qType = (q.type || '').toLowerCase();

      if (qType === 'file' || qText.includes('resume') || qText.includes('cv')) {
        result.resumeId = q.id;
      } else if (qText.includes('first name') || qText.includes('voornaam')) {
        result.firstNameId = q.id;
      } else if (qText.includes('last name') || qText.includes('achternaam')) {
        result.lastNameId = q.id;
      } else if (qType === 'email' || qText.includes('email') || qText.includes('e-mail')) {
        result.emailId = q.id;
      } else if (qType === 'tel' || qText.includes('phone') || qText.includes('mobiel') || qText.includes('cell')) {
        result.phoneId = q.id;
      } else if (qType === 'checkbox') {
        const optionLabels = Array.isArray(q.options)
          ? q.options.map((o) => (o.label || '').toLowerCase()).join(' ')
          : '';
        if (
          qText.includes('terms') ||
          optionLabels.includes('terms') ||
          optionLabels.includes('voorwaarden')
        ) {
          result.termsId = q.id;
        } else if (
          q.id === 'q-666' ||
          qText.includes('12 months') ||
          optionLabels.includes('12 months') ||
          optionLabels.includes('store')
        ) {
          result.retentionId = q.id;
        }
      }
    }
  }

  return result;
}

/**
 * GET /api/vacancy_application/[vacancyId]
 * Retrieves the application form structure for a specific vacancy.
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { vacancyId } = await context.params;

    if (!vacancyId) {
      return NextResponse.json(
        { error: 'Vacancy ID is required in path.' },
        { status: 400 }
      );
    }

    const formDef = await getVacancyApplicationForm(vacancyId);
    return NextResponse.json(formDef, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[GET /api/vacancy_application Error]:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/vacancy_application/[vacancyId]
 * Submits the application form answers for a specific vacancy to OTYS.
 * Also binds the uploaded CV directly to the candidate's dossier in OTYS Go!
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { vacancyId } = await context.params;

    if (!vacancyId) {
      return NextResponse.json(
        { error: 'Vacancy ID is required in path.' },
        { status: 400 }
      );
    }

    const contentType = request.headers.get('content-type') || '';
    let payloadAnswers: Record<string, string | string[]> = {};
    let clientMetaData: Record<string, unknown> | undefined = undefined;

    let candidateFirstName = '';
    let candidateLastName = '';
    let candidateEmail = '';
    let candidatePhone = '';
    let candidateOwsFileUid: string | null = null;
    let uploadedFileObj: File | null = null;

    if (contentType.includes('application/json')) {
      const body = await request.json();
      clientMetaData = body.metaData;

      candidateFirstName = body.firstName ? String(body.firstName).trim() : '';
      candidateLastName = body.lastName ? String(body.lastName).trim() : '';
      candidateEmail = body.email ? String(body.email).trim() : '';
      candidatePhone = body.phone ? String(body.phone).trim() : '';
      candidateOwsFileUid = body.owsFileUid ? String(body.owsFileUid).trim() : null;

      if (body.answers) {
        payloadAnswers = body.answers;
        // Fallback names from answers if not provided at top-level
        const qMap = resolveQuestionIds();
        if (!candidateFirstName && body.answers[qMap.firstNameId]) {
          candidateFirstName = String(body.answers[qMap.firstNameId]).trim();
        }
        if (!candidateLastName && body.answers[qMap.lastNameId]) {
          candidateLastName = String(body.answers[qMap.lastNameId]).trim();
        }
      } else {
        const qMap = resolveQuestionIds();
        if (candidateFirstName) payloadAnswers[qMap.firstNameId] = candidateFirstName;
        if (candidateLastName) payloadAnswers[qMap.lastNameId] = candidateLastName;
        if (candidateEmail) payloadAnswers[qMap.emailId] = candidateEmail;
        if (candidatePhone) payloadAnswers[qMap.phoneId] = candidatePhone;
        if (body.fileId) payloadAnswers[qMap.resumeId] = String(body.fileId);
        payloadAnswers[qMap.termsId] = ['1'];
        if (qMap.retentionId) payloadAnswers[qMap.retentionId] = ['1'];
      }
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      candidateFirstName = (formData.get('firstName') as string | null)?.trim() || '';
      candidateLastName = (formData.get('lastName') as string | null)?.trim() || '';
      candidatePhone = (formData.get('phone') as string | null)?.trim() || '';
      candidateEmail = (formData.get('email') as string | null)?.trim() || '';
      const fileId = (formData.get('fileId') as string | null)?.trim() || '';
      candidateOwsFileUid = (formData.get('owsFileUid') as string | null)?.trim() || null;
      uploadedFileObj = (formData.get('file') || formData.get('cv')) as File | null;

      const qMap = resolveQuestionIds();
      if (candidateFirstName) payloadAnswers[qMap.firstNameId] = candidateFirstName;
      if (candidateLastName) payloadAnswers[qMap.lastNameId] = candidateLastName;
      if (candidateEmail) payloadAnswers[qMap.emailId] = candidateEmail;
      if (candidatePhone) payloadAnswers[qMap.phoneId] = candidatePhone;
      if (fileId) payloadAnswers[qMap.resumeId] = fileId;
      payloadAnswers[qMap.termsId] = ['1'];
      if (qMap.retentionId) payloadAnswers[qMap.retentionId] = ['1'];
    }

    const referer = request.headers.get('referer');
    const forwardedFor = request.headers.get('x-forwarded-for');

    let refererUrl: URL | null = null;
    if (referer) {
      try {
        refererUrl = new URL(referer);
      } catch {
        // ignore
      }
    }

    const utmTags = {
      source: refererUrl?.searchParams.get('utm_source') || 'website',
      medium: refererUrl?.searchParams.get('utm_medium') || 'job_application',
      campaign: refererUrl?.searchParams.get('utm_campaign') || undefined,
    };

    const finalPayload = {
      answers: payloadAnswers,
      metaData: {
        ...(clientMetaData || {}),
        utmTags,
        referer: referer || null,
        ip: forwardedFor ? forwardedFor.split(',')[0].trim() : undefined,
      },
    };

    // 1. Submit application to OTYS (creates candidate & links to vacancy)
    const result = await submitVacancyApplication(vacancyId, finalPayload);
    console.log('[POST /api/vacancy_application Result]:', JSON.stringify(result));

    // 2. OTYS OWS Step: Bind CV directly to candidate's dossier in OTYS Go!
    let dossierId: string | null = null;
    if (candidateFirstName || candidateLastName) {
      try {
        const sessionToken = await loginOws();
        try {
          // If we have a direct file upload from multipart, upload it to OWS first
          if (!candidateOwsFileUid && uploadedFileObj && uploadedFileObj.size > 0) {
            candidateOwsFileUid = await uploadFileToOws(
              sessionToken,
              uploadedFileObj,
              uploadedFileObj.name || 'resume.pdf'
            );
          }

          if (candidateOwsFileUid) {
            // Find or get candidate UID in OTYS
            const candidateUid = await getOrCreateCandidateOuid(
              sessionToken,
              candidateFirstName,
              candidateLastName
            );

            if (candidateUid) {
              dossierId = await attachDocumentToCandidateDossier(
                sessionToken,
                candidateUid,
                candidateOwsFileUid,
                `${candidateFirstName} ${candidateLastName}`.trim()
              );
              console.log(
                `[OWS Success] CV '${candidateOwsFileUid}' attached to candidate '${candidateUid}' dossier ID: ${dossierId}`
              );
            }
          }
        } finally {
          await logoutOws(sessionToken);
        }
      } catch (owsErr) {
        console.error('[OWS Candidate Dossier Attachment Error (non-fatal)]:', owsErr);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Application submitted successfully!',
        data: result,
        dossierId,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string; detail?: string };
    const status = err.status || 500;
    const rawMessage = err.detail || err.message || 'Internal Server Error';

    console.error('[POST /api/vacancy_application Error]:', rawMessage);


    if (status === 409 || rawMessage.toLowerCase().includes('already linked')) {
      return NextResponse.json(
        {
          error: 'You have already applied for this position with this email. If you have any questions, please contact our team.',
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: rawMessage },
      { status: status >= 400 && status < 600 ? status : 500 }
    );
  }
}
