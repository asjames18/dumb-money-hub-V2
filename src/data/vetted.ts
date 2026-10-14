import type { ScanCheck } from "@/lib/token-scan";

/**
 * Vetted Token Directory — curated PulseChain tokens that passed the hub's
 * public vetting checklist on the listed date. A listing means "these checks
 * passed on this date" — it is NEVER a safety promise, an endorsement, or
 * financial advice. Anyone can re-run the checks live via the scanner.
 *
 * Checklist honesty rule: every check below reflects verification that was
 * actually performed and documented (see src/lib/pulsechain.ts comments and
 * the project notes). Anything not checked is "unknown", never invented.
 */
export interface VettedListing {
  address: `0x${string}` | "native";
  symbol: string;
  name: string;
  checks: ScanCheck[];
  /** Vetting date, YYYY-MM-DD. */
  vettedAt: string;
  /**
   * Contract deployment date on PulseChain, YYYY-MM-DD. Curated data,
   * verified on-chain 2026-10-04 via eth_getCode binary search against
   * rpc.pulsechain.com (creation block -> block timestamp).
   * HEX and WBTC are Ethereum-origin contracts whose state PulseChain
   * inherited at the fork, so their date is the PulseChain launch
   * (2023-05-13) — when they became active on this chain. null means
   * unverified; the UI must show "—" for null, never a guess.
   */
  deployedAt: string | null;
  status: "listed" | "delisted";
  delistReason?: string;
  note?: string;
}

const c = (id: string, label: string, status: ScanCheck["status"], detail: string): ScanCheck => ({
  id,
  label,
  status,
  detail,
});

/** Shared "not checked" entries — used instead of inventing results. */
const taxUnknown = () =>
  c(
    "measured-tax",
    "Transfer tax",
    "unknown",
    "Transfer tax was not measured during vetting. Run a live scan — it reads the contract's claimed tax and simulates real trades.",
  );
const ownerUnknown = () =>
  c(
    "ownership",
    "Ownership",
    "unknown",
    "Owner/mint powers were not reviewed during vetting. The live scan checks for common admin powers.",
  );
const lockUnknown = () =>
  c(
    "liquidity",
    "Liquidity lock",
    "unknown",
    "LP lock state was not checked during vetting. The live scan reports what it can find.",
  );
/** For the 2026-09-28 cohort, which passed the quick scan with only the standard LP caution. */
const lockCaution = () =>
  c(
    "liquidity",
    "Liquidity lock",
    "warn",
    "LP tokens are not burned to a known dead address — the standard caution from the quick scan. Treat unlocked liquidity as a risk.",
  );

