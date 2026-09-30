// PulseChain token safety scanner.
// The quick scan is FREE and read-only by construction: pure eth_call against
// the public PulseChain RPC. No wallet connection, no signing, no spending —
// the quick scanner never asks the user for anything except the token address.
// The deep scan (simulated buy+sell round-trips against real PulseX liquidity)
// costs a small DUMB burn to the dead address, verified on-chain before the
// report renders — the burn happens from the user's own wallet, the site never
// touches funds, and every deep scan shrinks the DUMB supply.
//
// Honesty contract (non-negotiable): these checks can catch red flags, but they
// CANNOT prove a token is safe. Anything the scan can't verify is reported as
// "unknown — treat as risky", never as passing. The deep-scan simulation
// applies the tax the contract CLAIMS (its getters) — if the contract takes
// more than it claims, real trades cost more than the simulation says.

import {
  createPublicClient,
  decodeFunctionData,
  encodeFunctionData,
  http,
  keccak256,
  parseAbi,
  parseAbiItem,
  stringToHex,
  toHex,
} from "viem";

import {
  DAMP,
  DEAD,
  DUMB,
  HELGO,
  HEX,
  INC,
  PCOCK,
  PLSX,
  PRVX,
  PTGC,
  PULSEX_V2_FACTORY,
  PULSEX_V2_ROUTER,
  SOLIDX,
  TEDDY,
  WBTC,
  WPLS,
  erc20Abi,
  pulsechain,
  routerAbi,
} from "./pulsechain";

const scanClient = createPublicClient({
  chain: pulsechain,
  transport: http("https://rpc.pulsechain.com"),
});

// Minimal extra surface not in the shared ABIs (kept local: scanner-only).
const scanAbi = [
  {
    type: "function",
    name: "name",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  // Safemoon-fork style: fees() = total transfer tax in basis points.
  {
    type: "function",
    name: "fees",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "taxFee",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "paused",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  // Cooldown getters for the 5j owner-cooldown probe (below): "cooldown
  // exists" is read plainly so the report can honestly distinguish an
  // armed cooldown from the live owner's power to change it.
  {
    type: "function",
    name: "tradingCooldown",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "transferDelay",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "cooldownEnabled",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  // Trading-toggle getters for the 5l owner-trading-toggle probe (below):
  // "trading halted right now?" is read plainly so a freeze verdict can be
  // corroboration-gated on the setter hit (a lone halted flag never earns a
  // fail). Bool decode ONLY: some forks implement tradingStatus as a uint8
  // state machine — a bool decode of a uint return throws, read() swallows
  // it, and the getter is silently skipped. Benign (no-signal, never
  // evidence either way).
  {
    type: "function",
    name: "tradingActive",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "tradingEnabled",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "tradingStatus",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  // Fee-wallet getters for the 5m owner-fee-wallet probe (below): the
  // contract NAMING a marketing/fee/dev wallet recipient is read plainly
  // (anyone can call) so the report can name the current recipient — but
  // chain state can't prove the tax actually FLOWS there (a hardcoded
  // address or a different variable could take the leg instead), so the
  // copy names the recipient, never asserts proven flow. A clean zero
  // address is reported honestly ("no wallet currently set"), never
  // silently omitted. Gated on !fallbackBlind like 5l's getters: a
  // permissive fallback would answer with zero-ish garbage, and naming a
  // garbage-state recipient would be inventing a data point.
  {
    type: "function",
    name: "marketingWallet",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "feeWallet",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "devWallet",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

const factoryAbi = [
  {
    type: "function",
    name: "getPair",
    stateMutability: "view",
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
    ],
    outputs: [{ name: "pair", type: "address" }],
  },
] as const;

const ZERO = "0x0000000000000000000000000000000000000000" as const;

/**
 * EIP-1967 storage slots for proxy implementation and admin — computed as
 * keccak256(label) - 1, never hand-typed. (Hand-typed literals here were
 * wrong from day one, so the proxy check silently passed every token.)
 */
const EIP1967_IMPL = toHex(BigInt(keccak256(stringToHex("eip1967.proxy.implementation"))) - 1n, {
  size: 32,
});
const EIP1967_ADMIN = toHex(BigInt(keccak256(stringToHex("eip1967.proxy.admin"))) - 1n, {
  size: 32,
});

/** Extract an address from a storage slot (last 20 bytes); zero → null. */
function slotToAddress(slot: string | null | undefined): string | null {
  if (!slot || slot.length !== 66) return null;
  const addr = `0x${slot.slice(26)}`;
  return addr.toLowerCase() === ZERO ? null : addr;
}

/**
 * Upgradeability check (EIP-1967 proxy): the upgrade-rug shape is a token
 * that launches clean, then the team upgrades the implementation behind it
 * into a honeypot. Read-only storage reads — no wallet, no signing.
 */
async function checkUpgradeability(address: `0x${string}`): Promise<ScanCheck> {
  const mk = (status: ScanStatus, detail: string) =>
    check("proxy", "Upgradeability", status, detail);
  const implSlot = await tryRead(() => scanClient.getStorageAt({ address, slot: EIP1967_IMPL }));
  if (implSlot === null)
    return mk(
      "unknown",
      "The RPC didn't answer the proxy check — upgradeability couldn't be verified. Treat as unknown, not fine.",
    );
  const impl = slotToAddress(implSlot);
  if (!impl)
    return mk(
      "pass",
      "No standard upgrade slot found — the token isn't an EIP-1967 upgradeable proxy, so its code can't be swapped out from under you. (Non-standard proxy layouts can hide elsewhere — that's what the deep scan and your own explorer check are for.)",
    );
  const implCode = await tryRead(() => scanClient.getBytecode({ address: impl as `0x${string}` }));
  if (implCode === "0x" || implCode === undefined)
    return mk(
      "unknown",
      "The upgrade slot points at an address with no contract code — this may be a custom or stale proxy layout the scan can't read. Treat as risky.",
    );
  const adminSlot = await tryRead(() => scanClient.getStorageAt({ address, slot: EIP1967_ADMIN }));
  if (adminSlot === null)
    return mk(
      "warn",
      `This is an upgradeable proxy (implementation ${impl.slice(0, 6)}…${impl.slice(-4)}), but the RPC wouldn't reveal who holds the upgrade key. A live upgrade key can replace the token's code entirely — treat it as risky until you verify the admin on the explorer.`,
    );
  const admin = slotToAddress(adminSlot);
  if (!admin || admin.toLowerCase() === DEAD.toLowerCase())
    return mk(
      "pass",
      "This is an upgradeable proxy, but the upgrade key is renounced (admin is the zero/dead address) — the code can't be swapped out from under you.",
    );
  return mk(
    "warn",
    `This is an upgradeable proxy (implementation ${impl.slice(0, 6)}…${impl.slice(-4)}) with a LIVE upgrade key (${admin.slice(0, 6)}…${admin.slice(-4)}). Whoever holds it can replace the token's code entirely — a clean token today can become a honeypot tomorrow. Many legitimate tokens use proxies, but a live upgrade key is a real rug vector: check who controls it before buying.`,
  );
}

/**
 * Curated, on-chain-verified token contracts the site already uses everywhere
 * (swap box, guardrail, pricing). Powers the quick scan's identity check:
 * a scanned token claiming one of these symbols at a different address is a
 * lookalike. Symbols are the exact on-chain symbol() values so the real
 * contracts get the identity pass.
 */
const VERIFIED_IDENTITIES = [
  { symbol: "DUMB", addresses: [DUMB] },
  { symbol: "DAMP", addresses: [DAMP] },
  { symbol: "WPLS", addresses: [WPLS] },
  { symbol: "HEX", addresses: [HEX] },
  { symbol: "TEDDY BEAR ㉾", addresses: [TEDDY] },
  { symbol: "SOLIDX", addresses: [SOLIDX] },
  { symbol: "PCOCK", addresses: [PCOCK] },
  { symbol: "HELGO", addresses: [HELGO] },
  { symbol: "INC", addresses: [INC] },
  { symbol: "PLSX", addresses: [PLSX] },
  { symbol: "PRVX", addresses: [PRVX] },
  { symbol: "pTGC", addresses: [PTGC] },
  { symbol: "WBTC", addresses: [WBTC] },
] as const;

export type ScanStatus = "pass" | "warn" | "fail" | "unknown";

export interface ScanCheck {
  id: string;
  label: string;
  status: ScanStatus;
  detail: string;
}

export interface QuickScanResult {
  address: `0x${string}`;
  checks: ScanCheck[];
  /** Transfer tax in basis points from the contract's own getters (null = none found). */
  taxBps: number | null;
  /** The token/WPLS PulseX pair the deep scan simulates against (null = none). */
  pair: `0x${string}` | null;
  /** Real on-chain metadata (null = the metadata check didn't pass — treat as risky). */
  symbol: string | null;
  decimals: number | null;
  scannedAt: number;
}

/** Bounded read: rpc.pulsechain.com drops batch calls intermittently, so every
 *  scan read retries twice before becoming an "unknown" instead of an error. */
async function tryRead<T>(fn: () => Promise<T>): Promise<T | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await fn();
    } catch {
      if (attempt < 2) await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
    }
  }
  return null;
}

const read = async <T>(
  address: `0x${string}`,
  abi: readonly object[],
  functionName: string,
  args: readonly unknown[] = [],
): Promise<T | null> =>
  // viem's readContract typing needs the exact ABI shape; the call is safe
  // because functionName/args are our own literals — cast at the boundary.
  tryRead(() =>
    (scanClient.readContract as (p: unknown) => Promise<T>)({
      address,
      abi,
      functionName,
      args,
    }),
  );

const check = (id: string, label: string, status: ScanStatus, detail: string): ScanCheck => ({
  id,
  label,
  status,
  detail,
});

/**
 * Read-only sell probe: simulates transfer() of `amount` from `holder` via
 * eth_call. No state changes, no wallet, no signing — the node just answers
 * whether the transfer would succeed. Returns "ok" when it would succeed,
 * "reverted" when the contract itself rejects it (the honeypot shape), and
 * "unknown" when the RPC won't give a clean answer (never a pass).
 */
async function simulateSellFrom(
  token: `0x${string}`,
  holder: `0x${string}`,
  amount: bigint,
): Promise<"ok" | "reverted" | "unknown"> {
  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [DEAD, amount],
  });
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await scanClient.call({ account: holder, to: token, data });
      return "ok";
    } catch (e) {
      // A revert is deterministic contract behavior; anything else is
      // transport/RPC noise — retried once, then reported as unknown.
      if (String(e).toLowerCase().includes("revert")) return "reverted";
    }
  }
  return "unknown";
}

