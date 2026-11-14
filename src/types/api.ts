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

/** A 4xx is the server's considered answer (bad input, no permission, not found); repeating it changes nothing. */
export function isClientError(error: unknown): boolean {
  return error instanceof ApiError && error.status !== null && error.status >= 400 && error.status < 500;
}
