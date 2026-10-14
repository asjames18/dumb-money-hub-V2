import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Check, ChevronDown, Copy, Flame, Loader2, Plus, Send, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  useAccount,
  useBalance,
  usePublicClient,
  useReadContract,
  useSendTransaction,
  useSignMessage,
  useWriteContract,
} from "wagmi";

import mascot from "@/assets/smiley-mascot.png";
import smileyFace from "@/assets/smiley-face.png";
import { ChatMarkdown } from "@/components/dumb/ChatMarkdown";
import { Disclaimer } from "@/components/dumb/Disclaimer";
import { SectionHead } from "@/components/dumb/SectionHead";
import { ConnectButton } from "@/components/dumb/ConnectButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AI_QA } from "@/data/dump";
import { localAnswer, type AskResult } from "@/lib/ai/rag";
import { DEAD, DUMB, erc20Abi, pulsechain, routerAbi, WPLS } from "@/lib/pulsechain";
import { useTokenPrices } from "@/lib/token-prices";
import { trackEvent } from "@/lib/analytics";
import {
  AI_SCAN_STORAGE_KEY,
  PRO_BURN_SWAP_TARGET_USD,
  PRO_BURN_TARGET_USD,
  PRO_BURN_USD,
  PRO_DAYS,
  PRO_MODEL_TARGET_USD,
  PRO_MODEL_USD,
  PRO_PAY_TOKENS,
  PRO_ROUTER,
  PRO_SESSION_MS,
  PRO_USD_THRESHOLD,
  proActivationMessage,
  proSessionMessage,
  type AiScanPayload,
} from "@/lib/ai/pro";

// A leg that was BROADCAST but never confirmed (receipt timed out, reload
// mid-confirmation) is not a failed payment — the transaction may still
// confirm. Persisting the pending hash lets a resume check the receipt
// before deciding, instead of blindly re-broadcasting and risking a
// double payment. Module-level: no component state, safe in any effect.
const PENDING_STORAGE_KEY = "dumb-ai-pro-pending-v1";
type PendingLegs = {
  address: string;
  symbol: string;
  burn?: `0x${string}`;
  model?: `0x${string}`;
};
function readPending(wallet: string, symbol: string): PendingLegs | null {
  try {
    const raw = localStorage.getItem(PENDING_STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as PendingLegs;
    return p.address?.toLowerCase() === wallet.toLowerCase() && p.symbol === symbol ? p : null;
  } catch {
    return null;
  }
}
function writePending(p: PendingLegs | null) {
  try {
    if (p && (p.burn || p.model)) localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(p));
    else localStorage.removeItem(PENDING_STORAGE_KEY);
  } catch {
    /* storage unavailable: resume just won't survive a reload */
  }
}

type Turn = {
  role: "user" | "dump";
  text: string;
  mode?: "live" | "local" | "refused";
  sources?: string[];
  pro?: boolean | undefined;
};

type ChatReply = AskResult & {
  hasLiveKey: boolean;
  pro?: boolean;
  proRequired?: boolean;
  /** The wallet claimed Pro but didn't prove it — sign a session and retry. */
  sessionRequired?: boolean;
  proExpiresAt?: number | null;
  freeRemaining?: number;
  proNudge?: boolean;
};

type ProStatus = { pro: boolean; expiresAt: number | null };

// Dumb AI talks to the worker's /api/ai-chat endpoint, which holds the
// OpenRouter key server-side (the browser never sees it). Pro wallets get
// paid models + the scan explainer; everyone else gets the free tier.
// Any failure falls back to the on-device knowledge base — never hard-fails.
async function postAiChat(
  question: string,
  address?: string,
  scan?: AiScanPayload | null,
  suggested?: boolean,
  history?: { role: "user" | "assistant"; text: string }[],
  session?: { expiresAt: number; signature: string } | null,
): Promise<ChatReply> {
  const res = await fetch("/api/ai-chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      question,
      address: address ?? undefined,
      scan: scan ?? undefined,
      suggested: suggested === true ? true : undefined,
      history: history?.length ? history : undefined,
      // Wallet-proven Pro session: the server trusts address ONLY when
      // this signature verifies. Absent/invalid → free tier, no error.
      sessionExpiresAt: session?.expiresAt ?? undefined,
      sessionSignature: session?.signature ?? undefined,
    }),
    signal: AbortSignal.timeout(35_000),
  });
  if (!res.ok) throw new Error(`ai-chat ${res.status}`);
  return (await res.json()) as ChatReply;
}

