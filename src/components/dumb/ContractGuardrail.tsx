import { ExternalLink, ShieldAlert } from "lucide-react";

import { AddToWalletButton } from "@/components/dumb/AddToWalletButton";
import { CopyButton } from "@/components/dumb/CopyButton";
import {
  DAMP_TOKEN_ADDRESS,
  DAMP_TOKEN_URL,
  DUMB_TOKEN_ADDRESS,
  DUMB_TOKEN_URL,
} from "@/data/dump";

const TOKENS = [
  {
    symbol: "DUMB",
    name: "Dumb Money",
    address: DUMB_TOKEN_ADDRESS,
    explorer: DUMB_TOKEN_URL,
  },
  {
    symbol: "DAMP",
    name: "Dumb Amplifier",
    address: DAMP_TOKEN_ADDRESS,
    explorer: DAMP_TOKEN_URL,
  },
] as const;

/**
 * "Which Dumb Money?" guardrail — pin both PulseChain contract addresses
 * wherever a trading decision happens. Several unrelated tokens share the
 * name (a loud Solana pump.fun one, an Ethereum one, BSC/Base copies):
 * check the contract address before you buy, or you buy the wrong token.
 */
export function ContractGuardrail() {
  return (
    <section
      aria-label="Which Dumb Money? Verify the contract address"
      className="rounded-xl border-2 border-gold/60 bg-card p-5 sm:p-6"
    >
      <p className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 size-6 shrink-0 text-gold" />
        <span>
          <span className="font-display text-lg uppercase tracking-wide text-foreground">
            Which Dumb Money?
          </span>
          <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
            Several unrelated tokens share this name — a loud Solana pump.fun one, an Ethereum one,
            BSC/Base copies.{" "}
            <strong className="text-foreground">
              Check the contract address before you buy, or you will buy the wrong token.
            </strong>{" "}
            This is the PulseChain DUMB:
          </span>
        </span>
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {TOKENS.map((t) => (
          <div key={t.symbol} className="rounded-lg border border-foreground/20 bg-surface p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="sticker bg-primary px-2 py-0.5 font-display text-[10px] uppercase tracking-[0.2em] text-primary-foreground">
                {t.symbol} · {t.name}
              </span>
              <CopyButton value={t.address} label={`${t.symbol} contract address`} />
            </div>
            <p className="mt-2 break-all font-mono text-[11px] leading-relaxed text-muted-foreground">
              {t.address}
            </p>
            <a
              href={t.explorer}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-2 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-foreground hover:text-pink"
            >
              View on explorer <ExternalLink className="size-3.5" />
            </a>
            <AddToWalletButton
              label={`Add ${t.symbol} to wallet`}
              doneLabel={`${t.symbol} in your wallet`}
              address={t.address}
              symbol={t.symbol}
              decimals={18}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