/** Free quick scan of any PulseChain token contract. */
export async function quickScan(address: `0x${string}`): Promise<QuickScanResult> {
  const checks: ScanCheck[] = [];
  let taxBps: number | null = null;
  let pair: `0x${string}` | null = null;

  // 1. Contract or EOA?
  const code = await tryRead(() => scanClient.getBytecode({ address }));
  if (code === null) {
    checks.push(
      check("code", "Contract exists", "unknown", "RPC didn't answer — couldn't verify."),
    );
  } else if (code === "0x" || code === undefined) {
    checks.push(
      check(
        "code",
        "Contract exists",
        "fail",
        "This address has no contract code — it's a plain wallet, not a token.",
      ),
    );
    return { address, checks, taxBps, pair, symbol: null, decimals: null, scannedAt: Date.now() };
  } else {
    checks.push(check("code", "Contract exists", "pass", "Contract code found on PulseChain."));
  }

  // 2. ERC-20 basics
  const name = await read<string>(address, scanAbi, "name");
  const symbol = await read<string>(address, scanAbi, "symbol");
  const decimals = await read<number>(address, erc20Abi, "decimals");
  const supply = await read<bigint>(address, erc20Abi, "totalSupply");
  if (typeof name === "string" && typeof symbol === "string" && typeof decimals === "number") {
    const supplyStr =
      typeof supply === "bigint"
        ? ` · supply ${Number(supply / 10n ** BigInt(decimals)).toLocaleString("en-US")}`
        : "";
    checks.push(
      check(
        "metadata",
        "Token metadata",
        "pass",
        `${name} (${symbol}), ${decimals} decimals${supplyStr}.`,
      ),
    );
  } else {
    checks.push(
      check(
        "metadata",
        "Token metadata",
        "warn",
        "name()/symbol()/decimals() didn't all answer — it may not be a standard ERC-20.",
      ),
    );
  }

  // 3. Identity: real contract or name-copying lookalike?
  // The site already maintains curated, on-chain-verified contracts (swap
  // box, guardrail, pricing). A scanned token that CLAIMS one of these
  // symbols but sits at a different address is a lookalike — the classic
  // name-collision scam this site fights elsewhere. No check is added when
  // the symbol matches nothing curated: a "pass" for every unknown token
  // would teach users that "not flagged" means "safe".
  if (typeof symbol === "string" && symbol.trim().length > 0) {
    const known = VERIFIED_IDENTITIES.find(
      (t) => t.symbol.toLowerCase() === symbol.trim().toLowerCase(),
    );
    if (known) {
      const isReal = known.addresses.some((a) => a.toLowerCase() === address.toLowerCase());
      const addrList = known.addresses.join(", ");
      if (isReal) {
        checks.push(
          check(
            "identity",
            "Identity",
            "pass",
            `This is the REAL ${known.symbol} on PulseChain — the address matches the curated contract this site uses (verified on-chain).`,
          ),
        );
      } else {
        checks.push(
          check(
            "identity",
            "Identity",
            "fail",
            `Lookalike warning: this token uses the "${known.symbol}" symbol, but the curated ${known.symbol} contract${known.addresses.length > 1 ? "s are" : " is"} ${addrList}. Name-copying is a classic scam pattern — treat it as a copycat until you verify it yourself on the explorer.`,
          ),
        );
      }
    }
  }

  // 4. Transfer tax (real vs claimed): try the getters common on PulseChain forks.
  const fees = await read<bigint>(address, scanAbi, "fees");
  const taxFee = await read<bigint>(address, scanAbi, "taxFee");
  taxBps =
    typeof fees === "bigint" ? Number(fees) : typeof taxFee === "bigint" ? Number(taxFee) : null;
  if (taxBps !== null) {
    checks.push(
      check(
        "tax",
        "Transfer tax",
        taxBps > 1000 ? "warn" : "pass",
        `Contract reports a ${taxBps / 100}%-of-every-transfer tax. The "Buy/sell tax, measured" check below compares that claim against what recent WPLS-pair trades actually paid — some tokens tax transfers in ways no getter reveals.`,
      ),
    );
  } else {
    checks.push(
      check(
        "tax",
        "Transfer tax",
        "unknown",
        "No standard tax getter found — the token may still tax transfers in ways getters can't reveal. (Sell-blocking is tested separately by the sell simulation below.)",
      ),
    );
  }

  // 5. Owner power
  const owner = await read<string>(address, scanAbi, "owner");
  if (typeof owner === "string") {
    const o = owner.toLowerCase();
    if (o === ZERO || o === DEAD.toLowerCase()) {
      checks.push(
        check(
          "owner",
          "Owner powers",
          "pass",
          "owner() points at the zero/dead address — ownership is renounced. No one can change the rules.",
        ),
      );
    } else {
      checks.push(
        check(
          "owner",
          "Owner powers",
          "warn",
          `A live owner exists (${owner.slice(0, 6)}…${owner.slice(-4)}) — it can still change fees, pause, or mint if those functions exist.`,
        ),
      );
    }
  } else {
    checks.push(
      check(
        "owner",
        "Owner powers",
        "unknown",
        "No standard owner() found — privileged functions may exist under different names. Treat as risky.",
      ),
    );
  }

  // 5b. Owner concentration: a live owner holding a big share of the supply
  // is the classic slow-rug shape — the LP can be burned and the rules
  // renounced-safe while the dump risk sits in one wallet. Only meaningful
  // for a live (non-renounced) owner; renounced/absent owners skip it.
  // totalSupply was already read in section 2, so this costs one read.
  if (typeof owner === "string") {
    const oc = owner.toLowerCase();
    if (oc !== ZERO && oc !== DEAD.toLowerCase()) {
      const ownerBal = await read<bigint>(address, erc20Abi, "balanceOf", [owner as `0x${string}`]);
      if (typeof ownerBal === "bigint" && typeof supply === "bigint" && supply > 0n) {
        const bps = Number((ownerBal * 10_000n) / supply);
        const pct = (bps / 100).toFixed(bps % 100 === 0 ? 0 : 2);
        const sym = typeof symbol === "string" ? symbol : "token";
        const held = `The owner address holds ~${pct}% of the ${sym} supply.`;
        checks.push(
          check(
            "concentration",
            "Owner concentration",
            bps >= 5000 ? "fail" : bps >= 1500 ? "warn" : "pass",
            bps >= 5000
              ? `${held} A single wallet that large can crash the price by selling into buyers — holding isn't dumping, but the power sits in one place.`
              : bps >= 1500
                ? `${held} That's enough to move the price hard on the way out — worth knowing before you buy.`
                : `${held} Not a concentration risk.`,
          ),
        );
      } else {
        checks.push(
          check(
            "concentration",
            "Owner concentration",
            "unknown",
            "The owner's share of the supply couldn't be read — concentration unknown, treat as risky.",
          ),
        );
      }
    }
  }

  // 5c. Fee-change powers: can the live owner rewrite the transfer tax?
  // A token showing 6% today whose owner can set it to 99% tomorrow is the
  // classic slow-rug — the tax getter in section 4 only reports today's
  // value. Probe the common safemoon-fork fee-setter shapes with read-only
  // eth_call calls impersonating the owner (eth_call never commits state;
  // the arg repeats the current tax, so even a hypothetical commit would be
  // a no-op — same read-only discipline as the sell simulation). A clean
  // return means a setter with that shape exists and the owner could call
  // it. Only meaningful with a LIVE owner — renounced/absent owners skip it
  // (fee changes need someone to call them; the owner check already covers
  // renounced). Selectors are derived via keccak256, never hand-typed.
  const FEE_SETTER_SIGS = [
    "setTaxFeePercent(uint256)",
    "setLiquidityFeePercent(uint256)",
    "setFees(uint256)",
    "setBuyFee(uint256)",
    "setSellFee(uint256)",
    "setMarketingFee(uint256)",
    "setTaxes(uint256,uint256,uint256)",
  ] as const;

  async function probeFeeSetter(
    token: `0x${string}`,
    caller: `0x${string}`,
    sig: string,
    currentTax: bigint,
  ): Promise<"found" | "absent" | "unknown"> {
    const selector = keccak256(stringToHex(sig)).slice(0, 10);
    const nargs = sig.endsWith("(uint256,uint256,uint256)") ? 3 : 1;
    const data = (selector +
      toHex(currentTax, { size: 32 }).slice(2).repeat(nargs)) as `0x${string}`;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await scanClient.call({ account: caller, to: token, data });
        return "found";
      } catch (e) {
        // A revert is deterministic contract behavior (no such function, or
        // it rejected the call); anything else is transport/RPC noise —
        // retried once, then reported as unknown.
        if (String(e).toLowerCase().includes("revert")) return "absent";
      }
    }
    return "unknown";
  }

  // Permissive-fallback control: some contracts (e.g. HEX) accept calls to
  // functions that don't exist without reverting. On those, "the call didn't
  // revert" can't mean "the setter exists" — every impersonation probe would
  // false-positive (verified live: HEX answers all 7 fee-setter shapes AND a
  // garbage selector). One garbage-selector call per caller: success means the
  // probe is unreliable for this contract, revert means it's reliable, and
  // anything else degrades to unreliable — unknown is the honest verdict.
  async function hasPermissiveFallback(
    token: `0x${string}`,
    caller: `0x${string}`,
  ): Promise<boolean> {
    // Deliberately garbage selector: it must match no real function.
    const data = ("0xdeadbeef" + "00".repeat(32)) as `0x${string}`;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await scanClient.call({ account: caller, to: token, data });
        return true;
      } catch (e) {
        if (String(e).toLowerCase().includes("revert")) return false;
      }
    }
    return true;
  }

  const currentTax = typeof taxBps === "number" && taxBps >= 0 ? BigInt(taxBps) : 0n;
  const taxLabel = typeof taxBps === "number" ? `${taxBps / 100}%` : "current";
  const liveOwner =
    typeof owner === "string" &&
    owner.toLowerCase() !== ZERO &&
    owner.toLowerCase() !== DEAD.toLowerCase();

  if (liveOwner) {
    const ownerAddr = owner as `0x${string}`;
    if (await hasPermissiveFallback(address, ownerAddr)) {
      checks.push(
        check(
          "fee-setter",
          "Fee-change powers",
          "unknown",
          "This contract answers calls to functions that don't exist, so the fee-setter probe can't tell whether a real fee setter is hiding in there — whether the owner can change the tax is unknown. Treat as risky.",
        ),
      );
    } else {
      let foundSig: string | null = null;
      let unknownCount = 0;
      for (const sig of FEE_SETTER_SIGS) {
        const r = await probeFeeSetter(address, ownerAddr, sig, currentTax);
        if (r === "found") {
          foundSig = sig;
          break;
        }
        if (r === "unknown") unknownCount++;
      }
      if (foundSig) {
        checks.push(
          check(
            "fee-setter",
            "Fee-change powers",
            "warn",
            `A common fee-setter shape (${foundSig}) answered — the owner can change the transfer tax after you buy. The ${taxLabel} tax you see today isn't locked; it could be raised before you sell. (Adjustable taxes are common in legit launches too — but the power sits with the owner, not with holders.)`,
          ),
        );
      } else if (unknownCount === FEE_SETTER_SIGS.length) {
        checks.push(
          check(
            "fee-setter",
            "Fee-change powers",
            "unknown",
            "The fee-setter probe couldn't get a clean answer from the RPC — whether the owner can change the tax is unknown. Treat as risky.",
          ),
        );
      } else {
        checks.push(
          check(
            "fee-setter",
            "Fee-change powers",
            "pass",
            `Probed ${FEE_SETTER_SIGS.length} common fee-setter shapes — none answered, so the tax can't be changed through the usual functions. Custom setters could hide under other names.`,
          ),
        );
      }
    }
  }

  // 5d. Permissionless fee change: with no live owner, could ANYONE rewrite
  // the tax? "Ownership renounced" is the strongest tax-lock claim a token
  // can make — but it only holds if no fee setter answers a random caller.
  // Probe the same shapes impersonating an arbitrary address that can never
  // be an owner (0x…0001). A clean return means the setter is permissionless
  // — a hard fail. Runs only when there is NO live owner: 5c already probes
  // from the owner's side, and a setter that answers a stranger but rejects
  // the owner is pathological. eth_call never commits state, same read-only
  // discipline as 5c.
  if (!liveOwner) {
    const ANYONE = "0x0000000000000000000000000000000000000001" as const;
    if (await hasPermissiveFallback(address, ANYONE)) {
      checks.push(
        check(
          "fee-setter-anyone",
          "Permissionless fee change",
          "unknown",
          "This contract answers calls to functions that don't exist, so the permissionless fee-setter probe can't tell whether a real setter is hiding in there — whether anyone can rewrite the tax is unknown. Treat as risky.",
        ),
      );
    } else {
      let foundSig: string | null = null;
      let unknownCount = 0;
      for (const sig of FEE_SETTER_SIGS) {
        const r = await probeFeeSetter(address, ANYONE, sig, currentTax);
        if (r === "found") {
          foundSig = sig;
          break;
        }
        if (r === "unknown") unknownCount++;
      }
      if (foundSig) {
        checks.push(
          check(
            "fee-setter-anyone",
            "Permissionless fee change",
            "fail",
            `A common fee-setter shape (${foundSig}) answered a call from an arbitrary address — anyone could rewrite the transfer tax, not just an owner. The ${taxLabel} tax you see today isn't locked; a stranger could raise it before you sell. Ownership being renounced doesn't stop this.`,
          ),
        );
      } else if (unknownCount === FEE_SETTER_SIGS.length) {
        checks.push(
          check(
            "fee-setter-anyone",
            "Permissionless fee change",
            "unknown",
            "The permissionless fee-setter probe couldn't get a clean answer from the RPC — whether anyone can change the tax is unknown. Treat as risky.",
          ),
        );
      } else {
        checks.push(
          check(
            "fee-setter-anyone",
            "Permissionless fee change",
            "pass",
            `Probed ${FEE_SETTER_SIGS.length} common fee-setter shapes as an arbitrary caller — none answered, so the tax can't be rewritten through the usual functions by just anyone. Custom setters could hide under other names, or behind a non-standard role.`,
          ),
        );
      }
    }
  }

  // 5e. Owner fee exemption: does the live owner's wallet skip the tax?
  // The adjacent slow-rug vector to fee setters: the owner excludes their
  // own wallet from the transfer tax, then dumps tax-free while holders pay
  // it. Safemoon forks carry a public isExcludedFromFee(address) view —
  // read-only, callable by anyone (no impersonation needed), so the probe is
  // a plain eth_call from any account. true = the owner's sells are cheaper
  // than yours (warn); false = same tax as everyone else (pass); no common
  // getter answers = nothing to exempt through (pass with the caveat — same
  // honest pattern as 5c/5d); RPC noise on every getter = unknown, treat as
  // risky. Only meaningful with a LIVE owner — renounced/absent owners skip
  // it (no owner's wallet to check). Both common getter spellings probed;
  // selectors derived via keccak256, never hand-typed.
  if (liveOwner) {
    const ownerAddr = owner as `0x${string}`;
    const FEE_EXEMPTION_GETTERS = [
      "isExcludedFromFee(address)",
      "isExcludedFromFees(address)",
    ] as const;

    async function probeFeeExemption(
      sig: string,
    ): Promise<"exempt" | "not-exempt" | "absent" | "unknown"> {
      const selector = keccak256(stringToHex(sig)).slice(0, 10);
      const data = (selector + ownerAddr.slice(2).padStart(64, "0")) as `0x${string}`;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const ret = await scanClient.call({ to: address, data });
          // bool return: last byte of the 32-byte word ("01" = true). A
          // clean return with no word is pathological — treat as unknown,
          // never as a pass.
          if (!ret.data || ret.data.length < 66) return "unknown";
          return ret.data.slice(-2) === "01" ? "exempt" : "not-exempt";
        } catch (e) {
          // A revert is deterministic contract behavior (no such getter);
          // anything else is transport/RPC noise — retried once, then
          // reported as unknown.
          if (String(e).toLowerCase().includes("revert")) return "absent";
        }
      }
      return "unknown";
    }

    let exempt = false;
    let notExempt = false;
    let unknownCount = 0;
    for (const sig of FEE_EXEMPTION_GETTERS) {
      const r = await probeFeeExemption(sig);
      if (r === "exempt") exempt = true;
      else if (r === "not-exempt") notExempt = true;
      else if (r === "unknown") unknownCount++;
    }
    if (exempt) {
      checks.push(
        check(
          "owner-fee-exemption",
          "Owner fee exemption",
          "warn",
          `The owner's wallet is excluded from the transfer tax — their sells skip the ${taxLabel} tax you'd pay. Excluding team wallets is common in forked launches, but it means their way out is cheaper than yours.`,
        ),
      );
    } else if (notExempt) {
      checks.push(
        check(
          "owner-fee-exemption",
          "Owner fee exemption",
          "pass",
          "The owner's wallet pays the same transfer tax as everyone else — no fee-exemption shortcut for the wallet that controls the contract.",
        ),
      );
    } else if (unknownCount === FEE_EXEMPTION_GETTERS.length) {
      checks.push(
        check(
          "owner-fee-exemption",
          "Owner fee exemption",
          "unknown",
          "The fee-exemption probe couldn't get a clean answer from the RPC — whether the owner's wallet skips the transfer tax is unknown. Treat as risky.",
        ),
      );
    } else {
      checks.push(
        check(
          "owner-fee-exemption",
          "Owner fee exemption",
          "pass",
          `Probed ${FEE_EXEMPTION_GETTERS.length} common fee-exemption getters — none answered, so the owner's wallet can't be exempted through the usual functions. Custom getters could hide under other names.`,
        ),
      );
    }
  }

  // 5f. Owner fee-exclusion setter: could the live owner exempt themselves
  // from the tax LATER? 5e answers what IS (the getter today); this probes
  // the setter — excludeFromFee(address)/excludeFromFees(address) — with a
  // read-only eth_call impersonating the owner (eth_call never commits
  // state, so the exclusion is simulated, never executed). A clean return
  // means the setter exists and the owner could call it for real: even when
  // 5e passes today, the owner could exempt their wallet before selling.
  // Only meaningful with a LIVE owner (no owner = nobody to call it).
  // Selectors via keccak256, never hand-typed. Arg choice: we simulate
  // excludeFromFee(owner) — the exact self-exemption the check guards
  // against. Non-standard setter shapes (extra args) revert here and land
  // in the honest pass-with-caveat, same as the other shape probes.
  if (liveOwner) {
    const ownerAddr = owner as `0x${string}`;
    const EXCLUSION_SETTER_SIGS = ["excludeFromFee(address)", "excludeFromFees(address)"] as const;

    async function probeExclusionSetter(sig: string): Promise<"found" | "absent" | "unknown"> {
      const selector = keccak256(stringToHex(sig)).slice(0, 10);
      const data = (selector + ownerAddr.slice(2).padStart(64, "0")) as `0x${string}`;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          // Impersonate the owner: onlyOwner setters revert for strangers.
          await scanClient.call({ account: ownerAddr, to: address, data });
          return "found";
        } catch (e) {
          // A revert is deterministic contract behavior (no such setter,
          // or it rejected the simulated call); anything else is
          // transport/RPC noise — retried once, then reported as unknown.
          if (String(e).toLowerCase().includes("revert")) return "absent";
        }
      }
      return "unknown";
    }

    let foundSig: string | null = null;
    let unknownCount = 0;
    // A permissive fallback would false-positive this probe too (any calldata
    // "answers"), so the garbage-selector control gates it first.
    const fallbackBlind = await hasPermissiveFallback(address, ownerAddr);
    for (const sig of EXCLUSION_SETTER_SIGS) {
      if (fallbackBlind) break;
      const r = await probeExclusionSetter(sig);
      if (r === "found") {
        foundSig = sig;
        break;
      }
      if (r === "unknown") unknownCount++;
    }
    if (fallbackBlind) {
      checks.push(
        check(
          "owner-exclusion-setter",
          "Owner fee-exclusion setter",
          "unknown",
          "This contract answers calls to functions that don't exist, so the exclusion-setter probe can't tell whether a real setter is hiding in there — whether the owner can exempt their wallet from the transfer tax later is unknown. Treat as risky.",
        ),
      );
    } else if (foundSig) {
      checks.push(
        check(
          "owner-exclusion-setter",
          "Owner fee-exclusion setter",
          "warn",
          `A common fee-exclusion setter (${foundSig}) answered the owner's own call — the owner could exempt their wallet from the transfer tax before selling, even if their wallet pays the tax today. The fee-exemption check above tells you what IS; this one tells you what COULD BE.`,
        ),
      );
    } else if (unknownCount === EXCLUSION_SETTER_SIGS.length) {
      checks.push(
        check(
          "owner-exclusion-setter",
          "Owner fee-exclusion setter",
          "unknown",
          "The fee-exclusion-setter probe couldn't get a clean answer from the RPC — whether the owner can exempt their wallet from the transfer tax is unknown. Treat as risky.",
        ),
      );
    } else {
      checks.push(
        check(
          "owner-exclusion-setter",
          "Owner fee-exclusion setter",
          "pass",
          `Probed ${EXCLUSION_SETTER_SIGS.length} common fee-exclusion setter shapes impersonating the owner — none answered, so the owner can't exempt wallets from the transfer tax through the usual functions. Custom setters could hide under other names.`,
        ),
      );
    }
  }

  // 5g. Owner mint power: can the live owner print new supply? The classic
  // inflation rug — mint, then dump the new tokens on buyers. Probes the
  // common mint shapes with a read-only eth_call impersonating the live
  // owner (eth_call never commits state, so nothing is actually minted).
  // The simulated mint targets the dead address: even in the impossible case
  // the call executed, the minted tokens would burn. A clean return means
  // the function exists and the owner's auth passed (verified live: INC's
  // mint(address,uint256) answers the owner's call while a stranger's
  // reverts — owner-gated, a true positive). Only meaningful with a LIVE
  // owner (renounced/absent owners skip — no one left to mint). Selectors
  // via keccak256, never hand-typed. A mint that exists but reverts on the
  // simulated call (caps, conditions) lands in the pass-with-caveat, same
  // honest pattern as the other shape probes.
  if (liveOwner) {
    const ownerAddr = owner as `0x${string}`;
    const MINT_SIGS = ["mint(address,uint256)", "mint(uint256)"] as const;

    async function probeMint(sig: string): Promise<"found" | "absent" | "unknown"> {
      const selector = keccak256(stringToHex(sig)).slice(0, 10);
      const deadArg = DEAD.slice(2).padStart(64, "0");
      const oneUnit = 1n.toString(16).padStart(64, "0");
      const data = (selector +
        (sig === "mint(address,uint256)" ? deadArg : "") +
        oneUnit) as `0x${string}`;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          // Impersonate the owner: onlyOwner mints revert for strangers.
          await scanClient.call({ account: ownerAddr, to: address, data });
          return "found";
        } catch (e) {
          // A revert is deterministic contract behavior (no such mint, or
          // it rejected the simulated call); anything else is
          // transport/RPC noise — retried once, then reported as unknown.
          if (String(e).toLowerCase().includes("revert")) return "absent";
        }
      }
      return "unknown";
    }

    let foundSig: string | null = null;
    let unknownCount = 0;
    // Same permissive-fallback control as the setter probes: a contract that
    // answers calls to functions that don't exist can't be probed by "the
    // call didn't revert" — degrade to unknown instead of a false warn.
    const fallbackBlind = await hasPermissiveFallback(address, ownerAddr);
    for (const sig of MINT_SIGS) {
      if (fallbackBlind) break;
      const r = await probeMint(sig);
      if (r === "found") {
        foundSig = sig;
        break;
      }
      if (r === "unknown") unknownCount++;
    }
    if (fallbackBlind) {
      checks.push(
        check(
          "owner-mint",
          "Owner mint power",
          "unknown",
          "This contract answers calls to functions that don't exist, so the mint probe can't tell whether a real mint function is hiding in there — whether the owner can print new tokens is unknown. Treat as risky.",
        ),
      );
    } else if (foundSig) {
      checks.push(
        check(
          "owner-mint",
          "Owner mint power",
          "warn",
          `A common mint function (${foundSig}) answered the owner's own call — the owner can print new tokens. That's the classic inflation vector: mint, then sell the new supply into buyers.`,
        ),
      );
    } else if (unknownCount === MINT_SIGS.length) {
      checks.push(
        check(
          "owner-mint",
          "Owner mint power",
          "unknown",
          "The mint probe couldn't get a clean answer from the RPC — whether the owner can print new tokens is unknown. Treat as risky.",
        ),
      );
    } else {
      checks.push(
        check(
          "owner-mint",
          "Owner mint power",
          "pass",
          `Probed ${MINT_SIGS.length} common mint shapes impersonating the owner — none answered, so the owner can't print new tokens through the usual functions. Custom mint functions could hide under other names.`,
        ),
      );
    }
  }

  // 5h. Owner blacklist power: can the live owner freeze wallets? The
  // nastiest honeypot-adjacent trick — blacklist a buyer so they can't
  // sell, or freeze wallets outright. Probes the common blacklist shapes
  // with a read-only eth_call impersonating the live owner (eth_call never
  // commits state). The dead address is the probe argument, so even in the
  // impossible case a call executed, the only wallet "blacklisted" would
  // be the dead one. Note: blacklist(address) may be a setter OR a public
  // mapping getter — either way, a clean return means blacklist machinery
  // EXISTS (isBlacklisted is the getter shape; a clean return on the dead
  // address proves the mapping exists even if it returns false). Only
  // meaningful with a LIVE owner (renounced/absent owners skip — no one
  // left to wield it). Selectors via keccak256, never hand-typed.
  if (liveOwner) {
    const ownerAddr = owner as `0x${string}`;
    const BLACKLIST_SIGS = [
      "blacklist(address)",
      "isBlacklisted(address)",
      "addToBlacklist(address)",
      "setBlacklist(address,bool)",
    ] as const;

    async function probeBlacklist(sig: string): Promise<"found" | "absent" | "unknown"> {
      const selector = keccak256(stringToHex(sig)).slice(0, 10);
      const deadArg = DEAD.slice(2).padStart(64, "0");
      const falseArg = "0".repeat(64);
      const data = (selector + deadArg + (sig.includes("bool") ? falseArg : "")) as `0x${string}`;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          // Impersonate the owner: onlyOwner setters revert for strangers.
          // (Getters answer anyone; a clean return still means the
          // machinery exists.)
          await scanClient.call({ account: ownerAddr, to: address, data });
          return "found";
        } catch (e) {
          // A revert is deterministic contract behavior (no such function,
          // or it rejected the simulated call); anything else is
          // transport/RPC noise — retried once, then reported as unknown.
          if (String(e).toLowerCase().includes("revert")) return "absent";
        }
      }
      return "unknown";
    }

    let foundSig: string | null = null;
    let unknownCount = 0;
    // Same permissive-fallback control as the other owner probes: a contract
    // that answers calls to functions that don't exist (HEX) can't be
    // probed by "the call didn't revert" — degrade to unknown instead of a
    // false warn.
    const fallbackBlind = await hasPermissiveFallback(address, ownerAddr);
    for (const sig of BLACKLIST_SIGS) {
      if (fallbackBlind) break;
      const r = await probeBlacklist(sig);
      if (r === "found") {
        foundSig = sig;
        break;
      }
      if (r === "unknown") unknownCount++;
    }
    if (fallbackBlind) {
      checks.push(
        check(
          "owner-blacklist",
          "Owner blacklist power",
          "unknown",
          "This contract answers calls to functions that don't exist, so the blacklist probe can't tell whether real blacklist machinery is hiding in there — whether the owner can freeze wallets is unknown. Treat as risky.",
        ),
      );
    } else if (foundSig) {
      checks.push(
        check(
          "owner-blacklist",
          "Owner blacklist power",
          "warn",
          `A blacklist function (${foundSig}) answered the owner's own call — the owner can freeze wallets, blocking sells or trapping tokens. The power existing in a live owner's hands is the rug vector: even if it's never used today, it can be turned on before a dump.`,
        ),
      );
    } else if (unknownCount === BLACKLIST_SIGS.length) {
      checks.push(
        check(
          "owner-blacklist",
          "Owner blacklist power",
          "unknown",
          "The blacklist probe couldn't get a clean answer from the RPC — whether the owner can freeze wallets is unknown. Treat as risky.",
        ),
      );
    } else {
      checks.push(
        check(
          "owner-blacklist",
          "Owner blacklist power",
          "pass",
          `Probed ${BLACKLIST_SIGS.length} common blacklist shapes impersonating the owner — none answered, so the owner can't freeze wallets through the usual functions. Custom freeze functions could hide under other names.`,
        ),
      );
    }
  }

  // 5i. Owner sell-limit power: can the live owner throttle sells by changing
  // max-transaction / max-wallet limits? The classic soft-rug throttle — the
  // tax can be honest while the exit is gated: crank maxTx down to dust and
  // holders can't sell in size, then loosen it for the owner's own dump.
  // Probes the common limit-setter shapes with a read-only eth_call
  // impersonating the live owner (eth_call never commits state). Probe args
  // are fail-safe in the impossible case a call executed: 50 (percent-style)
  // or half the supply (amount-style) only LOOSEN limits, never tighten
  // them. A clean return means the setter exists and the owner's auth passed.
  // Revert = absent (or a setter that rejected the probe value — named in the
  // pass caveat); RPC noise = unknown. Only meaningful with a LIVE owner
  // (renounced/absent owners skip — no one left to turn the dial). Selectors
  // via keccak256, never hand-typed.
  if (liveOwner) {
    const ownerAddr = owner as `0x${string}`;
    // Amount-style setters get half the (already-read) supply — passes the
    // common floor/ceiling validations; skipped when supply wasn't readable.
    const halfSupply = typeof supply === "bigint" && supply > 0n ? supply / 2n : null;
    const LIMIT_SETTER_SIGS: { sig: string; arg: bigint }[] = [
      { sig: "setMaxTxPercent(uint256)", arg: 50n },
      ...(halfSupply !== null
        ? [
            { sig: "setMaxTxAmount(uint256)", arg: halfSupply },
            { sig: "setMaxWallet(uint256)", arg: halfSupply },
            { sig: "setMaxWalletAmount(uint256)", arg: halfSupply },
            { sig: "updateMaxTxAmount(uint256)", arg: halfSupply },
          ]
        : []),
    ];

    async function probeLimitSetter(
      sig: string,
      arg: bigint,
    ): Promise<"found" | "absent" | "unknown"> {
      const selector = keccak256(stringToHex(sig)).slice(0, 10);
      const data = (selector + toHex(arg, { size: 32 }).slice(2)) as `0x${string}`;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          // Impersonate the owner: onlyOwner setters revert for strangers.
          await scanClient.call({ account: ownerAddr, to: address, data });
          return "found";
        } catch (e) {
          // A revert is deterministic contract behavior (no such setter, or
          // it rejected the probe value); anything else is transport/RPC
          // noise — retried once, then reported as unknown.
          if (String(e).toLowerCase().includes("revert")) return "absent";
        }
      }
      return "unknown";
    }

    let foundSig: string | null = null;
    let unknownCount = 0;
    // Same permissive-fallback control as the other owner probes: a contract
    // that answers calls to functions that don't exist can't be probed by
    // "the call didn't revert" — degrade to unknown instead of a false warn.
    const fallbackBlind = await hasPermissiveFallback(address, ownerAddr);
    for (const { sig, arg } of LIMIT_SETTER_SIGS) {
      if (fallbackBlind) break;
      const r = await probeLimitSetter(sig, arg);
      if (r === "found") {
        foundSig = sig;
        break;
      }
      if (r === "unknown") unknownCount++;
    }
    if (fallbackBlind) {
      checks.push(
        check(
          "owner-limit-setter",
          "Owner sell-limit power",
          "unknown",
          "This contract answers calls to functions that don't exist, so the sell-limit probe can't tell whether real limit setters are hiding in there — whether the owner can throttle sells with max-transaction or max-wallet limits is unknown. Treat as risky.",
        ),
      );
    } else if (foundSig) {
      checks.push(
        check(
          "owner-limit-setter",
          "Owner sell-limit power",
          "warn",
          `A sell-limit setter (${foundSig}) answered the owner's own call — the owner can change the maximum transaction or wallet size, choking sells to a trickle while keeping their own exit open. The transfer tax can be honest while the exit is gated: this is the classic soft-rug throttle.`,
        ),
      );
    } else if (unknownCount === LIMIT_SETTER_SIGS.length) {
      checks.push(
        check(
          "owner-limit-setter",
          "Owner sell-limit power",
          "unknown",
          "The sell-limit probe couldn't get a clean answer from the RPC — whether the owner can throttle sells with max-transaction or max-wallet limits is unknown. Treat as risky.",
        ),
      );
    } else {
      checks.push(
        check(
          "owner-limit-setter",
          "Owner sell-limit power",
          "pass",
          `Probed ${LIMIT_SETTER_SIGS.length} common max-transaction / max-wallet setter shapes impersonating the owner — none answered, so the owner can't throttle sells through the usual functions. Custom setters could hide under other names, or reject the probe's test value.`,
        ),
      );
    }
  }

  // 5j. Owner trading-cooldown power: can the live owner throttle trade
  // cadence with a transfer cooldown? The slow-rug tempo trick — an armed
  // cooldown between sells turns an exit into a trickle, and a live owner
  // who can flip or retune the dial controls the tempo. Probes the common
  // cooldown-setter shapes with a read-only eth_call impersonating the live
  // owner (eth_call never commits state). Fail-safe probe args in the
  // impossible case a call executed: 0 for seconds-style shapes (could only
  // REMOVE a cooldown), false for the bool switch (could only DISABLE one).
  // A clean return means the setter exists and the owner's auth passed.
  // Revert = absent (or a setter that rejected the probe value — named in
  // the pass caveat); RPC noise = unknown. The plain getters read below
  // ("cooldown exists") let the copy honestly distinguish an armed cooldown
  // from the owner's power to change it. Only meaningful with a LIVE owner
  // (renounced/absent owners skip — no one left to turn the dial).
  // Selectors via keccak256, never hand-typed.
  if (liveOwner) {
    const ownerAddr = owner as `0x${string}`;
    const COOLDOWN_SETTER_SIGS: { sig: string; argHex: string }[] = [
      { sig: "setTradingCooldown(uint256)", argHex: toHex(0n, { size: 32 }).slice(2) },
      { sig: "setCooldown(uint256)", argHex: toHex(0n, { size: 32 }).slice(2) },
      { sig: "setTransferDelay(uint256)", argHex: toHex(0n, { size: 32 }).slice(2) },
      { sig: "setCooldownEnabled(bool)", argHex: "0".repeat(64) },
    ];

    async function probeCooldownSetter(
      sig: string,
      argHex: string,
    ): Promise<"found" | "absent" | "unknown"> {
      const selector = keccak256(stringToHex(sig)).slice(0, 10);
      const data = (selector + argHex) as `0x${string}`;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          // Impersonate the owner: onlyOwner setters revert for strangers.
          await scanClient.call({ account: ownerAddr, to: address, data });
          return "found";
        } catch (e) {
          // A revert is deterministic contract behavior (no such setter, or
          // it rejected the probe value); anything else is transport/RPC
          // noise — retried once, then reported as unknown.
          if (String(e).toLowerCase().includes("revert")) return "absent";
        }
      }
      return "unknown";
    }

    // "Cooldown exists": the common cooldown getters, read plainly (anyone
    // can call them). A nonzero seconds value or a true flag means the
    // contract currently reports an armed cooldown; the setters above say
    // whether the live owner can change it.
    const cdSecs = await read<bigint>(address, scanAbi, "tradingCooldown");
    const delaySecs = await read<bigint>(address, scanAbi, "transferDelay");
    const cdEnabled = await read<boolean>(address, scanAbi, "cooldownEnabled");
    const armedNote =
      typeof cdSecs === "bigint" && cdSecs > 0n
        ? ` A ${cdSecs.toString()}-second cooldown is currently armed (tradingCooldown() reports ${cdSecs.toString()} seconds).`
        : typeof delaySecs === "bigint" && delaySecs > 0n
          ? ` A ${delaySecs.toString()}-second cooldown is currently armed (transferDelay() reports ${delaySecs.toString()} seconds).`
          : cdEnabled === true
            ? " A cooldown flag is currently enabled (cooldownEnabled() reports true)."
            : "";

    let foundSig: string | null = null;
    let unknownCount = 0;
    // Same permissive-fallback control as the other owner probes: a contract
    // that answers calls to functions that don't exist can't be probed by
    // "the call didn't revert" — degrade to unknown instead of a false warn.
    const fallbackBlind = await hasPermissiveFallback(address, ownerAddr);
    for (const { sig, argHex } of COOLDOWN_SETTER_SIGS) {
      if (fallbackBlind) break;
      const r = await probeCooldownSetter(sig, argHex);
      if (r === "found") {
        foundSig = sig;
        break;
      }
      if (r === "unknown") unknownCount++;
    }
    if (fallbackBlind) {
      checks.push(
        check(
          "owner-cooldown-setter",
          "Owner trading-cooldown power",
          "unknown",
          `This contract answers calls to functions that don't exist, so the cooldown probe can't tell whether real cooldown setters are hiding in there — whether the owner can throttle trade cadence is unknown. Treat as risky.${armedNote ? ` Note:${armedNote}` : ""}`,
        ),
      );
    } else if (foundSig) {
      checks.push(
        check(
          "owner-cooldown-setter",
          "Owner trading-cooldown power",
          "warn",
          `A cooldown setter (${foundSig}) answered the owner's own call — the owner can throttle how often wallets can trade, turning an exit into a trickle while keeping the power to loosen it for themselves. The slow-rug tempo trick: buys look free while sells are gated by the clock.${armedNote}`,
        ),
      );
    } else if (unknownCount === COOLDOWN_SETTER_SIGS.length) {
      checks.push(
        check(
          "owner-cooldown-setter",
          "Owner trading-cooldown power",
          "unknown",
          `The cooldown probe couldn't get a clean answer from the RPC — whether the owner can throttle trade cadence is unknown. Treat as risky.${armedNote ? ` Note:${armedNote}` : ""}`,
        ),
      );
    } else {
      checks.push(
        check(
          "owner-cooldown-setter",
          "Owner trading-cooldown power",
          "pass",
          `Probed ${COOLDOWN_SETTER_SIGS.length} common cooldown-setter shapes impersonating the owner — none answered, so the owner can't retune trade cadence through the usual functions. Custom setters could hide under other names, or reject the probe's fail-safe test value.${armedNote ? ` Note:${armedNote}` : ""}`,
        ),
      );
    }
  }

  // 5k. Owner tx-limit exemption power: can the live owner lift the
  // buy/sell limits for chosen wallets? The insider-lane vector — the 5i
  // probe covers the owner changing the limits, but in Safemoon-fork tokens
  // the limits often apply to everyone EXCEPT wallets the owner exempts:
  // the owner throttles everyone's exits to a trickle, then exempts their
  // own sell wallets and dumps through the open lane. Probes the common
  // exemption-setter shapes with a read-only eth_call impersonating the
  // live owner (eth_call never commits state). Fail-safe probe arg in the
  // impossible case a call executed: the dead address — exempting it could
  // only "free" an address that can never move tokens. isTxLimitExempt may
  // be a plain mapping getter rather than a setter — either way a clean
  // return proves the exemption machinery EXISTS (same design honesty as
  // the 5h blacklist probe). Revert = absent (or a setter that rejected
  // the probe value — named in the pass caveat); RPC noise = unknown.
  // Only meaningful with a LIVE owner (renounced/absent owners skip — no
  // one left to open the lane). Selectors via keccak256, never hand-typed.
  if (liveOwner) {
    const ownerAddr = owner as `0x${string}`;
    const EXEMPTION_SIGS: { sig: string; argHex: string }[] = [
      {
        sig: "setIsTxLimitExempt(address,bool)",
        argHex: DEAD.slice(2).padStart(64, "0") + "1".padStart(64, "0"),
      },
      {
        sig: "setTxLimitExempt(address,bool)",
        argHex: DEAD.slice(2).padStart(64, "0") + "1".padStart(64, "0"),
      },
      { sig: "excludeFromTxLimit(address)", argHex: DEAD.slice(2).padStart(64, "0") },
      { sig: "isTxLimitExempt(address)", argHex: DEAD.slice(2).padStart(64, "0") },
    ];

    async function probeExemptionSetter(
      sig: string,
      argHex: string,
    ): Promise<"found" | "absent" | "unknown"> {
      const selector = keccak256(stringToHex(sig)).slice(0, 10);
      const data = (selector + argHex) as `0x${string}`;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          // Impersonate the owner: onlyOwner setters revert for strangers.
          await scanClient.call({ account: ownerAddr, to: address, data });
          return "found";
        } catch (e) {
          // A revert is deterministic contract behavior (no such setter,
          // or it rejected the probe value); anything else is
          // transport/RPC noise — retried once, then reported as unknown.
          if (String(e).toLowerCase().includes("revert")) return "absent";
        }
      }
      return "unknown";
    }

    let foundSig: string | null = null;
    let unknownCount = 0;
    // Same permissive-fallback control as the other owner probes: a contract
    // that answers calls to functions that don't exist can't be probed by
    // "the call didn't revert" — degrade to unknown instead of a false warn.
    const fallbackBlind = await hasPermissiveFallback(address, ownerAddr);
    for (const { sig, argHex } of EXEMPTION_SIGS) {
      if (fallbackBlind) break;
      const r = await probeExemptionSetter(sig, argHex);
      if (r === "found") {
        foundSig = sig;
        break;
      }
      if (r === "unknown") unknownCount++;
    }
    if (fallbackBlind) {
      checks.push(
        check(
          "owner-txlimit-exemption",
          "Owner limit-exemption power",
          "unknown",
          "This contract answers calls to functions that don't exist, so the exemption probe can't tell whether real limit-exemption setters are hiding in there — whether the owner can exempt wallets from the buy/sell limits is unknown. Treat as risky.",
        ),
      );
    } else if (foundSig) {
      checks.push(
        check(
          "owner-txlimit-exemption",
          "Owner limit-exemption power",
          "warn",
          `An exemption function (${foundSig}) answered the owner's own call — the owner can lift the buy/sell limits for chosen wallets while everyone else stays gated. That's the insider lane: the throttle applies to you, not to them.`,
        ),
      );
    } else if (unknownCount === EXEMPTION_SIGS.length) {
      checks.push(
        check(
          "owner-txlimit-exemption",
          "Owner limit-exemption power",
          "unknown",
          "The exemption probe couldn't get a clean answer from the RPC — whether the owner can exempt wallets from the buy/sell limits is unknown. Treat as risky.",
        ),
      );
    } else {
      checks.push(
        check(
          "owner-txlimit-exemption",
          "Owner limit-exemption power",
          "pass",
          `Probed ${EXEMPTION_SIGS.length} common tx-limit-exemption shapes impersonating the owner — none answered, so the owner can't open insider lanes through the usual functions. Custom setters could hide under other names, or reject the probe's fail-safe test value.`,
        ),
      );
    }
  }

  // 5l. Owner trading-toggle power: can the live owner flip a fork-style
  // trading switch? The pre-launch trap and the re-halt-at-will rug — an
  // owner-controlled tradingActive/tradingEnabled/tradingStatus toggle is
  // the flagship Safemoon-fork honeypot shape this probe family didn't name:
  // the #6 "Pause switch" check reads ONLY OpenZeppelin's standardized
  // paused(), so a fork-style trading switch is completely invisible to it.
  // Probes the common (bool) toggle-setter shapes with a read-only eth_call
  // impersonating the live owner (eth_call never commits state). Fail-safe
  // probe arg in the impossible case a call executed: true (ENABLE —
  // enabling trading can only unfreeze, never the harmful direction; this is
  // why disableTrading() is deliberately NOT probed — it is not fail-safe —
  // and swapEnabled() is not probed either: that's the auto-liquidity
  // internal sell switch, not a user-trading halt, and warning on it would
  // false-positive on healthy fork mechanics). A clean return means the
  // setter exists and the owner's auth passed. Revert = absent (or a setter
  // that rejected the probe value — named in the pass caveat); RPC noise =
  // unknown. The plain getters below ("trading halted right now?") let the
  // report corroborate the setter hit — the freeze verdict is
  // CORROBORATION-GATED: trading toggles have no standardized semantics
  // (unlike OZ paused()), so a lone halted flag is never enough for fail —
  // name collisions across contract types are real (vault bots, game
  // contracts, presale flags), and a permissive-fallback contract would
  // answer the getters with zero-ish garbage. A halted flag contradicted by
  // another toggle getter reading enabled degrades to warn (contested
  // evidence isn't proof — the branch below, not fail). Getters are decoded as bool
  // ONLY: some forks implement tradingStatus as a uint8 state machine — a
  // bool decode of a uint return throws, read() swallows it, and the getter
  // is silently skipped. Benign (no-signal, never evidence either way).
  // tradingOpen (true = open) and tradingPaused (true = paused) are
  // deliberately NOT read: inverted semantics would invert the verdict — a
  // future run must not "helpfully" add them. Only meaningful with a LIVE
  // owner (renounced/absent owners skip — no one left to flip the switch).
  // Selectors via keccak256, never hand-typed.
  if (liveOwner) {
    const ownerAddr = owner as `0x${string}`;
    const TOGGLE_SETTER_SIGS: { sig: string; argHex: string }[] = [
      { sig: "setTradingActive(bool)", argHex: "1".padStart(64, "0") },
      { sig: "setTradingEnabled(bool)", argHex: "1".padStart(64, "0") },
      { sig: "setTradingStatus(bool)", argHex: "1".padStart(64, "0") },
      { sig: "setTrading(bool)", argHex: "1".padStart(64, "0") },
    ];

    async function probeToggleSetter(
      sig: string,
      argHex: string,
    ): Promise<"found" | "absent" | "unknown"> {
      const selector = keccak256(stringToHex(sig)).slice(0, 10);
      const data = (selector + argHex) as `0x${string}`;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          // Impersonate the owner: onlyOwner setters revert for strangers.
          await scanClient.call({ account: ownerAddr, to: address, data });
          return "found";
        } catch (e) {
          // A revert is deterministic contract behavior (no such setter,
          // or it rejected the probe value); anything else is
          // transport/RPC noise — retried once, then reported as unknown.
          if (String(e).toLowerCase().includes("revert")) return "absent";
        }
      }
      return "unknown";
    }

    // The permissive-fallback control runs FIRST here (unlike the other
    // owner probes): 5l's getter reads are gated on it, because a fallback
    // contract answering garbage-selector calls would also return zero-ish
    // garbage for the getters — reading them there could fabricate a
    // "halted" signal. When the control trips, the getters are suppressed
    // entirely: the verdict is unknown with NO getter note appended (the 5j
    // wart of appending the note to the unknown branch is not copied).
    const fallbackBlind = await hasPermissiveFallback(address, ownerAddr);

    // "Trading halted right now?": the common toggle getters, read plainly
    // (anyone can call them) — but ONLY when the control above passed.
    let haltEvidence: string | null = null;
    let enabledEvidence: string | null = null;
    if (!fallbackBlind) {
      for (const g of ["tradingActive", "tradingEnabled", "tradingStatus"] as const) {
        const v = await read<boolean>(address, scanAbi, g);
        if (v === false && haltEvidence === null) haltEvidence = `${g}() reports false`;
        if (v === true && enabledEvidence === null) enabledEvidence = `${g}() reports true`;
      }
    }

    let foundSig: string | null = null;
    let unknownCount = 0;
    for (const { sig, argHex } of TOGGLE_SETTER_SIGS) {
      if (fallbackBlind) break;
      const r = await probeToggleSetter(sig, argHex);
      if (r === "found") {
        foundSig = sig;
        break;
      }
      if (r === "unknown") unknownCount++;
    }
    if (fallbackBlind) {
      checks.push(
        check(
          "owner-trading-toggle",
          "Owner trading-toggle power",
          "unknown",
          "This contract answers calls to functions that don't exist, so the trading-toggle probe can't tell whether real toggle setters are hiding in there — whether the owner can flip a trading switch is unknown. Treat as risky.",
        ),
      );
    } else if (foundSig && haltEvidence && !enabledEvidence) {
      // Fail is corroboration-gated: the freeze is proven ONLY when the
      // "armed" evidence is uncontested. A halted flag CONTRADICTED by
      // another toggle getter reading enabled degrades to warn below —
      // contested evidence isn't proof, and a fail on contested evidence
      // would be the trust-eroding false FAIL the gating exists to prevent.
      checks.push(
        check(
          "owner-trading-toggle",
          "Owner trading-toggle power",
          "fail",
          `A trading-toggle setter (${foundSig}) answered the owner's own call AND ${haltEvidence} — the switch exists AND it is currently off: trading is frozen right now and only the owner can flip it back. This is the trading-toggle halt — the flagship owner-power rug shape: the owner freezes everyone's exits while theirs stays open.`,
        ),
      );
    } else if (foundSig) {
      // Contested flags (one toggle getter reads off, another reads on):
      // the setter hit still earns the warn — the freeze machinery exists
      // and answers the owner — but the disagreement is named, not hidden,
      // and the deep scan is the live tiebreaker.
      const contested =
        haltEvidence && enabledEvidence
          ? ` The toggle flags disagree — ${haltEvidence}, but ${enabledEvidence} — so the "halted" signal is contested; treated as a warning, not a frozen verdict.`
          : "";
      checks.push(
        check(
          "owner-trading-toggle",
          "Owner trading-toggle power",
          "warn",
          `A trading-toggle setter (${foundSig}) answered the owner's own call — the owner can freeze all trading with one call; your exit only works while they allow it.${contested || (enabledEvidence ? ` ${enabledEvidence} — open today says nothing about tomorrow.` : "")} The deep scan's simulated buy+sell shows whether trading is actually live right now.`,
        ),
      );
    } else if (haltEvidence) {
      checks.push(
        check(
          "owner-trading-toggle",
          "Owner trading-toggle power",
          "unknown",
          `A trading flag reads as halted (${haltEvidence}), but no owner toggle setter answered under the common names — this could be a custom toggle, or an unrelated flag (name collisions are real on fork contracts). Without the setter answering, calling it frozen would be dishonest — whether the owner can halt trading is unknown. Treat as risky.`,
        ),
      );
    } else if (unknownCount === TOGGLE_SETTER_SIGS.length) {
      checks.push(
        check(
          "owner-trading-toggle",
          "Owner trading-toggle power",
          "unknown",
          "The trading-toggle probe couldn't get a clean answer from the RPC — whether the owner can flip a trading switch is unknown. Treat as risky.",
        ),
      );
    } else {
      checks.push(
        check(
          "owner-trading-toggle",
          "Owner trading-toggle power",
          "pass",
          `Probed ${TOGGLE_SETTER_SIGS.length} common trading-toggle setter shapes impersonating the owner — none answered, so the owner can't flip a trading switch through the usual functions.${enabledEvidence ? ` ${enabledEvidence}.` : ""} Custom setters could hide under other names, or reject the probe's fail-safe test value.`,
        ),
      );
    }
  }

  // 5m. Owner fee-wallet redirect power: can the live owner redirect where
  // the tax money goes? A live owner who can repoint the fee/marketing
  // wallet turns the project's stated use-of-funds into fiction — holders
  // believe the tax funds marketing or buybacks while the dev quietly
  // points the wallet at themselves. The adjacent slow-rug vector to the
  // 5e/5f exemption probes — same family, new question. Probes the common
  // wallet-setter shapes with a read-only eth_call impersonating the live
  // owner (eth_call never commits state). Fail-safe probe arg in the
  // impossible case a call executed: the dead address — redirecting tax
  // proceeds to burn can never enrich an attacker (and it's non-zero, so
  // require(addr != address(0)) zero-checks pass — the 5k precedent). A
  // clean return means the setter exists and the owner's auth passed.
  // Revert = absent (or a setter that rejected the probe value — named in
  // the pass caveat); RPC noise = unknown. The wallet getters below let
  // the report name the CURRENT recipient — never asserting it "belongs
  // to the owner" or that the tax provably flows there (chain state shows
  // the named recipient, not proven flow): the report stays at capability
  // level — "the owner can redirect where the fee wallet points" — never
  // accusation (a configurable wallet with a multisig owner is normal;
  // the scan can't see timelocks). The getters read plainly but ONLY when
  // the permissive-fallback control passed (mirror 5l): a fallback
  // answering garbage-selector calls would return zero-ish garbage for
  // the getters too, and naming a garbage-state recipient would be
  // inventing a data point — so under fallbackBlind the verdict is
  // unknown with NO wallet named. A clean zero-address getter read is
  // reported honestly ("no wallet currently set — the fee leg may be
  // disabled, burned, or pointed elsewhere"), never silently omitted. Only
  // meaningful with a LIVE owner (renounced/absent owners skip — no one
  // left to redirect anything). Selectors via keccak256, never hand-typed.
  // setTeamWallet/setFeeReceiver dropped as rarer shapes; two-arg
  // share-split setter variants and setMarketingFee-class amount setters
  // are deliberately out of scope (5c's job — the REDIRECT is the
  // uncovered vector).
  if (liveOwner) {
    const ownerAddr = owner as `0x${string}`;
    const WALLET_SETTER_SIGS: { sig: string; label: string }[] = [
      { sig: "setMarketingWallet(address)", label: "marketing" },
      { sig: "setMarketingWalletAddress(address)", label: "marketing" },
      { sig: "updateMarketingWallet(address)", label: "marketing" },
      { sig: "setFeeWallet(address)", label: "fee" },
      { sig: "setDevWallet(address)", label: "dev" },
    ];
    // Fail-safe 32-byte probe arg: the dead address. In the impossible
    // case a call executed, tax proceeds would redirect to burn, never to
    // a thief; non-zero so zero-checks pass.
    const DEAD_ARG = DEAD.slice(2).padStart(64, "0");

    async function probeWalletSetter(sig: string): Promise<"found" | "absent" | "unknown"> {
      const selector = keccak256(stringToHex(sig)).slice(0, 10);
      const data = (selector + DEAD_ARG) as `0x${string}`;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          // Impersonate the owner: onlyOwner setters revert for strangers.
          await scanClient.call({ account: ownerAddr, to: address, data });
          return "found";
        } catch (e) {
          // A revert is deterministic contract behavior (no such setter,
          // or it rejected the probe value); anything else is
          // transport/RPC noise — retried once, then reported as unknown.
          if (String(e).toLowerCase().includes("revert")) return "absent";
        }
      }
      return "unknown";
    }

    // The permissive-fallback control runs FIRST here (mirror 5l): 5m's
    // getter reads are gated on it.
    const fallbackBlind = await hasPermissiveFallback(address, ownerAddr);

    // "Where does the contract say the tax money goes?": the common
    // wallet getters, read plainly (anyone can call them) — but ONLY when
    // the control above passed.
    let namedWallet: string | null = null;
    let clearedWallet: string | null = null;
    if (!fallbackBlind) {
      for (const { name, label } of [
        { name: "marketingWallet", label: "marketing" },
        { name: "feeWallet", label: "fee" },
        { name: "devWallet", label: "dev" },
      ] as const) {
        const v = await read<string>(address, scanAbi, name);
        if (typeof v !== "string") continue;
        if (v.toLowerCase() === ZERO) {
          if (clearedWallet === null) clearedWallet = label;
        } else if (namedWallet === null) {
          namedWallet = `${label} wallet ${v.slice(0, 6)}…${v.slice(-4)}`;
        }
      }
    }

    let foundSig: { sig: string; label: string } | null = null;
    let unknownCount = 0;
    for (const s of WALLET_SETTER_SIGS) {
      if (fallbackBlind) break;
      const r = await probeWalletSetter(s.sig);
      if (r === "found") {
        foundSig = s;
        break;
      }
      if (r === "unknown") unknownCount++;
    }
    if (fallbackBlind) {
      checks.push(
        check(
          "owner-fee-wallet",
          "Owner fee-wallet redirect power",
          "unknown",
          "This contract answers calls to functions that don't exist, so the fee-wallet probe can't tell whether a real redirect setter is hiding in there — whether the owner can repoint the fee wallet is unknown. Treat as risky.",
        ),
      );
    } else if (foundSig) {
      // Warn at capability level, never accusation: a configurable fee
      // wallet with a multisig owner is normal; the scan can't see
      // timelocks, so the report names the power and the current
      // recipient, not abuse.
      const walletNote = namedWallet
        ? ` Today the contract names ${namedWallet} — the named recipient, not a proven flow.`
        : "";
      const clearedNote = clearedWallet
        ? ` The contract names no ${clearedWallet} wallet currently set (zero address) — that fee leg may be disabled, burned, or pointed elsewhere.`
        : "";
      checks.push(
        check(
          "owner-fee-wallet",
          "Owner fee-wallet redirect power",
          "warn",
          `A fee-wallet setter (${foundSig.sig}) answered the owner's own call — the owner can redirect where the ${foundSig.label}-wallet tax proceeds point.${walletNote}${clearedNote} Where the tax money goes isn't locked; it can move with one call.`,
        ),
      );
    } else if (unknownCount === WALLET_SETTER_SIGS.length) {
      checks.push(
        check(
          "owner-fee-wallet",
          "Owner fee-wallet redirect power",
          "unknown",
          "The fee-wallet probe couldn't get a clean answer from the RPC — whether the owner can repoint the fee wallet is unknown. Treat as risky.",
        ),
      );
    } else {
      // Pass carries the family caveats: custom names, and a real setter
      // that rejects the dead-address probe value would be silently
      // missed (the 5l wording).
      checks.push(
        check(
          "owner-fee-wallet",
          "Owner fee-wallet redirect power",
          "pass",
          `Probed ${WALLET_SETTER_SIGS.length} common fee/marketing/dev wallet-setter shapes impersonating the owner — none answered, so the owner can't repoint the fee wallet through the usual functions. Custom setters could hide under other names, or reject the probe's fail-safe test value.`,
        ),
      );
    }
  }

  // 5n. Owner rescue/withdraw power: can the live owner pull accumulated
  // VALUE out of the contract? A rescue/withdraw function
  // (withdrawStuckETH, sweepToken, transferForeignToken-class) lets a live
  // owner drain the tax pool the holders funded — the slow-rug "tax jar"
  // drain. The scanner's job is arbitrary pasted addresses; DUMB's own
  // buckets are entombed anyway (engine dead, owner renounced). Probes the
  // 6 documented Safemoon-fork rescue shapes with a read-only eth_call
  // impersonating the live owner (eth_call never commits state). Fail-safe
  // probe args for the impossible case a call executed: no-arg shapes take
  // no arg (nothing to choose); (address) shapes take the dead address —
  // in the impossible executed case value would go to burn, never a thief,
  // and the contract holds no dead-token balance for it to read as a token
  // address; (address,uint256) shapes take (dead address, 1 wei) — a 1 wei
  // amount can never be mistaken for a real drain by a future reader. A
  // clean return means the rescue function exists and the owner's auth
  // passed. Revert = absent (or a rescue that rejected the probe value —
  // named in the pass caveat); RPC noise = unknown. The dead address has
  // no code, so a rescue impl's inner balanceOf/transfer calls against it
  // hit an EOA and zero-pad rather than revert (solc 0.8 external-call
  // epilogue: RETURNDATACOPY + MLOAD from zero-filled memory, no
  // minimum-size check — verified by disassembly) — balance-sweep and
  // unchecked fixed-amount impls report "found" honestly; only
  // require-checked-return impls revert into the pass caveat, the honest
  // bucket for them. Warn at capability level, never accusation (the 15:23
  // R5 precedent): sweeping airdropped dust is legitimate contract
  // hygiene, and the scan never reads the contract's balance — so the
  // report names the power and the hit shape, never a rescued balance.
  // Only meaningful with a LIVE owner (renounced/absent owners skip — no
  // one left to pull anything). Selectors via keccak256, never hand-typed.
  // Deliberately out of scope: two-arg (token,to,amount) variants (land in
  // the pass caveat like 5m's share-split rejection), real-token probe
  // amounts, and a balance getter pair (balance ≠ drainability — a
  // contract can hold value with no rescue function, and a rescue
  // function can exist on an empty one).
  if (liveOwner) {
    const ownerAddr = owner as `0x${string}`;
    // arity doubles as the warn's PLS-vs-tokens tailoring: no-arg rescues
    // drain native PLS; address-taking rescues sweep tokens.
    const RESCUE_SIGS: { sig: string; arity: "none" | "address" | "addressUint256" }[] = [
      { sig: "withdrawStuckETH()", arity: "none" },
      { sig: "withdrawStuckETH(address)", arity: "address" },
      { sig: "withdrawStuckTokens(address)", arity: "address" },
      { sig: "rescueTokens(address,uint256)", arity: "addressUint256" },
      { sig: "transferForeignToken(address,uint256)", arity: "addressUint256" },
      { sig: "recoverERC20(address,uint256)", arity: "addressUint256" },
    ];
    // Fail-safe probe args: the dead address, and 1 wei.
    const DEAD_ARG = DEAD.slice(2).padStart(64, "0");
    const ONE_WEI = 1n.toString(16).padStart(64, "0");

    async function probeRescue(s: {
      sig: string;
      arity: "none" | "address" | "addressUint256";
    }): Promise<"found" | "absent" | "unknown"> {
      const selector = keccak256(stringToHex(s.sig)).slice(0, 10);
      const data = (
        s.arity === "none"
          ? selector
          : s.arity === "address"
            ? selector + DEAD_ARG
            : selector + DEAD_ARG + ONE_WEI
      ) as `0x${string}`;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          // Impersonate the owner: onlyOwner rescues revert for strangers.
          await scanClient.call({ account: ownerAddr, to: address, data });
          return "found";
        } catch (e) {
          // A revert is deterministic contract behavior (no such rescue,
          // or it rejected the probe value); anything else is
          // transport/RPC noise — retried once, then reported as unknown.
          if (String(e).toLowerCase().includes("revert")) return "absent";
        }
      }
      return "unknown";
    }

    // The permissive-fallback control runs FIRST here (family pattern):
    // a contract answering garbage-selector calls would answer these too.
    const fallbackBlind = await hasPermissiveFallback(address, ownerAddr);

    let foundSig: { sig: string; arity: "none" | "address" | "addressUint256" } | null = null;
    let unknownCount = 0;
    for (const s of RESCUE_SIGS) {
      if (fallbackBlind) break;
      const r = await probeRescue(s);
      if (r === "found") {
        foundSig = s;
        break;
      }
      if (r === "unknown") unknownCount++;
    }
    if (fallbackBlind) {
      checks.push(
        check(
          "owner-rescue-withdraw",
          "Owner rescue/withdraw power",
          "unknown",
          "This contract answers calls to functions that don't exist, so the rescue/withdraw probe can't tell whether a real rescue function is hiding in there — whether the owner can pull value out of the contract is unknown. Treat as risky.",
        ),
      );
    } else if (foundSig) {
      // Warn at capability level, never accusation: sweeping airdropped
      // dust is legitimate contract hygiene, and the scan never reads the
      // contract's balance — so the report names the power and the hit
      // shape, never a rescued balance or an accusation of draining.
      const kind = foundSig.arity === "none" ? "PLS" : "tokens";
      checks.push(
        check(
          "owner-rescue-withdraw",
          "Owner rescue/withdraw power",
          "warn",
          `A rescue function (${foundSig.sig}) answered the owner's own call — the owner can pull accumulated ${kind} out of the contract. Rescue functions are sometimes used for legitimate hygiene (sweeping airdropped dust), but the same machinery can drain fee value the contract has collected — power, not proven abuse.`,
        ),
      );
    } else if (unknownCount === RESCUE_SIGS.length) {
      checks.push(
        check(
          "owner-rescue-withdraw",
          "Owner rescue/withdraw power",
          "unknown",
          "The rescue/withdraw probe couldn't get a clean answer from the RPC — whether the owner can pull value out of the contract is unknown. Treat as risky.",
        ),
      );
    } else {
      // Pass carries the family caveat verbatim, adapted: custom names,
      // and a real rescue that rejects the fail-safe probe value would be
      // silently missed.
      checks.push(
        check(
          "owner-rescue-withdraw",
          "Owner rescue/withdraw power",
          "pass",
          `Probed ${RESCUE_SIGS.length} common rescue/withdraw shapes impersonating the owner — none answered, so the owner can't pull value out of the contract through the usual rescue functions. Custom rescue functions could hide under other names, or reject the probe's fail-safe test value.`,
        ),
      );
    }
  }

  // 5o. Measured buy/sell tax: what recent trades ACTUALLY paid, vs the claim.
  // The transfer-tax check (#4) reports only the contract's claim — the
  // fees()/taxFee() getters. Getters can't reveal every tax shape, and the
  // classic soft-rug (cheap buys to attract, expensive sells to trap) is
  // invisible to claims. This probe measures behavior from Swap + Transfer
  // logs on the token/WPLS pair over a 100k-block window (~2.3 days).
  //
  // Method (read-only, no impersonation, no new data sources):
  // - Buy: Swap.amountOut on the token side is GROSS — the pair's balance
  //   drops by the full amount before the token's tax is taken. The matching
  //   Transfer(pair→recipient) in the same tx is NET (the token emits the
  //   post-tax amount). buyTax = 1 − net/gross. Exact — no blind spot.
  // - Sell: Swap.amountIn on the token side is NET — the pair records what
  //   arrived, post-tax. Gross is rebuilt from the funder's own token outflows
  //   in the same tx: the funding Transfer(user→pair) plus the fee legs of
  //   that taxed transfer. Verified emission order on live txs: the fork
  //   emits the fee legs FIRST and the net transfer LAST, so the legs sit
  //   below the funding transfer (to the token contract and the zero
  //   address — the 1% burn leg lands on ZERO, not the dead address, so the
  //   {pair, token, dead, zero} recipient set is load-bearing). Reflections
  //   emit no Transfer event, so the rebuilt gross misses the reflection share
  //   and sells read ~0.7–0.9pp LOW — the verdict bands below are calibrated
  //   for ~1pp of eventless-leg blind spot (fail only past claimed+10pp keeps
  //   6pp+ of headroom).
  // - Attribution is logIndex-scoped: the funding transfer is the one with the
  //   greatest logIndex below the Swap's in the same tx. One tx can carry
  //   several swaps (aggregators, multihop) — first-match attribution misfires
  //   there (measured 4.55% on a true-6% taxed transfer). Buys routed through
  //   an aggregator forward the tokens AFTER the Swap, so the buy side also
  //   accepts the closest Transfer(from==Swap.to) after the Swap. Anything
  //   ambiguous is skipped, never guessed.
  // - Per-side median; n<5 → that side unmeasured (thin history is not proof
  //   of fairness). Wide spread (IQR > 3pp) → warn instead of reporting a
  //   median: inconsistent taxes mean exempt wallets or a mid-window change.
  // - Topic0s come from viem's parseAbiItem over the event signatures —
  //   never hand-typed (hand-typed hashes have failed silently here before).
  if (address.toLowerCase() !== WPLS.toLowerCase()) {
    const pair5o = await read<string>(PULSEX_V2_FACTORY, factoryAbi, "getPair", [address, WPLS]);
    if (typeof pair5o !== "string" || pair5o.toLowerCase() === ZERO) {
      checks.push(
        check(
          "measured-tax",
          "Buy/sell tax, measured",
          "unknown",
          "No token/WPLS pair on PulseX — there's no trade history to measure the real tax against.",
        ),
      );
    } else {
      const token0 = await read<string>(
        pair5o as `0x${string}`,
        parseAbi(["function token0() view returns (address)"]),
        "token0",
      );
      const latest5o = await tryRead(() => scanClient.getBlockNumber());
      if (typeof token0 !== "string" || latest5o === null) {
        checks.push(
          check(
            "measured-tax",
            "Buy/sell tax, measured",
            "unknown",
            "The trade history didn't answer — the RPC is flaky right now.",
          ),
        );
      } else {
        // A crash inside measurement must never kill the whole scan:
        // anything that throws renders an "unknown" measured-tax check.
        try {
          const MEAS_WINDOW = 100_000n;
          const MEAS_CHUNK = 5_000n;
          const from5o = latest5o > MEAS_WINDOW ? latest5o - MEAS_WINDOW : 0n;
          const swapEvt = parseAbiItem(
            "event Swap(address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to)",
          );
          const xferEvt = parseAbiItem(
            "event Transfer(address indexed from, address indexed to, uint256 value)",
          );
          interface SwapRow {
            tx: string;
            logIndex: number;
            a0In: bigint;
            a1In: bigint;
            a0Out: bigint;
            a1Out: bigint;
            to: string;
          }
          interface XferRow {
            tx: string;
            logIndex: number;
            from: string;
            to: string;
            value: bigint;
          }
          const swapRows: SwapRow[] = [];
          const xferRows: XferRow[] = [];
          let logsOk = true;
          // Sequential chunks — the public RPC drops big parallel scans.
          for (let from = from5o; from <= latest5o && logsOk; from += MEAS_CHUNK) {
            const to = from + MEAS_CHUNK - 1n > latest5o ? latest5o : from + MEAS_CHUNK - 1n;
            const swaps = await tryRead(() =>
              scanClient.getLogs({
                address: pair5o as `0x${string}`,
                event: swapEvt,
                fromBlock: from,
                toBlock: to,
              }),
            );
            if (swaps === null) {
              logsOk = false;
              break;
            }
            for (const l of swaps) {
              if (l.logIndex === null || l.transactionHash === null) continue;
              const a = l.args as unknown as {
                amount0In: bigint;
                amount1In: bigint;
                amount0Out: bigint;
                amount1Out: bigint;
                to: string;
              };
              swapRows.push({
                tx: l.transactionHash,
                logIndex: Number(l.logIndex),
                a0In: a.amount0In,
                a1In: a.amount1In,
                a0Out: a.amount0Out,
                a1Out: a.amount1Out,
                to: a.to,
              });
            }
            const xfers = await tryRead(() =>
              scanClient.getLogs({ address, event: xferEvt, fromBlock: from, toBlock: to }),
            );
            if (xfers === null) {
              logsOk = false;
              break;
            }
            for (const l of xfers) {
              if (l.logIndex === null || l.transactionHash === null) continue;
              const a = l.args as unknown as { from: string; to: string; value: bigint };
              xferRows.push({
                tx: l.transactionHash,
                logIndex: Number(l.logIndex),
                from: a.from,
                to: a.to,
                value: a.value,
              });
            }
          }
          if (!logsOk) {
            checks.push(
              check(
                "measured-tax",
                "Buy/sell tax, measured",
                "unknown",
                "The trade history didn't answer — the RPC is flaky right now.",
              ),
            );
          } else {
            const tokenIs0 = token0.toLowerCase() === address.toLowerCase();
            const pairLc = (pair5o as string).toLowerCase();
            const addrLc = address.toLowerCase();
            const deadLc = DEAD.toLowerCase();
            const zeroLc = ZERO.toLowerCase();
            const xfersByTx = new Map<string, XferRow[]>();
            for (const x of xferRows) {
              const arr = xfersByTx.get(x.tx);
              if (arr) arr.push(x);
              else xfersByTx.set(x.tx, [x]);
            }
            const taxPct = (net: bigint, gross: bigint): number | null =>
              gross > 0n && net <= gross ? Number(((gross - net) * 10000n) / gross) / 100 : null;
            const buys: number[] = [];
            const sells: number[] = [];
            // A funding transfer is claimed by the first swap that attributes
            // to it; a second swap pointing at the same funding is genuinely
            // ambiguous (batched multi-swap tx) — skipped, never guessed.
            const claimedFunding = new Set<string>();
            for (const s of swapRows) {
              const inTok = tokenIs0 ? s.a0In : s.a1In;
              const outTok = tokenIs0 ? s.a0Out : s.a1Out;
              const txXfers = xfersByTx.get(s.tx) ?? [];
              if (outTok > 0n) {
                // BUY: gross = amountOut on the token side; net = the recipient's receipt.
                const toLc = s.to.toLowerCase();
                const direct = txXfers.filter(
                  (x) =>
                    x.from.toLowerCase() === pairLc &&
                    x.to.toLowerCase() === toLc &&
                    x.logIndex < s.logIndex,
                );
                let net: bigint | null = null;
                const d0 = direct[0];
                if (direct.length === 1 && d0) {
                  net = d0.value;
                } else if (direct.length === 0) {
                  // Aggregator forward: Swap.to is a contract that passes the
                  // tokens on after the Swap — the closest one after it.
                  const fwd = txXfers
                    .filter((x) => x.from.toLowerCase() === toLc && x.logIndex > s.logIndex)
                    .sort((a, b) => a.logIndex - b.logIndex);
                  const f0 = fwd[0];
                  if (f0) net = f0.value;
                }
                // direct.length > 1 → ambiguous, skip (never guess).
                const p = net === null ? null : taxPct(net, outTok);
                if (p !== null) buys.push(p);
              } else if (inTok > 0n) {
                // SELL: net = amountIn on the token side; gross = the funding
                // transfer plus the fee legs of that taxed transfer.
                // Leg emission order (verified against live swap txs): the fork
                // emits the fee legs FIRST and the net Transfer(to==pair) LAST,
                // so the legs sit BELOW the funding transfer. R2 scoping: only
                // the user's transfers after the previous funding boundary in
                // the same tx belong to this funding.
                const funds = txXfers
                  .filter((x) => x.to.toLowerCase() === pairLc && x.logIndex < s.logIndex)
                  .sort((a, b) => b.logIndex - a.logIndex);
                if (funds.length === 0) continue;
                const funding = funds[0];
                if (!funding) continue;
                const fundKey = `${s.tx}:${funding.logIndex}`;
                if (claimedFunding.has(fundKey)) continue; // already attributed — ambiguous
                claimedFunding.add(fundKey);
                // NOTE: no `funding.value < inTok` guard — the pair's recorded
                // amountIn routinely exceeds the funding transfer by a hair,
                // because the pair accrues reflection from the taxed transfer
                // with no Transfer event (the documented blind spot). A broken
                // reconstruction surfaces as a negative tax and is skipped.
                const boundary = funds.length > 1 ? (funds[1]?.logIndex ?? -1) : -1;
                const userLc = funding.from.toLowerCase();
                const legs = txXfers.filter(
                  (x) =>
                    x.from.toLowerCase() === userLc &&
                    x.logIndex > boundary &&
                    x.logIndex < funding.logIndex,
                );
                if (legs.some((x) => x.to.toLowerCase() === pairLc)) continue; // another funding inside — ambiguous
                const allowed = new Set([pairLc, addrLc, deadLc, zeroLc]);
                if (legs.some((x) => !allowed.has(x.to.toLowerCase()))) continue; // unknown recipient — skip
                const legsSum = legs.reduce((acc, x) => acc + x.value, 0n);
                if (legsSum > funding.value) continue; // legs exceeding the net is absurd — skip
                const p = taxPct(inTok, funding.value + legsSum);
                if (p !== null && p >= 0) sells.push(p);
              }
            }
            const summarize = (samples: number[]) => {
              if (samples.length < 5) return null; // thin history is not proof of fairness
              const s = [...samples].sort((a, b) => a - b);
              // Indexed access is guarded: the sampler above guarantees s.length >= 5,
              // the ?? 0 only satisfies the strict index check.
              const at = (i: number): number => s[Math.min(Math.max(i, 0), s.length - 1)] ?? 0;
              const mid = Math.floor(s.length / 2);
              const median = s.length % 2 === 1 ? at(mid) : (at(mid - 1) + at(mid)) / 2;
              return {
                n: s.length,
                median,
                iqr: at(Math.floor((3 * s.length) / 4)) - at(Math.floor(s.length / 4)),
                min: at(0),
                max: at(s.length - 1),
              };
            };
            const buy = summarize(buys);
            const sell = summarize(sells);
            const f1 = (n: number) => n.toFixed(1);
            const claimed = taxBps !== null ? taxBps / 100 : null;
            // Verdict bands. Buys are exact; sells carry ~1pp of eventless-leg
            // (reflection) blind spot, so the sell band is asymmetric.
            const band = (v: number, isBuySide: boolean): ScanStatus => {
              if (claimed === null) return v >= 25 ? "fail" : v >= 10 ? "warn" : "pass";
              const lo = isBuySide ? claimed - 3 : claimed - 4;
              const hi = claimed + 3;
              if (v >= lo && v <= hi) return "pass";
              if (v > claimed + 10) return "fail";
              return "warn";
            };
            let status: ScanStatus;
            let detail: string;
            if ((buy && buy.iqr > 3) || (sell && sell.iqr > 3)) {
              // R3: wide spread means exempt wallets or a mid-window tax
              // change — report the inconsistency, not a median as "the rate".
              status = "warn";
              const parts: string[] = [];
              if (buy && buy.iqr > 3)
                parts.push(
                  `buys measured anywhere from ~${f1(buy.min)}% to ~${f1(buy.max)}% across ${buy.n} swaps`,
                );
              if (sell && sell.iqr > 3)
                parts.push(
                  `sells measured anywhere from ~${f1(sell.min)}% to ~${f1(sell.max)}% across ${sell.n} swaps`,
                );
              detail = `Recent WPLS-pair trades don't agree on the tax: ${parts.join(" and ")}. An inconsistent tax can mean some wallets trade tax-free while others pay, or the tax changed mid-window — so no single rate is reported.`;
            } else if (buy && sell) {
              const b = buy.median;
              const s = sell.median;
              const spread = Math.abs(b - s);
              const bb = band(b, true);
              const bs = band(s, false);
              const claimTxt =
                claimed !== null ? `the claimed ${f1(claimed)}%` : "any claimed rate";
              if (bb === "pass" && bs === "pass" && spread <= 4) {
                status = "pass";
                detail =
                  claimed !== null
                    ? `Recent WPLS-pair trades paid ~${f1(b)}% going in and ~${f1(s)}% coming out — matching the claimed ${f1(claimed)}% transfer tax. Measured from ${buy.n} buys and ${sell.n} sells in the last ~100k blocks; the sell side reads a touch low because reflections don't emit transfer events.`
                    : `Recent WPLS-pair trades paid ~${f1(b)}% going in and ~${f1(s)}% coming out — no tax either way, and the contract exposes no tax getters claiming otherwise. Measured from ${buy.n} buys and ${sell.n} sells in the last ~100k blocks.`;
              } else if (spread >= 10) {
                // R1: direction-aware fail copy — name which side is the trap.
                status = "fail";
                detail =
                  s > b
                    ? `Buys cost ~${f1(b)}% but sells cost ~${f1(s)}% — cheap to enter, expensive to leave. That's the classic soft-rug tax shape: a low buy tax attracts buyers while a high sell tax traps them.`
                    : `Buys cost ~${f1(b)}% but sells cost ~${f1(s)}% — expensive to enter, cheap to leave. The tax is asymmetric: what it costs to get in doesn't match what it costs to get out.`;
              } else if (bb === "fail" || bs === "fail") {
                status = "fail";
                const side = bb === "fail" ? `buys at ~${f1(b)}%` : `sells at ~${f1(s)}%`;
                detail = `Measured ${side} — more than 10 points above ${claimTxt}. The contract takes more than it admits.`;
              } else {
                status = "warn";
                detail = `Measured ~${f1(b)}% on buys and ~${f1(s)}% on sells vs ${claimTxt} — a few points off the advertised rate.`;
              }
            } else if (buy || sell) {
              const m = (buy ?? sell)!;
              const isBuySide = buy !== null;
              const side = isBuySide ? "buys" : "sells";
              const other = isBuySide ? "sells" : "buys";
              const v = m.median;
              const verdict = band(v, isBuySide);
              const claimTxt =
                claimed !== null ? `the claimed ${f1(claimed)}%` : "any claimed rate";
              if (verdict === "pass" && claimed !== null) {
                status = "pass";
                detail = `Measured ${side} at ~${f1(v)}% against the claimed ${f1(claimed)}% — matching so far. Not enough recent ${other} to measure the other side; thin history is not proof of fairness.`;
              } else if (verdict === "fail") {
                status = "fail";
                detail = `Measured ${side} at ~${f1(v)}% — more than 10 points above ${claimTxt}. Not enough recent ${other} to measure the other side.`;
              } else {
                status = "warn";
                detail = `Measured ${side} at ~${f1(v)}% vs ${claimTxt} — not enough recent ${other} to measure the other side; thin history is not proof of fairness.`;
              }
            } else {
              status = "unknown";
              detail =
                "Not enough recent swaps on the WPLS pair to measure the real buy/sell tax — thin history is not proof of fairness.";
            }
            checks.push(check("measured-tax", "Buy/sell tax, measured", status, detail));
          }
        } catch {
          // A measurement crash must never kill the whole scan — render the
          // measured-tax check as "unknown" instead of failing the scan.
          checks.push(
            check(
              "measured-tax",
              "Buy/sell tax, measured",
              "unknown",
              "The measurement hit an error before it finished — trade history couldn't be fully read. Treat as unknown, not fine.",
            ),
          );
        }
      }
    }
  }

  // 6. Pause switch
  const paused = await read<boolean>(address, scanAbi, "paused");
  if (typeof paused === "boolean") {
    checks.push(
      check(
        "pause",
        "Pause switch",
        paused ? "fail" : "pass",
        paused
          ? "paused() is TRUE — transfers are frozen right now."
          : "paused() exists and is false — transfers aren't frozen today.",
      ),
    );
  } else {
    checks.push(
      check(
        "pause",
        "Pause switch",
        "unknown",
        "No standard paused() found — a pause mechanism may hide under another name.",
      ),
    );
  }

  // 7. Upgradeability: can someone swap the token's code later?
  checks.push(await checkUpgradeability(address));

  // 8. Liquidity: token/WPLS pair on PulseX + how much LP is burned.
  // Honesty rule: the scan can ONLY see LP burned to the dead address — it
  // cannot see third-party lockers. So "not burned" is a warning (go check the
  // pair's holders on the explorer), never a red flag: legit tokens like PLSX
  // keep LP with liquidity providers instead of burning it.
  if (address.toLowerCase() === WPLS.toLowerCase()) {
    checks.push(
      check(
        "liquidity",
        "Liquidity lock",
        "unknown",
        "This is WPLS itself — the wrapped native coin. There is no WPLS/WPLS pair to check.",
      ),
    );
  } else {
    const pairAddr = await read<string>(PULSEX_V2_FACTORY, factoryAbi, "getPair", [address, WPLS]);
    if (typeof pairAddr === "string" && pairAddr.toLowerCase() !== ZERO) {
      const lpAddress = pairAddr as `0x${string}`;
      pair = lpAddress;
      const lpSupply = await read<bigint>(lpAddress, erc20Abi, "totalSupply");
      const lpDead = await read<bigint>(lpAddress, erc20Abi, "balanceOf", [DEAD]);
      if (typeof lpSupply === "bigint" && typeof lpDead === "bigint" && lpSupply > 0n) {
        const burnedPct = Number((lpDead * 10000n) / lpSupply) / 100;
        checks.push(
          check(
            "liquidity",
            "Liquidity lock",
            burnedPct >= 90 ? "pass" : "warn",
            burnedPct >= 90
              ? `${burnedPct.toFixed(1)}% of the WPLS-pair LP tokens sit at the dead address (burned) — the liquidity effectively can't be pulled.`
              : `${burnedPct.toFixed(1)}% of the WPLS-pair LP tokens are burned. The rest isn't — it may sit in a locker this scan can't see, or with liquidity providers. Check the pair's token holders on the explorer before buying. Pair: ${pair}`,
          ),
        );
      } else {
        checks.push(
          check(
            "liquidity",
            "Liquidity lock",
            "unknown",
            "Pair exists on PulseX, but the LP supply/burn couldn't be read.",
          ),
        );
      }
    } else if (typeof pairAddr === "string") {
      checks.push(
        check(
          "liquidity",
          "Liquidity lock",
          "warn",
          "No token/WPLS pair on PulseX — it can't be traded through the flagship router.",
        ),
      );
    } else {
      checks.push(
        check("liquidity", "Liquidity lock", "unknown", "RPC didn't answer for the pair lookup."),
      );
    }
  }

  // 9. Sell simulation: can tokens actually move OUT of a holder?
  // The classic honeypot lets buys through and blocks sells. A read-only
  // eth_call simulates a small transfer() from a real holder — the WPLS pair
  // when one exists, else the token contract itself. No state changes, no
  // wallet, no signing: the call just asks the node "would this succeed".
  // A revert is the honeypot shape; success means transfers work at the token
  // level (a token can still block sells on the DEX specifically — that's
  // what the burn-gated deep scan tests against real liquidity).
  if (typeof decimals === "number") {
    const unit = 10n ** BigInt(decimals);
    let holder: `0x${string}` | null = null;
    let holderBalance = 0n;
    for (const candidate of [pair, address] as const) {
      if (!candidate) continue;
      const bal = await read<bigint>(address, erc20Abi, "balanceOf", [candidate]);
      if (typeof bal === "bigint" && bal > 0n) {
        holder = candidate;
        holderBalance = bal;
        break;
      }
    }
    if (!holder) {
      checks.push(
        check(
          "sell-sim",
          "Sell simulation",
          "unknown",
          "No holder balance found to simulate a sell from — transfer-blocking couldn't be tested. Treat as untested, not fine.",
        ),
      );
    } else {
      const amount = holderBalance >= unit ? unit : holderBalance;
      const sim = await simulateSellFrom(address, holder, amount);
      if (sim === "ok") {
        checks.push(
          check(
            "sell-sim",
            "Sell simulation",
            "pass",
            "A simulated transfer out of a real holder's balance completed — sells aren't blocked at the transfer level. (A token can still block sells on the DEX specifically — that's what the burn-gated deep scan tests.)",
          ),
        );
      } else if (sim === "reverted") {
        checks.push(
          check(
            "sell-sim",
            "Sell simulation",
            "fail",
            "A simulated token transfer reverted — the classic honeypot shape (buys go through, sells don't). Treat this as extremely risky. (Rarely, unusual transfer logic can also fail a simulation — the deep scan tests the real DEX path.)",
          ),
        );
      } else {
        checks.push(
          check(
            "sell-sim",
            "Sell simulation",
            "unknown",
            "The RPC didn't answer the simulation — transfer-blocking couldn't be tested. Treat as untested, not fine.",
          ),
        );
      }
    }
  } else {
    checks.push(
      check(
        "sell-sim",
        "Sell simulation",
        "unknown",
        "Couldn't read the token's decimals, so there was no safe amount to simulate a sell with. Treat as untested, not fine.",
      ),
    );
  }

  return {
    address,
    checks,
    taxBps,
    pair,
    // Only trusted when the metadata check passed — otherwise the token isn't
    // a standard ERC-20 and it doesn't get an add-to-wallet button.
    symbol: typeof symbol === "string" && typeof decimals === "number" ? symbol : null,
    decimals: typeof decimals === "number" ? decimals : null,
    scannedAt: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// DEEP SCAN — simulated buy+sell round-trips against real PulseX liquidity.
// Gated on a verified DUMB burn (see verifyScanBurn): the report renders only
// after the burn is confirmed on-chain. Read-only simulation: router
// getAmountsOut quotes, no wallet, no signing — the only thing the user does
// is the burn itself, from their own wallet, before they get here.
// ---------------------------------------------------------------------------

/** The deep-scan price: this much DUMB burned to the dead address per scan. */
export const DEEP_SCAN_BURN_COST = 100_000n * 10n ** 18n;

const TRANSFER_SELECTOR = "0xa9059cbb";
/**
 * Canonical ERC-20 Transfer topic — computed via keccak256, never hand-typed.
 * (A hand-typed literal missing its final hex char silently broke every burn
 * verification on 2026-09-28: no receipt log ever matched.)
 */
const TRANSFER_TOPIC = keccak256(stringToHex("Transfer(address,address,uint256)"));

export interface DeepScanResult {
  address: `0x${string}`;
  checks: ScanCheck[];
  scannedAt: number;
}

/** One router quote, null when the RPC won't answer. */
async function quoteOut(
  amountIn: bigint,
  path: [`0x${string}`, `0x${string}`],
): Promise<bigint | null> {
  const amounts = await tryRead(() =>
    (scanClient.readContract as (p: unknown) => Promise<bigint[]>)({
      address: PULSEX_V2_ROUTER,
      abi: routerAbi,
      functionName: "getAmountsOut",
      args: [amountIn, path],
    }),
  );
  if (!Array.isArray(amounts) || amounts.length !== path.length) return null;
  const out = amounts[amounts.length - 1];
  return typeof out === "bigint" && out > 0n ? out : null;
}

const WPLS_UNIT = 10n ** 18n;

/** Compact token amount for scan copy: 45234100 → "45.23M", 0.00012 → "0.00012". */
function fmtTokAmt(raw: bigint, decimals: number): string {
  const n = Number(raw) / 10 ** decimals;
  if (!Number.isFinite(n)) return "—";
  if (n >= 1000)
    return n.toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 2 });
  return n.toLocaleString("en-US", { maximumFractionDigits: n >= 1 ? 4 : 8 });
}

