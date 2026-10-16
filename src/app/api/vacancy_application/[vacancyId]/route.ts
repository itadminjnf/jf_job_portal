import { NextRequest, NextResponse } from 'next/server';
import {
  getVacancyApplicationForm,
  submitVacancyApplication,
  OtysRawFormResponse,
} from '@/lib/api';

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

    if (contentType.includes('application/json')) {
      const body = await request.json();
      clientMetaData = body.metaData;

      if (body.answers) {
        payloadAnswers = body.answers;
      } else {
        // If candidate fields are provided in JSON
        const qMap = resolveQuestionIds();
        if (body.firstName) payloadAnswers[qMap.firstNameId] = String(body.firstName).trim();
        if (body.lastName) payloadAnswers[qMap.lastNameId] = String(body.lastName).trim();
        if (body.email) payloadAnswers[qMap.emailId] = String(body.email).trim();
        if (body.phone) payloadAnswers[qMap.phoneId] = String(body.phone).trim();
        if (body.fileId) payloadAnswers[qMap.resumeId] = String(body.fileId);
        payloadAnswers[qMap.termsId] = ['1'];
        if (qMap.retentionId) payloadAnswers[qMap.retentionId] = ['1'];
      }
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const firstName = formData.get('firstName') as string | null;
      const lastName = formData.get('lastName') as string | null;
      const phone = formData.get('phone') as string | null;
      const email = formData.get('email') as string | null;
      const fileId = formData.get('fileId') as string | null;

      const qMap = resolveQuestionIds();
      if (firstName) payloadAnswers[qMap.firstNameId] = firstName.trim();
      if (lastName) payloadAnswers[qMap.lastNameId] = lastName.trim();
      if (email) payloadAnswers[qMap.emailId] = email.trim();
      if (phone) payloadAnswers[qMap.phoneId] = phone.trim();
      if (fileId) payloadAnswers[qMap.resumeId] = fileId.trim();
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

    const result = await submitVacancyApplication(vacancyId, finalPayload);

    return NextResponse.json(
      {
        success: true,
        message: 'Application submitted successfully!',
        data: result,
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
