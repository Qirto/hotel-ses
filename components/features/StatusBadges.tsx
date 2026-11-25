import { Badge, type BadgeTone } from "@/components/ui/badge";
import type { Reclamation } from "@/utils/roomsData";
import type { Tone } from "@/lib/rooms";

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

const STATUS: Record<Reclamation["status"], { label: string; tone: Tone }> = {
  OPEN: { label: "Open", tone: "danger" },
  ACKNOWLEDGED: { label: "Acknowledged", tone: "warning" },
  IN_PROGRESS: { label: "In progress", tone: "warning" },
  RESOLVED: { label: "Resolved", tone: "success" },
};

export function TicketStatusBadge({ status }: { status: Reclamation["status"] }) {
  const s = STATUS[status] ?? { label: status, tone: "neutral" as Tone };
  return <ToneBadge tone={s.tone}>{s.label}</ToneBadge>;
}

const PRIORITY: Record<Reclamation["priority"], { label: string; tone: Tone }> = {
  EMERGENCY: { label: "Emergency", tone: "danger" },
  HIGH: { label: "High", tone: "warning" },
  STANDARD: { label: "Standard", tone: "neutral" },
};

export function PriorityBadge({ priority }: { priority: Reclamation["priority"] }) {
  const p = PRIORITY[priority] ?? { label: priority, tone: "neutral" as Tone };
  return (
    <ToneBadge tone={p.tone} dot={false}>
      {p.label}
    </ToneBadge>
  );
}