/** WPLS amount for scan copy: 940000000000000000n → "0.94 WPLS". */
function fmtWplsAmt(raw: bigint): string {
  const n = Number(raw) / 1e18;
  if (!Number.isFinite(n)) return "—";
  return `${n.toLocaleString("en-US", { maximumFractionDigits: 4 })} WPLS`;
}

/**
 * Simulated trading against the token's live WPLS pair: a 1-WPLS round trip
 * (buy, then immediate sell-back), a 10-WPLS exit (what a real bag gets when
 * it heads for the door), and a liquidity-depth curve (1 vs 10 vs 100 WPLS
 * buys). All quotes are read-only getAmountsOut calls — no wallet, no trades.
 * The simulation applies the tax the contract CLAIMS (taxBps from the quick
 * scan's getters): buy-side tax comes off the received amount, sell-side tax
 * off the sell input — matching how fee-supporting router swaps settle. When
 * the contract exposes no tax getter, the sell-back is quoted raw at the AMM
 * level and labeled as pre-tax — the unknowable part stays unknowable, but
 * the knowable part is still shown.
 */
export async function deepScan(
  address: `0x${string}`,
  taxBps: number | null,
  meta?: { symbol: string | null; decimals: number | null },
): Promise<DeepScanResult> {
  const checks: ScanCheck[] = [];
  const sym = meta?.symbol ?? "tokens";
  const dec = typeof meta?.decimals === "number" ? meta.decimals : 18;

  if (address.toLowerCase() === WPLS.toLowerCase()) {
    checks.push(
      check(
        "roundtrip",
        "Deep scan",
        "unknown",
        "This is WPLS itself — there's no token/WPLS pair to simulate against.",
      ),
    );
    return { address, checks, scannedAt: Date.now() };
  }

  const pair = await read<string>(PULSEX_V2_FACTORY, factoryAbi, "getPair", [address, WPLS]);
  if (typeof pair !== "string" || pair.toLowerCase() === ZERO) {
    checks.push(
      check(
        "roundtrip",
        "Deep scan",
        "warn",
        typeof pair === "string"
          ? "No token/WPLS pair on PulseX — there's no live liquidity to simulate a buy and sell against."
          : "The RPC didn't answer the pair lookup, so the deep scan couldn't run.",
      ),
    );
    return { address, checks, scannedAt: Date.now() };
  }

  const [buy1, buy10, buy100] = await Promise.all([
    quoteOut(WPLS_UNIT, [WPLS, address]),
    quoteOut(10n * WPLS_UNIT, [WPLS, address]),
    quoteOut(100n * WPLS_UNIT, [WPLS, address]),
  ]);
  if (buy1 === null || buy10 === null || buy100 === null) {
    checks.push(
      check(
        "roundtrip",
        "Deep scan",
        "unknown",
        "The RPC didn't answer the simulation quotes — try again in a moment.",
      ),
    );
    return { address, checks, scannedAt: Date.now() };
  }

  // 1. Round-trip cost: 1 WPLS in → tokens → straight back to WPLS.
  // Always simulated now — with the claimed tax when the contract exposes a
  // getter, raw at the AMM level (labeled pre-tax) when it doesn't.
  const sellBackRaw = await quoteOut(buy1, [address, WPLS]);
  if (sellBackRaw === null) {
    checks.push(
      check(
        "roundtrip",
        "Round-trip cost",
        "unknown",
        "The sell-back quote didn't answer — the RPC is flaky right now.",
      ),
    );
  } else if (taxBps !== null) {
    const keep = BigInt(10_000 - taxBps);
    const received = (buy1 * keep) / 10_000n;
    const sellIn = (received * keep) / 10_000n;
    const back = await quoteOut(sellIn, [address, WPLS]);
    if (back === null) {
      checks.push(
        check(
          "roundtrip",
          "Round-trip cost",
          "unknown",
          "The sell-back quote didn't answer — the RPC is flaky right now.",
        ),
      );
    } else {
      const lossBps = Number(((WPLS_UNIT - back) * 10_000n) / WPLS_UNIT);
      const lossPct = (lossBps / 100).toFixed(1);
      checks.push(
        check(
          "roundtrip",
          "Round-trip cost",
          lossBps <= 800 ? "pass" : lossBps <= 2_000 ? "warn" : "fail",
          `1 WPLS → ${fmtTokAmt(buy1, dec)} ${sym} → ${fmtWplsAmt(back)}: ~${lossPct}% stays on the table — ` +
            `the claimed ${(taxBps / 100).toFixed(taxBps % 100 === 0 ? 0 : 2)}% tax on each leg plus AMM slippage. ` +
            `This applies the tax the contract CLAIMS; if it takes more than it claims, real trades cost more.`,
        ),
      );
    }
  } else {
    const lossBps = Number(((WPLS_UNIT - sellBackRaw) * 10_000n) / WPLS_UNIT);
    const lossPct = (lossBps / 100).toFixed(1);
    checks.push(
      check(
        "roundtrip",
        "Round-trip cost",
        lossBps <= 500 ? "pass" : lossBps <= 2_000 ? "warn" : "fail",
        `1 WPLS buys ${fmtTokAmt(buy1, dec)} ${sym}; selling it straight back quotes ${fmtWplsAmt(sellBackRaw)} — ` +
          `~${lossPct}% stays on the table at the AMM level. That's BEFORE any sell tax the contract skims on top: ` +
          `this token exposes no standard tax getter, so that part is unknowable — treat it as risky, not fine.`,
      ),
    );
  }

  // 2. Exit liquidity: what a 10 WPLS bag actually nets heading for the door.
  // Benchmarked against the small-trade price so the number is pure exit impact.
  const exitOut = await quoteOut(buy10, [address, WPLS]);
  if (exitOut === null) {
    checks.push(
      check(
        "exit",
        "Exit liquidity",
        "unknown",
        "The exit quote didn't answer — the RPC is flaky right now.",
      ),
    );
  } else {
    const fair = (buy10 * WPLS_UNIT) / buy1;
    const impactBps = fair > 0n ? Number(((fair - exitOut) * 10_000n) / fair) : 0;
    const impactPct = (impactBps / 100).toFixed(1);
    checks.push(
      check(
        "exit",
        "Exit liquidity",
        impactBps < 1_000 ? "pass" : impactBps < 3_000 ? "warn" : "fail",
        `Dumping the ${fmtTokAmt(buy10, dec)} ${sym} from a 10 WPLS buy nets ${fmtWplsAmt(exitOut)} — ` +
          `~${impactPct}% worse than the small-trade price. ` +
          (impactBps < 1_000
            ? "A 10 WPLS position can exit without cratering the price."
            : impactBps < 3_000
              ? "Exiting a 10 WPLS position moves the market against you — size any exit carefully."
              : "Exiting even a 10 WPLS position craters the price — neither you nor a whale (nor the dev) gets out clean."),
      ),
    );
  }

  // 3. Liquidity depth: the full curve — how much does a bigger buy move the price?
  // impact = 1 - (per-WPLS output of the bigger buy) / (per-WPLS output of a 1 WPLS buy).
  const per1 = buy1;
  const per10 = buy10 / 10n;
  const per100 = buy100 / 100n;
  const impact10Bps = per1 > 0n ? Number(((per1 - per10) * 10_000n) / per1) : 0;
  const impact100Bps = per1 > 0n ? Number(((per1 - per100) * 10_000n) / per1) : 0;
  const impact10Pct = (impact10Bps / 100).toFixed(1);
  const impact100Pct = (impact100Bps / 100).toFixed(1);
  checks.push(
    check(
      "depth",
      "Liquidity depth",
      impact10Bps < 500 ? "pass" : impact10Bps < 2_500 ? "warn" : "fail",
      `Per-WPLS pricing vs a 1 WPLS buy: a 10 WPLS buy gets ~${impact10Pct}% worse, a 100 WPLS buy ~${impact100Pct}% worse. ` +
        (impact10Bps < 500
          ? "Liquidity is deep enough that normal-size buys barely move the price."
          : impact10Bps < 2_500
            ? "Liquidity is thin — buys move the market, and a large holder selling moves it harder."
            : "Liquidity is dangerously thin — even modest buys swing the price. A developer holding the LP or a big bag can nuke this."),
    ),
  );

  return { address, checks, scannedAt: Date.now() };
}

