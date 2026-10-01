import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect } from "react";

import { WagmiProvider } from "wagmi";

import appCss from "../styles.css?url";
import { Smiley } from "@/components/dumb/Smiley";
import { Toaster } from "@/components/ui/sonner";
import { wagmiConfig } from "@/lib/wagmi";

const NOT_FOUND_LINKS = [
  { to: "/trade", label: "Trade", blurb: "Swap DUMB or DAMP on the live pairs" },
  { to: "/wallet", label: "Wallet", blurb: "Your PLS, DUMB and DAMP balances" },
  { to: "/proof", label: "Proof", blurb: "DUMB receipts — contract, supply, tax" },
  { to: "/genesis", label: "Genesis", blurb: "The supply story — 69% immobilized" },
  { to: "/roots", label: "Dashboard", blurb: "DUMB & DAMP on PulseChain — price, pools, supply" },
  { to: "/ai", label: "Dumb AI", blurb: "Ask the helper" },
  { to: "/plan", label: "Plan", blurb: "Roadmap: plans, not promises" },
  { to: "/whitepaper", label: "Whitepaper", blurb: "How DUMB actually works" },
  { to: "/raid", label: "Raid", blurb: "Missions and XP" },
  { to: "/culture", label: "Culture", blurb: "Smiley and the brand" },
] as const;

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="max-w-lg text-center">
        <Smiley variant="full" className="mx-auto w-28" />
        <p className="mt-6 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          404
        </p>
        <h1 className="font-display mt-2 text-3xl font-bold text-foreground">
          This page doesn't exist. DUMB does.
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Nothing was bought, nothing was sold, no money moved — this URL is just not a thing.
          Here's where the real stuff lives:
        </p>
        <div className="mt-6 grid grid-cols-2 gap-2 text-left sm:grid-cols-4">
          {NOT_FOUND_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-lg border border-border bg-card px-3 py-2 transition-colors hover:border-primary/60 hover:bg-primary/5"
            >
              <span className="block text-sm font-semibold text-foreground">{link.label}</span>
              <span className="block text-xs text-muted-foreground">{link.blurb}</span>
            </Link>
          ))}
        </div>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Dumb Money Hub — The Home of Retail Crypto" },
      {
        name: "description",
        content:
          "Smiley-led control room for Dumb Money on PulseChain: the live DUMB token's receipts, raid missions, and the Dump AI helper. Community tool, not financial advice.",
      },
      { name: "author", content: "Dumb Money" },
      { name: "theme-color", content: "#39ff14" },
      { property: "og:site_name", content: "Dumb Money Hub" },
      { property: "og:title", content: "Dumb Money Hub — The Home of Retail Crypto" },
      {
        property: "og:description",
        content:
          "DUMB and DAMP are immutable PulseChain tax tokens — DUMB: 6% on every transfer (5% instant burn, 1% reflections); DAMP: 3% (2% instant burn, 1% reflections). Trade them on-site, verify everything on-chain.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://dumbmoneypulse.melanatedintech.com/" },
      {
        property: "og:image",
        content: "https://dumbmoneypulse.melanatedintech.com/og-card.png",
      },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "DUMB MONEY — PulseChain's tax-burning meme token hub" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@dumbmoneydotwin" },
      { name: "twitter:title", content: "Dumb Money Hub — The Home of Retail Crypto" },
      {
        name: "twitter:description",
        content:
          "DUMB and DAMP are immutable PulseChain tax tokens — DUMB: 6% on every transfer (5% instant burn, 1% reflections); DAMP: 3% (2% instant burn, 1% reflections).",
      },
      {
        name: "twitter:image",
        content: "https://dumbmoneypulse.melanatedintech.com/og-card.png",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  // First-party anonymous pageview beacon: { path, referrer, ts } ONLY.
  // No cookies, no fingerprinting, no wallet data, no PII. Must never
  // break the app — every failure path is silent.
  useEffect(() => {
    const ping = () => {
      try {
        // The private /stats page is never tracked — not even its pageviews.
        if (window.location.pathname.startsWith("/stats")) return;
        const body = JSON.stringify({
          path: window.location.pathname,
          referrer: document.referrer || "",
          ts: Date.now(),
        });
        if (body.length <= 2048 && typeof navigator.sendBeacon === "function") {
          navigator.sendBeacon("/api/ping", body);
        }
      } catch {
        /* analytics must never break the app */
      }
    };
    ping();
    const unsubscribe = router.history.subscribe(() => ping());
    return () => unsubscribe();
  }, [router]);

  // Owner shortcut: Alt+S jumps to the private /stats page on any route.
  // Hidden by design — /stats stays unlisted (no nav link, no sitemap,
  // robots-disallowed); this just saves Antonio having to remember the URL.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      try {
        if (e.altKey && !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === "s") {
          // Never yank someone out of a form field (scan box, AI chat, burn
          // amount, etc.) — the shortcut can be re-pressed from outside it.
          const t = e.target as HTMLElement | null;
          if (
            t &&
            (t.tagName === "INPUT" ||
              t.tagName === "TEXTAREA" ||
              t.tagName === "SELECT" ||
              t.isContentEditable)
          )
            return;
          if (!window.location.pathname.startsWith("/stats")) {
            e.preventDefault();
            router.navigate({ to: "/stats" });
          }
        }
      } catch {
        /* owner shortcut must never break the app */
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
        <Toaster />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
