/**
 * OTYS Web Services (OWS) Client & Candidate Dossier Integration
 *
 * Implements the official OTYS Web Services (OWS) v1.5 protocol for:
 * 1. JSON-RPC 2.0 communication (https://ows.otys.nl/jservice.php)
 * 2. Session management (loginByUid, logout)
 * 3. Candidate creation & lookup (Otys.Services.CandidateService)
 * 4. File uploads to OWS fileService (https://ows.otys.nl/fileService.php)
 * 5. Dossier file binding (Otys.Services.AttachedDocumentsService.add)
 *
 * This ensures that uploaded CVs appear directly in the Candidate's Dossier in OTYS Go!
 */

const OWS_RPC_ENDPOINT = 'https://ows.otys.nl/jservice.php';
const OWS_FILE_ENDPOINT = 'https://ows.otys.nl/fileService.php';

function getOwsApiKey(): string {
  const apiKey =
    process.env.OTYS_API_KEY?.trim() ||
    process.env.APP_AUTH_KEY?.trim() ||
    '';
  if (!apiKey) {
    throw new Error('Missing OTYS_API_KEY for OWS integration.');
  }
  return apiKey;
}

export interface OwsRpcResponse<T = unknown> {
  result?: T;
  error?: {
    message: string;
    code: number;
    data?: unknown;
  };
  id: number | string;
}

/**
 * Low-level JSON-RPC 2.0 caller for OTYS OWS.
 */
export async function callOwsRpc<T = unknown>(
  method: string,
  params: unknown[] = [],
  id = 1
): Promise<T> {
  const payload = {
    jsonrpc: '2.0',
    method,
    params,
    id,
  };

  const response = await fetch(OWS_RPC_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`OWS HTTP error [${response.status}]: ${errorText}`);
  }

  const data = (await response.json()) as OwsRpcResponse<T>;

  if (data.error) {
    throw new Error(`OWS RPC error on '${method}': ${data.error.message} (code ${data.error.code})`);
  }

  return data.result as T;
}

/**
 * Logs in with the API key and returns a valid session token.
 */
export async function loginOws(): Promise<string> {
  const apiKey = getOwsApiKey();
  const sessionToken = await callOwsRpc<string>('loginByUid', [apiKey]);
  if (!sessionToken) {
    throw new Error('OWS loginByUid returned empty session token.');
  }
  return sessionToken;
}

/**
 * Logs out and invalidates the session token.
 */
export async function logoutOws(sessionToken: string): Promise<boolean> {
  try {
    return await callOwsRpc<boolean>('logout', [sessionToken]);
  } catch (err) {
    console.warn('[OWS Logout Warning]:', err);
    return false;
  }
}

/**
 * Uploads a file (CV) to https://ows.otys.nl/fileService.php
 * Returns the file's OUID on the OTYS server.
 */
export async function uploadFileToOws(
  sessionToken: string,
  fileContent: Blob | Buffer | Uint8Array,
  fileName: string
): Promise<string> {
  const formData = new FormData();
  formData.append('sessionId', sessionToken);

  if (typeof Blob !== 'undefined' && fileContent instanceof Blob) {
    formData.append('file', fileContent, fileName);
  } else {
    const blob = new Blob([fileContent as unknown as BlobPart], { type: 'application/pdf' });
    formData.append('file', blob, fileName);
  }

  const response = await fetch(OWS_FILE_ENDPOINT, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`OWS File Upload failed [${response.status}]: ${errorText}`);
  }

  const data = (await response.json()) as Record<string, { ouid: string; name?: string }>;
  console.log('[OWS File Upload Raw Response]:', JSON.stringify(data));

  // OWS returns: { "filename.pdf": { "ouid": "...", ... } }
  let fileOuid = '';
  if (data && typeof data === 'object') {
    const firstKey = Object.keys(data)[0];
    if (firstKey && data[firstKey]?.ouid) {
      fileOuid = data[firstKey].ouid;
    }
  }

  if (!fileOuid) {
    throw new Error(`OWS File upload did not return a valid OUID. Response: ${JSON.stringify(data)}`);
  }

  return fileOuid;
}

/**
 * Finds an existing candidate in OTYS by first name and last name.
 */