export type ScanBurnVerification =
  { ok: true; amount: bigint; from: string } | { ok: false; reason: string };

/**
 * Verifies a deep-scan burn on-chain: a direct transfer() of at least
 * DEEP_SCAN_BURN_COST DUMB to the dead address, mined successfully, with the
 * tokens actually arriving (receipt Transfer log). Read-only — the site never
 * touches the user's funds; the burn happens from the user's own wallet first.
 */
export async function verifyScanBurn(txHash: string): Promise<ScanBurnVerification> {
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash.trim())) {
    return { ok: false, reason: "That doesn't look like a transaction hash." };
  }
  const hash = txHash.trim().toLowerCase() as `0x${string}`;
  const [tx, receipt] = await Promise.all([
    tryRead(() => scanClient.getTransaction({ hash })),
    tryRead(() => scanClient.getTransactionReceipt({ hash })),
  ]);
  if (!tx || !receipt) {
    return { ok: false, reason: "The RPC didn't answer — try again in a moment." };
  }
  if (receipt.status !== "success") {
    return { ok: false, reason: "That transaction failed on-chain — it didn't burn anything." };
  }
  if ((tx.to ?? "").toLowerCase() !== DUMB.toLowerCase()) {
    return { ok: false, reason: "That transaction wasn't sent to the DUMB token contract." };
  }
  const input = (tx.input ?? "").toLowerCase();
  // 0x + selector(8) + address(64) + amount(64)
  if (!input.startsWith(TRANSFER_SELECTOR) || input.length < 138) {
    return {
      ok: false,
      reason:
        "That wasn't a plain DUMB transfer — the deep scan needs a direct transfer to the dead address.",
    };
  }
  const recipient = `0x${input.slice(34, 74)}`;
  if (recipient.toLowerCase() !== DEAD.toLowerCase()) {
    return { ok: false, reason: "That transfer didn't go to the dead address." };
  }
  const amount = BigInt(`0x${input.slice(74, 138)}`);
  if (amount < DEEP_SCAN_BURN_COST) {
    return { ok: false, reason: "That burn was smaller than the 100,000 DUMB deep-scan cost." };
  }
  const fromTopic = `0x${(tx.from ?? "").slice(2).toLowerCase().padStart(64, "0")}`;
  const deadTopic = `0x${DEAD.slice(2).toLowerCase().padStart(64, "0")}`;
  const arrived = receipt.logs.some(
    (log) =>
      (log.address ?? "").toLowerCase() === DUMB.toLowerCase() &&
      (log.topics?.[0] ?? "").toLowerCase() === TRANSFER_TOPIC &&
      (log.topics?.[1] ?? "").toLowerCase() === fromTopic &&
      (log.topics?.[2] ?? "").toLowerCase() === deadTopic,
  );
  if (!arrived) {
    return {
      ok: false,
      reason: "The tokens never arrived at the dead address in that transaction.",
    };
  }
  return { ok: true, amount, from: (tx.from ?? "").toLowerCase() };
}

