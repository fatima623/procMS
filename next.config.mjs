/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The ORM and logger pull in Node-only modules; Next must not try to bundle
  // them into the client build.
  serverExternalPackages: [
    '@prisma/client', 'pino', 'pino-pretty', 'pino-http', 'thread-stream', 'bcryptjs',
    // OTEL ships CJS modules + dynamic requires Next can't trace; keep it out of the bundler.
    '@opentelemetry/api',
    '@opentelemetry/sdk-node',
    '@opentelemetry/auto-instrumentations-node',
    '@opentelemetry/exporter-trace-otlp-http',
  ],
  experimental: {
    // Required in Next 14 to boot `instrumentation.ts`. (Default in Next 15+.)
    instrumentationHook: true,
  },
  // Harden the response headers for every route by default. Per-route
  // overrides can relax this in interfaces/http/middleware.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ];
  },
};

export default nextConfig;
