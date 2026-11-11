"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { useComms } from "@/components/comms/CommsContext";
import { CreateTemplateWizard } from "@/components/comms/CreateTemplateWizard";
import { ActionMenu, CommsHeader, Pagination, StatusBadge } from "@/components/comms/parts";
import { useTemplateActions } from "@/components/comms/TemplateDialogs";
import { Button, Card, Input, Select } from "@/components/ui/primitives";
import { EmptyState } from "@/components/ui/states";
import { CATEGORIES, DEMO_NOW, DEMO_TODAY, categoryName, findCategory } from "@/lib/comms/catalog";
import type { EmailTemplate } from "@/types/comms";

const PAGE_SIZE = 12;
const PRIORITY_RANK: Record<string, number> = { Critical: 0, High: 1, Normal: 2, Low: 3 };
const STATUS_RANK: Record<string, number> = { Published: 0, Approved: 1, "Pending Approval": 2, Draft: 3, Archived: 4 };

interface Filters {
  q: string;
  category: string;
  status: string;
  priority: string;
  trigger: string;
  version: string;
  modified: string;
  sort: "name" | "modified" | "status" | "priority";
  direction: 1 | -1;
}

const DEFAULT_FILTERS: Filters = {
  q: "",
  category: "all",
  status: "All",
  priority: "All",
  trigger: "All",
  version: "All",
  modified: "Any",
  sort: "modified",
  direction: 1,
};

function matches(t: EmailTemplate, f: Filters, category: string): boolean {
  const q = f.q.trim().toLowerCase();
  const ageDays = (DEMO_NOW - Date.parse(t.updated)) / 86_400_000;
  return (
    (category === "all" || t.category === category) &&
    (!q || [t.name, t.id, t.subject, t.event, categoryName(t.category), t.description].join(" ").toLowerCase().includes(q)) &&
    (f.status === "All" || t.status === f.status) &&
    (f.priority === "All" || t.priority === f.priority) &&
    (f.trigger === "All" || t.triggerType === f.trigger) &&
    (f.version === "All" || (f.version === "Latest" ? t.versions.length < 2 : t.versions.length > 1)) &&
    (f.modified === "Any" || (f.modified === "Today" ? t.updated === DEMO_TODAY : ageDays <= Number(f.modified)))
  );
}

function compare(a: EmailTemplate, b: EmailTemplate, sort: Filters["sort"]): number {
  switch (sort) {
    case "name":
      return a.name.localeCompare(b.name);
    case "status":
      return (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9);
    case "priority":
      return (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9);
    default:
      return b.updated.localeCompare(a.updated);
  }
}