// ---------------------------------------------------------------------------
// PLS FALLBACK — one-click PLS-to-dead DUMB burn for wallets short on DUMB.
// ONE wallet confirmation: swapExactETHForTokensSupportingFeeOnTransferTokens
// on the PulseX router with `to` = the dead address and path [WPLS, DUMB], so
// the bought DUMB goes straight to dead. The arrival is taxed at the full 6%
// (dead is not fee-excluded, verified in backlog #1) — ~95% of the pre-tax
// amount lands burned, and that tax IS the burn, not a bug. The site never
// touches funds: the user signs their own swap. Same guards as the swap box:
// 8% slippage, 20-minute deadline.
// Used by the deep-scan pass (quotePlsBurn / verifyPlsScanBurn) AND the
// voluntary burn page (BurnBox) via quotePlsBurnFor / verifyPlsBurn with
// per-use arrival thresholds.
// ---------------------------------------------------------------------------

/** Pre-tax DUMB output the PLS fallback targets: buffer so the ~6%-taxed
 *  arrival at dead still clears the 100k pass threshold with room for slippage. */
export const PLS_BURN_TARGET_DUMB = 110_000n * 10n ** 18n;

/** Dead's verified DUMB balance increase per pre-tax amount sent (95%) — backlog #1. */
const DEAD_ARRIVAL_NUM = 95n;
const DEAD_ARRIVAL_DEN = 100n;

