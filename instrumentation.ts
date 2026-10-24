/**
 * Next.js runs this file once per server process, before the first request.
 *
 * We boot OpenTelemetry only when an OTLP endpoint is configured — this way
 * local dev stays zero-overhead and the trace pipeline is a drop-in for
 * production without needing a code change.
 *
 * Auto-instrumentations cover: HTTP (incoming + outgoing), Fetch, Prisma
 * (when the Prisma Instrumentation package is installed — not required for
 * basic tracing).
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;      // Edge runtime: skip.

  // In-process scheduler (gated by ENABLE_SCHEDULER=true). Boots once per
  // process; a no-op when disabled.
  try {
    const { startScheduler } = await import('./src/infrastructure/jobs/scheduler');
    startScheduler();
  } catch { /* scheduler failure must not break startup */ }

  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!endpoint || endpoint.trim() === '') return;        // Not configured: skip.

  // Dynamic import so the OTEL packages don't load in processes that don't
  // need them (and so the Edge runtime bundle stays small).
  const { NodeSDK } = await import('@opentelemetry/sdk-node');
  const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http');
  const { getNodeAutoInstrumentations } = await import('@opentelemetry/auto-instrumentations-node');
  const { Resource } = await import('@opentelemetry/resources');
  const { SemanticResourceAttributes } = await import('@opentelemetry/semantic-conventions');

  const sdk = new NodeSDK({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: process.env.OTEL_SERVICE_NAME ?? 'procurement-api',
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV ?? 'development',
    }),
    traceExporter: new OTLPTraceExporter({ url: endpoint.replace(/\/+$/, '') + '/v1/traces' }),
    instrumentations: [
      getNodeAutoInstrumentations({
        // Noisy and rarely useful under Next.js (file-system reads, DNS).
        '@opentelemetry/instrumentation-fs': { enabled: false },
        '@opentelemetry/instrumentation-dns': { enabled: false },
      }),
    ],
  });

  sdk.start();
  // eslint-disable-next-line no-console
  console.log(`[otel] tracing enabled → ${endpoint}`);

  const shutdown = async () => {
    try { await sdk.shutdown(); } catch { /* best effort */ }
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}
