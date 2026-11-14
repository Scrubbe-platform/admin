"use client";

import {
  Activity,
  Briefcase,
  Building2,
  CalendarDays,
  CreditCard,
  FileClock,
  Filter,
  Inbox,
  LayoutDashboard,
  LayoutGrid,
  ListChecks,
  ListOrdered,
  LogOut,
  Mail,
  MailCheck,
  Newspaper,
  Receipt,
  Settings,
  ShieldAlert,
  ShieldCheck,
  UserCircle,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/layout/Logo";
import { useCurrentUser, useSignOut } from "@/hooks/useAuth";
import { cn } from "@/lib/cn";
import { displayName, STAFF_ROLE_LABEL, type Capability } from "@/types/user";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Shown only to staff whose role grants this capability (the server enforces it regardless). */
  needs: Capability;
  exact?: boolean;
}

const GROUPS: Array<{ title: string | null; items: NavItem[] }> = [
  { title: null, items: [{ href: "/dashboard", label: "Overview", icon: LayoutDashboard, needs: "overview.read" }] },
  {
    title: "Platform",
    items: [
      { href: "/workspaces", label: "Workspaces", icon: Building2, needs: "workspace.read" },
      { href: "/users", label: "Users", icon: Users, needs: "user.read" },
      { href: "/incidents", label: "Incidents", icon: ShieldAlert, needs: "incident.read" },
      { href: "/activity", label: "Activity", icon: Activity, needs: "activity.read" },
    ],
  },
  {
    title: "Revenue",
    items: [
      { href: "/billing", label: "Billing", icon: Receipt, needs: "billing.read" },
      { href: "/subscriptions", label: "Subscriptions", icon: CreditCard, needs: "billing.read" },
    ],
  },
  {
    title: "Support",
    items: [
      { href: "/inbox", label: "Inbox", icon: Inbox, needs: "inbox.manage" },
      { href: "/waitlist", label: "Waitlist", icon: ListOrdered, needs: "waitlist.manage" },
    ],
  },
  {
    title: "Content",
    items: [
      { href: "/blogs", label: "Blog", icon: Newspaper, needs: "content.write" },
      { href: "/careers", label: "Careers", icon: Briefcase, needs: "content.write" },
      { href: "/communications", label: "Communications", icon: MailCheck, needs: "comms.read" },
    ],
  },
  {
    title: "Acquisition desk",
    items: [
      { href: "/acquisition", label: "Overview", icon: LayoutGrid, needs: "acquisition.manage", exact: true },
      { href: "/acquisition/pipeline", label: "Pipeline", icon: Filter, needs: "acquisition.manage" },
      { href: "/acquisition/contacts", label: "Contacts", icon: Users, needs: "acquisition.manage" },
      { href: "/acquisition/meetings", label: "Meetings", icon: CalendarDays, needs: "acquisition.manage" },
      { href: "/acquisition/follow-ups", label: "Follow-ups", icon: ListChecks, needs: "acquisition.manage" },
      { href: "/acquisition/templates", label: "Templates", icon: Mail, needs: "acquisition.manage" },
    ],
  },
  {
    title: "Administration",
    items: [
      { href: "/team", label: "Team & access", icon: ShieldCheck, needs: "staff.read" },
      { href: "/audit", label: "Audit log", icon: FileClock, needs: "audit.read" },
      { href: "/organisation", label: "Organisation", icon: Building2, needs: "overview.read" },
      { href: "/settings", label: "Console security", icon: Settings, needs: "staff.read" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, can } = useCurrentUser();
  const signOut = useSignOut();

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-line bg-surface">
      <div className="px-5 py-5">
        <Link href="/dashboard" className="block">
          <Logo height={24} priority />
          <span className="mt-1.5 block text-xs text-ink-faint">Admin console</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-3">
        {GROUPS.map((group) => {
          const items = group.items.filter((i) => can(i.needs));
          if (items.length === 0) return null;
          return (
            <div key={group.title ?? "home"}>
              {group.title ? (
                <p className="px-2.5 pb-1.5 pt-5 text-2xs font-medium uppercase tracking-wider text-ink-faint">{group.title}</p>
              ) : null}
              {items.map((item) => (
                <NavLink key={item.href} item={item} pathname={pathname} />
              ))}
            </div>
          );
        })}
      </nav>

      {user ? (
        <div className="border-t border-line px-3 py-3">
          <div className="flex items-center justify-between gap-2">
            <Link href="/account" className="flex min-w-0 items-center gap-2 rounded-md p-1 hover:bg-raised">
              <UserCircle className="h-5 w-5 shrink-0 text-ink-faint" aria-hidden />
              <div className="min-w-0">
                <p className="truncate text-sm text-ink">{displayName(user)}</p>
                <p className="truncate text-2xs text-ink-faint">{STAFF_ROLE_LABEL[user.role]}</p>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => void signOut()}
              aria-label="Sign out"
              className="rounded-md p-1.5 text-ink-faint transition-colors hover:bg-raised hover:text-ink"
            >
              <LogOut className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      ) : null}
    </aside>
  );
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
        active ? "bg-signal-soft text-signal-strong" : "text-ink-muted hover:bg-raised hover:text-ink",
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
      {item.label}
    </Link>
  );
}
