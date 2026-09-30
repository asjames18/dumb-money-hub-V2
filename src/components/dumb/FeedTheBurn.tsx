import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Flame, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { formatUnits, parseAbiItem, parseUnits } from "viem";

import { Button } from "@/components/ui/button";
import { ConnectButton } from "@/components/dumb/ConnectButton";
import { CopyButton } from "@/components/dumb/CopyButton";
import { NativeShareButton } from "@/components/dumb/NativeShareButton";
import { Input } from "@/components/ui/input";
import { fmtCompactTok } from "@/lib/burns";
import { useUsernames } from "@/lib/use-usernames";
import {
  DRIP_COOLDOWN_S,
  DRIP_DUST,
  DRIP_VAULT,
  DRIP_VAULT_DEPLOY_BLOCK,
  DRIP_VAULT_TOKENS,
  dripVaultAbi,
  erc20Abi,
  explorerAddress,
  pulsechain,
} from "@/lib/pulsechain";
import { fmtUsdCompact, useTokenPrices, type PriceTokenKey } from "@/lib/token-prices";

const DRIP_EVENT = parseAbiItem(
  "event Drip(address indexed token, uint256 sold, uint256 dumbBurned)",
);

/** Transfer tax the vault's donors pay, in bps — the vault receives the rest.
 *  Empty: none of the current five tokens taxes transfers. */
const DONATE_TAX_BPS: Record<string, number> = {};
/** USD price key per vault token (1 WPLS ≈ 1 PLS). */
const PRICE_KEY: Record<string, PriceTokenKey> = {
  WPLS: "PLS",
  HEX: "HEX",
  INC: "INC",
  PRVX: "PRVX",
  PLSX: "PLSX",
};