/** Every template, or one category's, with search, filters, sorting and paging. */
export function TemplateLibrary({ categoryId }: { categoryId?: string }) {
  const { state } = useComms();
  const router = useRouter();
  const { run, dialogs } = useTemplateActions();
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [wizardOpen, setWizardOpen] = useState(false);

  const category = categoryId ? findCategory(categoryId) : undefined;
  const scope = categoryId ?? filters.category;

  const results = useMemo(
    () =>
      state.templates
        .filter((t) => matches(t, filters, scope))
        .sort((a, b) => compare(a, b, filters.sort) * filters.direction),
    [state.templates, filters, scope],
  );

  const pages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const shown = results.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const scoped = categoryId ? state.templates.filter((t) => t.category === categoryId) : [];

  const select = (key: keyof Filters, label: string, options: [string, string][]) => (
    <label className="grid gap-1">
      <span className="text-xs text-ink-faint">{label}</span>
      <Select
        value={String(filters[key])}
        onChange={(e) => setFilter(key, e.target.value as never)}
        className="w-auto"
      >
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </Select>
    </label>
  );
  const plain = (values: string[]): [string, string][] => values.map((v) => [v, v]);

  return (
    <div>
      <CommsHeader
        title={category ? category.name : "Email Templates"}
        description={
          category
            ? category.description
            : "Manage reusable email communications across incidents, governance, security and organisation workflows."
        }
        actions={
          <Button variant="primary" onClick={() => setWizardOpen(true)}>
            Create Template
          </Button>
        }
      />

      {category ? (
        <p className="-mt-3 mb-4 text-sm text-ink-muted">
          {scoped.length} templates | {scoped.filter((t) => t.status === "Published").length} published |{" "}
          {scoped.filter((t) => t.status === "Draft").length} draft |{" "}
          <Link href="/communications/templates" className="text-signal-strong hover:underline">
            All categories
          </Link>
        </p>
      ) : null}

      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
        <Input
          type="search"
          value={filters.q}
          onChange={(e) => setFilter("q", e.target.value)}
          placeholder="Search name, ID, subject, event, category, description"
          aria-label="Search templates"
          className="pl-9"
        />
      </div>

      <div className="mb-3 flex flex-wrap items-end gap-2">
        {category ? null : select("category", "Category", [["all", "All Categories"], ...CATEGORIES.map((c): [string, string] => [c.id, c.name])])}
        {select("status", "Status", plain(["All", "Published", "Draft", "Pending Approval", "Approved", "Archived"]))}
        {select("priority", "Priority", plain(["All", "Critical", "High", "Normal", "Low"]))}
        {select("trigger", "Trigger", plain(["All", "Event-based", "Scheduled", "Manual", "System-generated"]))}
        {select("version", "Version", [
          ["All", "All Versions"],
          ["Latest", "Latest only"],
          ["Older", "Has older versions"],
        ])}
        {select("modified", "Modified", [
          ["Any", "Any Time"],
          ["Today", "Today"],
          ["7", "Last 7 Days"],
          ["30", "Last 30 Days"],
        ])}
        {select("sort", "Sort by", [
          ["name", "Name"],
          ["modified", "Last Modified"],
          ["status", "Status"],
          ["priority", "Priority"],
        ])}
        <Button onClick={() => setFilter("direction", filters.direction === 1 ? -1 : 1)} aria-label="Toggle sort direction">
          {filters.direction === 1 ? "Ascending" : "Descending"}
        </Button>
        <Button
          onClick={() => {
            setFilters({ ...DEFAULT_FILTERS, sort: filters.sort, direction: filters.direction });
            setPage(1);
          }}
        >
          Clear Filters
        </Button>
      </div>

      <p className="mb-2 text-sm text-ink-muted" role="status">
        {results.length} matching template{results.length === 1 ? "" : "s"}
      </p>

      {results.length ? (
        <>
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-ink-faint">
                  {["Template name", "Template ID", "Category", "Trigger / event", "Version", "Status", "Priority", "Last modified", "Actions"].map(
                    (heading) => (
                      <th key={heading} scope="col" className="whitespace-nowrap px-3 py-2.5 font-normal">
                        {heading}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {shown.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => router.push(`/communications/templates/${t.id}`)}
                    className="cursor-pointer transition-colors hover:bg-raised/60"
                  >
                    <td className="px-3 py-2.5 font-medium text-ink">{t.name}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{t.id}</td>
                    <td className="px-3 py-2.5 text-ink-muted">{categoryName(t.category)}</td>
                    <td className="px-3 py-2.5">
                      <span className="font-mono text-xs">{t.event}</span>
                      <br />
                      <span className="text-xs text-ink-faint">{t.triggerType}</span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs">{t.version}</td>
                    <td className="px-3 py-2.5">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge status={t.priority} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-ink-muted">{t.updated}</td>
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <ActionMenu
                        label="Actions"
                        ariaLabel={`Actions for ${t.name}`}
                        items={[
                          { label: "Preview", onSelect: () => run("preview", t.id) },
                          {
                            label: t.status === "Published" || t.status === "Approved" ? "Edit (creates new draft)" : "Edit",
                            onSelect: () => run("edit", t.id),
                            disabled: t.status === "Archived" || t.status === "Pending Approval",
                          },
                          { label: "Duplicate", onSelect: () => run("duplicate", t.id) },
                          { label: "View History", onSelect: () => run("history", t.id) },
                          { label: "Test Send", onSelect: () => run("test", t.id) },
                          { label: "Submit for Approval", onSelect: () => run("submit", t.id), disabled: t.status !== "Draft" },
                          { label: "Archive", onSelect: () => run("archive", t.id), disabled: t.status === "Archived" },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Pagination page={currentPage} pages={pages} onChange={setPage} />
        </>
      ) : (
        <Card>
          <EmptyState
            title="No templates match these filters"
            body="Try a different search or clear the filters."
            action={
              <Button size="sm" onClick={() => setFilters(DEFAULT_FILTERS)}>
                Clear filters
              </Button>
            }
          />
        </Card>
      )}

      {wizardOpen ? <CreateTemplateWizard onClose={() => setWizardOpen(false)} /> : null}
      {dialogs}
    </div>
  );
}
