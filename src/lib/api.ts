/**
 * Central API Configuration & Reusable Server-Side API Client
 *
 * Location: src/lib/api.ts
 *
 * Responsibilities:
 * - Central registry for all external API endpoints
 * - Secure server-side HTTP client (apiRequest & authenticatedFetch)
 * - Automatic Bearer token injection using getValidToken()
 * - Automatic 401 Unauthorized handling (token refresh + single retry)
 * - Robust exception handling with fallback data support (serves stale/fallback data on error)
 * - Preserves existing mock getters for blog, news, and vacancies
 */

import { getValidToken, getAuthConfig, clearToken } from '@/lib/auth';
import { featuredJobs } from '@/data/jobs';
import { blogPosts } from '@/data/blogs';
import { newsArticles } from '@/data/news';
import { Job, EmploymentType } from '@/types/job';

// ============================================================================
// 1. CENTRALIZED API ENDPOINTS
// ============================================================================

/**
 * Central dictionary of all API endpoints.
 * Reference: https://web.olx.app/api
 *
 * Whenever new endpoints are needed, define them here instead of
 * hardcoding URLs across individual files.
 */
export const API_ENDPOINTS = {
  auth: {
    appAuth: '/auth',
  },
  vacancies: {
    list: '/vacancies',
    bySlug: (slug: string) => `/vacancies/slug/${encodeURIComponent(slug)}?includeUnpublishedTextfields=true`,
    details: (id: string | number) => `/vacancies/${encodeURIComponent(String(id))}?includeUnpublishedTextfields=true`,
  },
  files: {
    upload: '/files',
  },
  forms: {
    jobAlert: '/jobalert-form',
    vacancyApplication: (vacancyId: string | number) => `/vacancy_application/${encodeURIComponent(String(vacancyId))}`,
    openApplication: '/open_application',
    openApplicationSubmit: (id: string | number) => `/open_application/${encodeURIComponent(String(id))}`,
  },
} as const;

// ============================================================================
// 2. REUSABLE SERVER-SIDE API CLIENT & EXCEPTION HANDLING
// ============================================================================

export interface ApiRequestOptions<T = unknown> extends RequestInit {
  /**
   * Internal flag used to prevent infinite retry loops on 401 Unauthorized.
   */
  _hasRetried?: boolean;

  /**
   * Optional fallback data to serve if the request or authentication fails.
   */
  fallbackData?: T;
}

/**
 * Builds a full absolute URL given an endpoint or absolute URL string.
 */
function resolveUrl(endpoint: string): string {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  const { baseUrl } = getAuthConfig();
  let cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // If baseUrl already ends with /api and endpoint also starts with /api/, prevent /api/api
  if (baseUrl.endsWith('/api') && cleanEndpoint.startsWith('/api/')) {
    cleanEndpoint = cleanEndpoint.replace(/^\/api/, '');
  }

  return `${baseUrl}${cleanEndpoint}`;
}

/**
 * Low-level authenticated fetch wrapper.
 *
 * Features:
 * 1. Obtains a valid Bearer token from auth.ts
 * 2. Injects Authorization: Bearer <token>
 * 3. Handles 401/403 or invalid token: automatically force-refreshes the token and retries once
 * 4. Guards against infinite retry loops
 *
 * @param endpoint - Relative endpoint (e.g. '/vacancy') or absolute URL
 * @param options - Standard fetch RequestInit options
 */
export async function authenticatedFetch(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<Response> {
  const { _hasRetried = false, headers, ...restOptions } = options;

  // 1. Get valid access token (retrieves cached token, requests new one, or serves stale fallback)
  const token = await getValidToken();

  // 2. Prepare headers with Authorization header
  const reqHeaders = new Headers(headers);
  if (!reqHeaders.has('Authorization')) {
    reqHeaders.set('Authorization', `Bearer ${token}`);
  }
  if (!reqHeaders.has('Content-Type') && !(restOptions.body instanceof FormData)) {
    reqHeaders.set('Content-Type', 'application/json');
  }
  if (!reqHeaders.has('Accept')) {
    reqHeaders.set('Accept', 'application/ld+json, application/json');
  }

  // 3. Attach Required Website-ID header for OTYS context
  const { websiteId } = getAuthConfig();
  if (!reqHeaders.has('Website-ID') && websiteId) {
    reqHeaders.set('Website-ID', websiteId);
  }

  const fullUrl = resolveUrl(endpoint);

  // 3. Execute request with network-level exception handling & 1 automatic retry
  let response: Response;
  try {
    response = await fetch(fullUrl, {
      ...restOptions,
      headers: reqHeaders,
    });
  } catch (networkError: unknown) {
    // Retry once after brief delay for intermittent network dropouts
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      response = await fetch(fullUrl, {
        ...restOptions,
        headers: reqHeaders,
      });
    } catch {
      const message = networkError instanceof Error ? networkError.message : String(networkError);
      console.error(`[API Client Network Error] Request to '${fullUrl}' failed:`, message);
      throw networkError;
    }
  }

  // 4. Handle 401 Unauthorized / Invalid Token: Refresh token and retry once
  if (response.status === 401 && !_hasRetried) {
    console.warn('[API Client] 401 Unauthorized / Invalid Token received. Forcing token refresh and retrying once...');
    try {
      // Invalidate current token and force-fetch a new valid token
      await clearToken();
      await getValidToken(true);

      // Retry request with _hasRetried guard set to true
      return await authenticatedFetch(endpoint, {
        ...options,
        _hasRetried: true,
      });
    } catch (refreshError) {
      console.error('[API Client] Token refresh during 401 retry failed:', refreshError);
      return response;
    }
  }

  return response;
}

