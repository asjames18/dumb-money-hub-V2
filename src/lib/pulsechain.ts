// PulseChain constants for the on-site DUMB swap.
// Every address below was verified on-chain 2026-09-26 (eth_call against
// https://rpc.pulsechain.com):
//   - WPLS/DUMB pair token0/token1 + factory() -> WPLS, DUMB, PulseXFactory
//   - DAMP/WPLS pair token0/token1 -> DAMP, WPLS (cross-confirms WPLS)
//   - DUMB.ROUTER() / DAMP.ROUTER() -> the PulseX V2 router
//   - router.factory() -> PulseXFactory; router.WPLS() -> WPLS
//   - WPLS symbol() = "WPLS", name() = "Wrapped Pulse"
//   - PulseXFactory is the verified "PulseXFactory" contract on scan.pulsechain.com
//   - DAMP/WPLS pair token0/token1 -> DAMP, WPLS (note: reversed vs WPLS/DUMB)
//   - DAMP.fees() = 300 (3% tax); getAmountsOut(1 PLS, [WPLS, DAMP]) sane
// Curated swap inputs (verified on-chain 2026-09-26):
//   - HEX = pHEX 0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39 ("HEX", 8 decimals);
//     HEX/WPLS pair 0x19bb45a7270177e303dee6eaa6f5ad700812ba98 (token0=HEX,
//     ~130M HEX + ~37.8B WPLS reserves); getAmountsOut(1 HEX,[HEX,WPLS,DUMB])
//     and [HEX,WPLS,DAMP] sane
//   - DAI REMOVED 2026-09-28 per Antonio (see note below).
//   - PLSX REJECTED (2026-09-26, first pass): the REMEMBERED address
//     0x95B303987A60C71504D99Aa4b13fcA6295C4e928 has no contract — that
//     address was simply wrong. The REAL PLSX came from the DAMP/PLSX pair's
//     token1(): 0x95B303987A60C71504D99Aa1b13B4DA07b0790ab ("PulseX"/"PLSX",
//     18 decimals, has code) — verified 2026-09-26 via eth_getCode + name().
//     eWBTC/bridged-WETH full addresses could not be sourced — not listed.
//     Fewer verified tokens beats more unverified ones.
//   - DAI (bridged) REMOVED 2026-09-28 per Antonio — delisted from swap,
//     wallet, pricing, and scanner identity lists.
// Curated WPLS-routed swap inputs added 2026-09-28 (verified on-chain:
//   name()/symbol()/decimals()/totalSupply() + factory.getPair -> WPLS pair
//   + getReserves nonzero, and each passed the site's own quickScan with no
//   fails — only the standard not-burned-LP caution):
//   - TEDDY = 0xd6c31bA0754C4383A41c0e9DF042C62b5e918f6d ("TEDDY BEAR"/"TEDDY", 18 decimals);
//     TEDDY/WPLS pair 0x31eF9a41500E6BD18524404aC9c5B88D04AA924E (token0=WPLS, ~2.5B WPLS reserves)
//   - SOLIDX = 0x8Da17Db850315A34532108f0f5458fc0401525f6 ("SOLIDX", 18 decimals);
//     SOLIDX/WPLS pair 0x58Ce9f72Be187BB0cb44F4f0b05465D170AC4c86 (token0=SOLIDX, ~305M WPLS reserves)
//   - PCOCK = 0xc10A4Ed9b4042222d69ff0B374eddd47ed90fC1F ("PCOCK", 18 decimals);
//     PCOCK/WPLS pair 0xCb99800B71B7FB0696D19c3aaAa20c03d2D7e449 (token0=WPLS, ~4.3B WPLS reserves)
//   - HELGO = 0x0567CA0dE35606E9C260CC2358404B11DE21DB44 ("HELGO", 18 decimals);
//     HELGO/WPLS pair 0xFdDbFa9497270cDb16300482C1bF43F5bDe28beD (token0=HELGO, ~72M WPLS reserves)
// Direct DUMB/DAMP markets (all verified on-chain 2026-09-26: token0/token1,
// both reserves nonzero, factory.getPair(token0,token1) returns the pair):
//   - HEX/DUMB  0x2ccD79c8bc9f2fd84782E9aBd2F2eECC56042106 (token0=HEX)
//   - INC/DUMB  0x2d10D66f753b8BCC2CBcE4793Fd8661fc620aA13 (token0=INC)
//   - DAMP/PLSX  0xf93fE23fcD5A822fE40fcfeaa3d848B5beD3bf4C (token0=DAMP)
//   - HEX/DAMP  0x032F40fd0E48fB7811cf29b8585D88A5C118d48b (token0=HEX)
//   - INC/DAMP  0x594D5ae93A3985bC3Cd0fE7d2ca00ECbD344FE0B (token0=INC)
//   - INC  = 0x2fa878Ab3F87CC1C9737Fc071108F904c0B0C95d ("INC", 18 decimals)
// Never hand-edit an address here: re-verify with eth_call first.

