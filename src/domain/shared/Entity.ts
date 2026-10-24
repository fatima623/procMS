/**
 * Base class for domain entities.
 *
 * Entities are compared by identity, never by field equality. Keep this base
 * class deliberately minimal — anything protocol-specific (persistence hints,
 * JSON serialisation) belongs in the infrastructure layer, not here.
 */
export abstract class Entity<TId extends string = string> {
  public readonly id: TId;

  protected constructor(id: TId) {
    this.id = id;
  }

  public equals(other: Entity<TId> | null | undefined): boolean {
    if (other === null || other === undefined) return false;
    if (!(other instanceof Entity)) return false;
    return this.id === other.id;
  }
}
