import { AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";

const SHORT =
  "Experimental, unaudited software — interact at your own risk. This contract is immutable: no owner, no pause, no rescue. Bugs can't be fixed and you can lose everything. Not financial advice; no gains promised. Only risk what you can afford to lose.";

const LONG =
  "Dumb Money is an experiment in mechanism design, deployed as unaudited, immutable software — no owner, no pause button, no upgrade path, no rescue. If the contract contains a bug, nobody can fix it, and you can lose everything you put in. Nothing here is financial advice, an offer, or a promise of gains, price behavior, or dollar value. Crypto is risky. Always verify contract addresses on a block explorer before interacting, and only risk what you can afford to lose.";

type Props = {
  variant?: "short" | "long";
  className?: string;
};

export function Disclaimer({ variant = "short", className }: Props) {
  if (variant === "long") {
    return <p className={cn("text-xs leading-relaxed text-muted-foreground", className)}>{LONG}</p>;
  }

  return (
    <p
      className={cn(
        "flex items-start gap-2 rounded-md border border-border bg-surface p-3 text-xs leading-relaxed text-muted-foreground",
        className,
      )}
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-accent" />
      {SHORT}
    </p>
  );
}
