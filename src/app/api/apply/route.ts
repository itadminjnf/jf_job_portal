import { NextRequest, NextResponse } from 'next/server';
import {
  uploadOtysFile,
  getVacancyApplicationForm,
  submitVacancyApplication,
  OtysRawFormResponse,
} from '@/lib/api';

export const dynamic = 'force-dynamic';

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
  console.log("questionMap", result);

  return result;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const jobId = formData.get('jobId') as string | null;
    const jobTitle = formData.get('jobTitle') as string | null;
    const firstName = formData.get('firstName') as string | null;
    const lastName = formData.get('lastName') as string | null;
    const phone = formData.get('phone') as string | null;
    const email = formData.get('email') as string | null;
    const cv = formData.get('cv') as File | null;

    if (!jobId || !jobId.trim()) {
      return NextResponse.json(
        { error: 'Vacancy ID is required to submit an application.' },
        { status: 400 }
      );
    }

    if (!firstName || !firstName.trim()) {
      return NextResponse.json(
        { error: 'First name is required.' },
        { status: 400 }
      );
    }

    if (!lastName || !lastName.trim()) {
      return NextResponse.json(
        { error: 'Last name is required.' },
        { status: 400 }
      );
    }

    if (!phone || !phone.trim()) {
      return NextResponse.json(
        { error: 'Phone number is required.' },
        { status: 400 }
      );
    }

    const cleanPhone = phone.trim();
    // OTYS international format regex check: /^\+?[0-9\s-]{8,15}$/
    const digitsOnly = cleanPhone.replace(/\D/g, '');
    if (digitsOnly.length < 8 || digitsOnly.length > 15) {
      return NextResponse.json(
        { error: 'Please enter a valid phone number (between 8 and 15 digits, international format recommended e.g. +31...).' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !email.trim() || !emailRegex.test(email.trim())) {
      return NextResponse.json(
        { error: 'A valid email address is required.' },
        { status: 400 }
      );
    }

    if (!cv || !(cv instanceof File) || cv.size === 0) {
      return NextResponse.json(
        { error: 'CV is mandatory. Please upload your CV (.pdf, .doc, .docx).' },
        { status: 400 }
      );
    }

    // Step 1: Upload CV to OTYS /api/files endpoint
    let fileId: string;
    try {
      fileId = await uploadOtysFile(cv, cv.name || 'resume.pdf');
    } catch (uploadErr: unknown) {
      const uploadMsg = uploadErr instanceof Error ? uploadErr.message : String(uploadErr);
      console.error('[OTYS File Upload Error]:', uploadMsg);
      return NextResponse.json(
        { error: 'Could not upload your CV to OTYS server. Please verify the file format and try again.' },
        { status: 502 }
      );
    }

    // Step 2: Fetch vacancy application form definition to resolve exact question IDs
    let questionMap = resolveQuestionIds();
    try {
      const formDef = await getVacancyApplicationForm(jobId);
      if (formDef) {
        questionMap = resolveQuestionIds(formDef);
      }
    } catch (formDefErr) {
      console.warn('[OTYS Form Fetch Warning] Using default mapped question IDs:', formDefErr);
    }

    // Step 3: Construct answers payload
    const answers: Record<string, string | string[]> = {
      [questionMap.firstNameId]: firstName.trim(),
      [questionMap.lastNameId]: lastName.trim(),
      [questionMap.emailId]: email.trim(),
      [questionMap.phoneId]: cleanPhone,
      [questionMap.resumeId]: fileId,
      [questionMap.termsId]: ['1'],
    };

    if (questionMap.retentionId) {
      answers[questionMap.retentionId] = ['1'];
    }

    // Prepare metadata (Referer, IP, UTM)
    const referer = request.headers.get('referer');
    const forwardedFor = request.headers.get('x-forwarded-for');

    let refererUrl: URL | null = null;
    if (referer) {
      try {
        refererUrl = new URL(referer);
      } catch {
        // ignore invalid URL
      }
    }

    const utmTags = {
      source: refererUrl?.searchParams.get('utm_source') || 'website',
      medium: refererUrl?.searchParams.get('utm_medium') || 'job_application',
      campaign: refererUrl?.searchParams.get('utm_campaign') || undefined,
    };

    const payload = {
      answers,
      metaData: {
        utmTags,
        referer: referer || null,
        ip: forwardedFor ? forwardedFor.split(',')[0].trim() : undefined,
      },
    };

    // Step 4: Submit to OTYS POST /api/vacancy_application/{vacancyId}
    const result = await submitVacancyApplication(jobId, payload);

    // Step 5: Bind CV directly to candidate's dossier in OTYS Go! (OWS Manual Page 37-44)
    let dossierId: string | null = null;
    if (cv && cv instanceof File && cv.size > 0) {
      try {
        const { attachCvToCandidateDossierWorkflow } = await import('@/lib/otys-ows');
        const arrayBuffer = await cv.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const dossierRes = await attachCvToCandidateDossierWorkflow({
          fileContent: buffer,
          fileName: cv.name || 'resume.pdf',
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        });
        dossierId = dossierRes.dossierId;
        console.log('[Apply Route] CV successfully attached to Candidate Dossier:', dossierRes);
      } catch (dossierErr) {
        console.error('[Apply Route Dossier Attachment Error (non-fatal)]:', dossierErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully!',
      data: {
        jobId,
        jobTitle,
        candidate: `${firstName} ${lastName}`,
        fileId,
        dossierId,
        otysResponse: result,
      },
    });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string; detail?: string };
    const status = err.status || 500;
    const rawMessage = err.detail || err.message || 'Internal Server Error';

    console.error('[Job Application Submission Error]:', rawMessage);

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
