import { useEffect, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { AtSign, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  buildClearUsernameMessage,
  buildSetUsernameMessage,
  isValidUsername,
  USERNAME_MAX_LEN,
  USERNAME_MIN_LEN,
} from "@/lib/username";

type Status = "idle" | "loading" | "signing" | "saving" | "saved" | "error";

/**
 * Opt-in username registry card (mounted on /wallet). The connected wallet
 * can claim a display name that leaderboards show instead of the raw
 * address. One signature per change; names are unique case-insensitively;
 * clearing is also signed.
 */
export function UsernameCard() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [current, setCurrent] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  // Load the wallet's current name whenever it (re)connects.
  useEffect(() => {
    if (!isConnected || !address) {
      setCurrent(null);
      setInput("");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    setError(null);
    fetch(`/api/username?addresses=${address}`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: Record<string, string>) => {
        if (cancelled) return;
        const name = data[address.toLowerCase()] ?? null;
        setCurrent(name);
        setInput(name ?? "");
        setStatus("idle");
      })
      .catch(() => {
        if (!cancelled) setStatus("idle");
      });
    return () => {
      cancelled = true;
    };
  }, [isConnected, address]);

  const fail = (msg: string) => {
    setError(msg);
    setStatus("error");
  };

  async function save() {
    if (!address) return;
    const name = input.trim();
    if (!isValidUsername(name)) {
      fail(
        `Usernames are ${USERNAME_MIN_LEN}–${USERNAME_MAX_LEN} characters: letters, numbers, _ or -.`,
      );
      return;
    }
    setError(null);
    setStatus("signing");
    const timestamp = Date.now();
    let signature: string;
    try {
      signature = await signMessageAsync({
        message: buildSetUsernameMessage(name, address, timestamp),
      });
    } catch {
      fail("Signature rejected in wallet — nothing was saved.");
      return;
    }
    setStatus("saving");
    try {
      const res = await fetch("/api/username", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address, username: name, timestamp, signature }),
      });
      const data = (await res.json()) as { username?: string; error?: string };
      if (res.status === 409) {
        fail(data.error ?? `The name "${name}" is already taken — try another.`);
        return;
      }
      if (!res.ok || !data.username) {
        fail(data.error ?? "Couldn't save — try again.");
        return;
      }
      setCurrent(data.username);
      setStatus("saved");
    } catch {
      fail("Network error — try again.");
    }
  }

  async function clear() {
    if (!address) return;
    setError(null);
    setStatus("signing");
    const timestamp = Date.now();
    let signature: string;
    try {
      signature = await signMessageAsync({
        message: buildClearUsernameMessage(address, timestamp),
      });
    } catch {
      fail("Signature rejected in wallet — nothing was changed.");
      return;
    }
    setStatus("saving");
    try {
      const res = await fetch("/api/username", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address, username: "", timestamp, signature }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        fail(data.error ?? "Couldn't clear — try again.");
        return;
      }
      setCurrent(null);
      setInput("");
      setStatus("saved");
    } catch {
      fail("Network error — try again.");
    }
  }

  if (!isConnected || !address) {
    return (
      <div className="rounded-xl border border-foreground/15 bg-card p-5">
        <p className="flex items-center gap-2 font-display text-sm uppercase tracking-widest">
          <AtSign className="size-4" /> Username
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Connect your wallet to claim an optional display name for the leaderboards.
        </p>
      </div>
    );
  }

  const busy = status === "signing" || status === "saving" || status === "loading";

  return (
    <div className="rounded-xl border border-foreground/15 bg-card p-5">
      <p className="flex items-center gap-2 font-display text-sm uppercase tracking-widest">
        <AtSign className="size-4" /> Username
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {current ? (
          <>
            Leaderboards show you as{" "}
            <span className="font-semibold text-foreground">{current}</span>. Change it any time —
            one wallet signature, no gas.
          </>
        ) : (
          "Optional — claim a display name for the leaderboards. One wallet signature, no gas."
        )}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            if (status === "error" || status === "saved") setStatus("idle");
          }}
          placeholder="e.g. dumb_ape_42"
          maxLength={USERNAME_MAX_LEN}
          disabled={busy}
          aria-label="Username"
          className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm font-mono outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
        />
        <Button size="sm" onClick={save} disabled={busy || input.trim() === current}>
          {status === "signing" ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Sign in wallet…
            </>
          ) : status === "saving" ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Saving…
            </>
          ) : (
            "Sign to save"
          )}
        </Button>
        {current && (
          <Button size="sm" variant="ghost" onClick={clear} disabled={busy}>
            Clear
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {status === "saved" && !error && (
        <p className="mt-2 text-sm text-emerald-400">Saved — leaderboards will use your name.</p>
      )}
      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
        Names are unique (first come, first served) and public on the leaderboards. Your wallet
        signs every change — the site never moves funds.
      </p>
    </div>
  );
}
