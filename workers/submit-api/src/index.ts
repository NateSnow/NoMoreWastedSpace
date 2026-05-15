/**
 * Email Submission API Worker
 *
 * Cloudflare Worker that handles spec file submissions from the
 * Gridfinity Drawer Designer. Receives a spec file and contact email,
 * then sends the spec file to the configured operator email via Resend.
 *
 * Requirements: 6.4, 6.5, 6.6, 6.7
 */

export interface Env {
  /** Operator email address to receive spec files. */
  OPERATOR_EMAIL: string;
  /** Resend API key for sending emails. */
  RESEND_API_KEY: string;
  /** Verified sender email address for Resend. */
  FROM_EMAIL: string;
}

/** Shape of the incoming request body. */
interface SubmitRequestBody {
  specFile: unknown;
  contactEmail: string;
}

/** Shape of the success response. */
interface SubmitSuccessResponse {
  success: true;
  operatorEmail: string;
}

/** Shape of the error response. */
interface SubmitErrorResponse {
  success: false;
  error: string;
}

/** Simple email validation regex. */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Timeout for the Resend API call (30 seconds). */
const EMAIL_SEND_TIMEOUT_MS = 30_000;

/**
 * Validate the request body for required fields and email format.
 */
function validateRequestBody(
  body: unknown
): { valid: true; data: SubmitRequestBody } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const obj = body as Record<string, unknown>;

  if (!obj.specFile) {
    return { valid: false, error: 'Missing required field: specFile' };
  }

  if (!obj.contactEmail || typeof obj.contactEmail !== 'string') {
    return { valid: false, error: 'Missing required field: contactEmail' };
  }

  const email = obj.contactEmail.trim();
  if (!EMAIL_REGEX.test(email)) {
    return { valid: false, error: 'Invalid email format for contactEmail' };
  }

  return {
    valid: true,
    data: { specFile: obj.specFile, contactEmail: email },
  };
}

/**
 * Send the spec file to the operator email via Resend API.
 * Enforces a 30-second timeout on the email send operation.
 */
async function sendEmail(
  specFile: unknown,
  contactEmail: string,
  env: Env
): Promise<{ success: boolean; error?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), EMAIL_SEND_TIMEOUT_MS);

  try {
    const specFileContent = JSON.stringify(specFile, null, 2);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: env.FROM_EMAIL,
        to: [env.OPERATOR_EMAIL],
        subject: `Gridfinity Drawer Design Submission from ${contactEmail}`,
        text: [
          'New Gridfinity Drawer Design Submission',
          '',
          `Contact Email: ${contactEmail}`,
          '',
          'Spec File:',
          '---',
          specFileContent,
        ].join('\n'),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'Unknown error');
      return {
        success: false,
        error: `Email service returned status ${response.status}: ${errorBody}`,
      };
    }

    return { success: true };
  } catch (error: unknown) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      return { success: false, error: 'Email sending timed out after 30 seconds' };
    }

    const message =
      error instanceof Error ? error.message : 'Unknown error sending email';
    return { success: false, error: message };
  }
}

/**
 * Create a JSON response with CORS headers.
 */
function jsonResponse(
  body: SubmitSuccessResponse | SubmitErrorResponse,
  status: number
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

/**
 * Handle CORS preflight requests.
 */
function handleOptions(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleOptions();
    }

    // Only handle POST /api/submit
    if (url.pathname !== '/api/submit') {
      return jsonResponse(
        { success: false, error: 'Not found' },
        404
      );
    }

    if (request.method !== 'POST') {
      return jsonResponse(
        { success: false, error: 'Method not allowed. Use POST.' },
        405
      );
    }

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonResponse(
        { success: false, error: 'Invalid JSON in request body' },
        400
      );
    }

    // Validate request body
    const validation = validateRequestBody(body);
    if (!validation.valid) {
      return jsonResponse(
        { success: false, error: validation.error },
        400
      );
    }

    const { specFile, contactEmail } = validation.data;

    // Send email via Resend
    const emailResult = await sendEmail(specFile, contactEmail, env);

    if (!emailResult.success) {
      return jsonResponse(
        { success: false, error: emailResult.error ?? 'Failed to send email' },
        500
      );
    }

    // Success
    return jsonResponse(
      { success: true, operatorEmail: env.OPERATOR_EMAIL },
      200
    );
  },
} satisfies ExportedHandler<Env>;