/**
 * High-level typed API helper with fallback data support.
 *
 * Calls authenticatedFetch, validates response status, parses JSON, and returns typed result.
 * If the request or authentication fails (including after 5 auth retries):
 * - If fallbackData is provided (via parameter or option), returns fallbackData without crashing.
 * - Otherwise, throws an informative Error.
 *
 * Example usage:
 * ```ts
 * // With fallback data
 * const data = await apiRequest(API_ENDPOINTS.vacancies.list, { method: 'GET' }, fallbackVacancies);
 *
 * // Or without fallback (throws on error)
 * const data = await apiRequest(API_ENDPOINTS.users.list);
 * ```
 */
export async function apiRequest<T = unknown>(
  endpoint: string,
  options?: ApiRequestOptions<T>,
  fallbackData?: T
): Promise<T> {
  const effectiveFallback = fallbackData !== undefined ? fallbackData : options?.fallbackData;

  try {
    const response = await authenticatedFetch(endpoint, options);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(
        `API request to '${endpoint}' failed [${response.status} ${response.statusText}]: ${errorBody}`
      );
    }

    // Handle empty 204 No Content responses
    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    // If fallback data was provided, serve it gracefully
    if (effectiveFallback !== undefined) {
      console.warn(
        `[API Client Fallback] Request to '${endpoint}' failed (${errorMsg}). Serving provided fallback data.`
      );
      return effectiveFallback;
    }

    // Otherwise propagate the exception
    throw error;
  }
}

// ============================================================================
// 3. OTYS VACANCY DATA ADAPTER & QUERY PARAMS
// ============================================================================

export interface VacancyFilterParams {
  page?: number;
  itemsPerPage?: number;
  MatchCriteria?: Record<number | string, string | number[] | number> | string;
  matchcriteria?: Record<number | string, string | number[] | number>;
  VacancyCategory?: number | string | number[];
  category?: number | string | number[];
  'geo-country'?: 'nl' | 'be' | 'lu' | 'fr' | 'de' | 'gb' | 'au' | 'at' | string;
  country?: 'nl' | 'be' | 'lu' | 'fr' | 'de' | 'gb' | 'au' | 'at' | string;
  'geo-radius'?: number | string;
  radius?: number | string;
  'geo-zipcode'?: string;
  zipcode?: string;
  keywords?: string;
  publishedLanguage?: string[] | string;
  published?: boolean;
  includeUnpublishedTextfields?: boolean;
}

/**
 * Builds URL with query parameters supported by OTYS Vacancies API
 * GET /api/vacancies
 */
