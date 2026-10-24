/**
 * Hand-maintained OpenAPI 3.1 descriptor for the public API surface.
 *
 * This file is the single source of truth for API documentation. We keep it
 * hand-maintained (rather than auto-generating from the Zod schemas) because
 * the generated output needs manual annotation anyway — descriptions,
 * examples, operation grouping, auth scopes. The Zod schemas are still the
 * runtime source of validation truth; this file mirrors them for callers.
 *
 * To add a new endpoint:
 *   1. Add the route definition under `paths`.
 *   2. If it uses a new body/response shape, add it to `components.schemas`.
 *   3. Visit `/docs` to confirm the UI renders correctly.
 */

type OAPIDoc = {
  openapi: '3.1.0';
  info: Record<string, unknown>;
  servers: Array<{ url: string; description?: string }>;
  tags: Array<{ name: string; description?: string }>;
  paths: Record<string, Record<string, unknown>>;
  components: {
    securitySchemes: Record<string, unknown>;
    schemas: Record<string, unknown>;
    responses: Record<string, unknown>;
  };
  security: Array<Record<string, string[]>>;
};

const commonErrorResponse = {
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
};

const errorRefs = {
  '400': { description: 'Validation error', ...commonErrorResponse },
  '401': { description: 'Not authenticated', ...commonErrorResponse },
  '403': { description: 'Forbidden or missing CSRF token', ...commonErrorResponse },
  '404': { description: 'Not found', ...commonErrorResponse },
  '409': { description: 'Conflict / illegal state transition', ...commonErrorResponse },
  '429': { description: 'Rate limited', ...commonErrorResponse },
  '500': { description: 'Internal error', ...commonErrorResponse },
};

