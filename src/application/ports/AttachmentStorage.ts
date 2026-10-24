/**
 * Blob storage port. The default implementation writes to a local directory
 * for demo and development; a production deployment plugs in an S3-compatible
 * adapter without touching the use-cases.
 */
export interface AttachmentBlob {
  readonly storageKey: string;
  readonly sizeBytes: bigint;
  readonly checksumSha256: string;
}

export interface AttachmentStorage {
  /** Persist the given bytes under a fresh key. Returns the key + metadata. */
  put(data: Uint8Array, extension: string | null): Promise<AttachmentBlob>;

  /** Retrieve raw bytes previously stored under `storageKey`. */
  get(storageKey: string): Promise<Uint8Array>;
}
