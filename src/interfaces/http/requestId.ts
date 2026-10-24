import { ulid } from 'ulid';
import type { NextRequest } from 'next/server';

export const REQUEST_ID_HEADER = 'x-request-id';

/** Honour a client-supplied request id; otherwise mint one. */
export function requestIdOf(req: NextRequest): string {
  return req.headers.get(REQUEST_ID_HEADER) ?? ulid();
}