export const VETTED_LISTINGS: VettedListing[] = [
  {
    address: "0xe65112d2f120c8cb23ADC80D8E8122c0c8b7fF8D",
    symbol: "DUMB",
    name: "Dumb Money",
    vettedAt: "2026-09-26",
    deployedAt: "2025-02-15",
    status: "listed",
    note: "The hub's home token. 6% tax on buy, sell, and transfer — 5% instant burn, 1% reflections.",
    checks: [
      c(
        "code",
        "Contract exists",
        "pass",
        "Contract code found on PulseChain (verified 2026-09-26).",
      ),
      c(
        "metadata",
        "On-chain metadata",
        "pass",
        'name(), symbol(), decimals() return sane values ("Dumb Money" / "DUMB" / 18).',
      ),
      c(
        "measured-tax",
        "Transfer tax",
        "pass",
        "Verified on-chain: fees() = 600 (6% total) with feesDistribution() = (3333, 3333, 1667, 1667).",
      ),
      c(
        "ownership",
        "Ownership",
        "pass",
        "Owner is renounced (0x0) — no admin can change the tax or mint. Auto-processing engine is permanently dead.",
      ),
      c(
        "pair",
        "Liquidity exists",
        "pass",
        "WPLS/DUMB pair 0x221f63Fb54f3fBC6C60B3D22bc9BcB5Fd1d0d186: factory.getPair match, nonzero reserves on both sides.",
      ),
      lockUnknown(),
    ],
  },
  {
    address: "0x8357aA9070dc7d8d154Da74561CEc58cA30c41C3",
    symbol: "DAMP",
    name: "Dumb Amplifier",
    vettedAt: "2026-09-26",
    deployedAt: "2025-02-15",
    status: "listed",
    note: "DUMB's companion token. 3% tax on buy, sell, and transfer — 2% instant burn, 1% reflections.",
    checks: [
      c(
        "code",
        "Contract exists",
        "pass",
        "Contract code found on PulseChain (verified 2026-09-26).",
      ),
      c(
        "metadata",
        "On-chain metadata",
        "pass",
        'name(), symbol(), decimals() return sane values ("Dumb Amplifier" / "DAMP" / 18).',
      ),
      c(
        "measured-tax",
        "Transfer tax",
        "pass",
        "Verified on-chain: fees() = 300 (3% total) with feesDistribution() = (3333, 0, 3333, 3334).",
      ),
      c(
        "ownership",
        "Ownership",
        "pass",
        "Owner is renounced (0x0) — no admin can change the tax or mint. Auto-processing flywheel is dormant.",
      ),
      c(
        "pair",
        "Liquidity exists",
        "pass",
        "DAMP/WPLS pair 0xB256769d6B9d53E0E66a395C17135F8855A8633A: factory.getPair match, nonzero reserves on both sides.",
      ),
      lockUnknown(),
    ],
  },
  {
    address: "0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39",
    symbol: "HEX",
    name: "HEX (PulseChain)",
    vettedAt: "2026-09-26",
    deployedAt: "2023-05-13",
    status: "listed",
    note: "Bridged pHEX on PulseChain. 8 decimals.",
    checks: [
      c(
        "code",
        "Contract exists",
        "pass",
        "Contract code found on PulseChain (verified 2026-09-26).",
      ),
      c(
        "metadata",
        "On-chain metadata",
        "pass",
        'name(), symbol(), decimals() return sane values ("HEX" / "HEX" / 8).',
      ),
      c(
        "pair",
        "Liquidity exists",
        "pass",
        "HEX/DUMB direct pair and HEX/WPLS pair both verified: token0/token1, nonzero reserves, factory.getPair match.",
      ),
      taxUnknown(),
      ownerUnknown(),
      lockUnknown(),
    ],
  },
  {
    address: "0x2fa878Ab3F87CC1C9737Fc071108F904c0B0C95d",
    symbol: "INC",
    name: "Inc",
    vettedAt: "2026-09-26",
    deployedAt: "2023-05-11",
    status: "listed",
    checks: [
      c(
        "code",
        "Contract exists",
        "pass",
        "Contract code found on PulseChain (verified 2026-09-26).",
      ),
      c(
        "metadata",
        "On-chain metadata",
        "pass",
        "name(), symbol(), decimals() return sane values (18 decimals).",
      ),
      c(
        "pair",
        "Liquidity exists",
        "pass",
        "INC/WPLS pair 0x5b9661276708202dd1a0dd2346a3856b00d3c251 (token0=INC): nonzero reserves, factory.getPair match. INC/DUMB direct pair also verified.",
      ),
      taxUnknown(),
      ownerUnknown(),
      lockUnknown(),
    ],
  },
  {
    address: "0x95B303987A60C71504D99Aa1b13B4DA07b0790ab",
    symbol: "PLSX",
    name: "PulseX",
    vettedAt: "2026-09-26",
    deployedAt: "2023-05-11",
    status: "listed",
    note: "Verified as the real PulseX — a lookalike address with no contract was rejected during vetting.",
    checks: [
      c(
        "code",
        "Contract exists",
        "pass",
        "Contract code found on PulseChain (verified 2026-09-26 via eth_getCode + name()).",
      ),
      c(
        "metadata",
        "On-chain metadata",
        "pass",
        'name(), symbol(), decimals() return sane values ("PulseX" / "PLSX" / 18).',
      ),
      c(
        "pair",
        "Liquidity exists",
        "pass",
        "PLSX/WPLS pair 0x149b2c629e652f2e89e11cd57e5d4d77ee166f9f (token0=PLSX): nonzero reserves, factory.getPair match. DAMP/PLSX direct pair also verified.",
      ),
      taxUnknown(),
      ownerUnknown(),
      lockUnknown(),
    ],
  },
  {
    address: "0xF6f8Db0aBa00007681F8fAF16A0FDa1c9B030b11",
    symbol: "PRVX",
    name: "Provax",
    vettedAt: "2026-09-26",
    deployedAt: "2026-03-13",
    status: "listed",
    checks: [
      c(
        "code",
        "Contract exists",
        "pass",
        "Contract code found on PulseChain (verified 2026-09-26).",
      ),
      c(
        "metadata",
        "On-chain metadata",
        "pass",
        "name(), symbol(), decimals() return sane values (18 decimals).",
      ),
      c(
        "pair",
        "Liquidity exists",
        "pass",
        "WPLS pair with nonzero reserves verified on-chain; router sanity quotes sane.",
      ),
      taxUnknown(),
      ownerUnknown(),
      lockUnknown(),
    ],
  },
  {
    address: "0x94534EeEe131840b1c0F61847c572228bdfDDE93",
    symbol: "pTGC",
    name: "pTGC",
    vettedAt: "2026-09-26",
    deployedAt: "2023-10-11",
    status: "listed",
    checks: [
      c(
        "code",
        "Contract exists",
        "pass",
        "Contract code found on PulseChain (verified 2026-09-26).",
      ),
      c(
        "metadata",
        "On-chain metadata",
        "pass",
        "name(), symbol(), decimals() return sane values (18 decimals).",
      ),
      c(
        "pair",
        "Liquidity exists",
        "pass",
        "WPLS pair with nonzero reserves verified on-chain; router sanity quotes sane.",
      ),
      taxUnknown(),
      ownerUnknown(),
      lockUnknown(),
    ],
  },
  {
    address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    symbol: "WBTC",
    name: "Wrapped Bitcoin (PulseChain)",
    vettedAt: "2026-09-26",
    deployedAt: "2023-05-13",
    status: "listed",
    note: "Bridged WBTC on PulseChain. 8 decimals.",
    checks: [
      c(
        "code",
        "Contract exists",
        "pass",
        "Contract code found on PulseChain (verified 2026-09-26).",
      ),
      c(
        "metadata",
        "On-chain metadata",
        "pass",
        'name(), symbol(), decimals() return sane values ("WBTC" / 8 decimals).',
      ),
      c(
        "pair",
        "Liquidity exists",
        "pass",
        "WBTC/DUMB direct pair 0x8ff3b2e30a8e9aa2903944d39a7383f6ee112d5e (token0=WBTC) and WPLS pair both verified: nonzero reserves, factory.getPair match.",
      ),
      taxUnknown(),
      ownerUnknown(),
      lockUnknown(),
    ],
  },
  {
    address: "0xd6c31bA0754C4383A41c0e9DF042C62b5e918f6d",
    symbol: "TEDDY",
    name: "TEDDY BEAR",
    vettedAt: "2026-09-28",
    deployedAt: "2023-06-01",
    status: "listed",
    checks: [
      c(
        "code",
        "Contract exists",
        "pass",
        "Contract code found on PulseChain (verified 2026-09-28).",
      ),
      c(
        "metadata",
        "On-chain metadata",
        "pass",
        'name(), symbol(), decimals(), totalSupply() all read cleanly ("TEDDY BEAR" / "TEDDY" / 18).',
      ),
      c(
        "pair",
        "Liquidity exists",
        "pass",
        "TEDDY/WPLS pair 0x31eF9a41500E6BD18524404aC9c5B88D04AA924E (token0=WPLS): factory.getPair match, ~2.5B WPLS reserves.",
      ),
      c(
        "quickscan",
        "Quick scan",
        "pass",
        "Passed the hub's own quick scan with no fails (2026-09-28).",
      ),
      taxUnknown(),
      ownerUnknown(),
      lockCaution(),
    ],
  },
  {
    address: "0x8Da17Db850315A34532108f0f5458fc0401525f6",
    symbol: "SOLIDX",
    name: "SOLIDX",
    vettedAt: "2026-09-28",
    deployedAt: "2024-04-01",
    status: "listed",
    checks: [
      c(
        "code",
        "Contract exists",
        "pass",
        "Contract code found on PulseChain (verified 2026-09-28).",
      ),
      c(
        "metadata",
        "On-chain metadata",
        "pass",
        'name(), symbol(), decimals(), totalSupply() all read cleanly ("SOLIDX" / 18 decimals).',
      ),
      c(
        "pair",
        "Liquidity exists",
        "pass",
        "SOLIDX/WPLS pair 0x58Ce9f72Be187BB0cb44F4f0b05465D170AC4c86 (token0=SOLIDX): factory.getPair match, ~305M WPLS reserves.",
      ),
      c(
        "quickscan",
        "Quick scan",
        "pass",
        "Passed the hub's own quick scan with no fails (2026-09-28).",
      ),
      taxUnknown(),
      ownerUnknown(),
      lockCaution(),
    ],
  },
  {
    address: "0xc10A4Ed9b4042222d69ff0B374eddd47ed90fC1F",
    symbol: "PCOCK",
    name: "PCOCK",
    vettedAt: "2026-09-28",
    deployedAt: "2025-07-20",
    status: "listed",
    checks: [
      c(
        "code",
        "Contract exists",
        "pass",
        "Contract code found on PulseChain (verified 2026-09-28).",
      ),
      c(
        "metadata",
        "On-chain metadata",
        "pass",
        'name(), symbol(), decimals(), totalSupply() all read cleanly ("PCOCK" / 18 decimals).',
      ),
      c(
        "pair",
        "Liquidity exists",
        "pass",
        "PCOCK/WPLS pair 0xCb99800B71B7FB0696D19c3aaAa20c03d2D7e449 (token0=WPLS): factory.getPair match, ~4.3B WPLS reserves.",
      ),
      c(
        "quickscan",
        "Quick scan",
        "pass",
        "Passed the hub's own quick scan with no fails (2026-09-28).",
      ),
      taxUnknown(),
      ownerUnknown(),
      lockCaution(),
    ],
  },
  {
    address: "0x0567CA0dE35606E9C260CC2358404B11DE21DB44",
    symbol: "HELGO",
    name: "HELGO",
    vettedAt: "2026-09-28",
    deployedAt: "2023-06-15",
    status: "listed",
    checks: [
      c(
        "code",
        "Contract exists",
        "pass",
        "Contract code found on PulseChain (verified 2026-09-28).",
      ),
      c(
        "metadata",
        "On-chain metadata",
        "pass",
        'name(), symbol(), decimals(), totalSupply() all read cleanly ("HELGO" / 18 decimals).',
      ),
      c(
        "pair",
        "Liquidity exists",
        "pass",
        "HELGO/WPLS pair 0xFdDbFa9497270cDb16300482C1bF43F5bDe28beD (token0=HELGO): factory.getPair match, ~72M WPLS reserves.",
      ),
      c(
        "quickscan",
        "Quick scan",
        "pass",
        "Passed the hub's own quick scan with no fails (2026-09-28).",
      ),
      taxUnknown(),
      ownerUnknown(),
      lockCaution(),
    ],
  },
];

export const LISTED_TOKENS = VETTED_LISTINGS.filter((l) => l.status === "listed");
export const DELISTED_TOKENS = VETTED_LISTINGS.filter((l) => l.status === "delisted");