/** Slippage guard on the PLS fallback swap, in bps (matches the swap box default). */
const PLS_BURN_SLIPPAGE_BPS = 800n;

/** The swap-box 20-minute deadline, reused by the PLS fallback. */
export const SCAN_BURN_DEADLINE_SECONDS = 20 * 60;

export interface PlsBurnQuote {
  /** PLS the user pays (their wallet value). */
  plsIn: bigint;
  /** Pre-tax DUMB the router quote returns for it (~95% lands at dead). */
  dumbOut: bigint;
}

/**
 * Live quote: X PLS such that getAmountsOut(X, [WPLS, DUMB]) ≈ the given
 * pre-tax DUMB target. Two read-only quotes (estimate, then refine) — null
 * when the RPC won't answer. Shared by the deep-scan fallback and the
 * voluntary-/burn-page fallback (different arrival thresholds, same math).
 */
export async function quotePlsBurnFor(preTaxTargetDumb: bigint): Promise<PlsBurnQuote | null> {
  const path: [`0x${string}`, `0x${string}`] = [WPLS as `0x${string}`, DUMB as `0x${string}`];
  const perPls = await quoteOut(WPLS_UNIT, path);
  if (perPls === null || perPls === 0n) return null;
  // Round UP so the target is met, not just approached.
  const plsIn = (preTaxTargetDumb * WPLS_UNIT + perPls - 1n) / perPls;
  const dumbOut = await quoteOut(plsIn, path);
  if (dumbOut === null) return null;
  return { plsIn, dumbOut };
}

