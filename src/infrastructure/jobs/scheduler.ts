import { rootLogger } from '@/infrastructure/logging/pinoLogger';
import { WeeklyDigestUseCase } from '@/application/digest/WeeklyDigestUseCase';
import { defaultMailer } from '@/infrastructure/mail';
import { prisma } from '@/infrastructure/db/prisma';
import { Role } from '@prisma/client';

/**
 * Minimal in-process job runner. Checks every minute; fires jobs whose
 * schedule matches the current UTC minute. A per-job sentinel in memory
 * prevents double-firing within the same window.
 *
 * Pros: zero deps, works in any Node runtime.
 * Cons: one process only — if you run multiple replicas, use external cron
 * (POST /api/jobs/digest/run) with a lock or scope the scheduler to a
 * single leader.
 */

type Job = {
  readonly name: string;
  readonly shouldFire: (now: Date) => boolean;
  readonly run: () => Promise<void>;
};

const lastFiredMinute = new Map<string, string>();

function minuteKey(d: Date): string {
  return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}T${d.getUTCHours()}:${d.getUTCMinutes()}`;
}

function weeklyDigestJob(): Job {
  const day = Number(process.env.SCHEDULER_DIGEST_DAY ?? '1');
  const hour = Number(process.env.SCHEDULER_DIGEST_HOUR ?? '7');
  return {
    name: 'weekly-digest',
    shouldFire: (now) =>
      now.getUTCDay() === day && now.getUTCHours() === hour && now.getUTCMinutes() === 0,
    run: async () => {
      const log = rootLogger.child({ job: 'weekly-digest' });
      const extra = (process.env.DIGEST_RECIPIENTS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
      const leadership = await prisma.user.findMany({
        where: {
          isActive: true,
          roles: { some: { role: { in: [Role.ADMIN, Role.SECY_DP, Role.DGDP, Role.DP_N] } } },
        },
        select: { email: true, displayName: true },
      });
      const seen = new Set<string>();
      const recipients = [
        ...leadership.map((u) => ({ email: u.email, name: u.displayName })),
        ...extra.map((email) => ({ email })),
      ].filter((r) => (seen.has(r.email) ? false : (seen.add(r.email), true)));
      log.info({ recipients: recipients.length }, 'firing weekly digest');
      const result = await new WeeklyDigestUseCase(defaultMailer).execute({ recipients });
      log.info({ result }, 'weekly digest done');
    },
  };
}

function nightlyCleanupJob(): Job {
  return {
    name: 'nightly-cleanup',
    shouldFire: (now) => now.getUTCHours() === 3 && now.getUTCMinutes() === 15,
    run: async () => {
      const log = rootLogger.child({ job: 'nightly-cleanup' });
      // Soft-prune: delete read notifications older than 60 days to keep the table small.
      const cutoff = new Date(Date.now() - 60 * 86_400_000);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nx: any = prisma;
      const res = await nx.notification.deleteMany({
        where: { readAt: { not: null, lte: cutoff } },
      });
      log.info({ deletedNotifications: res.count }, 'nightly cleanup done');
    },
  };
}

let started = false;

export function startScheduler(): void {
  if (started) return;
  if (process.env.ENABLE_SCHEDULER !== 'true') {
    rootLogger.info({}, '[scheduler] disabled (ENABLE_SCHEDULER != true)');
    return;
  }
  started = true;
  const jobs = [weeklyDigestJob(), nightlyCleanupJob()];
  rootLogger.info({ jobs: jobs.map((j) => j.name) }, '[scheduler] starting in-process job runner');

  const tick = async () => {
    const now = new Date();
    const key = minuteKey(now);
    for (const job of jobs) {
      if (!job.shouldFire(now)) continue;
      if (lastFiredMinute.get(job.name) === key) continue;
      lastFiredMinute.set(job.name, key);
      try { await job.run(); }
      catch (err) { rootLogger.error({ err, job: job.name }, 'scheduled job failed'); }
    }
  };

  // Fire on each wall-clock minute (first tick immediate so the operator
  // sees "scheduler up" in the log; subsequent ticks aligned to :00s).
  tick().catch(() => { /* noop */ });
  const now = new Date();
  const msToNextMinute = 60_000 - (now.getSeconds() * 1000 + now.getMilliseconds());
  setTimeout(() => {
    setInterval(() => { tick().catch(() => { /* noop */ }); }, 60_000);
  }, msToNextMinute);
}
