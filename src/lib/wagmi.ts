// wagmi config for the on-site DUMB swap.
//
// Injected connector first (MetaMask / Brave / Coinbase-injected auto-detect) —
// no API keys, no accounts, no custody: the site never holds keys or funds,
// every transaction is proposed to the user's own wallet for approval.
//
// WALLET CONNECT: to add it later, set WALLETCONNECT_PROJECT_ID to a Reown
// project ID and uncomment the walletConnect() line below. No project ID is
// hardcoded or invented here — the injected connector works without one.

import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
// import { walletConnect } from "wagmi/connectors";

import { pulsechain } from "./pulsechain";

/** Reown project ID for WalletConnect. Null = WalletConnect disabled. */
export const WALLETCONNECT_PROJECT_ID: string | null = null;

export const wagmiConfig = createConfig({
  chains: [pulsechain],
  connectors: [
    injected(),
    // ...(WALLETCONNECT_PROJECT_ID
    //   ? [walletConnect({ projectId: WALLETCONNECT_PROJECT_ID })]
    //   : []),
  ],
  transports: {
    [pulsechain.id]: http(),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
