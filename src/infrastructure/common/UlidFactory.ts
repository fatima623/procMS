import { ulid } from 'ulid';
import type { IdFactory } from '@/application/ports/IdFactory';

export class UlidFactory implements IdFactory {
  public next(): string {
    return ulid();
  }
}
