import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { useEffect, useRef } from "react";
import { Wallet } from "lucide-react";

import { pulsechain } from "@/lib/pulsechain";
import { trackEvent } from "@/lib/analytics";
import { Button } from "@/components/ui/button";

const short = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;

/**
 * Wallet connect for the on-site swap. Non-custodial: the site never holds
 * keys or funds — every transaction is proposed to the user's own wallet.
 */
export function ConnectButton({ compact = false }: { compact?: boolean }) {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const injected = connectors.find((c) => c.id === "injected") ?? connectors[0];
  const onPulse = chainId === pulsechain.id;

  // Anonymous analytics: one wallet_connect per connected address (not per
  // render, not per page). No address is ever sent — just the event.
  const trackedFor = useRef<string | null>(null);
  useEffect(() => {
    if (isConnected && address && onPulse && trackedFor.current !== address) {
      trackedFor.current = address;
      trackEvent("wallet_connect");
    }
    if (!isConnected) trackedFor.current = null;
  }, [isConnected, address, onPulse]);

  if (!isConnected || !address) {
    return (
      <span className="inline-flex flex-col items-center gap-1">
        <Button
          size={compact ? "sm" : "default"}
          onClick={() => injected && connect({ connector: injected })}
          disabled={!injected || isConnecting}
          className="rounded-md bg-primary font-display text-sm uppercase tracking-widest text-primary-foreground hover:bg-primary/90"
        >
          <Wallet className="mr-1.5 size-4" />
          {isConnecting ? "Connecting…" : "Connect wallet"}
        </Button>
        {!compact && (
          <span className="text-[11px] leading-tight text-muted-foreground">
            Non-custodial — we never hold your keys or funds.
          </span>
        )}
      </span>
    );
  }

  if (!onPulse) {
    return (
      <Button
        size={compact ? "sm" : "default"}
        onClick={() => switchChain({ chainId: pulsechain.id })}
        disabled={isSwitching}
        className="rounded-md bg-gold font-display text-sm uppercase tracking-widest text-black hover:bg-gold/90"
      >
        {isSwitching ? "Switching…" : "Switch to PulseChain"}
      </Button>
    );
  }

  return (
    <Button
      size={compact ? "sm" : "default"}
      variant="outline"
      onClick={() => disconnect()}
      title={`${address} — click to disconnect`}
      className="rounded-md font-mono text-sm"
    >
      <span className="mr-1.5 inline-block size-2 rounded-full bg-emerald-400" aria-hidden="true" />
      {short(address)}
    </Button>
  );
}
