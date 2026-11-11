"use client";

import {
  Briefcase,
  Building2,
  CalendarDays,
  Filter,
  LayoutDashboard,
  LayoutGrid,
  ListChecks,
  LogOut,
  Mail,
  MailCheck,
  Newspaper,
  Settings,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/layout/Logo";
import { useCurrentUser, useSignOut } from "@/hooks/useAuth";
import { cn } from "@/lib/cn";
import { displayName } from "@/types/user";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Active only on this exact path, not on the pages beneath it. */
  exact?: boolean;
}

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/blogs", label: "Blogs", icon: Newspaper },
  { href: "/careers", label: "Careers", icon: Briefcase },
];

const ACQUISITION_NAV: NavItem[] = [
  { href: "/acquisition", label: "Overview", icon: LayoutGrid, exact: true },
  { href: "/acquisition/pipeline", label: "Pipeline", icon: Filter },
  { href: "/acquisition/contacts", label: "Contacts", icon: Users },
  { href: "/acquisition/meetings", label: "Meetings", icon: CalendarDays },
  { href: "/acquisition/follow-ups", label: "Follow-ups", icon: ListChecks },
  { href: "/acquisition/templates", label: "Templates", icon: Mail },
];

const ADMINISTRATION_NAV: NavItem[] = [
  { href: "/communications", label: "Communications Centre", icon: MailCheck },
  { href: "/organisation", label: "Organisation", icon: Building2 },
  { href: "/team", label: "Team & Access", icon: ShieldCheck },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useCurrentUser();
  const signOut = useSignOut();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-line bg-surface">
      <div className="px-5 py-5">
        <Link href="/dashboard" className="block">
          <Logo height={24} priority />
          <span className="mt-1.5 block text-xs text-ink-faint">Editorial console</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-3">
        {NAV.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}

        <p className="px-2.5 pb-1.5 pt-5 text-2xs font-medium uppercase tracking-wider text-ink-faint">
          Acquisition desk
        </p>
        {ACQUISITION_NAV.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}

        <p className="px-2.5 pb-1.5 pt-5 text-2xs font-medium uppercase tracking-wider text-ink-faint">Administration</p>
        {ADMINISTRATION_NAV.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>

      {user ? (
        <div className="border-t border-line px-3 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm text-ink">{displayName(user)}</p>
              <p className="truncate text-2xs text-ink-faint">{user.roles.join(", ") || "No role"}</p>
            </div>
            <button
              type="button"
              onClick={signOut}
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
  const active = item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
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
