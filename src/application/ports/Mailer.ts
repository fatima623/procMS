export interface EmailMessage {
  readonly to: readonly string[];
  readonly subject: string;
  readonly html: string;
  readonly text?: string;
}

/**
 * Outbound email port. The default implementation in dev logs the message
 * to stdout; a Nodemailer adapter wires it to real SMTP in prod without
 * touching the callers.
 */
export interface Mailer {
  send(message: EmailMessage): Promise<void>;
}