import { defineChain } from "viem";

export const pulsechain = defineChain({
  id: 369,
  name: "PulseChain",
  nativeCurrency: { name: "Pulse", symbol: "PLS", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.pulsechain.com"] },
  },
  blockExplorers: {
    default: { name: "PulseChain Scan", url: "https://scan.pulsechain.com" },
  },
});

export const DUMB = "0xe65112d2f120c8cb23ADC80D8E8122c0c8b7fF8D" as const;
export const DAMP = "0x8357aA9070dc7d8d154Da74561CEc58cA30c41C3" as const;
export const WPLS = "0xA1077a294dDE1B09bB078844df40758a5D0f9a27" as const;
export const PULSEX_V2_ROUTER = "0x165C3410fC91EF562C50559f7d2289fEbed552d9" as const;
export const PULSEX_V2_FACTORY = "0x29eA7545DEf87022BAdc76323F373EA1e707C523" as const;
export const WPLS_DUMB_PAIR = "0x221f63Fb54f3fBC6C60B3D22bc9BcB5Fd1d0d186" as const;
export const DAMP_WPLS_PAIR = "0xB256769d6B9d53E0E66a395C17135F8855A8633A" as const;
/** pHEX — the preferred HEX on PulseChain. 8 decimals. */
export const HEX = "0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39" as const;
/** HEX/WPLS pair (token0 = HEX). */
export const HEX_WPLS_PAIR = "0x19bb45a7270177e303dee6eaa6f5ad700812ba98" as const;
/** INC — 18 decimals. Direct DUMB + DAMP pairs (verified). */
export const INC = "0x2fa878Ab3F87CC1C9737Fc071108F904c0B0C95d" as const;
/** Real PLSX — the PulseX token. 18 decimals. (An earlier remembered address was wrong.) */
export const PLSX = "0x95B303987A60C71504D99Aa1b13B4DA07b0790ab" as const;
export const PRVX = "0xF6f8Db0aBa00007681F8fAF16A0FDa1c9B030b11" as const;
export const PTGC = "0x94534EeEe131840b1c0F61847c572228bdfDDE93" as const;
export const WBTC = "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599" as const;
/** TEDDY BEAR — 18 decimals. Verified on-chain 2026-09-28 (name/symbol/decimals/supply + WPLS pair). */
export const TEDDY = "0xd6c31bA0754C4383A41c0e9DF042C62b5e918f6d" as const;
/** TEDDY/WPLS pair (token0 = WPLS). Verified 2026-09-28: ~2.5B WPLS reserves. */
export const TEDDYWPLS_PAIR = "0x31eF9a41500E6BD18524404aC9c5B88D04AA924E" as const;
/** Solid X — 18 decimals. Verified on-chain 2026-09-28. */
export const SOLIDX = "0x8Da17Db850315A34532108f0f5458fc0401525f6" as const;
/** SOLIDX/WPLS pair (token0 = SOLIDX). Verified 2026-09-28: ~305M WPLS reserves. */
export const SOLIDXWPLS_PAIR = "0x58Ce9f72Be187BB0cb44F4f0b05465D170AC4c86" as const;
/** PulseChain Peacock — 18 decimals. Verified on-chain 2026-09-28. */
export const PCOCK = "0xc10A4Ed9b4042222d69ff0B374eddd47ed90fC1F" as const;
/** PCOCK/WPLS pair (token0 = WPLS). Verified 2026-09-28: ~4.3B WPLS reserves. */
export const PCOCKWPLS_PAIR = "0xCb99800B71B7FB0696D19c3aaAa20c03d2D7e449" as const;
/** HELGO — 18 decimals. Verified on-chain 2026-09-28. */
export const HELGO = "0x0567CA0dE35606E9C260CC2358404B11DE21DB44" as const;
/** HELGO/WPLS pair (token0 = HELGO). Verified 2026-09-28: ~72M WPLS reserves. */
export const HELGOWPLS_PAIR = "0xFdDbFa9497270cDb16300482C1bF43F5bDe28beD" as const;
/** HEX/DUMB pair (token0 = HEX). */
export const HEX_DUMB_PAIR = "0x2ccD79c8bc9f2fd84782E9aBd2F2eECC56042106" as const;
/** INC/DUMB pair (token0 = INC). */
export const INC_DUMB_PAIR = "0x2d10D66f753b8BCC2CBcE4793Fd8661fc620aA13" as const;
/** DAMP/PLSX pair (token0 = DAMP). */
export const DAMP_PLSX_PAIR = "0xf93fE23fcD5A822fE40fcfeaa3d848B5beD3bf4C" as const;
/** HEX/DAMP pair (token0 = HEX). */
export const HEX_DAMP_PAIR = "0x032F40fd0E48fB7811cf29b8585D88A5C118d48b" as const;
/** INC/DAMP pair (token0 = INC). */
export const INC_DAMP_PAIR = "0x594D5ae93A3985bC3Cd0fE7d2ca00ECbD344FE0B" as const;
/** DUMB/PLSX pair (token0 = PLSX). Discovered 2026-09-26 via factory.getPair —
 *  reserves ~235.7M PLSX / ~511.3M DUMB, both nonzero; 1000 DUMB -> ~455 PLSX sane. */
