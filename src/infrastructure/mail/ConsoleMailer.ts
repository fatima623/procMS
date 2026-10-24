import type { Mailer, EmailMessage } from '@/application/ports/Mailer';
import { rootLogger } from '@/infrastructure/logging/pinoLogger';

/**
 * Default dev mailer: logs the outgoing email instead of sending it. Keeps
 * the dev loop friction-free and the audit trail intact. Swap for the SMTP
 * adapter in prod by wiring `nodemailer` behind the same port.
 */
export class ConsoleMailer implements Mailer {
  public async send(msg: EmailMessage): Promise<void> {
    rootLogger.info(
      {
        to: msg.to,
        subject: msg.subject,
        preview: (msg.text ?? msg.html).slice(0, 400),
      },
      '[dev-mailer] email dropped (no SMTP configured)',
    );
  }
}

export const defaultMailer: Mailer = new ConsoleMailer();
