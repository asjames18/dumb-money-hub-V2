import { useMemo, useState } from "react";
import { parseUnits, formatUnits } from "viem";
import { Split } from "lucide-react";

import { DAMP_TAX_BPS, DUMB_TAX_BPS } from "@/lib/pulsechain";
import { Input } from "@/components/ui/input";

type TokenKey = "DUMB" | "DAMP";

interface Leg {
  label: string;
  bps: number;
  bar: string;
  detail: string;
}

/**
 * Per-leg split of the transfer tax, verified on-chain 2026-09-26 (read-only,
 * no signing): the dead address is NOT fee-excluded, so the full tax applies
 * to every buy, sell, and wallet-to-wallet transfer. DUMB 6% = 2% buy-back
 * bucket + 2% liquidity bucket (both entombed — the auto-processing engine is
 * dead, owner renounced) + 1% burn + ~1% reflection. Net: 5% of every transfer
 * permanently burned, ~1% reflected. DAMP 3% = 1% contract
 * bucket (entombed) + 1% burn + ~1% reflection. Net: 2% burned, ~1% reflected.
 */
const LEGS: Record<TokenKey, { taxBps: number; legs: Leg[] }> = {
  DUMB: {
    taxBps: DUMB_TAX_BPS,
    legs: [
      { label: "Recipient gets", bps: 9400, bar: "bg-emerald-500", detail: "the actual transfer" },
      {
        label: "Protocol burn",
        bps: 100,
        bar: "bg-orange-500",
        detail: "to the dead address — gone forever",
      },
      {
        label: "Buy-back bucket",
        bps: 200,
        bar: "bg-slate-500",
        detail: "entombed in the contract",
      },
      {
        label: "Liquidity bucket",
        bps: 200,
        bar: "bg-slate-400",
        detail: "entombed in the contract",
      },
      { label: "Reflection", bps: 100, bar: "bg-sky-500", detail: "≈ spread across all holders" },
    ],
  },
  DAMP: {
    taxBps: DAMP_TAX_BPS,
    legs: [
      { label: "Recipient gets", bps: 9700, bar: "bg-emerald-500", detail: "the actual transfer" },
      {
        label: "Protocol burn",
        bps: 100,
        bar: "bg-orange-500",
        detail: "to the dead address — gone forever",
      },
      {
        label: "Contract bucket",
        bps: 100,
        bar: "bg-slate-500",
        detail: "entombed in the contract",
      },
      { label: "Reflection", bps: 100, bar: "bg-sky-500", detail: "≈ spread across all holders" },
    ],
  },
};

function fmtTok(bi: bigint | null): string {
  if (bi === null) return "—";
  const [i, d = ""] = formatUnits(bi, 18).split(".");
  const int = Number(i).toLocaleString("en-US");
  const dec = d.slice(0, 4).replace(/0+$/, "");
  return dec ? `${int}.${dec}` : int;
}

export function TaxFlowVisual() {
  const [tokenKey, setTokenKey] = useState<TokenKey>("DUMB");
  const [amount, setAmount] = useState("1000000");

  const parsed = useMemo(() => {
    try {
      return amount.trim() ? parseUnits(amount.trim(), 18) : null;
    } catch {
      return null;
    }
  }, [amount]);

  const cfg = LEGS[tokenKey];
  const pct = cfg.taxBps / 100;

  return (
    <section
      aria-label="Where the transfer tax goes"
      className="rounded-xl border-2 border-foreground/20 bg-card p-5 sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 font-display text-sm uppercase tracking-[0.3em] text-pink">
            <Split className="size-4" aria-hidden="true" />
            Follow the money
          </p>
          <h2 className="mt-2 font-display text-2xl uppercase tracking-wide sm:text-3xl">
            Where the {pct}% tax actually goes
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Every taxed transfer — buy, sell, wallet move — is split into legs by the contract. Type
            an amount and watch each slice. Nothing here moves money; it&apos;s the verified
            on-chain math, visualized.
          </p>
        </div>
        <div
          className="flex shrink-0 rounded-lg border border-border p-1"
          role="group"
          aria-label="Token"
        >
          {(["DUMB", "DAMP"] as TokenKey[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setTokenKey(k)}
              aria-pressed={tokenKey === k}
              className={`rounded-md px-3 py-1.5 font-display text-xs uppercase tracking-widest transition-colors ${
                tokenKey === k
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <label htmlFor="taxflow-amount" className="text-sm text-muted-foreground">
          Amount of {tokenKey} sent
        </label>
        <Input
          id="taxflow-amount"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="1000000"
          className="w-44 font-mono"
        />
      </div>

      <div
        className="mt-4 flex h-6 w-full overflow-hidden rounded-full border border-border"
        role="img"
        aria-label={`Tax split for ${fmtTok(parsed)} ${tokenKey}: ${cfg.legs
          .map((l) => `${l.label} ${l.bps / 100}%`)
          .join(", ")}`}
      >
        {cfg.legs.map((leg) => (
          <div
            key={leg.label}
            className={leg.bar}
            style={{ width: `${leg.bps / 100}%` }}
            title={`${leg.label}: ${leg.bps / 100}%`}
          />
        ))}
      </div>

      <ul className="mt-4 space-y-2">
        {cfg.legs.map((leg) => (
          <li key={leg.label} className="flex items-center gap-3 text-sm">
            <span className={`size-3 shrink-0 rounded-sm ${leg.bar}`} aria-hidden="true" />
            <span className="font-medium">{leg.label}</span>
            <span className="text-muted-foreground">· {leg.detail}</span>
            <span className="ml-auto font-mono text-muted-foreground">
              {parsed !== null
                ? `${fmtTok((parsed * BigInt(leg.bps)) / 10_000n)} ${tokenKey}`
                : "—"}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-4 space-y-1.5 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
        <p>
          <span className="font-semibold text-foreground">Net effect:</span>{" "}
          {tokenKey === "DUMB" ? "5" : "2"}% of every {tokenKey} transfer is permanently burned (1%
          protocol burn to the dead address + {tokenKey === "DUMB" ? "4" : "1"}% locked in the
          contract&apos;s dead buckets forever), ~1% reflected to holders.
        </p>
        <p>
          <span className="font-semibold text-foreground">Burning to the dead address?</span> The
          dead address is <em>not</em> fee-excluded, so it collects the recipient leg{" "}
          <span className="font-semibold text-foreground">and</span> the 1% protocol burn leg: ≈
          {tokenKey === "DUMB" ? "95" : "98"} {tokenKey} of every 100 sent land in the dead balance.
        </p>
        <p>
          <span className="font-semibold text-foreground">Entombed</span> means the auto-processing
          engine is dead and the owner is renounced — nothing ever leaves those contract buckets.
        </p>
        <p className="text-[11px] opacity-80">
          Split verified on-chain 2026-09-27 (read-only). Reflection is ≈1% spread across holders —
          approximate, never a promise.
        </p>
      </div>
    </section>
  );
}
