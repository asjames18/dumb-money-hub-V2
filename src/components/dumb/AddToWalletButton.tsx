import { useState } from "react";
import { Check, Plus } from "lucide-react";

import { trackEvent } from "@/lib/analytics";

export const PULSECHAIN_CHAIN_ID_HEX = "0x171"; // 369

type AddStatus = "idle" | "pending" | "added" | "wrong-chain" | "no-wallet" | "rejected";

/**
 * One-click "add token to wallet" (EIP-747 wallet_watchAsset). This is a
 * read-only wallet prompt — not a transaction, no gas, no signing, reversible,
 * the user can always decline. Chain-checked first so a user sitting on the
 * wrong network never adds the address under the wrong chain.
 *
 * `label` is the idle button text (keep it neutral when the symbol comes from
 * an arbitrary scanned contract — the report context carries the identity);
 * `doneLabel` confirms the add. `symbol`/`decimals` must be real on-chain
 * metadata the caller already verified — callers should only render this when
 * the scan actually read them.
 */
export function AddToWalletButton({
  label,
  doneLabel,
  address,
  symbol,
  decimals,
}: {
  label: string;
  doneLabel: string;
  address: string;
  symbol: string;
  decimals: number;
}) {
  const [status, setStatus] = useState<AddStatus>("idle");

  async function handleClick() {
    const eth = (
      window as unknown as {
        ethereum?: { request?: (args: unknown) => Promise<unknown>; chainId?: string };
      }
    ).ethereum;
    if (!eth?.request) {
      setStatus("no-wallet");
      return;
    }
    let chainHex: string | undefined;
    try {
      chainHex = (await eth.request({ method: "eth_chainId" })) as string;
    } catch {
      chainHex = eth.chainId;
    }
    if (chainHex?.toLowerCase() !== PULSECHAIN_CHAIN_ID_HEX) {
      // Refuses on a wrong chain AND on an unknown chain — an address added
      // under the wrong network in the wallet would send a user to the wrong
      // token, so never guess.
      setStatus("wrong-chain");
      return;
    }
    setStatus("pending");
    trackEvent("add_to_wallet");
    try {
      const added = await eth.request({
        method: "wallet_watchAsset",
        params: { type: "ERC20", options: { address, symbol, decimals } },
      });
      setStatus(added === true ? "added" : "rejected");
    } catch {
      setStatus("rejected");
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={status === "pending" || status === "added"}
        className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-foreground/25 px-2.5 py-1.5 text-xs font-bold uppercase tracking-widest text-foreground transition-colors hover:border-gold hover:text-gold disabled:cursor-default disabled:opacity-70"
      >
        {status === "added" ? (
          <>
            <Check className="size-3.5" /> {doneLabel}
          </>
        ) : status === "pending" ? (
          "Check your wallet…"
        ) : (
          <>
            <Plus className="size-3.5" /> {label}
          </>
        )}
      </button>
      {status === "wrong-chain" && (
        <p className="mt-2 text-xs leading-relaxed text-gold">
          Your wallet is on a different network — switch it to PulseChain (chain 369) first, then
          tap the button again.
        </p>
      )}
      {status === "no-wallet" && (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          No wallet detected on this page — open it in a wallet app's built-in browser and tap the
          button there.
        </p>
      )}
      {status === "rejected" && (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Not completed — copy the address above and add it to your wallet manually instead.
        </p>
      )}
    </div>
  );
}
