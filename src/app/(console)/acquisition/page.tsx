"use client";

import Link from "next/link";
import { useState } from "react";

import { AcquisitionHero } from "@/components/acquisition/AcquisitionHero";
import { useDeskData } from "@/components/acquisition/DeskContext";
import { EmptyNote, Panel } from "@/components/acquisition/DeskParts";
import { RecordItem } from "@/components/acquisition/RecordItem";
import { useDeskDialogs } from "@/components/acquisition/useDeskDialogs";
import { Card, Select } from "@/components/ui/primitives";
import { deskOverview, sortByDate } from "@/lib/acquisition/desk";
import { SOURCES } from "@/types/acquisition";

export default function AcquisitionOverviewPage() {
  const desk = useDeskData();
  const { openEditor, dialogs } = useDeskDialogs();
  const [campaign, setCampaign] = useState("");

  const overview = deskOverview(desk, campaign);
  const total = overview.prospects.length;
  const payingShare = total ? Math.round((overview.payingCustomers / total) * 100) : 0;

  return (
    <div className="space-y-5 px-7 pb-16 pt-4">
      <AcquisitionHero onAddProspect={() => openEditor("companies")} />

      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="campaign" className="text-sm text-ink-muted">
          Dashboard scope
        </label>
        <Select id="campaign" value={campaign} onChange={(event) => setCampaign(event.target.value)} className="w-auto">
          <option value="">All campaigns</option>
          {SOURCES.map((source) => (
            <option key={source} value={source}>
              {source}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Prospects"
          value={total}
          detail={`${overview.inOutreach} in outreach or later`}
          href="/acquisition/pipeline"
        />
        <Metric
          label="Meetings booked"
          value={overview.bookedMeetings.length}
          detail={`${overview.heldMeetings} held`}
          href="/acquisition/meetings"
        />
        <Metric
          label="Open follow-ups"
          value={overview.openFollowUps.length}
          detail={`${overview.overdueFollowUps} overdue`}
          href="/acquisition/follow-ups"
          urgent={overview.overdueFollowUps > 0}
        />
        <Metric
          label="Paying customers"
          value={overview.payingCustomers}
          detail={`${overview.designPartners} active design partners`}
          href="/acquisition/pipeline"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Panel
          title="Conversion stages"
          description={`Current stage per company · ${payingShare}% of tracked prospects currently paying`}
          className="h-fit"
        >
          <div className="space-y-2.5">
            {overview.stageCounts.map(({ stage, count }) => (
              <div key={stage} className="grid grid-cols-[132px_1fr_24px] items-center gap-2.5 text-xs">
                <span className="text-ink-muted">{stage}</span>
                <div className="h-1.5 overflow-hidden rounded-full bg-raised">
                  <div
                    className="h-full rounded-full bg-signal"
                    style={{ width: `${total ? (100 * count) / total : 0}%` }}
                  />
                </div>
                <span className="text-right font-medium tabular-nums text-ink">{count}</span>
              </div>
            ))}
          </div>
        </Panel>

        <div className="grid content-start gap-4">
          <Panel title="Follow-up queue" action={<ViewAll href="/acquisition/follow-ups" />}>
            {overview.openFollowUps.length ? (
              <div className="divide-y divide-line">
                {sortByDate(overview.openFollowUps)
                  .slice(0, 4)
                  .map((task) => (
                    <RecordItem key={task.id} kind="tasks" record={task} onEdit={() => openEditor("tasks", task.id)} />
                  ))}
              </div>
            ) : (
              <EmptyNote>No open follow-ups in this scope.</EmptyNote>
            )}
          </Panel>

          <Panel title="Booked meetings" action={<ViewAll href="/acquisition/meetings" />}>
            {overview.bookedMeetings.length ? (
              <div className="divide-y divide-line">
                {sortByDate(overview.bookedMeetings)
                  .slice(0, 4)
                  .map((meeting) => (
                    <RecordItem
                      key={meeting.id}
                      kind="meetings"
                      record={meeting}
                      onEdit={() => openEditor("meetings", meeting.id)}
                    />
                  ))}
              </div>
            ) : (
              <EmptyNote>No booked meetings in this scope.</EmptyNote>
            )}
          </Panel>
        </div>
      </div>

      {dialogs}
    </div>
  );
}

function Metric({
  label,
  value,
  detail,
  href,
  urgent = false,
}: {
  label: string;
  value: number;
  detail: string;
  href: string;
  urgent?: boolean;
}) {
  return (
    <Link href={href} className="group">
      <Card className="h-full p-4 transition-colors group-hover:border-line-strong">
        <span className="text-2xs font-medium uppercase tracking-wider text-ink-faint">{label}</span>
        <p className="mt-1.5 text-3xl font-semibold tabular-nums text-ink">{value}</p>
        <p className={urgent ? "mt-0.5 text-xs text-danger" : "mt-0.5 text-xs text-ink-muted"}>{detail}</p>
      </Card>
    </Link>
  );
}

function ViewAll({ href }: { href: string }) {
  return (
    <Link href={href} className="text-xs text-ink-muted transition-colors hover:text-ink">
      View all
    </Link>
  );
}
