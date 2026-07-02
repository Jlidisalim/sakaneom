// Status as a quiet dot + label (the Quiet Gold convention from leads-panel).
import { cn } from "@/lib/utils";
import { RDV_STATUS_LABELS, type RdvStatus } from "@/lib/promo/types";

type Tone = "green" | "gold" | "red" | "stone" | "sky" | "amber";

const TONE_DOT: Record<Tone, string> = {
  green: "bg-emerald-500",
  gold: "bg-[var(--gold)]",
  red: "bg-destructive",
  stone: "bg-stone",
  sky: "bg-sky-500",
  amber: "bg-amber-500",
};

export function StatusBadge({
  label,
  tone,
  className,
}: {
  label: string;
  tone: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-muted-foreground",
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", TONE_DOT[tone])} />
      {label}
    </span>
  );
}

const RDV_TONE: Record<RdvStatus, Tone> = {
  planifie: "sky",
  confirme: "gold",
  realise: "green",
  annule: "red",
};
export function RdvStatusBadge({ status }: { status: RdvStatus }) {
  return <StatusBadge label={RDV_STATUS_LABELS[status]} tone={RDV_TONE[status]} />;
}

export type { Tone };
