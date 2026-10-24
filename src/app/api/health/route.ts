import { NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { prisma } from '@/infrastructure/db/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ComponentHealth {
  readonly status: 'ok' | 'degraded' | 'down';
  readonly latencyMs?: number;
  readonly detail?: string;
}

interface HealthReport {
  readonly status: 'ok' | 'degraded' | 'down';
  readonly ts: string;
  readonly version: string;
  readonly uptimeSeconds: number;
  readonly components: Readonly<Record<string, ComponentHealth>>;
}

/**
 * Liveness + readiness probe. Returns 200 when every critical component is
 * reachable; 503 when any critical component is down. "Degraded" (e.g. a
 * configured mailer that can't be reached) keeps 200 so load balancers
 * don't start pulling the pod — the detail lives in the body.
 *
 * Deliberately unauthenticated — your probe infrastructure needs it.
 */
export async function GET(): Promise<NextResponse> {
  const started = Date.now();
  const components: Record<string, ComponentHealth> = {};

  // --- DB ---
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    components.database = { status: 'ok', latencyMs: Date.now() - dbStart };
  } catch (err) {
    components.database = { status: 'down', detail: errMsg(err) };
  }

  // --- Attachment storage (writeable) ---
  const storageRoot = process.env.ATTACHMENT_ROOT_DIR ?? join(process.cwd(), 'storage', 'attachments');
  const storageStart = Date.now();
  try {
    const probePath = join(storageRoot, '.healthcheck');
    await fs.mkdir(storageRoot, { recursive: true });
    await fs.writeFile(probePath, 'ok');
    await fs.unlink(probePath);
    components.storage = { status: 'ok', latencyMs: Date.now() - storageStart };
  } catch (err) {
    components.storage = { status: 'degraded', detail: errMsg(err) };
  }

  // --- Mailer (config-only, not a live SMTP ping) ---
  components.mailer = process.env.SMTP_HOST
    ? { status: 'ok', detail: `smtp:${process.env.SMTP_HOST}:${process.env.SMTP_PORT ?? '587'}` }
    : { status: 'degraded', detail: 'console mailer (dev) — set SMTP_HOST for real email' };

  // --- Scheduler ---
  components.scheduler = process.env.ENABLE_SCHEDULER === 'true'
    ? { status: 'ok', detail: 'in-process scheduler enabled' }
    : { status: 'degraded', detail: 'in-process scheduler disabled — use external cron' };

  // --- Tracing ---
  components.tracing = process.env.OTEL_EXPORTER_OTLP_ENDPOINT
    ? { status: 'ok', detail: `otlp:${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}` }
    : { status: 'degraded', detail: 'OpenTelemetry not configured' };

  const anyDown = Object.values(components).some((c) => c.status === 'down');
  const overall: HealthReport['status'] = anyDown ? 'down' : 'ok';

  const report: HealthReport = {
    status: overall,
    ts: new Date().toISOString(),
    version: process.env.npm_package_version ?? '0.1.0',
    uptimeSeconds: Math.round(process.uptime()),
    components,
  };

  return NextResponse.json(report, {
    status: anyDown ? 503 : 200,
    headers: {
      'cache-control': 'no-store',
      'x-response-ms': String(Date.now() - started),
    },
  });
}

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message.slice(0, 240);
  return String(err).slice(0, 240);
}
