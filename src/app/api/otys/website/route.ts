/**
 * OTYS Website Configuration & Webhook Registration API Route
 *
 * Location: src/app/api/otys/website/route.ts
 *
 * Provides endpoints to:
 * 1. GET  /api/otys/website - Inspect current OTYS Website entity (webhookUrl, externalVacancyDetailUrlFormat, etc.)
 * 2. POST /api/otys/website - Set or update the webhookUrl, externalUrl, and vacancy URL formats in OTYS
 *
 * Reference: https://webapi.otys.app/api#/Website/app_website_patch
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOtysWebsite, updateOtysWebsite, OtysWebsiteConfig } from '@/lib/api';
import { getAuthConfig } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET: Retrieves current website configuration from OTYS Web API
 */
export async function GET() {
  const { websiteId } = getAuthConfig();

  try {
    const config = await getOtysWebsite(websiteId);

    const hasWebhook = Boolean(config?.webhookUrl && String(config.webhookUrl).trim().length > 0);

    return NextResponse.json({
      success: true,
      websiteId,
      hasWebhookUrlSet: hasWebhook,
      webhookUrl: config?.webhookUrl || null,
      externalVacancyDetailUrlFormat: config?.externalVacancyDetailUrlFormat || null,
      externalApplyUrlFormat: config?.externalApplyUrlFormat || null,
      externalUrl: config?.externalUrl || null,
      fullConfig: config,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[OTYS Website Route GET Error]:', message);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve OTYS website configuration',
        detail: message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST: Registers or updates the webhook URL and URL formats on OTYS Website entity
 */
export async function POST(request: NextRequest) {
  const { websiteId } = getAuthConfig();

  try {
    let body: Partial<OtysWebsiteConfig> & { websiteId?: string | number } = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    // Determine base site URL (from request origin or environment)
    const envSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    const originUrl = request.nextUrl.origin;
    const isHttpsOrigin = originUrl.startsWith('https://');
    const baseSiteUrl = (body.externalUrl || envSiteUrl || (isHttpsOrigin ? originUrl : 'https://jacksonfrank.com')).replace(/\/+$/, '');

    // Default payload according to OTYS specifications:
    // - webhookUrl: endpoint receiving vacancy change notifications
    // - externalVacancyDetailUrlFormat: "/vacancies/{{slug}}" uses vacancy slug token
    // - externalApplyUrlFormat: "/vacancies/{{slug}}#apply"
    // - externalUrl: base public website URL
    const targetWebhookUrl =
      body.webhookUrl || `${baseSiteUrl}/api/webhooks/otys`;

    const patchPayload: Partial<OtysWebsiteConfig> = {
      webhookUrl: targetWebhookUrl,
      externalVacancyDetailUrlFormat:
        body.externalVacancyDetailUrlFormat || '/vacancies/{{slug}}',
      externalApplyUrlFormat:
        body.externalApplyUrlFormat || '/vacancies/{{slug}}#apply',
      externalUrl: baseSiteUrl,
      ...(body.externalVacancyPreviewUrlFormat
        ? { externalVacancyPreviewUrlFormat: body.externalVacancyPreviewUrlFormat }
        : {}),
    };

    const targetWebsiteId = body.websiteId || websiteId;

    console.log(`[OTYS Website Config] Updating website ${targetWebsiteId} with:`, patchPayload);

    const updated = await updateOtysWebsite(patchPayload, targetWebsiteId);

    return NextResponse.json({
      success: true,
      message: 'OTYS Website configuration updated successfully.',
      websiteId: targetWebsiteId,
      appliedConfig: patchPayload,
      otysResponse: updated,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[OTYS Website Route POST Error]:', message);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update OTYS website configuration',
        detail: message,
      },
      { status: 500 }
    );
  }
}