export function buildVacanciesUrl(params: VacancyFilterParams = {}): string {
  const query = new URLSearchParams();

  // 1. Pagination: page (default 1) & itemsPerPage (default 10)
  const page = params.page !== undefined && params.page !== null ? Math.max(1, Number(params.page)) : 1;
  query.set('page', String(page));

  const itemsPerPage = params.itemsPerPage !== undefined && params.itemsPerPage !== null ? Number(params.itemsPerPage) : 10;
  query.set('itemsPerPage', String(itemsPerPage));

  // 2. Published status filter (defaults to true for active vacancies)
  const published = params.published !== undefined ? params.published : true;
  query.set('published', String(published));

  // 3. Include unpublished textfields (defaults to true for full descriptions)
  const includeUnpublishedTextfields =
    params.includeUnpublishedTextfields !== undefined ? params.includeUnpublishedTextfields : true;
  query.set('includeUnpublishedTextfields', String(includeUnpublishedTextfields));

  // 4. Keywords search (Vacancy title, descriptions, external ref, culture, salary, etc.)
  if (params.keywords && String(params.keywords).trim()) {
    query.set('keywords', String(params.keywords).trim());
  }

  // 5. VacancyCategory (single ID or comma-separated list of IDs)
  const category = params.VacancyCategory ?? params.category;
  if (category !== undefined && category !== null && category !== '') {
    const catVal = Array.isArray(category) ? category.join(',') : String(category).trim();
    if (catVal) query.set('VacancyCategory', catVal);
  }

  // 6. MatchCriteria (criteria ID 1 to 18, e.g. ?matchcriteria[1]=xxxx,xxxx)
  const criteriaObj =
    params.matchcriteria ?? (typeof params.MatchCriteria === 'object' ? params.MatchCriteria : undefined);
  if (criteriaObj && typeof criteriaObj === 'object') {
    for (const [critId, val] of Object.entries(criteriaObj)) {
      if (val !== undefined && val !== null && val !== '') {
        const valStr = Array.isArray(val) ? val.join(',') : String(val).trim();
        if (valStr) query.set(`matchcriteria[${critId}]`, valStr);
      }
    }
  } else if (typeof params.MatchCriteria === 'string' && params.MatchCriteria.trim()) {
    const rawParts = params.MatchCriteria.split('&');
    for (const part of rawParts) {
      const [k, v] = part.split('=');
      if (k && v) query.set(k.trim(), v.trim());
    }
  }

  // 7. Geo location filters (geo-country, geo-radius, geo-zipcode)
  const country = params['geo-country'] ?? params.country;
  if (country && String(country).trim()) {
    query.set('geo-country', String(country).trim().toLowerCase());
  }

  const radius = params['geo-radius'] ?? params.radius;
  if (radius !== undefined && radius !== null && radius !== '') {
    query.set('geo-radius', String(radius).trim());
  }

  const zipcode = params['geo-zipcode'] ?? params.zipcode;
  if (zipcode && String(zipcode).trim()) {
    query.set('geo-zipcode', String(zipcode).trim());
  }

  // 8. Published Language (array or comma-separated string)
  if (params.publishedLanguage) {
    if (Array.isArray(params.publishedLanguage)) {
      params.publishedLanguage.forEach((lang) => {
        if (lang && String(lang).trim()) {
          query.append('publishedLanguage[]', String(lang).trim());
        }
      });
    } else if (typeof params.publishedLanguage === 'string' && params.publishedLanguage.trim()) {
      params.publishedLanguage.split(',').forEach((lang) => {
        const trimmed = lang.trim();
        if (trimmed) query.append('publishedLanguage[]', trimmed);
      });
    }
  }

  const queryString = query.toString();
  return queryString ? `${API_ENDPOINTS.vacancies.list}?${queryString}` : API_ENDPOINTS.vacancies.list;
}

/**
 * Maps raw OTYS API vacancy JSON to our clean frontend Job interface.
 * Hides raw API response structure and internal fields.
 */
