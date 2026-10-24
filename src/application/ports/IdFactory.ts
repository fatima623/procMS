/**
 * Produces opaque sortable string IDs. We default to ULID (26 chars) because
 * they are URL-safe, sort by creation time, and avoid leaking row counts.
 * Keeping this as a port lets tests pass a deterministic factory.
 */
export interface IdFactory {
  next(): string;
}
