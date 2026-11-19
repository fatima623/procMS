import { describe, expect, it } from 'vitest';
import { replyMessageSchema, replySubject, sendMessageSchema } from '@/interfaces/http/schemas/mail';

describe('sendMessageSchema', () => {
  it('accepts a recipient, subject and body (trimmed)', () => {
    const r = sendMessageSchema.parse({ toUserId: 'u1', subject: '  Spare pumps  ', body: ' Please review. ' });
    expect(r.subject).toBe('Spare pumps');
    expect(r.body).toBe('Please review.');
  });

  it('rejects a missing recipient, blank subject or blank body', () => {
    expect(() => sendMessageSchema.parse({ subject: 'x', body: 'y' })).toThrow();
    expect(() => sendMessageSchema.parse({ toUserId: 'u1', subject: '   ', body: 'y' })).toThrow();
    expect(() => sendMessageSchema.parse({ toUserId: 'u1', subject: 'x', body: '   ' })).toThrow();
  });

  it('rejects a subject longer than 200 characters', () => {
    expect(() => sendMessageSchema.parse({ toUserId: 'u1', subject: 'a'.repeat(201), body: 'y' })).toThrow();
    expect(sendMessageSchema.parse({ toUserId: 'u1', subject: 'a'.repeat(200), body: 'y' }).subject).toHaveLength(200);
  });
});

describe('replyMessageSchema', () => {
  it('requires a non-blank body', () => {
    expect(replyMessageSchema.parse({ body: 'Noted.' }).body).toBe('Noted.');
    expect(() => replyMessageSchema.parse({ body: '  ' })).toThrow();
  });
});

describe('replySubject', () => {
  it('prefixes "Re: " once', () => {
    expect(replySubject('Spare pumps')).toBe('Re: Spare pumps');
  });

  it('does not stack "Re: Re:"', () => {
    expect(replySubject('Re: Spare pumps')).toBe('Re: Spare pumps');
    expect(replySubject('Re: Re: Spare pumps')).toBe('Re: Spare pumps');
    expect(replySubject('RE:re:  Spare pumps')).toBe('Re: Spare pumps');
  });

  it('stays within the 200-character subject limit', () => {
    expect(replySubject('a'.repeat(200))).toHaveLength(200);
  });
});
