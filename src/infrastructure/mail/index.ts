import type { Mailer } from '@/application/ports/Mailer';
import { ConsoleMailer } from './ConsoleMailer';
import { SmtpMailer } from './SmtpMailer';

/**
 * Pick the mailer based on config: SMTP in prod (when SMTP_HOST is set),
 * dev-friendly console logging otherwise. The single export means every
 * caller sees the same instance and swapping is a one-env-var flip.
 */
export const defaultMailer: Mailer = process.env.SMTP_HOST
  ? new SmtpMailer()
  : new ConsoleMailer();
