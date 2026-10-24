import type { Mailer, EmailMessage } from '@/application/ports/Mailer';
import { rootLogger } from '@/infrastructure/logging/pinoLogger';

/**
 * Nodemailer-backed SMTP adapter. Imported lazily so dev / test runs that
 * don't need SMTP never pay the module-load cost (and so projects that
 * don't install `nodemailer` still build cleanly).
 *
 * Required env: SMTP_HOST, SMTP_PORT (default 587), SMTP_USER, SMTP_PASS,
 *               SMTP_FROM ("name <addr>" header).
 * Optional:    SMTP_SECURE ("true" for implicit TLS on 465).
 */
export class SmtpMailer implements Mailer {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private transporterPromise: Promise<any> | null = null;

  private get transporter() {
    if (!this.transporterPromise) {
      this.transporterPromise = (async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nodemailer: any = await import('nodemailer' as string).catch(() => {
          throw new Error('nodemailer is not installed. Run `npm i nodemailer` to enable SMTP.');
        });
        return nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT ?? '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: process.env.SMTP_USER
            ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
            : undefined,
        });
      })();
    }
    return this.transporterPromise;
  }

  public async send(msg: EmailMessage): Promise<void> {
    const from = process.env.SMTP_FROM ?? 'procurement@localhost';
    const t = await this.transporter;
    try {
      await t.sendMail({
        from, to: msg.to.join(', '),
        subject: msg.subject, html: msg.html, text: msg.text,
      });
      rootLogger.info({ to: msg.to.length, subject: msg.subject }, 'email sent (SMTP)');
    } catch (err) {
      rootLogger.error({ err, to: msg.to, subject: msg.subject }, 'SMTP send failed');
      throw err;
    }
  }
}
