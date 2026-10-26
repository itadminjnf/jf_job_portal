/**
 * Server-Side Authentication & Token Management Module
 *
 * Location: src/lib/auth.ts
 *
 * Responsibilities:
 * - Secure server-side credential management (never exposed to client)
 * - 12-hour token expiry calculation and proactive refresh
 * - Concurrent request deduplication (prevents duplicate auth calls)
 * - Exception handling and Circuit Breaker (stops after 5 consecutive failures)
 * - Stale token fallback serving when external auth is down
 * - Abstract token storage (in-memory default, Redis/DB extensible)
 * - Safe activation toggle (AUTH_API_ENABLED = false)
 */

export interface TokenData {
  accessToken: string;
  tokenType?: string;
  expiresAt: number; // Unix timestamp in milliseconds
}

export interface AuthApiResponse {
  accessToken?: string;
  access_token?: string;
  token?: string;
  tokenType?: string;
  token_type?: string;
  expiresIn?: number;
  expires_in?: number;
  expiresAt?: string;
  expires_at?: string;
  detail?: string;
  [key: string]: unknown;
}

export interface TokenStore {
  getToken(): Promise<TokenData | null> | TokenData | null;
  setToken(token: TokenData): Promise<void> | void;
  clearToken(): Promise<void> | void;
}

// ============================================================================
// CONFIGURATION, CONSTANTS & SAFETY GUARDS
// ============================================================================

/**
 * MASTER SAFETY TOGGLE:
 * When false in development, NO real external network requests are sent to the Auth API.
 * The system returns a safe mock token and simulates the 12-hour lifecycle.
 * In production, AUTH_API_ENABLED must be explicitly set to 'true'.
 * Set AUTH_API_ENABLED=true in .env.local to activate real API calls.
 */
export const AUTH_API_ENABLED: boolean = process.env.AUTH_API_ENABLED === 'true';

/**
 * Default token expiry duration: 12 hours in milliseconds (43,200,000 ms).
 */
export const DEFAULT_EXPIRY_MS = 12 * 60 * 60 * 1000;

/**
 * Safety window for proactive refresh (5 minutes before expiry).
 */
export const REFRESH_BUFFER_MS = 5 * 60 * 1000;

/**
 * Maximum consecutive authentication failures allowed before tripping the circuit breaker.
 */
export const MAX_AUTH_FAILURES = 5;

/**
 * Tracks consecutive authentication failures.
 */
let consecutiveAuthFailures = 0;

/**
 * Retains the last known good token in memory as a stale fallback if auth fails.
 */
let lastKnownGoodToken: TokenData | null = null;

let hasLoggedConfig = false;

/**
 * Safe configuration diagnostics for debugging production without exposing secrets.
 */
function logSafeAuthConfig(baseUrl: string, websiteId: string, hasKey: boolean): void {
  if (!hasLoggedConfig) {
    hasLoggedConfig = true;
  }
}

/**
 * Auth configuration helper.
 * Secrets are strictly read server-side.
 */
export function getAuthConfig() {
  const isProduction = process.env.NODE_ENV === 'production';
  let rawBaseUrl = process.env.OTYS_API_BASE_URL?.trim();

  // Guard: if empty, missing, or erroneously filled with the variable name itself, fallback to official OTYS URL
  if (!rawBaseUrl || !rawBaseUrl.startsWith('http')) {
    rawBaseUrl = 'https://webapi.otys.app/api';
  }
  const baseUrl = rawBaseUrl.replace(/\/+$/, '');

  const authKey =
    process.env.OTYS_API_KEY?.trim() ||
    process.env.APP_AUTH_KEY?.trim() || '';

  const websiteId =
    process.env.OTYS_WEBSITE_ID?.trim() ||
    '2';

  if (!authKey) {
    if (isProduction || AUTH_API_ENABLED) {
      throw new Error(
        'Missing OTYS API authentication key. Configure OTYS_API_KEY on the server.'
      );
    }
  }

  logSafeAuthConfig(baseUrl, websiteId, Boolean(authKey));

  const authEndpoint = '/auth';

  return {
    baseUrl,
    authKey: authKey || '',
    websiteId,
    authEndpoint,
    authUrl: `${baseUrl}${authEndpoint}`,
  };
}

// ============================================================================
// SERVER-SIDE TOKEN STORAGE
// ============================================================================