async function getAiChatStatus(): Promise<{ hasLiveKey: boolean }> {
  const res = await fetch("/api/ai-chat", { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) return { hasLiveKey: false };
  return (await res.json()) as { hasLiveKey: boolean };
}

async function getProStatus(address: string): Promise<ProStatus> {
  const res = await fetch(`/api/ai-pro/status?address=${address}`, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return { pro: false, expiresAt: null };
  return (await res.json()) as ProStatus;
}

async function getProConfig(): Promise<{ modelWallet: string | null }> {
  const res = await fetch("/api/ai-pro/config", { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) return { modelWallet: null };
  return (await res.json()) as { modelWallet: string | null };
}

type ProFlow =
  | "idle"
  | "approving"
  | "confirmingApprove"
  | "burning"
  | "confirming"
  | "paying"
  | "confirmingPay"
  | "signing"
  | "activating"
  | "done"
  | "error";

/** 20-minute swap deadline, matching the swap box. */
const PRO_SWAP_DEADLINE_SECONDS = 20 * 60;
/** 8% slippage guard on the burn-leg swap, matching the swap box default. */
const PRO_SWAP_SLIPPAGE_NUM = 92n;
const PRO_SWAP_SLIPPAGE_DEN = 100n;

/**
 * Dumb AI Pro upgrade card: the $20 pass splits 80/20 — $16 of DUMB burns
 * to the dead address, ~$4 goes to the model wallet that funds OpenRouter.
 * Pay with any of the hub's verified tokens: the burn leg always ends up
 * as DUMB at dead (a PulseX swap when the payment isn't DUMB), the model
 * leg is a plain transfer of the payment token. One wallet signature names
 * both tx hashes; the server verifies both legs on-chain before granting
 * 30 days. No new contract, no custody.
 */
function ProPanel({
  address,
  pro,
  expiresAt,
  onActivated,
}: {
  address: `0x${string}` | undefined;
  pro: boolean;
  expiresAt: number | null;
  onActivated: () => void;
}) {
  const prices = useTokenPrices();
  const [paySymbol, setPaySymbol] = useState("DUMB");
  const payToken = PRO_PAY_TOKENS.find((t) => t.symbol === paySymbol) ?? PRO_PAY_TOKENS[0]!;
  const price = (prices[payToken.symbol as keyof typeof prices] ?? null) as number | null;
  const [flow, setFlow] = useState<ProFlow>("idle");
  const [flowError, setFlowError] = useState<string | null>(null);
  // Hash of the broadcast leg whose receipt failed (revert/timeout/RPC) — kept
  // so the error panel can link the plain-English /scan diagnosis. Set ONLY by
  // confirmLeg below: wallet rejections (no broadcast, no hash) never set it.
  const [failedTxHash, setFailedTxHash] = useState<`0x${string}` | null>(null);
  const [legs, setLegs] = useState<{ burn?: `0x${string}`; model?: `0x${string}` }>({});
  const [amounts, setAmounts] = useState<{ burn: bigint; model: bigint } | null>(null);
  // Slim banner by default — the full split flow expands on tap so the
  // payment UI doesn't dominate the chat page (presentation only; the
  // payment logic below is untouched).
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [recoverBurn, setRecoverBurn] = useState("");
  const [recoverModel, setRecoverModel] = useState("");

  const LEGS_STORAGE_KEY = "dumb-ai-pro-legs-v1";

  // Persist confirmed legs so a reload can never strand a paid flow —
  // a confirmed leg is never re-submitted and never re-spent.
  const persistLegs = (
    wallet: string,
    symbol: string,
    next: { burn?: `0x${string}`; model?: `0x${string}` },
    nextAmounts: { burn: bigint; model: bigint } | null,
  ) => {
    try {
      if (!next.burn && !next.model) {
        localStorage.removeItem(LEGS_STORAGE_KEY);
        return;
      }
      localStorage.setItem(
        LEGS_STORAGE_KEY,
        JSON.stringify({
          address: wallet,
          symbol,
          burn: next.burn,
          model: next.model,
          burnAmt: nextAmounts?.burn?.toString(),
          modelAmt: nextAmounts?.model?.toString(),
        }),
      );
    } catch {
      /* storage unavailable: resume just won't survive a reload */
    }
  };

  /**
   * Resolve a broadcast-but-unconfirmed leg: a single receipt check decides.
   * Landed → return the hash so the caller adopts it as confirmed (nothing
   * is ever re-broadcast). Missing/reverted/RPC hiccup → drop the stale
   * marker and return undefined so the normal path re-sends. The pending
   * marker is consumed either way — it never survives a resolution.
   */
  const resolvePending = async (leg: "burn" | "model"): Promise<`0x${string}` | undefined> => {
    if (!address || !publicClient) return undefined;
    const p = readPending(address, paySymbol);
    const h = p?.[leg];
    if (!h) return undefined;
    const rest: PendingLegs = { address, symbol: paySymbol };
    if (leg === "burn" && p.model) rest.model = p.model;
    if (leg === "model" && p.burn) rest.burn = p.burn;
    let landed = false;
    try {
      const rc = await publicClient.getTransactionReceipt({ hash: h });
      landed = rc.status === "success";
    } catch {
      landed = false;
    }
    writePending(rest);
    return landed ? h : undefined;
  };

  // Restore an interrupted paid flow (e.g. a reload after the verifier
  // rejected good transactions): confirmed legs are reused, never re-spent.
  // A hash is only ever stored after its receipt confirmed on-chain.
  useEffect(() => {
    if (!address) return;
    try {
      const raw = localStorage.getItem(LEGS_STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        address?: string;
        symbol?: string;
        burn?: `0x${string}`;
        model?: `0x${string}`;
        burnAmt?: string;
        modelAmt?: string;
      };
      if (
        saved.address?.toLowerCase() === address.toLowerCase() &&
        saved.symbol === paySymbol &&
        (saved.burn || saved.model)
      ) {
        const restored: { burn?: `0x${string}`; model?: `0x${string}` } = {};
        if (saved.burn) restored.burn = saved.burn;
        if (saved.model) restored.model = saved.model;
        setLegs(restored);
        if (saved.burnAmt && saved.modelAmt) {
          setAmounts({ burn: BigInt(saved.burnAmt), model: BigInt(saved.modelAmt) });
        }
        setFlow("error");
        setFlowError("Payment interrupted — press Try again to resume where it stopped.");
      }
      // A broadcast that never got its receipt (timeout, reload
      // mid-confirmation): surface it so the resume path checks the
      // receipt before anything is re-sent — never a blind re-broadcast.
      const pending = readPending(address, paySymbol);
      if (pending?.burn || pending?.model) {
        setFlow("error");
        setFlowError(
          "A payment was broadcast but never confirmed — press Try again and it checks whether it landed on-chain before sending anything new.",
        );
      }
    } catch {
      /* corrupted snapshot: start fresh */
    }
  }, [address, paySymbol]);

  const { writeContractAsync } = useWriteContract();
  const { sendTransactionAsync } = useSendTransaction();
  const { signMessageAsync } = useSignMessage();
  const publicClient = usePublicClient();

  const configQuery = useQuery({
    queryKey: ["ai-pro-config"],
    queryFn: () => getProConfig(),
    staleTime: 300_000,
  });
  const modelWallet = configQuery.data?.modelWallet ?? null;

  const { data: plsBalance } = useBalance({
    address,
    query: { enabled: !!address && payToken.symbol === "PLS" },
  });
  const { data: erc20Balance } = useReadContract({
    address: (payToken.address ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address ?? "0x0000000000000000000000000000000000000000"],
    query: { enabled: !!address && payToken.address !== null },
  });
  const payBalanceValue =
    payToken.symbol === "PLS"
      ? (plsBalance?.value ?? null)
      : ((erc20Balance as bigint | undefined) ?? null);

  // Token units for each leg, quoted at exactly the $20 split ($16 burn +
  // $4 models). No markup on top: Antonio's rule is the pass costs $20,
  // never more. Price-move slack lives in the server's arrival minimums,
  // not in the user's price.
  const toWei = (usd: number): bigint | null => {
    if (!price || price <= 0) return null;
    const units = usd / price;
    const wei = Math.ceil(units * 10 ** payToken.decimals);
    return wei > 0 ? BigInt(wei) : null;
  };
  const burnTargetUsd = payToken.symbol === "DUMB" ? PRO_BURN_TARGET_USD : PRO_BURN_SWAP_TARGET_USD;
  const burnWei = toWei(burnTargetUsd);
  const modelWei = modelWallet ? toWei(PRO_MODEL_TARGET_USD) : null;
  const totalWei = burnWei !== null && modelWei !== null ? burnWei + modelWei : null;
  const insufficient =
    totalWei !== null && payBalanceValue !== null ? payBalanceValue < totalWei : false;
  const bothLegsConfirmed = Boolean(legs.burn && legs.model);
  // A resume with both legs already confirmed spends nothing new on-chain,
  // so a balance that is short of a FRESH quote must not block it.
  const paywallBlocks = insufficient && !bothLegsConfirmed;

  const fail = (msg: string) => {
    setFlowError(msg);
    setFlow("error");
  };

  const waitReceipt = async (hash: `0x${string}`) => {
    if (!publicClient)
      throw new Error("No network connection — reconnect your wallet and try again.");
    const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 });
    if (receipt.status !== "success") throw new Error("That transaction failed on-chain.");
  };

  /** Confirm one broadcast leg; on a receipt failure keep the hash so the
      error panel can offer the evidence-backed "Why did it fail?" diagnosis
      (same pattern as the SwapBox/BurnBox/scanner surfaces). The hash is the
      user's own broadcast — the explainer shows only what it can prove. */
  const confirmLeg = async (hash: `0x${string}`) => {
    try {
      await waitReceipt(hash);
    } catch (e) {
      setFailedTxHash(hash);
      throw e;
    }
  };

  /** Fresh min-out quote for the burn-leg swap (8% slippage guard). */
  const quoteBurnMinOut = async (amountIn: bigint): Promise<bigint> => {
    if (!publicClient || payToken.swapPath.length === 0)
      throw new Error("No network connection — reconnect your wallet and try again.");
    const out = (await publicClient.readContract({
      address: PRO_ROUTER as `0x${string}`,
      abi: routerAbi,
      functionName: "getAmountsOut",
      args: [amountIn, [...payToken.swapPath] as `0x${string}`[]],
    })) as bigint[];
    const last = out[out.length - 1] ?? 0n;
    if (last <= 0n) throw new Error("No swap route right now — try another token.");
    return (last * PRO_SWAP_SLIPPAGE_NUM) / PRO_SWAP_SLIPPAGE_DEN;
  };

  /** Burn leg: DUMB transfers straight to dead; anything else swaps
   *  T -> DUMB with `to` = dead (the scan pass's PLS-fallback shape). */
  const runBurnLeg = async (amountIn: bigint): Promise<`0x${string}`> => {
    if (payToken.symbol === "DUMB") {
      return writeContractAsync({
        address: DUMB as `0x${string}`,
        abi: erc20Abi,
        functionName: "transfer",
        args: [DEAD as `0x${string}`, amountIn],
        chainId: pulsechain.id,
      });
    }
    const deadline = BigInt(Math.floor(Date.now() / 1000) + PRO_SWAP_DEADLINE_SECONDS);
    const minOut = await quoteBurnMinOut(amountIn);
    if (payToken.symbol === "PLS") {
      return writeContractAsync({
        address: PRO_ROUTER as `0x${string}`,
        abi: routerAbi,
        functionName: "swapExactETHForTokensSupportingFeeOnTransferTokens",
        args: [
          minOut,
          [WPLS as `0x${string}`, DUMB as `0x${string}`],
          DEAD as `0x${string}`,
          deadline,
        ],
        value: amountIn,
        chainId: pulsechain.id,
      });
    }
    // ERC-20: exact-amount approval first (the swap box's safety rule),
    // then the swap straight to dead.
    setFlow("approving");
    const approveHash = await writeContractAsync({
      address: payToken.address as `0x${string}`,
      abi: erc20Abi,
      functionName: "approve",
      args: [PRO_ROUTER as `0x${string}`, amountIn],
      chainId: pulsechain.id,
    });
    setFlow("confirmingApprove");
    await confirmLeg(approveHash);
    setFlow("burning");
    return writeContractAsync({
      address: PRO_ROUTER as `0x${string}`,
      abi: routerAbi,
      functionName: "swapExactTokensForTokensSupportingFeeOnTransferTokens",
      args: [
        amountIn,
        minOut,
        [...payToken.swapPath] as `0x${string}`[],
        DEAD as `0x${string}`,
        deadline,
      ],
      chainId: pulsechain.id,
    });
  };

  /** Model leg: a plain transfer of the payment token to the model wallet. */
  const runModelLeg = async (amountIn: bigint): Promise<`0x${string}`> => {
    if (!modelWallet) throw new Error("The Pro split isn't configured yet — check back soon.");
    if (payToken.symbol === "PLS") {
      return sendTransactionAsync({
        to: modelWallet as `0x${string}`,
        value: amountIn,
        chainId: pulsechain.id,
      });
    }
    return writeContractAsync({
      address: (payToken.symbol === "DUMB" ? DUMB : payToken.address) as `0x${string}`,
      abi: erc20Abi,
      functionName: "transfer",
      args: [modelWallet as `0x${string}`, amountIn],
      chainId: pulsechain.id,
    });
  };

  const isTxHash = (h: string) => /^0x[0-9a-fA-F]{64}$/.test(h.trim());

  // Manual recovery: paste the two confirmed transaction hashes (from the
  // wallet's activity) to resume without sending anything new on-chain.
  // The server re-validates both from scratch — a wrong hash just fails
  // activation with a clear error, never spends.
  const restoreHashes = () => {
    if (!address) return;
    const burn = recoverBurn.trim() as `0x${string}`;
    const model = recoverModel.trim() as `0x${string}`;
    if (!isTxHash(burn) || !isTxHash(model)) {
      setFlow("error");
      setFlowError("Both entries must be transaction hashes: 0x followed by 64 hex characters.");
      setFailedTxHash(null);
      return;
    }
    const next = { burn, model };
    setLegs(next);
    persistLegs(address, paySymbol, next, null);
    setRecoverBurn("");
    setRecoverModel("");
    setFlow("error");
    setFlowError("Hashes restored — press Try again to finish activating Pro.");
    setFailedTxHash(null);
  };

  const startSplit = async () => {
    if (!address || burnWei === null || modelWei === null || !modelWallet || paywallBlocks) return;
    setFlowError(null);
    setFailedTxHash(null);
    const fresh = flow === "idle" || flow === "done";
    if (fresh) {
      setLegs({});
      setAmounts({ burn: burnWei, model: modelWei });
      persistLegs(address, paySymbol, {}, null);
    }
    // Amounts are snapshotted at flow start so a price refresh mid-flow
    // can't move the legs under a resume.
    const burnAmt = fresh ? burnWei : (amounts?.burn ?? burnWei);
    const modelAmt = fresh ? modelWei : (amounts?.model ?? modelWei);
    try {
      // A retry resumes where it stopped — a confirmed leg is never
      // repeated, and a broadcast-but-unconfirmed leg is never re-sent
      // blind: resolvePending checks the receipt once and adopts it when
      // it landed (the timeout case), so a flaky RPC can't double-charge.
      let nextLegs = { ...legs };
      let burnHash = fresh ? undefined : legs.burn;
      if (!burnHash && !fresh) {
        const adopted = await resolvePending("burn");
        if (adopted) {
          burnHash = adopted;
          nextLegs = { ...nextLegs, burn: adopted };
          setLegs(nextLegs);
          persistLegs(address, paySymbol, nextLegs, { burn: burnAmt, model: modelAmt });
        }
      }
      if (!burnHash) {
        setFlow("burning");
        const newBurnHash = await runBurnLeg(burnAmt);
        writePending({ address, symbol: paySymbol, burn: newBurnHash });
        setFlow("confirming");
        await confirmLeg(newBurnHash);
        writePending(null);
        burnHash = newBurnHash;
        nextLegs = { ...nextLegs, burn: newBurnHash };
        setLegs(nextLegs);
        persistLegs(address, paySymbol, nextLegs, { burn: burnAmt, model: modelAmt });
      }
      let modelHash = fresh ? undefined : legs.model;
      if (!modelHash && !fresh) {
        const adopted = await resolvePending("model");
        if (adopted) {
          modelHash = adopted;
          nextLegs = { ...nextLegs, model: adopted };
          setLegs(nextLegs);
          persistLegs(address, paySymbol, nextLegs, { burn: burnAmt, model: modelAmt });
        }
      }
      if (!modelHash) {
        setFlow("paying");
        const newModelHash = await runModelLeg(modelAmt);
        writePending({ address, symbol: paySymbol, model: newModelHash });
        setFlow("confirmingPay");
        await confirmLeg(newModelHash);
        writePending(null);
        modelHash = newModelHash;
        nextLegs = { ...nextLegs, model: newModelHash };
        setLegs(nextLegs);
        persistLegs(address, paySymbol, nextLegs, { burn: burnAmt, model: modelAmt });
      }
      setFlow("signing");
      const signature = await signMessageAsync({
        message: proActivationMessage(address, burnHash, modelHash),
      });
      setFlow("activating");
      const res = await fetch("/api/ai-pro/activate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          address,
          burnTxHash: burnHash,
          modelTxHash: modelHash,
          signature,
        }),
        signal: AbortSignal.timeout(90_000),
      });
      const data = (await res.json()) as { ok?: boolean; reason?: string };
      if (!res.ok || !data.ok) {
        fail(data.reason ?? "Activation failed — try again.");
        return;
      }
      // Pro-pass purchase burn leg: a real burn, but NOT a voluntary /burn-page
      // burn — it must never be counted as one in analytics (that conflation
      // once hid a Pro test purchase as an unverified burn event). Separate
      // event name so /stats reports it honestly on its own line.
      trackEvent("pro_pass_burn");
      onActivated();
      setFlow("done");
      persistLegs(address, paySymbol, {}, null);
      toast.success("Dumb AI Pro active", {
        description: `${PRO_DAYS} days of paid models + scan explainer.`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something failed.";
      // A receipt timeout is NOT a failed payment — the transaction was
      // broadcast and may still confirm. Say so plainly, and steer away
      // from a blind retry: the resume path checks the receipt first, and
      // "Paid already? Restore" below finishes a landed payment for free.
      const receiptTimedOut = /timed out/i.test(msg);
      fail(
        /rejected|denied|cancelled|user/i.test(msg)
          ? "Rejected in wallet — anything already confirmed on-chain stays, just try again to resume."
          : receiptTimedOut
            ? "The transaction was broadcast but confirmation timed out — it may still confirm. Check it on the explorer (Why did it fail?) before trying again; if it landed, use “Paid already? Restore” below to finish without paying twice."
            : msg,
      );
    }
  };

  if (!address) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-foreground">
          <Sparkles className="size-3.5 text-primary" /> Dumb AI Pro
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Paid models, 100 questions/day, and the plain-English scan explainer — unlocked by a $
          {PRO_USD_THRESHOLD} split in any verified token: ${PRO_BURN_USD} of DUMB burns, $
          {PRO_MODEL_USD} funds the AI.
        </p>
        <div className="mt-3">
          <ConnectButton />
        </div>
      </div>
    );
  }

  if (pro) {
    return (
      <div className="rounded-lg border border-primary/40 bg-primary/5 p-4">
        <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-primary">
          <Sparkles className="size-3.5" /> Dumb AI Pro active
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Paid models + scan explainer until{" "}
          <span className="font-bold text-foreground">
            {expiresAt ? new Date(expiresAt).toLocaleDateString() : "soon"}
          </span>
          . Split another ${PRO_USD_THRESHOLD} to extend.
        </p>
      </div>
    );
  }

  if (!modelWallet) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-foreground">
          <Sparkles className="size-3.5 text-primary" /> Dumb AI Pro
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Paid models, 100 questions/day, and the plain-English scan explainer — ${PRO_BURN_USD} of
          every ${PRO_USD_THRESHOLD} burns as DUMB, ${PRO_MODEL_USD} funds the AI. The split is
          being wired up — check back soon.
        </p>
      </div>
    );
  }

  const busy = flow !== "idle" && flow !== "done" && flow !== "error";
  const isSwapBurn = payToken.swapPath.length > 0;
  const stepLabel =
    flow === "approving"
      ? `1 of 2 — approve ${payToken.symbol} in your wallet…`
      : flow === "confirmingApprove"
        ? "1 of 2 — waiting for the approval…"
        : flow === "burning"
          ? isSwapBurn
            ? `1 of 2 — confirm the burn swap in your wallet…`
            : "1 of 2 — confirm the burn in your wallet…"
          : flow === "confirming"
            ? "1 of 2 — waiting for the burn to confirm…"
            : flow === "paying"
              ? "2 of 2 — confirm the model payment in your wallet…"
              : flow === "confirmingPay"
                ? "2 of 2 — waiting for the payment to confirm…"
                : flow === "signing"
                  ? "Sign the activation message…"
                  : flow === "activating"
                    ? "Verifying both transfers on-chain…"
                    : null;

  // Human-readable token amounts for the quote line.
  const fmtAmt = (wei: bigint | null) =>
    wei === null
      ? "—"
      : (Number(wei) / 10 ** payToken.decimals).toLocaleString(undefined, {
          maximumFractionDigits: payToken.decimals > 8 ? 4 : payToken.decimals,
        });

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <button
        type="button"
        onClick={() => setPaywallOpen((v) => !v)}
        aria-expanded={paywallOpen}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <span>
          <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-foreground">
            <Sparkles className="size-3.5 text-primary" /> Dumb AI Pro — ${PRO_USD_THRESHOLD} ·{" "}
            {PRO_DAYS} days
          </span>
          <span className="mt-1 block text-sm text-muted-foreground">
            Paid models · 100 questions/day · scan explainer
          </span>
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-muted-foreground transition-transform ${paywallOpen ? "rotate-180" : ""}`}
        />
      </button>
      {paywallOpen ? (
        <div className="border-t border-border p-4">
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>· Paid AI models — smarter, longer answers</li>
            <li>· 100 questions/day</li>
            <li>· Scan explainer — Smiley walks through any safety scan in plain English</li>
          </ul>
          <label className="mt-3 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Pay with
            <select
              value={paySymbol}
              onChange={(e) => {
                setPaySymbol(e.target.value);
                setLegs({});
                setAmounts(null);
                setFlow("idle");
                setFlowError(null);
                try {
                  localStorage.removeItem(LEGS_STORAGE_KEY);
                } catch {
                  /* ignore */
                }
                // A pending broadcast belongs to the old token — never let a
                // resume for the new token adopt or clear it.
                writePending(null);
              }}
              disabled={busy}
              className="ml-2 rounded-md border border-border bg-surface px-2 py-1 text-sm font-bold text-foreground"
              aria-label="Token to pay with"
            >
              {PRO_PAY_TOKENS.map((t) => (
                <option key={t.symbol} value={t.symbol}>
                  {t.symbol}
                </option>
              ))}
            </select>
          </label>
          <p className="mt-2 text-sm text-muted-foreground">
            Split{" "}
            <span className="font-bold text-foreground">
              {burnWei !== null && modelWei !== null
                ? `~${fmtAmt(burnWei + modelWei)} ${payToken.symbol}`
                : "—"}
            </span>{" "}
            (~${(burnTargetUsd + PRO_MODEL_TARGET_USD).toFixed(0)}):{" "}
            <span className="font-bold text-foreground">
              ~${PRO_BURN_USD} of DUMB burns forever
            </span>
            {isSwapBurn ? " (your swap buys the DUMB and sends it straight to dead)" : ""},{" "}
            <span className="font-bold text-foreground">
              ~${PRO_MODEL_USD} of {payToken.symbol} funds the AI models
            </span>{" "}
            (to <span className="font-mono text-xs">{modelWallet.slice(0, 10)}…</span>). {PRO_DAYS}{" "}
            days of Pro. No card, no subscription — the split{" "}
            <span className="font-bold text-foreground">is</span> the payment, and the burn half is
            gone forever.
          </p>
          {insufficient && payBalanceValue !== null ? (
            <p
              role="alert"
              className="mt-2 rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm"
            >
              Your {payToken.symbol} balance (
              {(Number(payBalanceValue) / 10 ** payToken.decimals).toLocaleString(undefined, {
                maximumFractionDigits: 4,
              })}
              ) is short of the ~{fmtAmt(totalWei)} {payToken.symbol} needed.
            </p>
          ) : null}
          {flow === "error" && flowError ? (
            <p
              role="alert"
              className="mt-2 rounded-md border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm"
            >
              {flowError}
            </p>
          ) : null}
          {/* On-chain failure only (never wallet-level errors): the hash is the
              user's own broadcast, kept by confirmLeg when the receipt failed —
              the evidence-backed diagnosis instead of hammering Try again blind,
              same pattern as the SwapBox/BurnBox/scanner failure panels. */}
          {flow === "error" && failedTxHash ? (
            <p className="mt-1 text-sm">
              <Link
                to="/scan"
                search={{ token: undefined, burn: undefined, tx: failedTxHash }}
                className="underline decoration-pink underline-offset-2 hover:text-pink"
                title="The hub reads the failed transaction on-chain and names the cause in plain English — out of gas, an expired deadline, or the contract's own revert reason. Never a guess, never a retry nudge."
              >
                Why did it fail?
              </Link>
            </p>
          ) : null}
          <Button
            onClick={() => void startSplit()}
            disabled={busy || burnWei === null || modelWei === null || paywallBlocks}
            className="mt-3 gap-2 rounded-md bg-primary font-black text-primary-foreground"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Flame className="size-4" />}
            {stepLabel ??
              (flow === "error"
                ? "Try again — resumes where it stopped"
                : insufficient
                  ? `Not enough ${payToken.symbol}`
                  : burnWei === null || modelWei === null
                    ? "Price unavailable — try in a moment"
                    : `Split ~$${(burnTargetUsd + PRO_MODEL_TARGET_USD).toFixed(0)} ${payToken.symbol}, get Pro`)}
          </Button>
          {flow === "done" ? (
            <>
              <p className="mt-2 text-sm font-bold text-primary">Pro is active — ask away.</p>
              {/* Success-side counterpart of the BurnBox/scanner "Explain this
                  burn" (10:43/11:23): the Pro payment's burn leg — ~$16 of
                  DUMB destroyed — lands here with no decode path. The hash is
                  the user's own confirmed burn tx (persisted only after
                  confirmLeg succeeded, or a format-validated manual restore),
                  so the link can only ever open the burn they just paid for.
                  Completes the success-side pattern on the last money surface;
                  style matches this card's own "Why did it fail?" link. */}
              {legs.burn ? (
                <p className="mt-1 text-sm">
                  <Link
                    to="/scan"
                    search={{ token: undefined, burn: undefined, tx: legs.burn }}
                    className="underline decoration-pink underline-offset-2 hover:text-pink"
                    title="Plain-English breakdown of the burn leg: what you paid, what the tax cost, and what actually landed at the dead address. Never a guess."
                  >
                    Explain this burn
                  </Link>
                </p>
              ) : null}
            </>
          ) : null}
          {flow === "idle" && !legs.burn && !legs.model ? (
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer font-bold text-muted-foreground">
                Paid already? Restore with your transaction hashes
              </summary>
              <p className="mt-2 text-muted-foreground">
                Find the two transactions in your wallet&apos;s activity (the {payToken.symbol} swap
                and the {payToken.symbol} payment) and paste their hashes below. Nothing new is sent
                on-chain — this just re-checks the payments you already made.
              </p>
              <input
                value={recoverBurn}
                onChange={(e) => setRecoverBurn(e.target.value)}
                placeholder="Burn (swap) transaction hash — 0x…"
                spellCheck={false}
                className="mt-2 w-full rounded-md border border-border bg-surface px-2 py-1 font-mono text-xs text-foreground"
                aria-label="Burn transaction hash"
              />
              <input
                value={recoverModel}
                onChange={(e) => setRecoverModel(e.target.value)}
                placeholder="Model payment transaction hash — 0x…"
                spellCheck={false}
                className="mt-2 w-full rounded-md border border-border bg-surface px-2 py-1 font-mono text-xs text-foreground"
                aria-label="Model payment transaction hash"
              />
              <Button
                onClick={restoreHashes}
                disabled={!address || !isTxHash(recoverBurn) || !isTxHash(recoverModel)}
                className="mt-2 rounded-md font-bold"
                variant="secondary"
              >
                Restore &amp; try again
              </Button>
            </details>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function AiPreview() {
  const { address } = useAccount();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [scanPayload, setScanPayload] = useState<AiScanPayload | null>(null);
  // Free-model answers left today (server-reported, free tier only).
  const [freeLeft, setFreeLeft] = useState<number | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { signMessageAsync } = useSignMessage();
  // Pro chat session: wallet-signed once per 30 minutes, kept in memory
  // ONLY (never persisted — a stored session would be as replayable as
  // the address itself). Proves the wallet behind each paid-chat request.
  const proSessionRef = useRef<{ wallet: string; expiresAt: number; signature: string } | null>(
    null,
  );
  // One-time honest note if a Pro user declines the session signature —
  // they'd otherwise wonder why they're getting free-tier answers.
  const sessionDeclinedRef = useRef(false);

  /** Wallet signature proving the connected wallet for Pro chat. */
  const ensureProSession = async (): Promise<{
    expiresAt: number;
    signature: string;
  } | null> => {
    if (!address) return null;
    const live = proSessionRef.current;
    if (
      live &&
      live.wallet.toLowerCase() === address.toLowerCase() &&
      live.expiresAt > Date.now() + 60_000
    ) {
      return { expiresAt: live.expiresAt, signature: live.signature };
    }
    try {
      const expiresAt = Date.now() + PRO_SESSION_MS;
      const signature = await signMessageAsync({ message: proSessionMessage(address, expiresAt) });
      proSessionRef.current = { wallet: address.toLowerCase(), expiresAt, signature };
      return { expiresAt, signature };
    } catch {
      // Declined or wallet hiccup — serve the free tier. The server
      // enforces this too, so nothing Pro can leak either way.
      if (!sessionDeclinedRef.current) {
        sessionDeclinedRef.current = true;
        toast.message("Pro chat needs a wallet signature", {
          description: "Sign the session prompt to unlock Pro answers — or keep chatting free.",
        });
      }
      return null;
    }
  };

  // Keep the newest answer in view as the conversation grows.
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, busy]);

  // Scanner handoff: /ai?explain=1 with a report in localStorage.
  // Portfolio handoff: /ai?q=… prefills the question box (never auto-sends —
  // the user reviews before asking).
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("explain") === "1") {
        const raw = localStorage.getItem(AI_SCAN_STORAGE_KEY);
        if (raw) setScanPayload(JSON.parse(raw) as AiScanPayload);
        window.history.replaceState(null, "", "/ai");
      }
      const q = params.get("q");
      if (q) {
        setDraft(q.slice(0, 500));
        window.history.replaceState(null, "", "/ai");
        inputRef.current?.focus();
      }
    } catch {
      /* storage/URL unavailable — the explain card just won't show */
    }
  }, []);

  const status = useQuery({
    queryKey: ["dumb-ai-status"],
    queryFn: () => getAiChatStatus(),
    staleTime: 60_000,
  });

  const proQuery = useQuery({
    queryKey: ["dumb-ai-pro", address],
    queryFn: () => getProStatus(address as string),
    enabled: !!address,
    staleTime: 60_000,
  });
  const isPro = !!proQuery.data?.pro;
  const proExpiresAt = proQuery.data?.expiresAt ?? null;

  const pushAnswer = async (question: string, scan?: AiScanPayload | null, suggested?: boolean) => {
    const q = question.trim();
    if ((!q && !scan) || busy) return;
    setBusy(true);
    setTurns((prev) => [
      ...prev,
      { role: "user", text: scan ? `Explain my ${scan.symbol ?? "token"} scan` : q },
    ]);
    setDraft("");
    requestAnimationFrame(() => {
      if (inputRef.current) inputRef.current.style.height = "auto";
    });
    try {
      // Conversation memory (Pro): the turns so far, so follow-ups resolve.
      // Server caps count + length; "dump" turns map to the assistant role.
      const history = turns.slice(-6).map((t) => ({
        role: (t.role === "dump" ? "assistant" : "user") as "user" | "assistant",
        text: t.text.slice(0, 600),
      }));
      // Wallet-proven Pro session: a claimed address alone never unlocks
      // paid models (the server enforces this), so Pro wallets sign a
      // 30-minute session before asking.
      const session = address && isPro ? await ensureProSession() : null;
      let result = await postAiChat(q, address, scan ?? undefined, suggested, history, session);
      if (result.sessionRequired && session) {
        // Session lapsed between signing and the server's check — sign
        // fresh and retry once. If the wallet declines, the decline toast
        // already fired; no point re-asking without a session.
        proSessionRef.current = null;
        const fresh = await ensureProSession();
        if (fresh) {
          result = await postAiChat(q, address, scan ?? undefined, suggested, history, fresh);
        }
      }
      setTurns((prev) => [
        ...prev,
        {
          role: "dump",
          text: result.answer,
          mode: result.mode,
          sources: result.sources,
          pro: result.pro,
        },
      ]);
      // Free-model budget left today — shown in the toolbar for free users.
      if (!result.pro && typeof result.freeRemaining === "number") {
        setFreeLeft(result.freeRemaining);
      }
      if (result.sessionRequired && !sessionDeclinedRef.current) {
        toast.message("Pro chat needs a fresh signature", {
          description: "Sign the session prompt to unlock Pro answers.",
        });
      } else if (result.proRequired) {
        toast.message("Scan explainer is Pro", {
          description: `Grab a Pro pass below for ${PRO_DAYS} days of Pro to unlock it.`,
        });
      }
      if (result.proNudge) {
        toast.message("That's a Pro question", {
          description: "Free Dumb AI covers Dumb Money — Pro asks anything.",
        });
      }
    } catch {
      const fallback = localAnswer(q || "scan");
      setTurns((prev) => [
        ...prev,
        {
          role: "dump",
          text: fallback.answer,
          mode: fallback.mode,
          sources: fallback.sources,
        },
      ]);
      toast.message("Served local receipts", {
        description: "Server AI call failed — used on-device knowledge.",
      });
    } finally {
      setBusy(false);
    }
  };

  const newChat = () => {
    setTurns([]);
    setDraft("");
    inputRef.current?.focus();
  };

  const copyAnswer = async (idx: number, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      window.setTimeout(() => {
        setCopiedIdx((cur) => (cur === idx ? null : cur));
      }, 1500);
    } catch {
      toast.message("Copy failed", { description: "Your browser blocked clipboard access." });
    }
  };

  const autoresize = () => {
    const el = inputRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
    }
  };

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    void pushAnswer(draft);
  };

  return (
    <section id="ai" className="scroll-mt-24">
      <SectionHead
        asH1
        index="04"
        eyebrow="Dumb AI"
        title="Ask Smiley"
        blurb="Your AI helper for DUMB, the 6% tax, scam safety, and markets. Pro subscribers get paid models, live prices, and web search."
      />

      <div className="mx-auto max-w-3xl">
        {/* Slim toolbar: one status line + new chat. */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {isPro ? (
              <Badge
                variant="outline"
                className="rounded-md border-primary text-[10px] text-primary"
              >
                <Sparkles className="mr-1 size-3" /> Pro · paid models
                {proExpiresAt ? ` · until ${new Date(proExpiresAt).toLocaleDateString()}` : ""}
              </Badge>
            ) : (
              <Badge variant="outline" className="rounded-md text-[10px] text-muted-foreground">
                Free · {freeLeft === null ? 10 : freeLeft} of 10 AI answers left today
              </Badge>
            )}
            <Badge
              variant="outline"
              className={`rounded-md text-[10px] ${
                status.data?.hasLiveKey
                  ? "border-primary text-primary"
                  : "border-border text-muted-foreground"
              }`}
            >
              {status.data?.hasLiveKey ? "Live model ready" : "Local RAG mode"}
            </Badge>
          </div>
          {turns.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={newChat}
              className="gap-1.5 rounded-md text-xs font-bold text-muted-foreground"
            >
              <Plus className="size-3.5" /> New chat
            </Button>
          ) : null}
        </div>

        {/* Scanner handoff: slim banner, only when a scan is waiting. */}
        {scanPayload ? (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/40 bg-primary/5 p-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-black uppercase tracking-widest text-primary">
                Scan ready to explain
              </span>{" "}
              — {scanPayload.symbol ?? "Token"} {scanPayload.address.slice(0, 10)}… in plain
              English.{isPro ? "" : " This is a Pro feature."}
            </p>
            <Button
              onClick={() => void pushAnswer("", scanPayload)}
              disabled={busy}
              className="gap-2 rounded-md bg-primary font-black text-primary-foreground"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Explain my scan
            </Button>
          </div>
        ) : null}

        {/* Pro: active state is slim; the paywall is a slim banner that
            expands to the full split flow on tap. */}
        <div className="mb-6">
          <ProPanel
            address={address}
            pro={isPro}
            expiresAt={proExpiresAt}
            onActivated={() => void proQuery.refetch()}
          />
        </div>

        {/* Conversation. */}
        <div ref={logRef} className="max-h-[60vh] space-y-6 overflow-y-auto pr-1">
          {turns.length === 0 ? (
            <div className="py-8 text-center">
              <img
                src={mascot}
                alt="Smiley"
                width={1024}
                height={1024}
                className="mx-auto size-16 object-contain"
              />
              <h2 className="mt-4 font-display text-2xl font-black tracking-tight">
                {isPro ? "Ask me anything" : "Ask about Dumb Money"}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                {isPro
                  ? "Paid models, live market data, and web search — 100 questions a day."
                  : "Free covers Dumb Money questions. Suggested questions are always free and always answered."}
              </p>
              <div className="mx-auto mt-6 grid max-w-xl gap-2 pb-2 sm:grid-cols-2">
                {AI_QA.slice(0, 4).map((item) => (
                  <button
                    key={item.q}
                    type="button"
                    disabled={busy}
                    onClick={() => void pushAnswer(item.q, null, true)}
                    className="rounded-xl border border-border bg-card px-4 py-3 text-left text-sm font-semibold text-foreground transition-colors hover:border-primary hover:bg-secondary disabled:opacity-50"
                  >
                    {item.q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            turns.map((t, i) =>
              t.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">
                    {t.text}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex gap-3">
                  <img
                    src={smileyFace}
                    alt=""
                    width={56}
                    height={56}
                    className="mt-0.5 size-8 shrink-0 rounded-full"
                  />
                  <div className="min-w-0 flex-1">
                    <ChatMarkdown text={t.text} />
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {t.mode}
                        {t.pro ? " · pro" : ""}
                        {t.sources?.length ? ` · ${t.sources.slice(0, 2).join(", ")}` : ""}
                      </span>
                      <button
                        type="button"
                        onClick={() => void copyAnswer(i, t.text)}
                        aria-label="Copy answer"
                        className="rounded p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      >
                        {copiedIdx === i ? (
                          <Check className="size-3.5 text-primary" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ),
            )
          )}
          {busy ? (
            <div className="flex gap-3">
              <img
                src={smileyFace}
                alt=""
                width={56}
                height={56}
                className="mt-0.5 size-8 shrink-0 animate-pulse rounded-full"
              />
              <div className="flex items-center gap-1.5 pt-2" aria-label="Smiley is thinking">
                <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
              </div>
            </div>
          ) : null}
        </div>

        {/* Input, docked like ChatGPT/Claude. */}
        <form onSubmit={submit} className="sticky bottom-4 mt-6">
          <div className="rounded-2xl border border-border bg-card shadow-lg">
            <Textarea
              ref={inputRef}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                autoresize();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder={
                isPro
                  ? "Ask Smiley anything — Pro answers in depth…"
                  : "Ask Smiley about DUMB, trading, burns, safety…"
              }
              aria-label="Ask Smiley a question"
              rows={1}
              maxLength={500}
              className="max-h-[200px] resize-none rounded-2xl border-0 bg-transparent px-4 pt-3.5 focus-visible:ring-0"
            />
            <div className="flex items-center justify-between px-3 pb-3">
              <p className="px-1 text-[11px] text-muted-foreground">
                Smiley teaches — never financial advice.
              </p>
              <Button
                type="submit"
                disabled={busy || !draft.trim()}
                size="icon"
                aria-label="Send question"
                className="size-9 shrink-0 rounded-full bg-primary text-primary-foreground"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </Button>
            </div>
          </div>
        </form>
      </div>
      <Disclaimer className="mt-4" />
    </section>
  );
}
