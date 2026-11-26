import { Badge, type BadgeTone } from "@/components/ui/badge";
import type { Reclamation } from "@/utils/roomsData";
import type { Tone } from "@/lib/rooms";
import { TICKET_PRIORITY, TICKET_STATUS } from "@/lib/tickets";

const TO_BADGE: Record<Tone, BadgeTone> = {
  neutral: "neutral",
  info: "neutral",
  special: "neutral",
  success: "success",
  warning: "warning",
  danger: "danger",
};

export function ToneBadge({ tone, children, dot = true }: { tone: Tone; children: React.ReactNode; dot?: boolean }) {
  return (
    <Badge tone={TO_BADGE[tone]} dot={dot} className="whitespace-nowrap">
      {children}
    </Badge>
  );
}

export function TicketStatusBadge({ status }: { status: Reclamation["status"] }) {
  const s = TICKET_STATUS[status] ?? { label: status, tone: "neutral" as Tone };
  return <ToneBadge tone={s.tone}>{s.label}</ToneBadge>;
}

export function PriorityBadge({ priority }: { priority: Reclamation["priority"] }) {
  const p = TICKET_PRIORITY[priority] ?? { label: priority, tone: "neutral" as Tone };
  return (
    <ToneBadge tone={p.tone} dot={false}>
      {p.label}
    </ToneBadge>
  );
}
