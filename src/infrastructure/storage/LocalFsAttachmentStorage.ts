import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { ulid } from 'ulid';
import type { AttachmentBlob, AttachmentStorage } from '@/application/ports/AttachmentStorage';

/**
 * Writes attachments to the local filesystem under a configurable root dir.
 * Keys are "<2-char-shard>/<ulid>.<ext>" so very large sets don't crush a
 * single directory. Checksums are SHA-256 of the raw bytes.
 *
 * For production, swap this for an S3Storage adapter implementing the same
 * port; no caller needs to change.
 */
export class LocalFsAttachmentStorage implements AttachmentStorage {
  constructor(private readonly rootDir: string) {}

  public async put(data: Uint8Array, extension: string | null): Promise<AttachmentBlob> {
    const id = ulid();
    const shard = id.slice(0, 2).toLowerCase();
    const ext = extension ? (extension.startsWith('.') ? extension : `.${extension}`) : '';
    const storageKey = `${shard}/${id}${ext}`;
    const fullPath = resolve(this.rootDir, storageKey);
    await fs.mkdir(dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, data);
    const hash = createHash('sha256').update(data).digest('hex');
    return {
      storageKey,
      sizeBytes: BigInt(data.byteLength),
      checksumSha256: hash,
    };
  }

  public async get(storageKey: string): Promise<Uint8Array> {
    // Guard against path traversal: the key must be a relative two-segment path.
    if (storageKey.includes('..') || storageKey.includes('\\')) {
      throw new Error(`Invalid storage key: ${storageKey}`);
    }
    const fullPath = resolve(this.rootDir, storageKey);
    if (!fullPath.startsWith(resolve(this.rootDir))) {
      throw new Error(`Path escape attempt: ${storageKey}`);
    }
    return fs.readFile(fullPath);
  }

  /** Convenience factory using the project's default storage root. */
  public static default(): LocalFsAttachmentStorage {
    const root = process.env.ATTACHMENT_ROOT_DIR ?? join(process.cwd(), 'storage', 'attachments');
    return new LocalFsAttachmentStorage(root);
  }
}
