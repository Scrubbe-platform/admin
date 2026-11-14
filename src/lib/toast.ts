import toast from "react-hot-toast";

import { ApiError } from "@/types/api";

/**
 * Error toasts carry the server's own `message` whenever there is one. Generic
 * strings are only used when the failure never reached the server.
 */
export function toastError(error: unknown, fallback = "That didn't go through."): void {
  if (error instanceof ApiError) {
    toast.error(error.message || fallback);
    return;
  }
  if (error instanceof Error && error.message) {
    toast.error(error.message);
    return;
  }
  toast.error(fallback);
}

export function toastSuccess(message: string): void {
  toast.success(message);
}
