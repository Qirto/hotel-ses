"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, CircleCheck, ClipboardPlus, Clock, History, ListChecks, Repeat, Timer } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import { ResponsiveSheet } from "@/components/app/ResponsiveSheet";
import type { HotelRoom, Reclamation } from "@/utils/roomsData";
import { computeRoomAnalytics } from "@/utils/roomAnalytics";
import { isOpenTicket } from "@/lib/tickets";
import { CLEANING_LABEL, CLEANING_TONE, isTicketForRoom, roomHeadline, roomLocation, ticketStatsByRoom } from "@/lib/rooms";
import { categoryIcon, departmentIcon } from "@/lib/icons";
import { departmentLabel, formatIncidentDate, formatMinutes, plural } from "@/lib/format";
import { EmptyState } from "./Panel";
import { PriorityBadge, TicketStatusBadge, ToneBadge } from "./StatusBadges";

type TabId = "overview" | "open" | "history" | "patterns";

/**
 * Room detail shared by every portal (replaces three ~600-line modals).
 * Role-specific behaviour is passed in:
 *  - `controls`: room actions on the Overview tab (stay state, cleaning, ...)
 *  - `ticketActions`: buttons per open ticket (acknowledge, resolve, ...)
 *  - `logForm`: optional form, opened from the "Log issue" footer button
 */