/**
 * Live quote: X PLS such that getAmountsOut(X, [WPLS, DUMB]) ≈ 110k DUMB.
 */
export async function quotePlsBurn(): Promise<PlsBurnQuote | null> {
  return quotePlsBurnFor(PLS_BURN_TARGET_DUMB);
}

/**
 * amountOutMin for the PLS fallback swap: verified dead-arrival math (95% of
 * the pre-tax quote — the router's fee-supporting variant checks the dead
 * address's actual balance increase) with the 8% slippage guard.
 */
export function plsBurnMinOut(quote: PlsBurnQuote): bigint {
  return (
    (quote.dumbOut * DEAD_ARRIVAL_NUM * (10_000n - PLS_BURN_SLIPPAGE_BPS)) /
    (DEAD_ARRIVAL_DEN * 10_000n)
  );
}

/**
 * Verifies a PLS-fallback burn on-chain: a successful
 * swapExactETHForTokensSupportingFeeOnTransferTokens call to the PulseX
 * router with `to` = dead and path [WPLS, DUMB], whose DUMB Transfer logs to
 * dead total at least opts.minArrival. Decodes via the shared router ABI
 * (no hand-rolled selector) and sums receipt logs — the honest measure of
 * what actually burned. The deep-scan pass (verifyPlsScanBurn) and the
 * voluntary-/burn-page fallback both use this with their own thresholds.
 */
