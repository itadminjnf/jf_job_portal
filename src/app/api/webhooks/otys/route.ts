/**
 * OTYS Vacancy Webhook Receiver & Cache Revalidation Endpoint
 *
 * Location: src/app/api/webhooks/otys/route.ts
 *
 * Responsibilities:
 * - Receives real-time webhook events sent by OTYS when vacancies change:
 *   (e.g., vacancy created, edited, deleted, depublished, text altered).
 * - Immediately invalidates Next.js data caches and page paths so updates
 *   are instantly reflected on the live site without delay.
 * - Supports optional webhook secret verification via OTYS_WEBHOOK_SECRET.
 * - Handles GET for webhook diagnostics and health checks.
 */

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

export const dynamic = 'force-dynamic';

interface WebhookPayload {
  event?: string;
  action?: string;
  type?: string;
  timestamp?: string | number;
  id?: string | number;
  vacancyId?: string | number;
  slug?: string;
  data?: {
    id?: string | number;
    vacancyId?: string | number;
    slug?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Verifies optional webhook secret header or query parameter
 */
function isAuthorized(request: NextRequest): boolean {
  const configuredSecret = process.env.OTYS_WEBHOOK_SECRET?.trim();
  if (!configuredSecret) {
    // If no secret configured in env, permit incoming webhook
    return true;
  }

  const querySecret = request.nextUrl.searchParams.get('secret');
  const headerSecret =
    request.headers.get('x-otys-secret') ||
    request.headers.get('x-webhook-secret') ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

  return querySecret === configuredSecret || headerSecret === configuredSecret;
}

/**
 * Health check & diagnostic endpoint for OTYS Webhook registration
 */
export async function GET() {
  return NextResponse.json({
    status: 'active',
    service: 'OTYS Vacancy Webhook Handler',
    description:
      'Listens for OTYS vacancy change signals (created, updated, deleted, depublished) and invalidates Next.js cache.',
    supportedMethods: ['GET', 'POST'],
    timestamp: new Date().toISOString(),
  });
}

/**
 * Handles incoming OTYS webhook notifications
 */
export async function POST(request: NextRequest) {
  // 1. Authorization check
  if (!isAuthorized(request)) {
    console.warn('[OTYS Webhook] Unauthorized webhook attempt received.');
    return NextResponse.json(
      { error: 'Unauthorized. Invalid or missing webhook secret.' },
      { status: 401 }
    );
  }

  let payload: WebhookPayload = {};
  try {
    const rawText = await request.text();
    if (rawText && rawText.trim()) {
      try {
        payload = JSON.parse(rawText);
      } catch {
        payload = { raw: rawText };
      }
    }
  } catch (parseError) {
    console.warn('[OTYS Webhook] Could not read body as JSON:', parseError);
  }

  const eventName = payload.event || payload.action || payload.type || 'vacancy.change';
  const vacancyId =
    payload.vacancyId ||
    payload.data?.vacancyId ||
    payload.id ||
    payload.data?.id;
  const slug = payload.slug || payload.data?.slug;

  console.log(`[OTYS Webhook] Received signal: "${eventName}"`, {
    vacancyId,
    slug,
    timestamp: new Date().toISOString(),
  });

  const revalidatedPaths: string[] = [];

  try {
    // 2. Invalidate listing & common vacancy pages
    revalidatePath('/vacancies');
    revalidatedPaths.push('/vacancies');

    revalidatePath('/vacancies/[slug]', 'page');
    revalidatedPaths.push('/vacancies/[slug]');

    // Homepage displays latest jobs
    revalidatePath('/');
    revalidatedPaths.push('/');

    // Header & counters
    revalidatePath('/api/vacancies/count');
    revalidatedPaths.push('/api/vacancies/count');

    // 3. Invalidate global 'vacancies' Next.js cache tag
    try {
      revalidateTag('vacancies', { expire: 0 });
    } catch {
      try {
        // Fallback for older Next.js signature without profile object
        (revalidateTag as (tag: string) => void)('vacancies');
      } catch {
        // no-op if tag cache is not supported in current mode
      }
    }

    // 4. Invalidate specific vacancy if slug or ID is known
    if (slug) {
      const slugPath = `/vacancies/${encodeURIComponent(String(slug))}`;
      revalidatePath(slugPath);
      revalidatedPaths.push(slugPath);
    }

    if (vacancyId) {
      const idPath = `/vacancies/${encodeURIComponent(String(vacancyId))}`;
      revalidatePath(idPath);
      revalidatedPaths.push(idPath);

      try {
        revalidateTag(`vacancy-${vacancyId}`, { expire: 0 });
      } catch {
        try {
          (revalidateTag as (tag: string) => void)(`vacancy-${vacancyId}`);
        } catch {
          // no-op
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'OTYS webhook processed and website cache invalidated successfully.',
      event: eventName,
      details: {
        vacancyId: vacancyId ? String(vacancyId) : null,
        slug: slug ? String(slug) : null,
      },
      revalidatedPaths,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[OTYS Webhook] Error during cache revalidation:', errorMsg);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to complete cache revalidation.',
        message: errorMsg,
      },
      { status: 500 }
    );
  }
}