/**
 * In-memory server-side token store.
 * Node.js / Next.js server runtime keeps this in process memory.
 */
class InMemoryTokenStore implements TokenStore {
  private currentToken: TokenData | null = null;

  getToken(): TokenData | null {
    return this.currentToken;
  }

  setToken(token: TokenData): void {
    this.currentToken = token;
  }

  clearToken(): void {
    this.currentToken = null;
  }
}

let activeTokenStore: TokenStore = new InMemoryTokenStore();

/**
 * Allows switching the token store (e.g. to Redis or Database) without
 * altering caller code.
 */
export function setTokenStore(store: TokenStore): void {
  activeTokenStore = store;
}

// Concurrency mutex: In-flight token refresh promise deduplication
let inFlightRefreshPromise: Promise<string> | null = null;

// ============================================================================
// FAILURE TRACKING & CIRCUIT BREAKER HELPERS
// ============================================================================

/**
 * Returns current consecutive auth failure count.
 */
export function getAuthFailureCount(): number {
  return consecutiveAuthFailures;
}

/**
 * Resets consecutive auth failures and clears circuit breaker.
 */
export function resetAuthFailures(): void {
  consecutiveAuthFailures = 0;
}

/**
 * Returns the last known good token (even if expired/stale).
 */
export function getLastKnownGoodToken(): TokenData | null {
  return lastKnownGoodToken;
}

// ============================================================================
// CORE TOKEN RETRIEVAL & REFRESH LOGIC
// ============================================================================

/**
 * Fetches a new access token from the authentication service.
 *
 * Exception & Circuit Breaker Handling:
 * - Checks if circuit breaker is tripped (5 consecutive failures). If tripped, stops making
 *   external calls and serves stale token or throws an error.
 * - Wraps external calls in try-catch.
 * - On failure: increments failure count, logs attempt (${failures}/5), and returns stale token if available.
 * - On success: resets failure count to 0 and stores last known good token.
 */