export function RoomDetail({
  room: selected,
  tickets,
  onClose,
  controls,
  ticketActions,
  logForm,
}: {
  room: HotelRoom | null;
  tickets: readonly Reclamation[];
  onClose: () => void;
  controls?: ReactNode;
  ticketActions?: (ticket: Reclamation) => ReactNode;
  logForm?: ReactNode;
}) {
  const [tab, setTab] = useState<TabId>("overview");
  const [logging, setLogging] = useState(false);

  // Controlled like every other drawer: the sheet stays mounted and keeps the
  // last room on screen while it animates out, instead of vanishing mid-close.
  const isOpen = selected != null;
  const [shown, setShown] = useState(selected);
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (selected && selected !== shown) setShown(selected);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      // fresh view on every open
      setTab("overview");
      setLogging(false);
    }
  }
  const room = selected ?? shown;
  const logButton = useRef<HTMLButtonElement>(null);
  const backButton = useRef<HTMLButtonElement>(null);
  const wasLogging = useRef(false);

  // the button that was clicked unmounts with the view: hand focus to its counterpart
  useEffect(() => {
    if (logging) backButton.current?.focus();
    else if (wasLogging.current) logButton.current?.focus();
    wasLogging.current = logging;
  }, [logging]);

  // state resets on the next open, so the closing sheet doesn't flash another view
  const close = onClose;

  const roomTickets = useMemo(
    () =>
      room
        ? tickets
            .filter((t) => isTicketForRoom(t, room))
            .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
        : [],
    [room, tickets]
  );
  const open = useMemo(() => roomTickets.filter(isOpenTicket), [roomTickets]);
  const analytics = useMemo(() => (room ? computeRoomAnalytics(room, roomTickets as Reclamation[]) : null), [room, roomTickets]);

  if (!room) return null;
  const head = roomHeadline(room, ticketStatsByRoom(roomTickets).get(room.id) ?? undefined);
  const occupancyLabel = room.is_occupied ? "Occupied" : "Vacant";
  const cleaningLabel = CLEANING_LABEL[room.cleaning_status];

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "open", label: "Open", badge: open.length || undefined },
    { id: "history", label: "History" },
    { id: "patterns", label: "Patterns" },
  ];

  // Logging is an action, not a view: a footer button swaps the body to the form
  // inside the same drawer.
  const showLog = logging && Boolean(logForm);

  return (
    <ResponsiveSheet
      open={isOpen}
      onOpenChange={(o) => !o && close()}
      size="lg"
      title={showLog ? `Log issue · Room ${room.room_number}` : `Room ${room.room_number}`}
      description={showLog ? "Create a ticket now, or record a past incident." : roomLocation(room)}
      footer={
        logForm && !showLog ? (
          <Button
            ref={logButton}
            type="button"
            variant="primary"
            size="lg"
            onClick={() => setLogging(true)}
            leftIcon={<ClipboardPlus className="size-4" aria-hidden />}
            className="w-full justify-center"
          >
            Log issue
          </Button>
        ) : undefined
      }
    >
      <motion.div
        key={showLog ? "log" : "room"}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
        className="flex flex-col gap-5"
      >
        {showLog ? (
          <>
            <Button
              ref={backButton}
              type="button"
              variant="ghost"
              size="touch"
              onClick={() => setLogging(false)}
              leftIcon={<ArrowLeft className="size-4" aria-hidden />}
              className="-ml-2 self-start"
            >
              Back to room
            </Button>
            {logForm}
          </>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {/* the headline repeats a status below when nothing more urgent applies: show it only when it adds something */}
              {head.label !== occupancyLabel && head.label !== cleaningLabel && <ToneBadge tone={head.tone}>{head.label}</ToneBadge>}
              <ToneBadge tone={room.is_occupied ? "info" : "success"}>{occupancyLabel}</ToneBadge>
              <ToneBadge tone={CLEANING_TONE[room.cleaning_status]}>{cleaningLabel}</ToneBadge>
            </div>

            <AnimatedTabs
              tabs={tabs}
              activeTab={tab}
              onChange={(id) => setTab(id as TabId)}
              renderContent={false}
              tabsContainerClassName="no-scrollbar w-full max-w-full self-stretch overflow-x-auto [&>button]:flex-1 [&>button]:justify-center"
            />

            {tab === "overview" && (
              <div className="flex flex-col gap-5">
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Stat icon={<ListChecks />} label="Tickets" value={analytics?.totalTickets ?? 0} />
                  <Stat icon={<Clock />} label="Open" value={analytics?.openTickets ?? 0} />
                  <Stat icon={<CircleCheck />} label="Resolved" value={analytics?.resolvedTickets ?? 0} />
                  <Stat
                    icon={<Timer />}
                    label="Avg fix"
                    value={formatMinutes(analytics?.avgResolutionMinutes)}
                  />
                </dl>
                {room.is_occupied && (room.adult_count || room.child_count) ? (
                  <p className="text-sm text-fg-secondary">
                    Guests: {plural(room.adult_count ?? 0, "adult")}, {plural(room.child_count ?? 0, "child", "children")}
                  </p>
                ) : null}
                {controls}
              </div>
            )}

            {tab === "open" &&
              (open.length === 0 ? (
                <EmptyState icon={<CircleCheck />} title="No open tickets" description="Everything reported for this room is resolved." />
              ) : (
                <ul className="flex flex-col gap-3">
                  {open.map((t) => (
                    <TicketCard key={t.id} ticket={t} actions={ticketActions?.(t)} />
                  ))}
                </ul>
              ))}

            {tab === "history" &&
              (roomTickets.length === 0 ? (
                <EmptyState icon={<History />} title="No history yet" description="Tickets logged for this room will appear here." />
              ) : (
                <ol className="relative flex flex-col gap-4 border-l border-border pl-5">
                  {roomTickets.map((t) => {
                    const d = formatIncidentDate(t.created_at);
                    return (
                      <li key={t.id} className="relative">
                        <span
                          className={`absolute -left-[1.6rem] top-1.5 size-2.5 rounded-full ring-4 ring-surface ${isOpenTicket(t) ? "bg-warning" : "bg-success"}`}
                          aria-hidden
                        />
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-medium">{t.category}</span>
                          <TicketStatusBadge status={t.status} />
                        </div>
                        {t.description && <p className="mt-1 text-sm text-fg-secondary">{t.description}</p>}
                        <p className="mt-1 text-xs text-fg-muted">
                          {d.full} · {departmentLabel(t.department)}
                        </p>
                      </li>
                    );
                  })}
                </ol>
              ))}

            {tab === "patterns" && (
              <div className="flex flex-col gap-5">
                <div className="rounded-lg border border-border bg-surface-raised p-4">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <Clock className="size-4 text-fg-muted" aria-hidden /> Rush hour
                  </p>
                  {analytics?.rushHour ? (
                    <>
                      <p className="mt-2 text-xl font-semibold tabular-nums">{analytics.rushHour.hourRange}</p>
                      <p className="mt-1 text-sm text-fg-muted">
                        Peak of {plural(analytics.rushHour.count, "ticket")} on {analytics.rushHour.date};{" "}
                        {plural(analytics.rushHour.totalForHourOfDay, "ticket")} in this hour overall.
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-fg-muted">Not enough history yet.</p>
                  )}
                </div>
                <div>
                  <p className="mb-3 flex items-center gap-2 text-sm font-medium">
                    <Repeat className="size-4 text-fg-muted" aria-hidden /> Most repeated problems
                  </p>
                  {analytics && analytics.topProblems.length > 0 ? (
                    <ProblemBars problems={analytics.topProblems} />
                  ) : (
                    <p className="text-sm text-fg-muted">No repeated problems.</p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>
    </ResponsiveSheet>
  );
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface-raised p-3">
      <dt className="flex items-center gap-1.5 text-xs text-fg-muted [&>svg]:size-3.5">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

export function TicketCard({ ticket, actions }: { ticket: Reclamation; actions?: ReactNode }) {
  const Icon = categoryIcon(ticket.category);
  const DeptIcon = departmentIcon(ticket.department);
  const d = formatIncidentDate(ticket.created_at);
  return (
    <li className="rounded-lg border border-border bg-surface-raised p-3.5">
      <div className="flex items-start gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-md bg-surface-hover text-fg-muted">
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{ticket.category}</span>
            <PriorityBadge priority={ticket.priority} />
            <TicketStatusBadge status={ticket.status} />
          </div>
          {ticket.description && <p className="mt-1 text-sm text-fg-secondary">{ticket.description}</p>}
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted">
            <span className="inline-flex items-center gap-1">
              <DeptIcon className="size-3.5" aria-hidden /> {departmentLabel(ticket.department)}
            </span>
            <span title={d.full}>{d.relative}</span>
            <span>{ticket.assigned_to?.full_name ?? "Unassigned"}</span>
          </p>
        </div>
      </div>
      {actions && <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-border pt-3">{actions}</div>}
    </li>
  );
}

export function ProblemBars({ problems }: { problems: readonly { category: string; count: number; percentage: number }[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {problems.map((p, i) => {
        const Icon = categoryIcon(p.category);
        return (
          <li key={p.category}>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
              <span className="inline-flex min-w-0 items-center gap-2">
                <span className="w-5 text-xs tabular-nums text-fg-muted">{i + 1}.</span>
                <Icon className="size-4 shrink-0 text-fg-muted" aria-hidden />
                <span className="truncate">{p.category}</span>
              </span>
              <span className="shrink-0 tabular-nums text-fg-secondary">
                {p.count}× <span className="text-fg-muted">({Math.round(p.percentage)}%)</span>
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-hover" aria-hidden>
              <div className="h-full rounded-full bg-fg" style={{ width: `${Math.max(4, p.percentage)}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
