import { toastError, toastSuccess } from "@/lib/toast";

/** Clipboard access can be refused, so a failure is reported in a toast rather than thrown. */
export async function copyText(text: string, successMessage: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    toastSuccess(successMessage);
  } catch {
    toastError(null, "Couldn't reach the clipboard. Select the text and copy it by hand.");
  }
}
