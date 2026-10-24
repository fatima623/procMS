/** Narrow port so use-cases don't call `new Date()` directly (makes tests deterministic). */
export interface Clock {
  now(): Date;
}