export async function requestNewToken(): Promise<string> {
  // 1. Safety check: do NOT trigger real API if disabled, and NEVER allow mock token in production
  if (!AUTH_API_ENABLED) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('AUTH_API_ENABLED must be true in production.');
    }

    const mockToken = 'mock_auth_token_ready_for_activation';
    const expiresAt = Date.now() + DEFAULT_EXPIRY_MS;

    const tokenData: TokenData = {
      accessToken: mockToken,
      tokenType: 'Bearer',
      expiresAt,
    };

    lastKnownGoodToken = tokenData;
    consecutiveAuthFailures = 0;
    await activeTokenStore.setToken(tokenData);
    return mockToken;
  }

  const config = getAuthConfig();

  // 2. Circuit Breaker Check: Stop calling if 5 consecutive failures occurred
  if (consecutiveAuthFailures >= MAX_AUTH_FAILURES) {
    console.error(
      `[Auth Circuit Breaker] Max consecutive authentication failures (${MAX_AUTH_FAILURES}) reached. Halting external auth calls.`
    );

    if (
      lastKnownGoodToken &&
      (process.env.NODE_ENV !== 'production' ||
        lastKnownGoodToken.accessToken !== 'mock_auth_token_ready_for_activation')
    ) {
      console.warn('[Auth Circuit Breaker] Serving last known stale token as fallback.');
      return lastKnownGoodToken.accessToken;
    }

    throw new Error(
      `Authentication circuit breaker tripped: failed ${MAX_AUTH_FAILURES} consecutive times. No external calls will be made.`
    );
  }

  // 3. Real authentication flow with full exception handling & transient network retries
  try {
    let response: Response | null = null;
    let lastNetworkErr: unknown = null;

    // Retry up to 3 times on transient network blip or socket timeout
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        response = await fetch(config.authUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ key: config.authKey }),
          cache: 'no-store',
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        break;
      } catch (netErr: unknown) {
        lastNetworkErr = netErr;
        if (attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
        }
      }
    }

    if (!response) {
      throw lastNetworkErr || new Error('Network request to auth endpoint timed out or failed');
    }
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Authentication endpoint returned status ${response.status}: ${errorText || response.statusText}`);
    }

    const data: AuthApiResponse = await response.json();
    const rawToken = data.accessToken || data.access_token || data.token;

    if (!rawToken) {
      throw new Error('Authentication response payload did not contain an access token');
    }

    // Calculate 12-hour expiry (use server expiresIn/expiresAt if provided, otherwise default to 12h)
    let expiresAt: number;
    const expiresInSeconds = data.expiresIn || data.expires_in;

    if (typeof expiresInSeconds === 'number' && expiresInSeconds > 0) {
      expiresAt = Date.now() + expiresInSeconds * 1000;
    } else if (data.expiresAt || data.expires_at) {
      const parsed = Date.parse((data.expiresAt || data.expires_at) as string);
      expiresAt = !isNaN(parsed) ? parsed : Date.now() + DEFAULT_EXPIRY_MS;
    } else {
      expiresAt = Date.now() + DEFAULT_EXPIRY_MS;
    }

    const tokenData: TokenData = {
      accessToken: rawToken,
      tokenType: data.tokenType || data.token_type || 'Bearer',
      expiresAt,
    };

    // Reset failure counter on successful authentication
    consecutiveAuthFailures = 0;
    lastKnownGoodToken = tokenData;
    await activeTokenStore.setToken(tokenData);

    return tokenData.accessToken;
  } catch (error: unknown) {
    consecutiveAuthFailures++;
    const errMsg = error instanceof Error ? error.message : String(error);

    console.error(
      `[Auth Error] Failed to obtain new token (Failure ${consecutiveAuthFailures}/${MAX_AUTH_FAILURES}): ${errMsg}`
    );

    // Stale data fallback: if we have a previous real token, serve it instead of failing immediately
    if (
      lastKnownGoodToken &&
      (process.env.NODE_ENV !== 'production' ||
        lastKnownGoodToken.accessToken !== 'mock_auth_token_ready_for_activation')
    ) {
      console.warn('[Auth Fallback] Serving stale/cached token after refresh failure.');
      return lastKnownGoodToken.accessToken;
    }

    // If 5 failures reached or no fallback exists, propagate error
    throw new Error(
      `Authentication failed (${consecutiveAuthFailures}/${MAX_AUTH_FAILURES}): ${errMsg}`
    );
  }
}

/**
 * Returns a valid, non-expired access token.
 *
 * Flow:
 * 1. Checks if token exists and is valid (current time < expiry - 5 min buffer).
 * 2. If valid and forceRefresh is false, returns existing token.
 * 3. If expired or forceRefresh is true, requests a new token.
 * 4. Deduplicates simultaneous calls using an in-flight promise.
 * 5. Handles exceptions and falls back to stale token if refresh fails.
 *
 * @param forceRefresh - Force request a new token even if existing token is valid
 */
export async function getValidToken(forceRefresh: boolean = false): Promise<string> {
  if (process.env.NODE_ENV === 'production' && !AUTH_API_ENABLED) {
    throw new Error('AUTH_API_ENABLED must be true in production.');
  }

  try {
    const existingToken = await activeTokenStore.getToken();

    const isExpired = !existingToken || Date.now() >= existingToken.expiresAt - REFRESH_BUFFER_MS;

    if (!forceRefresh && existingToken && !isExpired) {
      if (
        process.env.NODE_ENV === 'production' &&
        existingToken.accessToken === 'mock_auth_token_ready_for_activation'
      ) {
        throw new Error('AUTH_API_ENABLED must be true in production.');
      }
      return existingToken.accessToken;
    }

    // Deduplicate concurrent refresh calls
    if (inFlightRefreshPromise) {
      return inFlightRefreshPromise;
    }

    inFlightRefreshPromise = (async () => {
      try {
        return await requestNewToken();
      } finally {
        inFlightRefreshPromise = null;
      }
    })();

    return await inFlightRefreshPromise;
  } catch (error: unknown) {
    let existingToken: TokenData | null = null;
    try {
      existingToken = await activeTokenStore.getToken();
    } catch {
      // Ignore store read error during fallback attempt
    }
    const staleToken = existingToken || lastKnownGoodToken;

    if (
      staleToken &&
      (process.env.NODE_ENV !== 'production' ||
        staleToken.accessToken !== 'mock_auth_token_ready_for_activation')
    ) {
      console.warn('[Auth Fallback] Returning stale token after exception in getValidToken().');
      return staleToken.accessToken;
    }

    throw error;
  }
}

/**
 * Manually invalidates and clears the stored token.
 */
export async function clearToken(): Promise<void> {
  await activeTokenStore.clearToken();
}
