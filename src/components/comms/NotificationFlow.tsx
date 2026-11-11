import { Card } from "@/components/ui/primitives";

const STEPS: [string, string][] = [
  ["Domain Event", "Something happened in Scrubbe"],
  ["Notification Use Case", "Why a notification is generated"],
  ["Master Email Template", "Approved content for the event"],
  ["Notification Policy", "Whether, when and to whom"],
  ["Delivery", "The attempt to send the email"],
];

/** Event → use case → template → policy → delivery: the path every notification takes. */
export function NotificationFlow() {
  return (
    <ol className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {STEPS.map(([title, description], i) => (
        <li key={title}>
          <Card className="h-full p-4">
            <span className="text-xs text-ink-faint">Step {i + 1}</span>
            <h3 className="mt-0.5 text-sm font-semibold text-ink">{title}</h3>
            <p className="mt-0.5 text-xs text-ink-muted">{description}</p>
          </Card>
        </li>
      ))}
    </ol>
  );
}