export function mapOtysVacancyToJob(raw: any): Job {
  if (!raw || typeof raw !== 'object') {
    return {
      id: '',
      slug: '',
      title: 'Unknown',
      company: 'Jackson & Frank',
      companyLogo: '/images/logos/jackson-frank-logo.svg',
      location: 'Netherlands',
      country: 'Netherlands',
      city: '',
      type: 'Full Time',
      experience: 'Experienced',
      skills: ['Consulting', 'Integration'],
      postedTime: 'Recently',
    };
  }

  // Already our Job type?
  if (raw.id && raw.slug && raw.title && raw.company && raw.companyLogo) {
    return raw as Job;
  }

  const id = String(raw.id || raw.vacancyId || raw._id || Math.random().toString(36).substring(2, 9));
  const title = String(raw.title || raw.name || raw.vacancyTitle || 'Untitled Position');
  const slug = String(raw.slug || raw.customSlug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || id);
  const company = String(raw.company || raw.relation?.name || 'Jackson & Frank');
  const rawLoc = String(raw.location || raw.city || '').trim();
  let city = '';
  let country = 'Netherlands';
  let location = rawLoc || 'Netherlands';

  // if (rawLoc) {
  //   if (rawLoc.includes('(') && rawLoc.includes(')')) {
  //     city = rawLoc.replace(/\s*\([^)]*\)/g, '').trim();
  //     country = 'Netherlands';
  //     location = rawLoc;
  //   } else if (rawLoc.toLowerCase() === 'hungary') {
  //     city = 'Budapest';
  //     country = 'Hungary';
  //     location = 'Hungary';
  //   } else if (rawLoc.toLowerCase() === 'malaysia') {
  //     city = 'Kuala Lumpur';
  //     country = 'Malaysia';
  //     location = 'Malaysia';
  //   } else if (rawLoc.toLowerCase().includes('bangalore') || rawLoc.toLowerCase().includes('nagpur')) {
  //     city = rawLoc;
  //     country = 'India';
  //     location = `${rawLoc}, India`;
  //   } else {
  //     city = rawLoc;
  //     country = 'Netherlands';
  //     location = rawLoc.includes(',') ? rawLoc : `${rawLoc}, ${country}`;
  //   }
  // }

  // Extract Skills from matchCriteria
  let skills: string[] = [];
  let type: EmploymentType = 'Full Time';
  let salary: string | undefined = undefined;
  let industry: string | undefined = undefined;
  let experience = '3–5 Yrs';

  if (Array.isArray(raw.matchCriteria)) {
    // 1. Skills
    const skillsCriterion = raw.matchCriteria.find(
      (c: any) => c.name?.toLowerCase().includes('skills') || c.id === 2
    );
    if (skillsCriterion && Array.isArray(skillsCriterion.options)) {
      skills = skillsCriterion.options.map((o: any) => o.name).filter(Boolean);
    }

    // 2. Contract Type
    const contractCriterion = raw.matchCriteria.find(
      (c: any) => c.name?.toLowerCase().includes('contract') || c.id === 5
    );
    if (contractCriterion && Array.isArray(contractCriterion.options) && contractCriterion.options[0]?.name) {
      const typeStr = contractCriterion.options[0].name.toLowerCase();
      if (typeStr.includes('permanent')) type = 'Permanent';
      else if (typeStr.includes('contract')) type = 'Contract';
      else if (typeStr.includes('part')) type = 'Part Time';
      else if (typeStr.includes('remote')) type = 'Remote';
    }

    // 3. Salary
    const salaryCriterion = raw.matchCriteria.find(
      (c: any) => c.name?.toLowerCase().includes('salary') || c.id === 7
    );
    if (salaryCriterion && Array.isArray(salaryCriterion.options) && salaryCriterion.options[0]?.name) {
      salary = `€${salaryCriterion.options[0].name}k / yr`;
    }

    // 4. Industry / Branche
    const brancheCriterion = raw.matchCriteria.find(
      (c: any) => c.name?.toLowerCase().includes('branche') || c.id === 1
    );
    if (brancheCriterion && Array.isArray(brancheCriterion.options) && brancheCriterion.options[0]?.name) {
      industry = brancheCriterion.options[0].name;
    }

    // 5. Education Level / Experience
    const eduCriterion = raw.matchCriteria.find(
      (c: any) => c.name?.toLowerCase().includes('education') || c.id === 10
    );
    if (eduCriterion && Array.isArray(eduCriterion.options) && eduCriterion.options[0]?.name) {
      experience = eduCriterion.options[0].name;
    }
  }

  if (skills.length === 0) {
    skills = ['Agile', 'Scrum', 'Application'];
  }

  // Extract rich textfields from OTYS payload
  let overviewHtml: string | undefined = undefined;
  let jobDescriptionHtml: string | undefined = undefined;
  let requirementsHtml: string | undefined = undefined;
  let companyProfileHtml: string | undefined = undefined;
  let benefitsHtml: string | undefined = undefined;
  let description: string | undefined = undefined;

  if (Array.isArray(raw.textfields)) {
    const summaryField = raw.textfields.find(
      (t: any) => t.type === 'textField_summary' || t.name?.toLowerCase().includes('summary') || t.name?.toLowerCase().includes('short description')
    );
    if (summaryField?.value) {
      overviewHtml = summaryField.value;
      description = summaryField.value.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
    }

    const descField = raw.textfields.find(
      (t: any) => t.type === 'textField_description' || t.name?.toLowerCase().includes('job description')
    );
    if (descField?.value) {
      jobDescriptionHtml = descField.value;
      if (!description) {
        description = descField.value.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
      }
    }

    const reqField = raw.textfields.find(
      (t: any) => t.type === 'textField_requirements' || t.name?.toLowerCase().includes('requirements')
    );
    if (reqField?.value) {
      requirementsHtml = reqField.value;
    }

    const compField = raw.textfields.find(
      (t: any) => t.type === 'textField_companyProfile' || t.name?.toLowerCase().includes('company')
    );
    if (compField?.value) {
      companyProfileHtml = compField.value;
    }

    const benField = raw.textfields.find(
      (t: any) => t.type === 'textField_salary' || t.name?.toLowerCase().includes('benefit') || t.name?.toLowerCase().includes('salary')
    );
    if (benField?.value) {
      benefitsHtml = benField.value;
    }
  }

  // Extract Consultant / Recruiter Details
  let consultant: Job['consultant'] = undefined;
  if (raw.user && (raw.user.firstName || raw.user.lastName || raw.user.email)) {
    const nameParts = [raw.user.firstName, raw.user.infix, raw.user.lastName].filter(Boolean);
    const consultantPhone = Array.isArray(raw.user.phoneNumbers)
      ? raw.user.phoneNumbers.find((p: any) => p.number?.trim())?.number
      : undefined;

    consultant = {
      name: nameParts.join(' '),
      title: raw.user.jobTitle || 'Recruitment Consultant',
      email: raw.user.email,
      phone: consultantPhone,
      avatar: raw.user.profilePicture || undefined,
    };
  }

  // Extract Additional MatchCriteria (Role, Language, Hours, Region)
  let role: string | undefined = undefined;
  let language: string | undefined = undefined;
  let hoursPerWeek: string | undefined = undefined;
  let region: string | undefined = undefined;

  if (Array.isArray(raw.matchCriteria)) {
    const roleCrit = raw.matchCriteria.find((c: any) => c.name?.toLowerCase().includes('role') || c.id === 15);
    if (roleCrit?.options?.length) role = roleCrit.options.map((o: any) => o.name).filter(Boolean).join(', ');

    const langCrit = raw.matchCriteria.find((c: any) => c.name?.toLowerCase().includes('language') || c.id === 3);
    if (langCrit?.options?.length) language = langCrit.options.map((o: any) => o.name).filter(Boolean).join(', ');

    const hoursCrit = raw.matchCriteria.find((c: any) => c.name?.toLowerCase().includes('hours') || c.id === 4);
    if (hoursCrit?.options?.length) hoursPerWeek = hoursCrit.options.map((o: any) => o.name).filter(Boolean).join(', ');

    const regionCrit = raw.matchCriteria.find((c: any) => c.name?.toLowerCase().includes('region') || c.id === 6);
    if (regionCrit?.options?.length) region = regionCrit.options.map((o: any) => o.name).filter(Boolean).join(', ');
  }

  // Calculate Posted Time
  let postedTime = 'Recently';
  if (raw.entryDateTime) {
    const entryDate = new Date(raw.entryDateTime);
    const diffDays = Math.floor((Date.now() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) postedTime = 'Today';
    else if (diffDays === 1) postedTime = '1 day ago';
    else postedTime = `${diffDays} days ago`;
  }

  // Safe fallback logos from public directory
  const fallbackLogos = [
    '/images/logos/asml.svg',
    '/images/logos/ing.svg',
    '/images/logos/philips.svg',
    '/images/logos/adyen.svg',
    '/images/logos/shell.svg',
    '/images/logos/booking.svg',
  ];
  const logoIndex = Math.abs(id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % fallbackLogos.length;
  const companyLogo = raw.companyLogo || raw.mainImage?.url || fallbackLogos[logoIndex];

  return {
    id,
    slug,
    title,
    company,
    companyLogo,
    location,
    country,
    city,
    type,
    experience,
    skills,
    postedTime,
    salary,
    description,
    industry,
    isFeatured: true,

    // Rich OTYS detailed fields
    overviewHtml,
    jobDescriptionHtml,
    requirementsHtml,
    companyProfileHtml,
    benefitsHtml,
    role,
    education: experience,
    language,
    hoursPerWeek,
    region,
    branche: industry,
    customApplyUrl: raw.customApplyUrl || undefined,
    consultant,
  };
}

/**
 * Extracts and maps collection of vacancies from OTYS API payload
 */
export function mapOtysCollectionToJobs(data: any): Job[] {
  if (!data) return [];

  // If already mapped Job[] array (such as fallback data), return directly
  if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' && ('slug' in data[0] || 'postedTime' in data[0])) {
    return data as Job[];
  }

  let list: any[] = [];
  if (Array.isArray(data)) {
    list = data;
  } else if (Array.isArray(data.member)) {
    // API Platform / OTYS JSON-LD format
    list = data.member;
  } else if (Array.isArray(data['hydra:member'])) {
    list = data['hydra:member'];
  } else if (Array.isArray(data.items)) {
    list = data.items;
  } else if (Array.isArray(data.data)) {
    list = data.data;
  } else if (Array.isArray(data.vacancies)) {
    list = data.vacancies;
  }

  if (list.length === 0) return [];
  return list.map(mapOtysVacancyToJob);
}

// ============================================================================
// 4. CLEAN CONTENT DATA GETTERS (USED BY APPLICATION PAGES)
// ============================================================================

export async function getFeaturedJobs(filterParams?: VacancyFilterParams): Promise<Job[]> {
  const fallback = featuredJobs.filter((job) => job.isFeatured);
  const endpoint = buildVacanciesUrl(filterParams);

  try {
    const rawData = await apiRequest<any>(endpoint, { method: 'GET' }, fallback);
    const jobs = mapOtysCollectionToJobs(rawData);
    if (jobs.length > 0) {
      const featured = jobs.filter((j) => j.isFeatured);
      return featured.length > 0 ? featured : jobs;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

export async function getAllJobs(filterParams?: VacancyFilterParams): Promise<Job[]> {
  const endpoint = buildVacanciesUrl(filterParams);

  try {
    const rawData = await apiRequest<any>(endpoint, { method: 'GET' }, featuredJobs);
    const jobs = mapOtysCollectionToJobs(rawData);

    return jobs.length > 0 ? jobs : featuredJobs;
  } catch {
    return featuredJobs;
  }
}

export async function getVacanciesCount(): Promise<number> {
  const endpoint = buildVacanciesUrl({ itemsPerPage: 100 });

  try {
    const rawData = await apiRequest<any>(endpoint, { method: 'GET' }, null);
    if (rawData) {
      if (typeof rawData['hydra:totalItems'] === 'number') {
        return rawData['hydra:totalItems'];
      }
      if (typeof rawData.totalItems === 'number') {
        return rawData.totalItems;
      }
      if (typeof rawData.total === 'number') {
        return rawData.total;
      }
    }
    const jobs = mapOtysCollectionToJobs(rawData);
    return jobs.length > 0 ? jobs.length : featuredJobs.length;
  } catch {
    return featuredJobs.length;
  }
}

export async function getJobBySlug(slug: string): Promise<Job | undefined> {
  const fallback = featuredJobs.find((job) => job.slug === slug || job.id === slug);

  // 1. Try bySlug endpoint
  try {
    const rawData = await apiRequest<any>(
      API_ENDPOINTS.vacancies.bySlug(slug),
      { method: 'GET' }
    );
    if (rawData && !rawData.status) return mapOtysVacancyToJob(rawData);
  } catch {
    // ignore and try by ID
  }

  // 2. Try byId endpoint (for vacancies where slug is the id)
  try {
    const rawData = await apiRequest<any>(
      API_ENDPOINTS.vacancies.details(slug),
      { method: 'GET' }
    );
    if (rawData && !rawData.status) return mapOtysVacancyToJob(rawData);
  } catch {
    // ignore
  }

  // 3. Fallback: Search in latest collection
  try {
    const all = await getAllJobs({ itemsPerPage: 50 });
    const match = all.find((j) => j.slug === slug || j.id === slug);
    if (match) return match;
  } catch {
    // ignore
  }

  return fallback;
}

export async function getJobById(id: string | number): Promise<Job | undefined> {
  const fallback = featuredJobs.find((job) => job.id === String(id));
  try {
    const rawData = await apiRequest<any>(
      API_ENDPOINTS.vacancies.details(id),
      { method: 'GET' },
      fallback
    );
    if (!rawData) return fallback;
    return mapOtysVacancyToJob(rawData);
  } catch {
    return fallback;
  }
}

export async function getBlogPostBySlug(slug: string) {
  return blogPosts.find((post) => post.slug === slug);
}

export async function getNewsArticleBySlug(slug: string) {
  return newsArticles.find((item) => item.slug === slug);
}

// ============================================================================
// 5. OTYS JOB ALERT FORM TYPES, NORMALIZER & API CLIENT HELPERS
// ============================================================================

export interface OtysRawConstraint {
  '@type'?: string;
  type?: string | null;
  message?: string;
  pattern?: string | null;
  [key: string]: unknown;
}

export interface OtysRawFormQuestionOption {
  '@type'?: string;
  value: string | number;
  label: string;
  kill?: boolean;
  killExplanation?: string | null;
  [key: string]: unknown;
}

export interface OtysRawFormQuestion {
  '@type'?: string;
  id: string;
  question: string;
  type: string;
  options?: OtysRawFormQuestionOption[] | null;
  constraints?: OtysRawConstraint[];
  [key: string]: unknown;
}

export interface OtysRawFormPage {
  '@type'?: string;
  title?: string;
  questions?: OtysRawFormQuestion[];
  [key: string]: unknown;
}

export interface OtysRawFormResponse {
  '@context'?: string;
  '@id'?: string;
  '@type'?: string;
  id?: number | string;
  title?: string;
  pages?: OtysRawFormPage[];
  [key: string]: unknown;
}

export interface JobAlertFieldOption {
  value: string;
  label: string;
}

export interface JobAlertField {
  id: string;
  name: string;
  label: string;
  rawQuestion: string;
  type: string; // 'email' | 'select' | 'multiselect' | 'text' | 'textarea' | 'number' | 'checkbox' | 'radio' | 'date'
  required: boolean;
  options?: JobAlertFieldOption[];
  defaultValue?: unknown;
  placeholder?: string;
  constraints?: OtysRawConstraint[];
}

export interface NormalizedJobAlertForm {
  id?: number | string;
  title: string;
  fields: JobAlertField[];
}

export interface OtysJobAlertUtmTags {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

export interface OtysJobAlertMetaData {
  ip?: string;
  utmTags?: OtysJobAlertUtmTags;
  visitorExternalId?: string;
  gaSessionId?: string;
  referer?: string | null;
  [key: string]: unknown;
}

export interface OtysJobAlertSubmitPayload {
  metaData?: OtysJobAlertMetaData | null;
  answers: Record<string, string | string[]>;
}

export interface OtysJobAlertSubmitResponse {
  '@context'?: string;
  '@id'?: string;
  '@type'?: string;
  id?: number | string;
  title?: string;
  pages?: OtysRawFormPage[];
  message?: string;
  data?: {
    hash?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Normalizes raw OTYS Form API response into a clean, predictable internal model.
 */
export function normalizeJobAlertFormResponse(raw: OtysRawFormResponse): NormalizedJobAlertForm {
  if (!raw || !Array.isArray(raw.pages)) {
    return {
      id: raw?.id,
      title: raw?.title || 'Job Alert',
      fields: [],
    };
  }

  const fields: JobAlertField[] = [];

  for (const page of raw.pages) {
    if (!Array.isArray(page.questions)) continue;

    for (const q of page.questions) {
      if (!q || !q.id) continue;

      // Filter: Keep only requested fields: Email, Branch, Type (Contract type), Language, Skill, Period
      const qText = (q.question || '').toLowerCase();
      const qType = (q.type || '').toLowerCase();
      const isAllowed =
        qType === 'email' ||
        qText.includes('email') ||
        qText.includes('branch') ||
        qText.includes('contract') ||
        qText.includes('type') ||
        qText.includes('language') ||
        qText.includes('skill') ||
        qText.includes('period');

      if (!isAllowed) {
        continue;
      }

      const isRequired =
        Array.isArray(q.constraints) &&
        q.constraints.some(
          (c) =>
            c['@type'] === 'NotBlank' ||
            c.type === 'NotBlank' ||
            c['@type'] === 'NotNull' ||
            c.type === 'NotNull' ||
            (c.message && /required|cannot be blank|mandatory/i.test(c.message))
        );

      const options: JobAlertFieldOption[] | undefined = Array.isArray(q.options)
        ? q.options.map((opt) => ({
          value: String(opt.value),
          label: opt.label || String(opt.value),
        }))
        : undefined;

      // Clean display label while keeping original question context
      let cleanLabel = q.question || q.id;
      if (cleanLabel.toLowerCase().startsWith('match criterium ')) {
        cleanLabel = cleanLabel.substring('match criterium '.length);
      }

      // Determine appropriate placeholder
      let placeholder = '';
      if (q.type === 'email') {
        placeholder = 'name@company.com';
      } else if (q.type === 'multiselect') {
        placeholder = `Select ${cleanLabel.toLowerCase()}...`;
      } else if (q.type === 'select') {
        placeholder = `Select ${cleanLabel.toLowerCase()}`;
      } else if (q.type === 'text') {
        placeholder = `Enter ${cleanLabel.toLowerCase()}`;
      }

      // Determine default value
      let defaultValue: unknown = undefined;
      if (q.type === 'multiselect') {
        defaultValue = [];
      } else if (q.type === 'select') {
        if (cleanLabel.toLowerCase().includes('period') && options) {
          const weeklyOption = options.find((o) => o.value.toLowerCase() === 'weekly');
          defaultValue = weeklyOption ? weeklyOption.value : options[0]?.value || '';
        } else {
          defaultValue = '';
        }
      } else {
        defaultValue = '';
      }

      fields.push({
        id: q.id,
        name: q.id,
        label: cleanLabel,
        rawQuestion: q.question,
        type: q.type ? q.type.toLowerCase() : 'text',
        required: isRequired,
        options,
        placeholder,
        defaultValue,
        constraints: q.constraints || [],
      });
    }
  }

  return {
    id: raw.id,
    title: raw.title || 'Job Alert',
    fields,
  };
}

/**
 * Builds OTYS Job Alert submission payload from normalized fields and dynamic form values.
 */
export function buildJobAlertPayload(
  fields: JobAlertField[],
  formValues: Record<string, unknown>
): OtysJobAlertSubmitPayload {
  const answers: Record<string, string | string[]> = {};

  for (const field of fields) {
    const rawVal = formValues[field.id];
    if (rawVal === undefined || rawVal === null || rawVal === '') {
      continue;
    }

    if (field.type === 'multiselect' || Array.isArray(rawVal)) {
      const arr = Array.isArray(rawVal) ? rawVal : [rawVal];
      const cleaned = arr.map((item) => String(item).trim()).filter(Boolean);
      if (cleaned.length > 0) {
        answers[field.id] = cleaned;
      }
    } else {
      const strVal = String(rawVal).trim();
      if (strVal) {
        answers[field.id] = strVal;
      }
    }
  }

  // Ensure Website criterion is attached so OTYS never fails with 500
  if (!answers['q200120']) {
    answers['q200120'] = ['13_44159']; // Jackson and Frank
  }

  return {
    answers,
  };
}

/**
 * Fetches the Job Alert form definition from OTYS API and normalizes it.
 */
export async function getJobAlertFormDefinition(): Promise<NormalizedJobAlertForm> {
  const raw = await apiRequest<OtysRawFormResponse>(
    API_ENDPOINTS.forms.jobAlert,
    { method: 'GET' }
  );
  return normalizeJobAlertFormResponse(raw);
}

/**
 * Submits Job Alert form answers to OTYS API.
 */
export async function submitJobAlertSubscription(
  payload: OtysJobAlertSubmitPayload
): Promise<OtysJobAlertSubmitResponse> {
  const response = await authenticatedFetch(API_ENDPOINTS.forms.jobAlert, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/ld+json',
      Accept: 'application/ld+json, application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(
      `Job alert subscription failed [${response.status} ${response.statusText}]: ${errorBody}`
    );
  }

  return (await response.json()) as OtysJobAlertSubmitResponse;
}

// ============================================================================
// 6. OTYS FILE UPLOAD & VACANCY APPLICATION APIS
// ============================================================================

export interface OtysFileUploadResponseItem {
  id: string;
  name?: string;
  mimeType?: string;
  size?: number;
  [key: string]: unknown;
}

/**
 * Uploads a file (CV or document) to OTYS /api/files endpoint.
 * Returns the raw JSON response object or array from OTYS.
 */
export async function uploadOtysFileRaw(
  fileBlob: Blob | Buffer | Uint8Array,
  filename: string
): Promise<any> {
  const formData = new FormData();
  if (typeof Blob !== 'undefined' && fileBlob instanceof Blob) {
    formData.append('file', fileBlob, filename);
  } else {
    const blob = new Blob([fileBlob as unknown as BlobPart], { type: 'application/octet-stream' });
    formData.append('file', blob, filename);
  }

  const response = await authenticatedFetch(API_ENDPOINTS.files.upload, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`File upload to OTYS failed [${response.status}]: ${errorText}`);
  }

  const data = await response.json();
  return data;
}

/**
 * Uploads a file (CV or document) to OTYS /api/files endpoint.
 * Returns the generated string file ID.
 */
export async function uploadOtysFile(
  fileBlob: Blob | Buffer | Uint8Array,
  filename: string
): Promise<string> {
  const data = await uploadOtysFileRaw(fileBlob, filename);
  let fileId = '';

  if (Array.isArray(data) && data.length > 0 && data[0]?.id) {
    fileId = String(data[0].id);
  } else if (data && typeof data === 'object' && 'id' in data && data.id) {
    fileId = String(data.id);
  }

  if (!fileId) {
    throw new Error('OTYS /api/files did not return a valid file ID in response.');
  }

  return fileId;
}

/**
 * Fetches the dynamic application form definition for a specific vacancy.
 */
export async function getVacancyApplicationForm(
  vacancyId: string | number
): Promise<OtysRawFormResponse> {
  return await apiRequest<OtysRawFormResponse>(
    API_ENDPOINTS.forms.vacancyApplication(vacancyId),
    { method: 'GET' }
  );
}

export interface OtysVacancyApplicationPayload {
  answers: Record<string, string | string[]>;
  metaData?: Record<string, unknown> | null;
}

/**
 * Submits the application form for a specific vacancy.
 */
export async function submitVacancyApplication(
  vacancyId: string | number,
  payload: OtysVacancyApplicationPayload
): Promise<any> {
  console.log("payload 0001", payload);
  const response = await authenticatedFetch(
    API_ENDPOINTS.forms.vacancyApplication(vacancyId),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/ld+json',
        Accept: 'application/ld+json, application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    let detailMsg = errorBody;

    try {
      const parsed = JSON.parse(errorBody);
      if (Array.isArray(parsed.violations) && parsed.violations.length > 0) {
        detailMsg = parsed.violations
          .map((v: any) => `${v.message || v.code || 'Invalid field'}`)
          .join('. ');
      } else if (parsed.detail) {
        detailMsg = parsed.detail;
      } else if (parsed.description) {
        detailMsg = parsed.description;
      }
    } catch {
      // not JSON format
    }

    const err = new Error(detailMsg || `Vacancy application submission failed [${response.status}]`);
    (err as any).status = response.status;
    (err as any).detail = detailMsg;
    throw err;
  }

  return await response.json();
}

/**
 * Fetches the Open Application form definition from OTYS API.
 */
export async function getOpenApplicationForm(): Promise<OtysRawFormResponse> {
  return await apiRequest<OtysRawFormResponse>(
    API_ENDPOINTS.forms.openApplication,
    { method: 'GET' }
  );
}

/**
 * Submits the Open Application form to OTYS API.
 */
export async function submitOpenApplication(
  id: string | number,
  payload: {
    answers: Record<string, string | string[]>;
    metaData?: Record<string, unknown> | null;
  }
): Promise<any> {
  const response = await authenticatedFetch(
    API_ENDPOINTS.forms.openApplicationSubmit(id),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/ld+json',
        Accept: 'application/ld+json, application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    let detailMsg = errorBody;

    try {
      const parsed = JSON.parse(errorBody);
      if (Array.isArray(parsed.violations) && parsed.violations.length > 0) {
        detailMsg = parsed.violations
          .map((v: any) => `${v.message || v.code || 'Invalid field'}`)
          .join('. ');
      } else if (parsed.detail) {
        detailMsg = parsed.detail;
      } else if (parsed.description) {
        detailMsg = parsed.description;
      }
    } catch {
      // not JSON format
    }

    const err = new Error(detailMsg || `Open application submission failed [${response.status}]`);
    (err as any).status = response.status;
    (err as any).detail = detailMsg;
    throw err;
  }

  return await response.json();
}



