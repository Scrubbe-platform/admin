"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

const TABS = [
  { href: "/communications", label: "Overview", exact: true },
  { href: "/communications/templates", label: "Email Templates", also: "/communications/categories" },
  { href: "/communications/design", label: "Design System" },
  { href: "/communications/event-mapping", label: "Event Mapping" },
  { href: "/communications/policies", label: "Notification Policies" },
  { href: "/communications/tenants", label: "Tenant Profiles" },
  { href: "/communications/recipients", label: "Recipients & Preferences" },
  { href: "/communications/logs", label: "Delivery Logs" },
  { href: "/communications/versions", label: "Version History" },
  { href: "/communications/provider", label: "Provider Configuration" },
  { href: "/communications/audit", label: "Audit Log" },
];

export default function CommunicationsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // The editor takes the full width and brings its own toolbar.
  const editing = pathname.endsWith("/edit");

  return (
    <>
      {editing ? null : (
        <nav aria-label="Communications Centre" className="mb-5 flex gap-0.5 overflow-x-auto border-b border-line">
          {TABS.map((tab) => {
            const active = tab.exact
              ? pathname === tab.href
              : pathname.startsWith(tab.href) || (tab.also ? pathname.startsWith(tab.also) : false);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm transition-colors",
                  active
                    ? "border-signal font-medium text-ink"
                    : "border-transparent text-ink-muted hover:text-ink",
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      )}
      {children}
    </>
  );
}