function fmtCountdown(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/** Plain token amount, trimmed to 4 decimals. */
function fmtAmt(wei: bigint, decimals: number): string {
  const [i, d = ""] = formatUnits(wei, decimals).split(".");
  const dec = d.slice(0, 4).replace(/0+$/, "");
  const int = Number(i).toLocaleString("en-US");
  return dec ? `${int}.${dec}` : int;
}

function shortAddr(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

/**
 * One row of the vault token table: live vault balance, cooldown state, and
 * the permissionless drip() trigger for that token.
 */
function VaultTokenRow({
  symbol,
  address,
  nowSec,
  dripping,
  onDrip,
  canDrip,
}: {
  symbol: string;
  address: `0x${string}`;
  nowSec: number;
  dripping: boolean;
  onDrip: (token: `0x${string}`) => void;
  canDrip: boolean;
}) {
  const { data: balance } = useReadContract({
    address,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [DRIP_VAULT],
    query: { refetchInterval: 30_000 },
  });
  const { data: lastDrip } = useReadContract({
    address: DRIP_VAULT,
    abi: dripVaultAbi,
    functionName: "lastDrip",
    args: [address],
    query: { refetchInterval: 30_000 },
  });

  const bal = balance ?? 0n;
  const last = lastDrip ?? 0n;
  const cooldownLeft = Math.max(0, Number(last) + DRIP_COOLDOWN_S - nowSec);
  const hasDust = bal > 0n && bal <= DRIP_DUST;
  const ready = bal > DRIP_DUST && cooldownLeft === 0;

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary/40 px-3 py-2.5">
      <div className="min-w-0">
        <p className="font-display text-sm uppercase tracking-wide">{symbol}</p>
        <p className="truncate text-xs text-muted-foreground">
          {bal > 0n ? `${fmtCompactTok(bal)} waiting` : "vault empty"}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {hasDust ? (
          <span className="text-[11px] text-muted-foreground">dust — too small to drip</span>
        ) : cooldownLeft > 0 ? (
          <span className="text-[11px] text-muted-foreground">
            cooling down · {fmtCountdown(cooldownLeft)}
          </span>
        ) : ready ? (
          dripping ? (
            <span className="text-[11px] text-gold">dripping…</span>
          ) : canDrip ? (
            <Button
              type="button"
              size="sm"
              onClick={() => onDrip(address)}
              className="h-7 rounded-md px-3 text-[11px] font-bold uppercase tracking-wide"
            >
              Drip it now
            </Button>
          ) : (
            <ConnectButton compact />
          )
        ) : (
          <span className="text-[11px] text-muted-foreground">—</span>
        )}
      </div>
    </div>
  );
}

/**
 * Donate card: pick a curated token, enter an amount, send it to the vault
 * with one wallet confirmation. A plain ERC-20 transfer — the site never
 * touches funds; the user signs in their own wallet.
 */
function DonateCard() {
  const { address, chainId } = useAccount();
  const onPulse = chainId === pulsechain.id;
  const prices = useTokenPrices();

  const [tokenIdx, setTokenIdx] = useState(0); // WPLS
  const token = DRIP_VAULT_TOKENS[tokenIdx]!; // selector only ever sets 0..4
  const [amount, setAmount] = useState("");
  const decimals = token.decimals;

  const balQuery = (t: (typeof DRIP_VAULT_TOKENS)[number]) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useReadContract({
      address: t.address,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: address ? [address] : undefined,
      query: { enabled: !!address && onPulse, refetchInterval: 15_000 },
    });
  const b0 = balQuery(DRIP_VAULT_TOKENS[0]);
  const b1 = balQuery(DRIP_VAULT_TOKENS[1]);
  const b2 = balQuery(DRIP_VAULT_TOKENS[2]);
  const b3 = balQuery(DRIP_VAULT_TOKENS[3]);
  const b4 = balQuery(DRIP_VAULT_TOKENS[4]);
  const bals = [b0, b1, b2, b3, b4];
  const bal = bals[tokenIdx]!.data ?? 0n;
  const refetchBal = bals[tokenIdx]!.refetch;

  const parsed = useMemo(() => {
    try {
      const v = parseUnits(amount.trim(), decimals);
      return v > 0n ? v : null;
    } catch {
      return null;
    }
  }, [amount, decimals]);

  const taxBps = DONATE_TAX_BPS[token.symbol] ?? 0;
  const net = parsed ? (parsed * BigInt(10_000 - taxBps)) / 10_000n : null;
  const priceKey = PRICE_KEY[token.symbol];
  const price = priceKey ? prices[priceKey] : undefined;
  const usd = parsed && price != null ? Number(formatUnits(parsed, decimals)) * price : null;
  const insufficient = parsed != null && parsed > bal;

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const {
    data: receipt,
    isLoading: isConfirming,
    isSuccess: isConfirmed,
  } = useWaitForTransactionReceipt({ hash });
  const txSucceeded = isConfirmed && receipt?.status === "success";
  const txReverted = isConfirmed && receipt?.status === "reverted";

  const donate = () => {
    if (!parsed || insufficient) return;
    reset();
    writeContract({
      address: token.address,
      abi: erc20Abi,
      functionName: "transfer",
      args: [DRIP_VAULT, parsed],
    });
  };

  useEffect(() => {
    if (txSucceeded && hash) {
      toast.success("Donation sent", {
        description: "The vault has your tokens. The next drip burns them.",
      });
      setAmount("");
      refetchBal();
    } else if (txReverted) {
      toast.error("Donation reverted", { description: "The transfer did not go through." });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txSucceeded, txReverted]);

  const writeError = error ? (error as Error).message.split("\n")[0] : null;
  const busy = isPending || isConfirming;

  return (
    <div className="rounded-xl border-2 border-foreground/20 bg-card p-5">
      <h3 className="font-display text-lg uppercase tracking-wide">
        Donate <span className="text-pink">{token.symbol}</span>
      </h3>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        Your {token.symbol} goes straight to the vault — gone forever. This cannot be undone;
        donations never come back.
      </p>

      <div className="mt-4 grid grid-cols-5 gap-2">
        {DRIP_VAULT_TOKENS.map((t, i) => (
          <button
            key={t.address}
            type="button"
            onClick={() => setTokenIdx(i)}
            className={`rounded-lg border-2 px-2 py-2 text-center transition-colors ${
              i === tokenIdx
                ? "border-primary bg-primary/10"
                : "border-border bg-secondary/40 hover:border-primary/50"
            }`}
          >
            <span className="block font-display text-xs uppercase tracking-wide">{t.symbol}</span>
            <span className="block truncate text-[10px] text-muted-foreground">
              {address && onPulse ? fmtCompactTok(bals[i]!.data ?? 0n) : "—"}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <Input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          placeholder="0.0"
          aria-label={`Amount of ${token.symbol} to donate`}
          className="font-mono"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setAmount(formatUnits(bal, decimals))}
          disabled={!address || !onPulse || bal === 0n}
          className="shrink-0"
        >
          Max
        </Button>
      </div>

      <div className="mt-2 min-h-5 text-xs text-muted-foreground">
        {parsed && (
          <>
            {usd != null && <span>≈ {fmtUsdCompact(usd)} est. · </span>}
            {taxBps > 0 ? (
              <span>
                vault receives ≈ {fmtAmt(net!, decimals)} {token.symbol} ({taxBps / 100}% transfer
                tax)
              </span>
            ) : (
              <span>
                vault receives {fmtAmt(parsed, decimals)} {token.symbol}
              </span>
            )}
          </>
        )}
        {parsed && insufficient && (
          <span className="text-pink"> · insufficient {token.symbol} balance</span>
        )}
      </div>

      <div className="mt-3">
        {!address || !onPulse ? (
          <ConnectButton />
        ) : (
          <Button
            type="button"
            onClick={donate}
            disabled={!parsed || insufficient || busy}
            className="w-full rounded-lg bg-primary py-5 font-display text-base font-bold uppercase tracking-widest text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {busy
              ? isConfirming
                ? "Confirming…"
                : "Check your wallet…"
              : parsed
                ? `Donate ${fmtAmt(parsed, decimals)} ${token.symbol}`
                : `Donate ${token.symbol}`}
          </Button>
        )}
      </div>
      {writeError && <p className="mt-2 text-xs text-pink">Couldn&apos;t submit: {writeError}</p>}
      {address && (
        <p className="mt-3 text-xs text-muted-foreground">Connected as {shortAddr(address)}</p>
      )}
    </div>
  );
}

const TRANSFER_EVENT = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)",
);

// Share helpers for a donor's own rank — copy is the site's own words plus
// the connected wallet's own verified rank and donated value (real on-chain
// data, never invented). Same intent-button pattern as the burn leaderboard:
// nothing ever posts automatically, and the shared link re-renders the same
// live board for the viewer.
const donorShareUrl = (): string =>
  `${typeof window !== "undefined" ? window.location.origin : ""}/burn`;

const donorShareText = (rank: number, usd: number): string =>
  `I donated ${fmtUsdCompact(usd)} to the Feed-the-Burn vault — rank #${rank} on the Dumb Money all-time donor board. Every donation verified on-chain.`;

const donorShareXUrl = (rank: number, usd: number): string =>
  `https://x.com/intent/post?text=${encodeURIComponent(donorShareText(rank, usd))}&url=${encodeURIComponent(donorShareUrl())}`;

const donorShareTelegramUrl = (rank: number, usd: number): string =>
  `https://t.me/share/url?url=${encodeURIComponent(donorShareUrl())}&text=${encodeURIComponent(donorShareText(rank, usd))}`;

interface DonorTotal {
  donor: `0x${string}`;
  /** Raw per-token totals, parallel to DRIP_VAULT_TOKENS. */
  amounts: bigint[];
}

/**
 * All-time top volunteer donors, read straight from chain logs: every Transfer
 * into the vault for the five curated tokens since the vault launched. Ranked
 * by cumulative donated value at current USD prices — prices move, so ranks
 * can shift without any new donation. No resets, no shortcuts, nothing
 * invented: if it's not in the logs, it's not on the board.
 */
function DonorLeaderboard() {
  const { address: me } = useAccount();
  const publicClient = usePublicClient();
  const prices = useTokenPrices();
  const [donors, setDonors] = useState<DonorTotal[] | null>(null);
  /** Health of the last getLogs round: ok | partial (some token reads failed)
   *  | stale (all failed — showing the last good read) | failed (all failed,
   *  nothing ever loaded). A total read failure must never collapse into the
   *  false "No donations yet" empty state. */
  const [readState, setReadState] = useState<"ok" | "partial" | "stale" | "failed">("ok");
  const everLoaded = useRef(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!publicClient) return;
    let cancelled = false;
    Promise.all(
      DRIP_VAULT_TOKENS.map((t) =>
        publicClient
          .getLogs({
            address: t.address,
            event: TRANSFER_EVENT,
            args: { to: DRIP_VAULT },
            fromBlock: DRIP_VAULT_DEPLOY_BLOCK,
          })
          .catch(() => null),
      ),
    )
      .then((perToken) => {
        if (cancelled) return;
        if (perToken.every((logs) => logs === null)) {
          setReadState(everLoaded.current ? "stale" : "failed");
          if (!everLoaded.current) setDonors([]);
          return;
        }
        everLoaded.current = true;
        setReadState(perToken.some((logs) => logs === null) ? "partial" : "ok");
        const map = new Map<string, bigint[]>();
        perToken.forEach((logs, i) => {
          if (logs === null) return;
          for (const l of logs) {
            const from = l.args.from;
            const value = l.args.value;
            if (!from || value == null || value === 0n) continue;
            if (from.toLowerCase() === DRIP_VAULT.toLowerCase()) continue;
            const amounts = map.get(from) ?? Array<bigint>(DRIP_VAULT_TOKENS.length).fill(0n);
            amounts[i] = (amounts[i] ?? 0n) + value;
            map.set(from, amounts);
          }
        });
        setDonors(
          [...map.entries()].map(([donor, amounts]) => ({
            donor: donor as `0x${string}`,
            amounts,
          })),
        );
      })
      .catch(() => {
        // Aggregation threw after the reads landed — same as a total failure.
        if (cancelled) return;
        setReadState(everLoaded.current ? "stale" : "failed");
        if (!everLoaded.current) setDonors([]);
      });
    return () => {
      cancelled = true;
    };
  }, [publicClient, tick]);

  const rows = useMemo(() => {
    if (!donors) return null;
    return donors
      .map((d) => {
        let usd = 0;
        DRIP_VAULT_TOKENS.forEach((t, i) => {
          const key = PRICE_KEY[t.symbol];
          const price = key ? prices[key] : undefined;
          const amt = d.amounts[i] ?? 0n;
          if (price != null && amt > 0n) {
            usd += Number(formatUnits(amt, t.decimals)) * price;
          }
        });
        return { ...d, usd };
      })
      .filter((r) => r.usd > 0)
      .sort((a, b) => b.usd - a.usd);
  }, [donors, prices]);

  // The board ranks by current USD value, so it needs live prices: prices
  // resolve per token, and a donor whose donated tokens' prices all failed
  // lands at usd = 0 and is filtered out. If the chain logs hold donations
  // but the board is empty, every donor's prices failed to read — an empty
  // board then means "prices are down", never "no donations".

  const meLower = me?.toLowerCase();
  const meRank = rows && meLower ? rows.findIndex((r) => r.donor.toLowerCase() === meLower) : -1;
  const top = rows?.slice(0, 10) ?? null;
  // Opt-in display names (wallet-signed). Unknown donors stay as addresses.
  const names = useUsernames((top ?? []).map((r) => r.donor));

  return (
    <div className="mt-4 rounded-xl border-2 border-foreground/20 bg-card p-5">
      <h3 className="font-display text-lg uppercase tracking-wide">
        Top volunteer <span className="text-gold">donors</span>
      </h3>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        Every donation of the five vault tokens since launch, straight from the chain. Ranked by
        current USD value — so prices can move ranks even with no new donations. No resets, no
        shortcuts, nothing invented.
      </p>
      {readState === "partial" && (
        <p className="mt-3 rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-xs text-muted-foreground">
          Some token reads failed this round, so this may be a partial view — it refreshes
          automatically.
        </p>
      )}
      {readState === "stale" && (
        <p className="mt-3 rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-xs text-muted-foreground">
          The chain couldn&apos;t be reached on the last refresh — showing the last good read. It
          retries about every minute.
        </p>
      )}
      {rows === null ? (
        <p className="mt-4 text-sm text-muted-foreground">Reading the chain…</p>
      ) : rows.length === 0 ? (
        readState === "failed" ? (
          <p role="alert" className="mt-4 text-sm text-muted-foreground">
            The donation reads didn&apos;t land — the chain couldn&apos;t be reached. The board will
            appear when the next read succeeds (it retries about every minute).
          </p>
        ) : donors !== null && donors.length > 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Donations are on-chain, but current prices couldn&apos;t be read — the board will appear
            once prices load.
          </p>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            No donations yet — be the first to feed the burn.
          </p>
        )
      ) : (
        <ol className="mt-4 space-y-2">
          {top!.map((r, i) => {
            const isMe = meLower === r.donor.toLowerCase();
            return (
              <li
                key={r.donor}
                className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 ${
                  isMe ? "border-gold/60 bg-gold/10" : "border-border bg-secondary/40"
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`font-display text-sm uppercase ${
                      i === 0 ? "text-gold" : "text-muted-foreground"
                    }`}
                  >
                    #{i + 1}
                  </span>
                  <a
                    href={explorerAddress(r.donor)}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate font-mono text-sm hover:underline"
                  >
                    {isMe ? "you" : (names[r.donor.toLowerCase()] ?? shortAddr(r.donor))}
                  </a>
                </div>
                <span className="shrink-0 font-display text-sm uppercase">
                  {fmtUsdCompact(r.usd)} donated
                </span>
              </li>
            );
          })}
        </ol>
      )}
      {rows && meRank >= 10 && (
        <p className="mt-3 text-xs text-muted-foreground">
          You&apos;re #{meRank + 1} with {fmtUsdCompact(rows[meRank]?.usd ?? 0)} donated — keep
          feeding it.
        </p>
      )}
      {rows && meRank >= 0 && (
        <div className="mt-3 rounded-lg border border-gold/40 bg-gold/10 px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Share your rank:
            </span>
            <NativeShareButton
              title="Feed-the-Burn donor rank"
              text={donorShareText(meRank + 1, rows[meRank]?.usd ?? 0)}
              url={donorShareUrl()}
              fallbackUrl={donorShareXUrl(meRank + 1, rows[meRank]?.usd ?? 0)}
            />
            <Button
              asChild
              size="sm"
              className="gap-1.5 rounded-md bg-foreground text-xs font-bold text-background hover:bg-foreground/90"
            >
              <a
                href={donorShareXUrl(meRank + 1, rows[meRank]?.usd ?? 0)}
                target="_blank"
                rel="noreferrer noopener"
              >
                Post to X
              </a>
            </Button>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="gap-1.5 rounded-md border-pink text-xs font-bold text-pink hover:bg-pink hover:text-pink-foreground"
            >
              <a
                href={donorShareTelegramUrl(meRank + 1, rows[meRank]?.usd ?? 0)}
                target="_blank"
                rel="noreferrer noopener"
              >
                Share to Telegram
              </a>
            </Button>
          </div>
        </div>
      )}
      <p className="mt-3 text-[11px] text-muted-foreground">
        Ranked by donated value at current prices — an estimate for bragging rights, nothing more.
      </p>
    </div>
  );
}

