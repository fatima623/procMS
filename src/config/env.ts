import { z } from 'zod';

/**
 * Validated environment. Fail-fast at startup if anything is missing or
 * malformed — this is better than discovering a bad config under load.
 *
 * We treat `""` as "unset" for optional fields: lots of templates ship with
 * `FOO=""` to show the key, and Zod's `.url().optional()` would otherwise
 * reject the empty string as a bad URL.
 */
const emptyToUndef = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.preprocess(emptyToUndef, z.string().url().optional()),
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 chars'),
  NEXTAUTH_URL: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? 'http://localhost:3000' : v),
    z.string().url().default('http://localhost:3000'),
  ),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  ALLOWED_ORIGINS: z.string().optional().default(''),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.preprocess(emptyToUndef, z.string().url().optional()),
  OTEL_SERVICE_NAME: z.string().default('procurement-api'),

  // Optional OIDC provider (enables the "Sign in with SSO" button when all four are set).
  OIDC_ISSUER: z.preprocess(emptyToUndef, z.string().url().optional()),
  OIDC_CLIENT_ID: z.preprocess(emptyToUndef, z.string().optional()),
  OIDC_CLIENT_SECRET: z.preprocess(emptyToUndef, z.string().optional()),
  OIDC_PROVIDER_NAME: z.preprocess(emptyToUndef, z.string().optional()),

  // Comma-separated extra recipients for the weekly digest email.
  DIGEST_RECIPIENTS: z.preprocess(emptyToUndef, z.string().optional()),
});

type RawEnv = z.infer<typeof schema>;

export interface Env extends RawEnv {
  readonly allowedOrigins: readonly string[];
  readonly isProduction: boolean;
}

/**
 * Trim leading/trailing whitespace from every env-var value before validating,
 * AND write the trimmed value back onto process.env so downstream consumers
 * that read process.env directly (notably Prisma's PrismaClient, which reads
 * DATABASE_URL on construction) see the clean value too. Vercel's env-var
 * editor silently preserves a tab or newline if you paste one with it.
 */
for (const [k, v] of Object.entries(process.env)) {
  if (typeof v === 'string') {
    const t = v.trim();
    if (t !== v) process.env[k] = t;
  }
}

/**
 * Normalize DATABASE_URL for Prisma's MySQL Query Engine. Aiven exposes a
 * connection string with `?ssl-mode=REQUIRED` (MySQL CLI syntax), which
 * Prisma Migrate tolerates but Prisma's runtime Query Engine rejects as
 * "unsupported argument". Translate to the Prisma-native `sslaccept=strict`
 * so copying the Aiven URL verbatim just works.
 */
if (typeof process.env.DATABASE_URL === 'string') {
  const original = process.env.DATABASE_URL;
  let fixed = original.replace(/([?&])ssl-mode=REQUIRED/i, '$1sslaccept=strict');
  // Older `?ssl=true` also upsets the Query Engine; map it the same way.
  fixed = fixed.replace(/([?&])ssl=true/i, '$1sslaccept=strict');
  if (fixed !== original) process.env.DATABASE_URL = fixed;
}

/**
 * During `next build` (phase-production-build), Next.js imports every route
 * handler to collect metadata. The handlers chain through to this module. If
 * the build host doesn't have DATABASE_URL / NEXTAUTH_SECRET set (CI, Docker
 * image bake, Vercel preview without secrets), the strict parse would abort
 * the whole build even though no handler runs at build time. In that phase
 * we fall back to permissive placeholders — never shipped to runtime because
 * runtime re-reads process.env, where the real values are set.
 */
const isBuildPhase =
  process.env.NEXT_PHASE === 'phase-production-build' ||
  process.env.NEXT_PHASE === 'phase-export';

const parsed = schema.safeParse(process.env);
let raw: RawEnv;
if (parsed.success) {
  raw = parsed.data;
} else if (isBuildPhase) {
  // eslint-disable-next-line no-console
  console.warn('[env] Build-phase placeholder values in use (real env vars will be read at runtime).');
  raw = {
    NODE_ENV: (process.env.NODE_ENV as 'development' | 'test' | 'production' | undefined) ?? 'production',
    DATABASE_URL: process.env.DATABASE_URL ?? 'mysql://user:pass@localhost:3306/build_placeholder',
    DIRECT_URL: undefined,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? 'build_phase_placeholder_secret_32_chars__',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? 'http://localhost:3000',
    LOG_LEVEL: 'info',
    ALLOWED_ORIGINS: '',
    OTEL_EXPORTER_OTLP_ENDPOINT: undefined,
    OTEL_SERVICE_NAME: 'procurement-api',
    OIDC_ISSUER: undefined,
    OIDC_CLIENT_ID: undefined,
    OIDC_CLIENT_SECRET: undefined,
    OIDC_PROVIDER_NAME: undefined,
    DIGEST_RECIPIENTS: undefined,
  };
} else {
  // eslint-disable-next-line no-console
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration');
}

export const env: Env = {
  ...raw,
  allowedOrigins: raw.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean),
  isProduction: raw.NODE_ENV === 'production',
};
