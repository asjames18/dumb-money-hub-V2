/**
 * Stat marquee: the live DUMB token's verified facts stream as a poster
 * ticker under the hero. Static — every figure is a verified on-chain fact
 * (2026-09-26), not a live feed. No invented numbers, ever.
 */
export function Ticker() {
  const items = [
    { label: "Token", value: "DUMB · live" },
    { label: "Chain", value: "PulseChain" },
    { label: "Tax", value: "6% every transfer" },
    { label: "Supply", value: "28B fixed" },
    { label: "Immobilized", value: "~69%" },
    { label: "Owner", value: "Renounced" },
    { label: "Burns on trades", value: "5% instant" },
  ];

  const row = (key: string, hidden: boolean) => (
    <div key={key} aria-hidden={hidden} className="flex shrink-0 items-center">
      {items.map((i) => (
        <span key={`${key}-${i.label}`} className="flex items-center whitespace-nowrap">
          <span className="font-display text-sm uppercase tracking-widest text-muted-foreground">
            {i.label}
          </span>
          <span className="ml-2 font-display text-sm uppercase tracking-wide text-primary">
            {i.value}
          </span>
          <span className="mx-6 text-primary">●</span>
        </span>
      ))}
    </div>
  );

  return (
    <div className="overflow-hidden border-t-2 border-foreground/20 bg-card/80 py-2">
      <div className="flex w-max animate-marquee gap-0">
        {row("a", false)}
        {row("b", true)}
      </div>
    </div>
  );
}