/**
 * "Feed the Burn" — the community DripVault on /burn. Donate curated tokens,
 * the vault (or anyone) drips them into DUMB and sends it to the dead address.
 * Immutable contract: no owner, no withdrawals, no rescue. Ever.
 */
export function FeedTheBurn() {
  const { address, chainId } = useAccount();
  const onPulse = chainId === pulsechain.id;
  const publicClient = usePublicClient();

  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const t = setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 15_000);
    return () => clearInterval(t);
  }, []);

  // --- vault lifetime stats from Drip event logs ---------------------------
  const [dripCount, setDripCount] = useState<number | null>(null);
  const [vaultBurned, setVaultBurned] = useState<bigint | null>(null);
  const [statsTick, setStatsTick] = useState(0);
  useEffect(() => {
    if (!publicClient) return;
    let cancelled = false;
    publicClient
      .getLogs({
        address: DRIP_VAULT,
        event: DRIP_EVENT,
        fromBlock: DRIP_VAULT_DEPLOY_BLOCK,
      })
      .then((logs) => {
        if (cancelled) return;
        setDripCount(logs.length);
        setVaultBurned(logs.reduce((acc, l) => acc + (l.args.dumbBurned ?? 0n), 0n));
      })
      .catch(() => {
        if (!cancelled) {
          setDripCount(null);
          setVaultBurned(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [publicClient, statsTick]);

  // --- permissionless drip() -----------------------------------------------
  const [dripToken, setDripToken] = useState<`0x${string}` | null>(null);
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const {
    data: receipt,
    isLoading: isConfirming,
    isSuccess: isConfirmed,
  } = useWaitForTransactionReceipt({ hash });
  const txSucceeded = isConfirmed && receipt?.status === "success";
  const txReverted = isConfirmed && receipt?.status === "reverted";

  const onDrip = (token: `0x${string}`) => {
    reset();
    setDripToken(token);
    writeContract({ address: DRIP_VAULT, abi: dripVaultAbi, functionName: "drip", args: [token] });
  };

  useEffect(() => {
    if (txSucceeded && hash) {
      toast.success("Drip confirmed", {
        description: "Tokens sold through WPLS into DUMB — burned to the dead address.",
      });
      setDripToken(null);
      setStatsTick((t) => t + 1);
    } else if (txReverted) {
      toast.error("Drip reverted", {
        description: "The cooldown may have been consumed by someone else's drip just now.",
      });
      setDripToken(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txSucceeded, txReverted]);

  const dripError = useMemo(
    () => (error ? (error as Error).message.split("\n")[0] : null),
    [error],
  );

  return (
    <section aria-label="Feed the Burn — community burn vault" className="mt-8">
      <p className="font-display text-sm uppercase tracking-[0.3em] text-pink">The vault</p>
      <h2 className="mt-2 font-display text-3xl uppercase leading-none sm:text-4xl">
        Feed the <span className="text-pink">burn.</span>
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
        A community burn vault with no owner and no off switch. Donate tokens below, and anyone can
        call <code className="rounded bg-secondary px-1 text-[12px]">drip()</code> to push up to a
        quarter of a token&apos;s balance through WPLS into DUMB, straight to the dead address. No
        autopilot is watching it right now — a drip only fires when someone pulls the trigger. Every
        drip is a public on-chain event.
      </p>

      {/* vault address */}
      <div className="mt-5 flex flex-wrap items-center gap-2 rounded-xl border-2 border-foreground/20 bg-card p-4">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Vault contract · PulseChain
          </p>
          <p className="mt-1 break-all font-mono text-sm">{DRIP_VAULT}</p>
        </div>
        <CopyButton value={DRIP_VAULT} label="Vault address" />
        <a
          href={explorerAddress(DRIP_VAULT)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          Explorer <ExternalLink className="size-3" />
        </a>
      </div>

      {/* irreversible warning */}
      <div className="mt-4 flex gap-3 rounded-xl border-2 border-gold/60 bg-gold/10 p-4">
        <TriangleAlert className="size-5 shrink-0 text-gold" />
        <div className="text-sm leading-relaxed">
          <p className="font-bold uppercase tracking-wide text-gold">One-way street</p>
          <p className="mt-1 text-muted-foreground">
            Deposits can never be withdrawn, returned, or rescued — the contract has no owner and no
            rescue function. Only the five tokens below are guaranteed to route; anything else you
            send may sit stuck in the vault forever. Burns shrink supply; they never promise price.
          </p>
        </div>
      </div>

      {/* live stats */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border-2 border-foreground/20 bg-card p-4">
          <p className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            <Flame className="size-3.5 text-pink" /> Burned by the vault
          </p>
          <p className="mt-1 font-display text-2xl uppercase">
            {vaultBurned === null ? "…" : `${fmtCompactTok(vaultBurned)} DUMB`}
          </p>
        </div>
        <div className="rounded-xl border-2 border-foreground/20 bg-card p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Drips fired
          </p>
          <p className="mt-1 font-display text-2xl uppercase">
            {dripCount === null ? "…" : dripCount.toLocaleString("en-US")}
          </p>
        </div>
      </div>

      {/* donate + pull the trigger */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <DonateCard />
        <div className="rounded-xl border-2 border-foreground/20 bg-card p-5">
          <h3 className="font-display text-lg uppercase tracking-wide">
            Pull the <span className="text-gold">trigger</span>
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Anyone can call <code className="rounded bg-secondary px-1 text-[12px]">drip()</code> —
            no allowlist, no owner. Each drip pushes up to 25% of a token&apos;s vault balance
            through WPLS into DUMB and burns it, then that token cools down for 15 minutes. Nothing
            drips on a timer right now — if tokens are sitting in the vault, you&apos;re the
            trigger.
          </p>
          <div className="mt-4 space-y-2">
            {DRIP_VAULT_TOKENS.map((t) => (
              <VaultTokenRow
                key={t.address}
                symbol={t.symbol}
                address={t.address}
                nowSec={nowSec}
                dripping={dripToken === t.address && (isPending || isConfirming)}
                onDrip={onDrip}
                canDrip={!!address && onPulse}
              />
            ))}
          </div>
          {dripError && (
            <p className="mt-3 text-xs text-pink">Couldn&apos;t submit the drip: {dripError}</p>
          )}
        </div>
      </div>

      {/* all-time donor leaderboard */}
      <DonorLeaderboard />
    </section>
  );
}
