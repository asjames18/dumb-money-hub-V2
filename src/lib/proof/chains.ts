// Chain registry for the Proof Hub.
//
// Everything network-specific lives here so adding a deployment is a config
// change rather than an edit to the fetchers. The hub is PulseChain-only.

export type ChainKey = "pulsechain-testnet" | "pulsechain";

export type ChainConfig = {
  key: ChainKey;
  /** Short label shown next to a token in the UI. */
  label: string;
  chainId: number;
  rpc: string;
  /** BlockScout-style REST base, or null when the chain has no scan API. */
  scanApi: string | null;
  scanApiV2: string | null;
  /** Human-facing explorer root, used to build address links. */
  explorer: string;
  /** True for networks whose tokens carry no real value. */
  isTestnet: boolean;
};

// Chain IDs verified 2026-09-26 via eth_chainId on the public RPCs:
//   mainnet 0x171 = 369, testnet v4 0x3af = 943.
export const CHAINS: Record<ChainKey, ChainConfig> = {
  "pulsechain-testnet": {
    key: "pulsechain-testnet",
    label: "PulseChain Testnet",
    chainId: 943,
    rpc: "https://rpc.v4.testnet.pulsechain.com",
    scanApi: "https://scan.v4.testnet.pulsechain.com/api",
    scanApiV2: "https://scan.v4.testnet.pulsechain.com/api/v2",
    explorer: "https://scan.v4.testnet.pulsechain.com",
    isTestnet: true,
  },
  pulsechain: {
    key: "pulsechain",
    label: "PulseChain",
    chainId: 369,
    rpc: "https://rpc.pulsechain.com",
    scanApi: "https://scan.pulsechain.com/api",
    scanApiV2: "https://scan.pulsechain.com/api/v2",
    explorer: "https://scan.pulsechain.com",
    isTestnet: false,
  },
};

export const addressUrl = (chain: ChainConfig, address: string) =>
  `${chain.explorer}/address/${address}`;

/** Link to a transaction on the chain's explorer. */
export const txUrl = (chain: ChainConfig, txHash: string) => `${chain.explorer}/tx/${txHash}`;

/** Public RPCs are rate limited; these calls are best-effort and must not hang. */
export const RPC_TIMEOUT_MS = 12_000;