export async function verifyPlsBurn(
  txHash: string,
  opts: { minArrival: bigint; shortfallNote: string },
): Promise<ScanBurnVerification> {
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash.trim())) {
    return { ok: false, reason: "That doesn't look like a transaction hash." };
  }
  const hash = txHash.trim().toLowerCase() as `0x${string}`;
  const [tx, receipt] = await Promise.all([
    tryRead(() => scanClient.getTransaction({ hash })),
    tryRead(() => scanClient.getTransactionReceipt({ hash })),
  ]);
  if (!tx || !receipt) {
    return { ok: false, reason: "The RPC didn't answer — try again in a moment." };
  }
  if (receipt.status !== "success") {
    return { ok: false, reason: "That transaction failed on-chain — it didn't burn anything." };
  }
  if ((tx.to ?? "").toLowerCase() !== PULSEX_V2_ROUTER.toLowerCase()) {
    return { ok: false, reason: "That transaction wasn't sent to the PulseX router." };
  }
  if (!tx.value || tx.value === 0n) {
    return { ok: false, reason: "That transaction sent no PLS — the fallback needs a PLS swap." };
  }
  let fn: string;
  let args: readonly unknown[];
  try {
    const decoded = decodeFunctionData({ abi: routerAbi, data: tx.input as `0x${string}` });
    fn = decoded.functionName;
    args = decoded.args;
  } catch {
    return {
      ok: false,
      reason: "That wasn't a PLS-to-DUMB burn swap — the router call couldn't be decoded.",
    };
  }
  if (fn !== "swapExactETHForTokensSupportingFeeOnTransferTokens") {
    return { ok: false, reason: "That wasn't the PLS burn swap (wrong router function)." };
  }
  const [, path, to] = args as [bigint, readonly string[], string];
  if (
    !Array.isArray(path) ||
    path.length !== 2 ||
    (path[0] ?? "").toLowerCase() !== WPLS.toLowerCase() ||
    (path[1] ?? "").toLowerCase() !== DUMB.toLowerCase() ||
    (to ?? "").toLowerCase() !== DEAD.toLowerCase()
  ) {
    return {
      ok: false,
      reason: "That swap didn't route PLS → DUMB straight to the dead address.",
    };
  }
  const deadTopic = `0x${DEAD.slice(2).toLowerCase().padStart(64, "0")}`;
  const arrived = receipt.logs.reduce((sum, log) => {
    if (
      (log.address ?? "").toLowerCase() === DUMB.toLowerCase() &&
      (log.topics?.[0] ?? "").toLowerCase() === TRANSFER_TOPIC &&
      (log.topics?.[2] ?? "").toLowerCase() === deadTopic
    ) {
      try {
        return sum + BigInt(log.data ?? "0x0");
      } catch {
        return sum;
      }
    }
    return sum;
  }, 0n);
  if (arrived < opts.minArrival) {
    const got = (Number(arrived) / 1e18).toLocaleString("en-US", { maximumFractionDigits: 0 });
    return {
      ok: false,
      reason: `Only ~${got} DUMB arrived at the dead address in that swap — ${opts.shortfallNote}. The market moved between quote and confirmation; the burned DUMB is still gone.`,
    };
  }
  return { ok: true, amount: arrived, from: (tx.from ?? "").toLowerCase() };
}

/**
 * Deep-scan flavor of the PLS-fallback burn: the swap must land at least the
 * 100,000 DUMB pass cost at the dead address.
 */
export async function verifyPlsScanBurn(txHash: string): Promise<ScanBurnVerification> {
  return verifyPlsBurn(txHash, {
    minArrival: DEEP_SCAN_BURN_COST,
    shortfallNote: "the pass needs 100,000 — it didn't clear the pass threshold",
  });
}

/**
 * Either deep-scan burn path: a plain DUMB transfer (one-click / manual) OR
 * the PLS-fallback router swap. Used for shared ?burn= report links, which can
 * now carry either kind of burn — the viewer's side re-verifies on-chain, so
 * the link can never show a fabricated result.
 */
export async function verifyDeepScanBurn(txHash: string): Promise<ScanBurnVerification> {
  const direct = await verifyScanBurn(txHash);
  if (direct.ok) return direct;
  // PLS-fallback burns are router swaps, not transfer() calls — they fail the
  // transfer check by construction, so route them to the swap verifier.
  return verifyPlsScanBurn(txHash);
}

// ---------------------------------------------------------------------------
// 30-day deep-scan pass — one verified DUMB burn unlocks unlimited deep scans
// for 30 days, then the user burns again. The pass is a localStorage ledger:
// { txHash, unlockedAt, expiresAt, path }. The burn itself is always
// re-verified on-chain (verifyScanBurn) before a pass is issued, and every
// shared ?burn= link re-verifies on-chain too — the pass only remembers a
// burn THIS browser already paid for. No custody, no server, no new contract.
// ---------------------------------------------------------------------------

/** One burn (either path) unlocks this many days of unlimited deep scans. */
export const DEEP_SCAN_PASS_DAYS = 30;

const SCAN_PASS_KEY = "dumb-scan-pass";

export interface DeepScanPass {
  /** The verified burn tx hash (always re-verified on-chain before issue). */
  txHash: string;
  unlockedAt: number;
  expiresAt: number;
  /** How the burn was made: "wallet" (one-click), "paste" (manual tx hash), "pls" (PLS fallback). */
  path: "wallet" | "paste" | "pls";
}

function isScanPass(x: unknown): x is DeepScanPass {
  if (typeof x !== "object" || x === null) return false;
  const p = x as Record<string, unknown>;
  const txHash = p["txHash"];
  const unlockedAt = p["unlockedAt"];
  const expiresAt = p["expiresAt"];
  const path = p["path"];
  return (
    typeof txHash === "string" &&
    /^0x[0-9a-fA-F]{64}$/.test(txHash) &&
    typeof unlockedAt === "number" &&
    Number.isFinite(unlockedAt) &&
    typeof expiresAt === "number" &&
    Number.isFinite(expiresAt) &&
    (path === "wallet" || path === "paste" || path === "pls")
  );
}

/** The stored pass, or null when none exists, is malformed, or expired. */
export function loadScanPass(): DeepScanPass | null {
  try {
    const raw = localStorage.getItem(SCAN_PASS_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isScanPass(parsed)) return null;
    return parsed.expiresAt > Date.now() ? parsed : null;
  } catch {
    return null;
  }
}

/** Issue a pass starting now for the verified burn. Never throws. */
export function saveScanPass(txHash: string, path: DeepScanPass["path"]): void {
  const now = Date.now();
  try {
    localStorage.setItem(
      SCAN_PASS_KEY,
      JSON.stringify({
        txHash: txHash.toLowerCase(),
        unlockedAt: now,
        expiresAt: now + DEEP_SCAN_PASS_DAYS * 24 * 60 * 60 * 1000,
        path,
      } satisfies DeepScanPass),
    );
  } catch {
    // Storage blocked — the current scan still runs; the pass just won't persist.
  }
}

/** Human-friendly expiry, e.g. "23 days" / "1 day" / "3 hours". Never throws. */
export function passTimeLeft(pass: DeepScanPass): string {
  const ms = Math.max(0, pass.expiresAt - Date.now());
  const days = Math.floor(ms / 86_400_000);
  if (days >= 2) return `${days} days`;
  if (days === 1) return "1 day";
  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 1) return `${hours} hour${hours === 1 ? "" : "s"}`;
  return "under an hour";
}

// ---------------------------------------------------------------------------
// "Scan my bags" — discover ERC-20 tokens a wallet received in the recent
// window, so one click can quick-scan everything the connected wallet holds.
// ---------------------------------------------------------------------------

/** How far back the bag scan looks. The result carries the window's block
 *  timestamps so the UI can label it honestly ("since <date>") instead of
 *  guessing at block times. */
const BAG_SCAN_BLOCKS = 100_000n;
/** Keep each getLogs window small — the public RPC drops big scans. */
const BAG_LOG_CHUNK = 5_000n;
/** Discovery cap — a dust-spammed wallet can touch hundreds of contracts. */
const BAG_DISCOVER_CAP = 25;

export interface BagDiscovery {
  /** Distinct token contracts with inbound transfers in the window. */
  tokens: `0x${string}`[];
  /** True when more contracts existed than the cap. */
  truncated: boolean;
  fromBlock: bigint;
  toBlock: bigint;
  /** Window-edge block timestamps (unix seconds, null when unreadable). */
  fromTimestamp: number | null;
  toTimestamp: number | null;
}

/**
 * Read-only discovery: which ERC-20 contracts sent tokens TO this wallet in
 * the recent window? Chunked, topic-filtered getLogs — the same gentle,
 * retry-per-chunk pattern as the burn ticker. Never throws: RPC failure
 * yields an empty list and the UI says so.
 */
export async function discoverWalletTokens(wallet: `0x${string}`): Promise<BagDiscovery> {
  const empty: BagDiscovery = {
    tokens: [],
    truncated: false,
    fromBlock: 0n,
    toBlock: 0n,
    fromTimestamp: null,
    toTimestamp: null,
  };
  try {
    const latest = await tryRead(() => scanClient.getBlockNumber());
    if (latest === null) return empty;
    const toBlock = latest;
    const fromBlock = toBlock > BAG_SCAN_BLOCKS ? toBlock - BAG_SCAN_BLOCKS : 0n;
    const seen = new Map<string, `0x${string}`>();
    let truncated = false;
    for (let from = fromBlock; from <= toBlock && seen.size < BAG_DISCOVER_CAP;) {
      const to = from + BAG_LOG_CHUNK - 1n > toBlock ? toBlock : from + BAG_LOG_CHUNK - 1n;
      const logs = await tryRead(() =>
        scanClient.getLogs({
          event: parseAbiItem(
            "event Transfer(address indexed from, address indexed to, uint256 value)",
          ),
          args: { to: wallet },
          fromBlock: from,
          toBlock: to,
        }),
      );
      if (logs) {
        for (const log of logs) {
          const lower = log.address.toLowerCase();
          if (/^0x[0-9a-f]{40}$/.test(lower) && !seen.has(lower)) {
            seen.set(lower, log.address);
            if (seen.size >= BAG_DISCOVER_CAP) {
              truncated = true;
              break;
            }
          }
        }
      }
      from = to + 1n;
    }
    const fromTs = await tryRead(() => scanClient.getBlock({ blockNumber: fromBlock }));
    const toTs = await tryRead(() => scanClient.getBlock({ blockNumber: toBlock }));
    return {
      tokens: [...seen.values()],
      truncated,
      fromBlock,
      toBlock,
      fromTimestamp: fromTs ? Number(fromTs.timestamp) : null,
      toTimestamp: toTs ? Number(toTs.timestamp) : null,
    };
  } catch {
    return empty;
  }
}
