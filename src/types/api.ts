/** Every Scrubbe response is enveloped. `success: false` is a failure even on HTTP 200. */
export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

/**
 * Thrown for every API failure. `message` is the server's own message whenever
 * the server gave us one, so toasts can surface it verbatim.
 */
export class ApiError extends Error {
  readonly status: number | null;
  readonly fromServer: boolean;

  constructor(message: string, status: number | null, fromServer: boolean) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fromServer = fromServer;
  }
}

/**
 * Thrown by any operation whose backend endpoint has not been confirmed to
 * exist. Never caught and swallowed: the UI surfaces it, so an unwired action
 * is visibly unwired rather than silently fake.
 */
export class NotWiredError extends Error {
  readonly operation: string;

  constructor(operation: string, detail: string) {
    super(detail);
    this.name = "NotWiredError";
    this.operation = operation;
  }
}
