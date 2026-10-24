export interface Logger {
  info(bindings: Record<string, unknown>, msg: string): void;
  warn(bindings: Record<string, unknown>, msg: string): void;
  error(bindings: Record<string, unknown>, msg: string): void;
  debug(bindings: Record<string, unknown>, msg: string): void;
  child(bindings: Record<string, unknown>): Logger;
}