export const DUMB_PLSX_PAIR = "0xce7dbd7fa7cb61ebe002dba028e3993a28099fd6" as const;
export const DEAD = "0x000000000000000000000000000000000000dEaD" as const;
/**
 * DripVault v1 — the community "Feed the Burn" vault (PulseChain mainnet).
 * Verified on-chain 2026-09-28 by eth_call from the deployment receipt:
 *   - deployed at block 27663330 by 0xBeFf5717D28DE2149aD9732f09c22f4d4a77BbeC
 *   - tx 0xef8f4c2f44a38fa091320b9f74fc97dc64726fd38a227cd75d8a99d357a8d33f
 *   - immutables read live: ROUTER()=0x165C…552d9, DUMB()=0xe651…7fF8D,
 *     WPLS()=0xA107…f9a27, DEAD()=0x000…dEaD, DUST()=1e12, COOLDOWN()=900
 *   - runtime bytecode matched the audited local build (8002 bytes; only
 *     immutable slots + metadata differed)
 * No owner, no upgrade, no withdraw, no rescue, no pause. Immutable forever.
 */
export const DRIP_VAULT = "0x67c0553cC87b505006E5137FBE3AD7c4660C44ee" as const;
/** Deployment block — start of the Drip event log window. */
export const DRIP_VAULT_DEPLOY_BLOCK = 27663330n;
/**
 * First block at/after Sept 21 2026 00:00 EDT — start of the voluntary-burn
 * leaderboard epoch. Found once via binary search on the public RPC
 * 2026-09-28 (this block's ts = 2026-09-21T04:00:05Z; previous block =
 * 2026-09-21T03:59:55Z). Hardcoded like DRIP_VAULT_DEPLOY_BLOCK.
 */
