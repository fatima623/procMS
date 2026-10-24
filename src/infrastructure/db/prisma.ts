import { PrismaClient } from '@prisma/client';
import { env } from '@/config/env';

/**
 * Singleton Prisma client. Guarded against hot-reload-driven leaks in dev;
 * production uses one instance per process.
 */
declare global {
  // eslint-disable-next-line no-var
  var __prismaClient: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  global.__prismaClient ??
  new PrismaClient({
    log: env.isProduction
      ? [{ emit: 'event', level: 'warn' }, { emit: 'event', level: 'error' }]
      : [{ emit: 'event', level: 'query' }, { emit: 'event', level: 'warn' }, { emit: 'event', level: 'error' }],
    errorFormat: env.isProduction ? 'minimal' : 'pretty',
  });

if (!env.isProduction) {
  global.__prismaClient = prisma;
}
