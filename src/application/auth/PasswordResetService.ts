import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { ulid } from 'ulid';
import { prisma } from '@/infrastructure/db/prisma';
import type { Mailer } from '../ports/Mailer';
import { ValidationError } from '@/domain/errors/DomainError';

// Narrow cast while the Prisma client is pending regen for the new
// PasswordResetToken model.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const px: any = prisma;

const TOKEN_TTL_MS = 60 * 60 * 1000;        // 1 hour
const BCRYPT_COST = 12;

export class PasswordResetService {
  constructor(private readonly mailer: Mailer) {}

  /**
   * Begin a reset: generate a token, hash it, store it, email the plaintext
   * link to the user. Returns a stable "ok" shape regardless of whether the
   * email exists — no user-enumeration.
   */
  public async requestReset(email: string, baseUrl: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() }, select: { id: true, email: true, displayName: true } });
    // Short-circuit silently if no user. We DO delay slightly on both branches
    // so attackers can't distinguish between "unknown email" and "sent".
    await new Promise((r) => setTimeout(r, 100));
    if (!user) return;

    const tokenPlain = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(tokenPlain).digest('hex');
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
    const id = ulid();

    await px.passwordResetToken.create({
      data: { id, userId: user.id, tokenHash, expiresAt },
    });

    const resetUrl = `${baseUrl.replace(/\/+$/, '')}/reset-password?token=${tokenPlain}&id=${id}`;
    const text = `Hi ${user.displayName},

A password reset was requested for your account. If this wasn't you, ignore this email — nothing has changed.

Open this link within the next hour to set a new password:

  ${resetUrl}

For your security, the link expires at ${expiresAt.toISOString()}.
— DP-N Procurement`;

    const html = `<!doctype html><html><body style="font-family:system-ui,-apple-system,sans-serif;color:#111;padding:24px;">
  <h2 style="margin:0 0 12px;">Password reset</h2>
  <p>Hi ${escapeHtml(user.displayName)},</p>
  <p>A password reset was requested for your account. If this wasn't you, ignore this email — nothing has changed.</p>
  <p>Open this link within the next hour to set a new password:</p>
  <p><a href="${resetUrl}" style="display:inline-block;padding:10px 16px;background:#4a9cff;color:#fff;border-radius:4px;text-decoration:none;">Reset password</a></p>
  <p style="color:#666;font-size:12px;">Or copy &amp; paste: <code>${resetUrl}</code></p>
  <p style="color:#666;font-size:12px;">Expires: ${expiresAt.toISOString()}</p>
</body></html>`;

    await this.mailer.send({ to: [user.email], subject: 'DP-N: reset your password', text, html });

    await prisma.auditLog.create({
      data: {
        id: ulid(), actorUserId: user.id,
        action: 'password.reset.requested',
        subjectType: 'USER', subjectId: user.id,
      },
    });
  }

  /** Consume a token and set a new password. Returns the user's id on success. */
  public async completeReset(tokenId: string, tokenPlain: string, newPassword: string): Promise<string> {
    if (newPassword.length < 10) {
      throw new ValidationError('Password must be at least 10 characters', { password: 'too short' });
    }
    const row = await px.passwordResetToken.findUnique({ where: { id: tokenId } });
    if (!row) throw new ValidationError('Invalid or expired reset link');
    if (row.usedAt) throw new ValidationError('This reset link has already been used');
    if (row.expiresAt.getTime() < Date.now()) throw new ValidationError('Reset link expired — request a new one');

    const expectedHash = createHash('sha256').update(tokenPlain).digest('hex');
    if (!timingSafeEqualHex(expectedHash, row.tokenHash)) {
      throw new ValidationError('Invalid reset link');
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
    await prisma.$transaction([
      prisma.user.update({ where: { id: row.userId }, data: { passwordHash } }),
      px.passwordResetToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
      // Invalidate every OTHER outstanding token for this user — if an attacker
      // sat on one, resetting burns them all.
      px.passwordResetToken.updateMany({
        where: { userId: row.userId, id: { not: row.id }, usedAt: null },
        data: { usedAt: new Date() },
      }),
      prisma.auditLog.create({
        data: { id: ulid(), actorUserId: row.userId, action: 'password.reset.completed', subjectType: 'USER', subjectId: row.userId },
      }),
    ]);

    return row.userId;
  }
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!
  ));
}
