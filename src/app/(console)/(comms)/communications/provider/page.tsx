"use client";

import { useQuery } from "@tanstack/react-query";

import { CommsHeader, Notice } from "@/components/comms/parts";
import { KeyValues, Section } from "@/components/console/kit";
import { Badge, Card, Skeleton } from "@/components/ui/primitives";
import { ErrorState } from "@/components/ui/states";
import { request } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";

interface Provider {
  provider: "resend" | "smtp" | "none";
  configured: boolean;
  fromAddress: string | null;
}

interface DeliveryStats {
  last7Days: { sent: number; failed: number };
}

const PROVIDER_NAME: Record<Provider["provider"], string> = {
  resend: "Resend",
  smtp: "SMTP relay",
  none: "Not configured",
};

/** What the API is actually sending with, read from its live configuration (never its secrets). */
export default function ProviderConfigurationPage() {
  const provider = useQuery({ queryKey: ["comms-provider"], queryFn: () => request<Provider>({ method: "GET", url: `${ENDPOINTS.comms}/provider` }) });
  const stats = useQuery({ queryKey: ["comms-delivery-stats"], queryFn: () => request<DeliveryStats>({ method: "GET", url: `${ENDPOINTS.comms}/delivery-logs?limit=1` }) });

  return (
    <div>
      <CommsHeader title="Provider Configuration" description="The email provider the Scrubbe API sends through, as configured in its environment." />
      <Notice className="mb-4">
        Credentials live in the API&apos;s environment and are never shown here. Changing provider is a deployment change, not a console setting.
      </Notice>
      {provider.isError ? (
        <Card><ErrorState error={provider.error} onRetry={() => provider.refetch()} /></Card>
      ) : !provider.data ? (
        <Skeleton className="h-40" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Section title="Sending provider">
            <KeyValues
              rows={[
                ["Provider", PROVIDER_NAME[provider.data.provider]],
                ["Status", provider.data.configured ? <Badge key="s" tone="live">Configured</Badge> : <Badge key="s" tone="danger">Missing configuration</Badge>],
                ["Sender address", provider.data.fromAddress ?? "—"],
              ]}
            />
          </Section>
          <Section title="Deliveries, last 7 days" description="From the delivery log (every send the API attempted).">
            <KeyValues
              rows={[
                ["Sent", stats.data ? String(stats.data.last7Days.sent) : "…"],
                ["Failed", stats.data ? <span key="f" className={stats.data.last7Days.failed ? "text-danger" : undefined}>{stats.data.last7Days.failed}</span> : "…"],
              ]}
            />
          </Section>
        </div>
      )}
    </div>
  );
}