export function buildOpenApiDocument(baseUrl: string): OAPIDoc {
  return {
    openapi: '3.1.0',
    info: {
      title: 'DP(Navy) Procurement API',
      version: process.env.npm_package_version ?? '0.1.0',
      description:
        'HTTP API for the DP(Navy) Procurement workflow. All mutating endpoints require ' +
        'a valid NextAuth session cookie **and** the `X-CSRF-Token` header matching the ' +
        '`csrf_token` cookie. Read endpoints only require the session cookie.',
      contact: { name: 'DP-N Procurement', email: 'no-reply@localhost' },
    },
    servers: [{ url: baseUrl, description: 'Current host' }],
    tags: [
      { name: 'Indent',        description: 'Indent lifecycle — create, submit, list, detail' },
      { name: 'Approval',      description: 'Chain approvals across INDENT / IT / CST subjects' },
      { name: 'IT Proforma',   description: 'Invitation to Tender preparation and dispatch' },
      { name: 'Technical',     description: 'Technical offers + TSR workflow' },
      { name: 'Commercial',    description: 'Commercial offers and CST' },
      { name: 'PR',            description: 'Purchase Requisitions' },
      { name: 'Attachments',   description: 'Multipart upload + download' },
      { name: 'Notifications', description: 'In-app notification bell' },
      { name: 'Comments',      description: 'Threaded comments / activity feed' },
      { name: 'Admin',         description: 'Admin-only CRUD, imports, audit' },
      { name: 'Auth',          description: 'Sign-in, password reset, 2FA enrollment' },
      { name: 'Health',        description: 'Liveness / readiness probes' },
    ],
    security: [{ sessionCookie: [], csrfToken: [] }],
    components: {
      securitySchemes: {
        sessionCookie: {
          type: 'apiKey',
          in: 'cookie',
          name: 'next-auth.session-token',
          description: 'NextAuth JWT session cookie.',
        },
        csrfToken: {
          type: 'apiKey',
          in: 'header',
          name: 'X-CSRF-Token',
          description: 'Double-submit CSRF token. Must match the `csrf_token` cookie.',
        },
      },
      responses: errorRefs,
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
                requestId: { type: 'string' },
                fields: { type: 'object', additionalProperties: { type: 'string' } },
              },
              required: ['code', 'message'],
            },
          },
          required: ['error'],
        },
        Ulid: { type: 'string', pattern: '^[A-Z0-9]{26}$' },
        MoneyMinor: {
          type: 'object',
          properties: {
            amountMinor: { type: 'string', description: 'Non-negative integer, scaled by 10^4.' },
            currency: { type: 'string', minLength: 3, maxLength: 3 },
          },
          required: ['amountMinor', 'currency'],
        },
        CreateIndent: {
          type: 'object',
          required: ['subject', 'type', 'estimatedValueMinor', 'currency', 'fiscalYearId', 'budgetHeadId', 'items'],
          properties: {
            subject: { type: 'string', maxLength: 500 },
            justification: { type: 'string', maxLength: 10000 },
            type: { type: 'string', enum: ['NORMAL', 'PROPRIETY'] },
            priority: { type: 'string', enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'], default: 'NORMAL' },
            estimatedValueMinor: { type: 'string', pattern: '^\\d+$' },
            currency: { type: 'string', pattern: '^[A-Z]{3}$' },
            fiscalYearId: { $ref: '#/components/schemas/Ulid' },
            budgetHeadId: { $ref: '#/components/schemas/Ulid' },
            items: {
              type: 'array', minItems: 1, maxItems: 500,
              items: {
                type: 'object',
                required: ['lineNo', 'description', 'quantity', 'uom', 'estimatedUnitPriceMinor', 'currency'],
                properties: {
                  lineNo: { type: 'integer', minimum: 1 },
                  itemCode: { type: 'string', maxLength: 80 },
                  description: { type: 'string', maxLength: 1000 },
                  specifications: { type: 'object', additionalProperties: true },
                  quantity: { type: 'number', exclusiveMinimum: 0 },
                  uom: { type: 'string', maxLength: 20 },
                  estimatedUnitPriceMinor: { type: 'string', pattern: '^\\d+$' },
                  currency: { type: 'string', pattern: '^[A-Z]{3}$' },
                },
              },
            },
          },
        },
        DecideApproval: {
          type: 'object', required: ['decision'],
          properties: {
            decision: { type: 'string', enum: ['APPROVED', 'REJECTED', 'RETURNED'] },
            comments: { type: 'string', maxLength: 10000 },
          },
        },
        CreateITProforma: {
          type: 'object', required: ['indentId', 'reference', 'invitedFirmIds'],
          properties: {
            indentId: { $ref: '#/components/schemas/Ulid' },
            reference: { type: 'string', minLength: 5, maxLength: 60 },
            checklist: { type: 'object', additionalProperties: true },
            invitedFirmIds: { type: 'array', minItems: 1, maxItems: 200, items: { $ref: '#/components/schemas/Ulid' } },
          },
        },
        DispatchIT: {
          type: 'object', required: ['closingAt'],
          properties: { closingAt: { type: 'string', format: 'date-time' } },
        },
        EvaluateOffer: {
          type: 'object', required: ['technicalOfferId', 'verdict'],
          properties: {
            technicalOfferId: { $ref: '#/components/schemas/Ulid' },
            verdict: { type: 'string', enum: ['ACCEPTED', 'REJECTED', 'NEEDS_QUERY'] },
            remarks: { type: 'string', maxLength: 10000 },
          },
        },
      },
    },
    paths: {
      '/api/health': {
        get: {
          tags: ['Health'], summary: 'Liveness + per-component readiness probe',
          security: [], // explicitly unauthenticated
          responses: {
            '200': { description: 'All critical components OK' },
            '503': { description: 'DB or other critical component is down' },
          },
        },
      },
      '/api/openapi.json': {
        get: {
          tags: ['Health'], summary: 'This document',
          security: [],
          responses: { '200': { description: 'OpenAPI 3.1 descriptor' } },
        },
      },

      '/api/indents': {
        get: {
          tags: ['Indent'], summary: 'List visible indents (paginated)',
          parameters: [
            { name: 'page',     in: 'query', schema: { type: 'integer', minimum: 1 } },
            { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 200 } },
            { name: 'status',   in: 'query', schema: { type: 'string' }, description: 'Comma-separated statuses.' },
            { name: 'search',   in: 'query', schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'OK' }, ...errorRefs },
        },
        post: {
          tags: ['Indent'], summary: 'Create a new draft indent',
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateIndent' } } } },
          responses: { '201': { description: 'Created' }, ...errorRefs },
        },
      },
      '/api/indents/{id}': {
        get: {
          tags: ['Indent'], summary: 'Fetch an indent by id',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/Ulid' } }],
          responses: { '200': { description: 'OK' }, ...errorRefs },
        },
      },
      '/api/indents/{id}/submit': {
        post: {
          tags: ['Indent'], summary: 'Submit a draft indent to CR',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/Ulid' } }],
          responses: { '200': { description: 'OK' }, ...errorRefs },
        },
      },
      '/api/indents/{id}/observations': {
        post: {
          tags: ['Indent'], summary: 'ADP raises an observation on an indent in ADP_VETTING',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/Ulid' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['note'], properties: { note: { type: 'string', maxLength: 10000 }, raisedToUserId: { $ref: '#/components/schemas/Ulid' } } } } } },
          responses: { '201': { description: 'Created' }, ...errorRefs },
        },
      },
      '/api/indents/{id}/observations/resolve': {
        post: {
          tags: ['Indent'], summary: 'Indenter resolves all open observations and returns the file',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/Ulid' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['resolution'], properties: { resolution: { type: 'string', maxLength: 10000 } } } } } },
          responses: { '200': { description: 'OK' }, ...errorRefs },
        },
      },
      '/api/indents/{id}/comments': {
        post: {
          tags: ['Comments'], summary: 'Post a comment on an indent (with optional @mention)',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/Ulid' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['body'], properties: { body: { type: 'string', maxLength: 10000 }, parentId: { $ref: '#/components/schemas/Ulid' } } } } } },
          responses: { '201': { description: 'Created' }, ...errorRefs },
        },
      },
      '/api/comments/{id}': {
        delete: {
          tags: ['Comments'], summary: 'Soft-delete a comment (own or admin only)',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/Ulid' } }],
          responses: { '200': { description: 'Deleted' }, ...errorRefs },
        },
      },
      '/api/indents/export': {
        get: {
          tags: ['Indent'], summary: 'Export indents as CSV (filter via query)',
          parameters: [
            { name: 'status', in: 'query', schema: { type: 'string' } },
            { name: 'q',      in: 'query', schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'text/csv body' }, ...errorRefs },
        },
      },

      '/api/approvals/{id}/decide': {
        post: {
          tags: ['Approval'], summary: 'Decide the current step of an approval chain',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/Ulid' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/DecideApproval' } } } },
          responses: { '200': { description: 'OK' }, ...errorRefs },
        },
      },

      '/api/it-proformas': {
        post: {
          tags: ['IT Proforma'], summary: 'Create a new IT Issue Proforma',
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateITProforma' } } } },
          responses: { '201': { description: 'Created' }, ...errorRefs },
        },
      },
      '/api/it-proformas/{id}/start-approval': {
        post: {
          tags: ['IT Proforma'], summary: 'Send the IT into Chain #2 (AD → DD → DP(N))',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/Ulid' } }],
          responses: { '200': { description: 'OK' }, ...errorRefs },
        },
      },
      '/api/it-proformas/{id}/dispatch': {
        post: {
          tags: ['IT Proforma'], summary: 'Dispatch the approved IT to invited firms',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/Ulid' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/DispatchIT' } } } },
          responses: { '200': { description: 'OK' }, ...errorRefs },
        },
      },

      '/api/technical-offers': {
        post: {
          tags: ['Technical'], summary: 'Firm submits a technical offer',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['itPerformaId'], properties: { itPerformaId: { $ref: '#/components/schemas/Ulid' }, documentKey: { type: 'string' }, remarks: { type: 'string' } } } } } },
          responses: { '201': { description: 'Created' }, ...errorRefs },
        },
      },
      '/api/tsrs': {
        post: {
          tags: ['Technical'], summary: 'Inspectorate starts a TSR',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['itPerformaId'], properties: { itPerformaId: { $ref: '#/components/schemas/Ulid' } } } } } },
          responses: { '201': { description: 'Created' }, ...errorRefs },
        },
      },
      '/api/tsrs/{id}/evaluate': {
        post: {
          tags: ['Technical'], summary: 'Record a verdict for one technical offer',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/Ulid' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/EvaluateOffer' } } } },
          responses: { '200': { description: 'OK' }, ...errorRefs },
        },
      },
      '/api/tsrs/{id}/queries': {
        post: {
          tags: ['Technical'], summary: 'Raise a query to a firm',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/Ulid' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['firmId', 'question'], properties: { firmId: { $ref: '#/components/schemas/Ulid' }, question: { type: 'string', maxLength: 10000 } } } } } },
          responses: { '201': { description: 'Created' }, ...errorRefs },
        },
      },
      '/api/tsrs/{id}/queries/answer': {
        post: {
          tags: ['Technical'], summary: 'Firm answers a query',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/Ulid' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['queryId', 'response'], properties: { queryId: { $ref: '#/components/schemas/Ulid' }, response: { type: 'string', maxLength: 10000 } } } } } },
          responses: { '200': { description: 'OK' }, ...errorRefs },
        },
      },
      '/api/tsrs/{id}/complete': {
        post: {
          tags: ['Technical'], summary: 'Complete the TSR; opens commercial for accepted firms',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/Ulid' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['summary'], properties: { summary: { type: 'string', maxLength: 10000 } } } } } },
          responses: { '200': { description: 'OK' }, ...errorRefs },
        },
      },

      '/api/commercial-offers': {
        post: {
          tags: ['Commercial'], summary: 'Open a commercial envelope from a technically-accepted firm',
          responses: { '201': { description: 'Created' }, ...errorRefs },
        },
      },
      '/api/csts': {
        post: { tags: ['Commercial'], summary: 'Prepare a CST ranking the opened commercial offers', responses: { '201': { description: 'Created' }, ...errorRefs } },
      },
      '/api/csts/{id}/start-approval': {
        post: {
          tags: ['Commercial'], summary: 'Send the CST into Chain #3',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/Ulid' } }],
          responses: { '200': { description: 'OK' }, ...errorRefs },
        },
      },

      '/api/prs': {
        post: { tags: ['PR'], summary: 'Issue a Purchase Requisition', responses: { '201': { description: 'Created' }, ...errorRefs } },
      },
      '/api/prs/{id}/send':        { post: { tags: ['PR'], summary: 'Mark PR as sent (faxed)', parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/Ulid' } }], responses: { '200': { description: 'OK' }, ...errorRefs } } },
      '/api/prs/{id}/acknowledge': { post: { tags: ['PR'], summary: 'Firm acknowledges a sent PR', parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/Ulid' } }], responses: { '200': { description: 'OK' }, ...errorRefs } } },
      '/api/prs/{id}/close':       { post: { tags: ['PR'], summary: 'Close the PR and the owning indent', parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/Ulid' } }], responses: { '200': { description: 'OK' }, ...errorRefs } } },

      '/api/attachments': {
        post: {
          tags: ['Attachments'], summary: 'Upload an attachment (multipart/form-data)',
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object', required: ['subject', 'subjectId', 'file'],
                  properties: {
                    subject: { type: 'string', enum: ['INDENT', 'IT_PROFORMA', 'TECH_OFFER', 'COMMERCIAL_OFFER', 'TSR', 'CST', 'PR', 'OBSERVATION'] },
                    subjectId: { $ref: '#/components/schemas/Ulid' },
                    file: { type: 'string', format: 'binary' },
                  },
                },
              },
            },
          },
          responses: { '201': { description: 'Created' }, ...errorRefs },
        },
      },
      '/api/attachments/{id}/download': {
        get: {
          tags: ['Attachments'], summary: 'Stream an attachment back to the caller',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/Ulid' } }],
          responses: { '200': { description: 'Binary stream' }, ...errorRefs },
        },
      },

      '/api/notifications':                    { get:  { tags: ['Notifications'], summary: 'List my notifications', responses: { '200': { description: 'OK' }, ...errorRefs } } },
      '/api/notifications/unread-count':       { get:  { tags: ['Notifications'], summary: 'Current unread count',  responses: { '200': { description: 'OK' }, ...errorRefs } } },
      '/api/notifications/{id}/read':          { post: { tags: ['Notifications'], summary: 'Mark one notification read', parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/Ulid' } }], responses: { '200': { description: 'OK' }, ...errorRefs } } },
      '/api/notifications/read-all':           { post: { tags: ['Notifications'], summary: 'Mark every unread notification read', responses: { '200': { description: 'OK' }, ...errorRefs } } },

      '/api/auth/forgot-password': {
        post: {
          tags: ['Auth'], summary: 'Request a password reset email',
          security: [], // unauthenticated
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email' } } } } } },
          responses: { '200': { description: 'Always OK (no user enumeration)' }, '429': errorRefs['429'] },
        },
      },
      '/api/auth/reset-password': {
        post: {
          tags: ['Auth'], summary: 'Consume a reset token and set a new password',
          security: [],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['id', 'token', 'password'], properties: { id: { $ref: '#/components/schemas/Ulid' }, token: { type: 'string', minLength: 64, maxLength: 64 }, password: { type: 'string', minLength: 10 } } } } } },
          responses: { '200': { description: 'OK' }, ...errorRefs },
        },
      },
      '/api/me/2fa/start':   { post: { tags: ['Auth'], summary: 'Begin TOTP enrollment', responses: { '200': { description: 'Returns `secret` + otpauth URI' }, ...errorRefs } } },
      '/api/me/2fa/verify':  { post: { tags: ['Auth'], summary: 'Confirm TOTP enrollment with a 6-digit code', responses: { '200': { description: 'OK' }, ...errorRefs } } },
      '/api/me/2fa/disable': { post: { tags: ['Auth'], summary: 'Disable TOTP (requires a current code)', responses: { '200': { description: 'OK' }, ...errorRefs } } },

      '/api/admin/users':       { get: { tags: ['Admin'], summary: 'List users (ADMIN only)', responses: { '200': { description: 'OK' }, ...errorRefs } }, post: { tags: ['Admin'], summary: 'Create a user', responses: { '201': { description: 'Created' }, ...errorRefs } } },
      '/api/admin/users/{id}':  { get: { tags: ['Admin'], summary: 'Get a user', parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/Ulid' } }], responses: { '200': { description: 'OK' }, ...errorRefs } }, patch: { tags: ['Admin'], summary: 'Update a user', parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/Ulid' } }], responses: { '200': { description: 'OK' }, ...errorRefs } } },
      '/api/admin/users/{id}/reset-password': { post: { tags: ['Admin'], summary: "Admin-forced password reset", parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/Ulid' } }], responses: { '200': { description: 'OK' }, ...errorRefs } } },
      '/api/admin/sections':    { get: { tags: ['Admin'], summary: 'List sections', responses: { '200': { description: 'OK' }, ...errorRefs } }, post: { tags: ['Admin'], summary: 'Create a section', responses: { '201': { description: 'Created' }, ...errorRefs } } },
      '/api/admin/firms':       { get: { tags: ['Admin'], summary: 'List firms', responses: { '200': { description: 'OK' }, ...errorRefs } }, post: { tags: ['Admin'], summary: 'Create a firm', responses: { '201': { description: 'Created' }, ...errorRefs } } },
      '/api/admin/fiscal-years':      { get: { tags: ['Admin'], summary: 'List fiscal years', responses: { '200': { description: 'OK' }, ...errorRefs } }, post: { tags: ['Admin'], summary: 'Create a fiscal year', responses: { '201': { description: 'Created' }, ...errorRefs } } },
      '/api/admin/budget-heads':      { get: { tags: ['Admin'], summary: 'List budget heads', responses: { '200': { description: 'OK' }, ...errorRefs } }, post: { tags: ['Admin'], summary: 'Create a budget head', responses: { '201': { description: 'Created' }, ...errorRefs } } },
      '/api/admin/budget-allocations':{ get: { tags: ['Admin'], summary: 'List allocations', responses: { '200': { description: 'OK' }, ...errorRefs } }, post: { tags: ['Admin'], summary: 'Create an allocation', responses: { '201': { description: 'Created' }, ...errorRefs } } },

      '/api/admin/import/firms': { post: { tags: ['Admin'], summary: 'Bulk-upsert firms from a CSV body', requestBody: { required: true, content: { 'text/csv': { schema: { type: 'string' } } } }, responses: { '200': { description: 'All rows OK' }, '207': { description: 'Partial success — see `errors`' }, ...errorRefs } } },
      '/api/admin/import/users': { post: { tags: ['Admin'], summary: 'Bulk-upsert users from a CSV body', requestBody: { required: true, content: { 'text/csv': { schema: { type: 'string' } } } }, responses: { '200': { description: 'All rows OK' }, '207': { description: 'Partial success — see `errors`' }, ...errorRefs } } },

      '/api/jobs/digest/run': { post: { tags: ['Admin'], summary: 'Trigger the weekly digest email', responses: { '200': { description: 'OK' }, ...errorRefs } } },
    },
  };
}