export async function findCandidateInOws(
  sessionToken: string,
  firstName: string,
  lastName: string
): Promise<string | null> {
  try {
    const result = await callOwsRpc<{
      listOutput?: Array<{ uid: string; Person?: { firstName?: string; lastName?: string } }>;
    }>('Otys.Services.CandidateService.getListEx', [
      sessionToken,
      {
        what: {
          uid: 1,
          Person: {
            firstName: 1,
            lastName: 1,
          },
        },
        condition: {
          type: 'AND',
          items: [
            {
              type: 'COND',
              field: 'Person.firstName',
              op: 'EQ',
              param: firstName.trim(),
            },
            {
              type: 'COND',
              field: 'Person.lastName',
              op: 'EQ',
              param: lastName.trim(),
            },
          ],
        },
        sort: {
          uid: 'DESC',
        },
        limit: 1,
      },
    ]);

    if (result?.listOutput && result.listOutput.length > 0 && result.listOutput[0].uid) {
      return result.listOutput[0].uid;
    }
  } catch (err) {
    console.warn('[OWS Find Candidate Warning]:', err);
  }
  return null;
}

/**
 * Creates a candidate in OTYS via OWS CandidateService.add.
 * Status ID -1 means "Via website".
 */
export async function createCandidateInOws(
  sessionToken: string,
  firstName: string,
  lastName: string
): Promise<string> {
  const result = await callOwsRpc<string>('Otys.Services.CandidateService.add', [
    sessionToken,
    {
      Person: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      },
      statusId: -1, // -1 is "Via website" status in OTYS
    },
  ]);

  if (!result) {
    throw new Error('CandidateService.add did not return a valid candidate UID.');
  }

  return result;
}

/**
 * Ensures candidate exists in OTYS (finds existing or creates a new one).
 */
export async function getOrCreateCandidateOuid(
  sessionToken: string,
  firstName: string,
  lastName: string
): Promise<string> {
  const existingUid = await findCandidateInOws(sessionToken, firstName, lastName);
  if (existingUid) {
    console.log(`[OWS] Found existing candidate with UID: ${existingUid}`);
    return existingUid;
  }

  console.log(`[OWS] Creating new candidate for ${firstName} ${lastName}...`);
  const newUid = await createCandidateInOws(sessionToken, firstName, lastName);
  console.log(`[OWS] Created candidate with UID: ${newUid}`);
  return newUid;
}

/**
 * Binds an uploaded file to the candidate's Dossier in OTYS Go!
 * Type '1' is the official standard OTYS document type for 'CV'.
 */
export async function attachDocumentToCandidateDossier(
  sessionToken: string,
  candidateUid: string,
  fileUid: string,
  candidateName: string
): Promise<string> {
  const result = await callOwsRpc<string>('Otys.Services.AttachedDocumentsService.add', [
    sessionToken,
    {
      candidateUid,
      fileUid,
      typeId: '1', // '1' is 'CV' in AttachedDocumentsService option lists
      subject: `CV ${candidateName}`.trim(),
    },
  ]);

  console.log(`[OWS] Successfully attached CV to Candidate Dossier! Dossier ID: ${result}`);
  return result;
}

/**
 * Complete Workflow:
 * 1. Log in to OWS
 * 2. Upload file to OWS fileService
 * 3. Find or create candidate in OWS
 * 4. Attach CV to candidate's Dossier
 * 5. Log out
 */
export async function attachCvToCandidateDossierWorkflow(params: {
  fileContent: Blob | Buffer | Uint8Array;
  fileName: string;
  firstName: string;
  lastName: string;
  candidateUid?: string | null;
}): Promise<{ candidateUid: string; fileUid: string; dossierId: string }> {
  const { fileContent, fileName, firstName, lastName } = params;
  const candidateName = `${firstName} ${lastName}`.trim();

  const sessionToken = await loginOws();
  try {
    // 1. Upload file to OWS
    console.log(`[OWS Workflow] Uploading file '${fileName}' to OWS fileService...`);
    const fileUid = await uploadFileToOws(sessionToken, fileContent, fileName);
    console.log(`[OWS Workflow] File uploaded, OUID: ${fileUid}`);

    // 2. Resolve candidate UID (use provided or lookup/create)
    let cUid = params.candidateUid;
    if (!cUid) {
      cUid = await getOrCreateCandidateOuid(sessionToken, firstName, lastName);
    }

    // 3. Attach file to Candidate Dossier
    console.log(`[OWS Workflow] Attaching file '${fileUid}' to candidate '${cUid}' dossier...`);
    const dossierId = await attachDocumentToCandidateDossier(
      sessionToken,
      cUid,
      fileUid,
      candidateName
    );

    return {
      candidateUid: cUid,
      fileUid,
      dossierId,
    };
  } finally {
    await logoutOws(sessionToken);
  }
}
