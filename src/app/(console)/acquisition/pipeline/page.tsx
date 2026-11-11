"use client";

import { Filter, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { useDeskData } from "@/components/acquisition/DeskContext";
import { useDeskDialogs } from "@/components/acquisition/useDeskDialogs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, Button, Card, Input, Select } from "@/components/ui/primitives";
import { EmptyState } from "@/components/ui/states";
import { STAGES } from "@/types/acquisition";

export default function PipelinePage() {
  const desk = useDeskData();
  const { openEditor, dialogs } = useDeskDialogs();
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("");

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    return desk.companies.filter(
      (prospect) =>
        (!stage || prospect.stage === stage) &&
        (!term ||
          [prospect.name, prospect.platform, prospect.pain, prospect.source].some((value) =>
            (value ?? "").toLowerCase().includes(term),
          )),
    );
  }, [desk.companies, query, stage]);

  return (
    <div className="pb-16">
      <PageHeader
        title="Prospect pipeline"
        description="Track the path from first conversation to commercial rollout."
        actions={
          <Button variant="primary" onClick={() => openEditor("companies")}>
            <Plus className="h-4 w-4" aria-hidden />
            Add prospect
          </Button>
        }
      />

      <div className="px-7 py-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search company, pain point or platform"
              className="pl-9"
              aria-label="Search prospects"
            />
          </div>
          <Select
            value={stage}
            onChange={(event) => setStage(event.target.value)}
            aria-label="Filter by stage"
            className="w-auto"
          >
            <option value="">All stages</option>
            {STAGES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
        </div>

        <Card className="overflow-x-auto">
          {desk.companies.length === 0 ? (
            <EmptyState
              icon={<Filter className="h-6 w-6" />}
              title="No prospects yet"
              body={<p>Add your first prospect to start tracking conversations.</p>}
              action={
                <Button variant="primary" size="sm" onClick={() => openEditor("companies")}>
                  Add prospect
                </Button>
              }
            />
          ) : rows.length === 0 ? (
            <EmptyState
              title="No prospects match these filters"
              body="Loosen the filters or clear the search."
              action={
                <Button
                  size="sm"
                  onClick={() => {
                    setQuery("");
                    setStage("");
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-ink-faint">
                  <th className="px-4 py-2.5 font-normal">Company</th>
                  <th className="px-4 py-2.5 font-normal">Stage</th>
                  <th className="px-4 py-2.5 font-normal">Incident platform</th>
                  <th className="px-4 py-2.5 font-normal">Qualification</th>
                  <th className="px-4 py-2.5 font-normal">Next step</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((prospect) => (
                  <tr key={prospect.id} className="group align-top transition-colors hover:bg-raised/50">
                    <td className="px-4 py-3">
                      <Link href={`/acquisition/pipeline/${prospect.id}`} className="block min-w-0">
                        <span className="block font-medium text-ink group-hover:text-signal-strong">{prospect.name}</span>
                        {prospect.source ? (
                          <span className="block text-2xs text-ink-faint">{prospect.source}</span>
                        ) : null}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone="signal">{prospect.stage}</Badge>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{prospect.platform || "—"}</td>
                    <td className="px-4 py-3 text-ink-muted">{prospect.fit || "—"}</td>
                    <td className="max-w-xs px-4 py-3 text-ink-muted">
                      <span className="line-clamp-2 break-words">{prospect.next || "—"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {dialogs}
    </div>
  );
}