export const BURN_EPOCH_BLOCK = 27599124n;
/** Per-token cooldown between drips, seconds. Immutable in the contract. */
export const DRIP_COOLDOWN_S = 900;
/** Minimum vault balance for a drip to do anything. Immutable in the contract. */
export const DRIP_DUST = 1000000000000n;
/** Curated vault tokens. Only these are guaranteed routable — anything else
 *  donated may sit stuck in the vault forever. */
/** Tokens the Feed the Burn vault accepts. Donated tokens are dripped through
 *  WPLS into DUMB and burned — pure buy-and-burn, no DUMB/DAMP deposits. */
export const DRIP_VAULT_TOKENS = [
  { symbol: "WPLS", address: WPLS, decimals: 18 },
  { symbol: "HEX", address: HEX, decimals: 8 },
  { symbol: "INC", address: INC, decimals: 18 },
  { symbol: "PRVX", address: PRVX, decimals: 18 },
  { symbol: "PLSX", address: PLSX, decimals: 18 },
] as const;
/** Minimal DripVault ABI: what the site needs and nothing more. */
export const dripVaultAbi = [
  {
    type: "function",
    name: "drip",
    stateMutability: "nonpayable",
    inputs: [{ name: "token", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "lastDrip",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "event",
    name: "Drip",
    inputs: [
      { name: "token", type: "address", indexed: true },
      { name: "sold", type: "uint256", indexed: false },
      { name: "dumbBurned", type: "uint256", indexed: false },
    ],
  },
] as const;

/**
 * VERIFIED additional buy inputs (Antonio, 2026-09-26, PulseChain 369):
 *
 * PRVX  0xF6f8Db0aBa00007681F8fAF16A0FDa1c9B030b11 — symbol "PRVX", 18 dec, has code.
 *       WPLS pair 0x62f7d076c92db76cf84223b6309801ea461d7afe, reserves ~3.16M WPLS /
 *       ~420.4M PRVX (both nonzero), token0 = WPLS. Routed PRVX->WPLS->DUMB/DAMP.
 *       Sanity: 1 PRVX -> ~0.02 DUMB via router getAmountsOut.
 * pTGC  0x94534EeEe131840b1c0F61847c572228bdfDDE93 — symbol "pTGC", 18 dec, has code.
 *       WPLS pair 0x2491574f78410460ab6b1e9b39b21ce3bcfb69e8, reserves ~52.0M pTGC /
 *       ~185.2M WPLS (both nonzero), token0 = pTGC. Routed pTGC->WPLS->DUMB/DAMP.
 *       Sanity: 1 pTGC -> ~9.48 DUMB via router getAmountsOut.
 * WBTC  0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599 — symbol "WBTC", 8 dec, has code
 *       on PulseChain (same address format as Ethereum WBTC, but this IS a
 *       PulseChain contract). DIRECT WBTC/DUMB pair
 *       0x8ff3b2e30a8e9aa2903944d39a7383f6ee112d5e, reserves ~10.31 WBTC /
 *       ~614.8M DUMB (both nonzero), token0 = WBTC — preferred route for DUMB.
 *       WPLS pair 0xe0e1f83a1c64cf65c1a86d7f3445fc4f58f7dcbf for WBTC->WPLS->DAMP.
 *       Sanity: 1 WBTC -> ~54.2M DUMB direct; -> ~8.75M DAMP via WPLS.
 *
 * Confirmed-and-skipped (already listed, no change needed):
 *   PLSX 0x95B303987A60C71504D99Aa1b13B4DA07b0790ab — real PulseX (has code,
 *        name "PulseX"); the lookalike 0x95B303987A60C71504D99Aa4b13fcA6295C4e928
 *        has NO contract and is NOT used anywhere.
 *   pHEX 0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39 — already a buy input.
 */
/** Direct WBTC/DUMB pair (token0 = WBTC). */
export const WBTCDUMB_PAIR = "0x8ff3b2e30a8e9aa2903944d39a7383f6ee112d5e" as const;
/** WPLS routing pairs for the new multihop inputs. */
export const PRVXWPLS_PAIR = "0x62f7d076c92db76cf84223b6309801ea461d7afe" as const;
export const PTGCWPLS_PAIR = "0x2491574f78410460ab6b1e9b39b21ce3bcfb69e8" as const;
export const WBTCWPLS_PAIR = "0xe0e1f83a1c64cf65c1a86d7f3445fc4f58f7dcbf" as const;
/**
 * INC/WPLS pair (token0 = INC). Discovered 2026-09-26 via factory.getPair —
 * token0/token1 + nonzero reserves verified on-chain before use in USD pricing.
 */
export const INCWPLS_PAIR = "0x5b9661276708202dd1a0dd2346a3856b00d3c251" as const;
/**
 * PLSX/WPLS pair (token0 = PLSX). Discovered 2026-09-26 via factory.getPair —
 * token0/token1 + nonzero reserves verified on-chain before use in USD pricing.
 */
export const PLSXWPLS_PAIR = "0x149b2c629e652f2e89e11cd57e5d4d77ee166f9f" as const;

/** DUMB transfer tax in basis points — read live from fees(), 600 = 6%. */
export const DUMB_TAX_BPS = 600;
/** Fraction of a DUMB transfer that survives the tax. */
export const DUMB_AFTER_TAX = 1 - DUMB_TAX_BPS / 10_000;
/** DAMP transfer tax in basis points — read live from fees(), 300 = 3%. */
export const DAMP_TAX_BPS = 300;
/** Fraction of a DAMP transfer that survives the tax. */
export const DAMP_AFTER_TAX = 1 - DAMP_TAX_BPS / 10_000;

/**
 * Minimal Safemoon-fork tax surface for live proof reads.
 * Verified on-chain 2026-09-28: fees() = 600 (DUMB) / 300 (DAMP);
 * feesDistribution() = (3333,3333,1667,1667) on DUMB, (3333,0,3333,3334) on
 * DAMP — four uint256 shares of 10_000 of the tax (legs 0+1+2 burn/entomb,
 * leg 3 reflects). Selectors 0x9af1d35a / 0xb068d56e.
 */
export const taxAbi = [
  {
    type: "function",
    name: "fees",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "feesDistribution",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "", type: "uint256" },
      { name: "", type: "uint256" },
      { name: "", type: "uint256" },
      { name: "", type: "uint256" },
    ],
  },
] as const;

/** Minimal PulseX V2 router surface the swap box needs. */
export const routerAbi = [
  {
    type: "function",
    name: "getAmountsOut",
    stateMutability: "view",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "path", type: "address[]" },
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }],
  },
  {
    type: "function",
    name: "swapExactETHForTokensSupportingFeeOnTransferTokens",
    stateMutability: "payable",
    inputs: [
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "swapExactTokensForETHSupportingFeeOnTransferTokens",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "swapExactTokensForTokensSupportingFeeOnTransferTokens",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

/** Minimal pair surface: reserves for price-impact math. */
export const pairAbi = [
  {
    type: "function",
    name: "getReserves",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "reserve0", type: "uint112" },
      { name: "reserve1", type: "uint112" },
      { name: "blockTimestampLast", type: "uint32" },
    ],
  },
] as const;

/** Minimal ERC20 surface: balances + exact-amount approvals + plain transfers
 *  (used by the voluntary burn box: a burn is an ordinary transfer to the
 *  dead address — no contract, no approval needed). */
export const erc20Abi = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "totalSupply",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const explorerTx = (hash: string) => `${pulsechain.blockExplorers.default.url}/tx/${hash}`;
export const explorerAddress = (address: string) =>
  `${pulsechain.blockExplorers.default.url}/address/${address}`;
