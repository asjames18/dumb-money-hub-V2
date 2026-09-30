import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";

import { ConnectButton } from "@/components/dumb/ConnectButton";
import { Disclaimer } from "@/components/dumb/Disclaimer";
import { MobileNav } from "@/components/dumb/MobileNav";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import smileyFace from "@/assets/smiley-face.png";
import { Button } from "@/components/ui/button";

/** Primary desktop nav: the tools. Everything else lives under "More". */
const PRIMARY_NAV = [
  { to: "/trade", label: "Trade" },
  { to: "/burn", label: "Burn" },
  { to: "/scan", label: "Scan" },
  { to: "/wallet", label: "Wallet" },
];

/** Content pages, tucked into the "More" dropdown so the header stays clean. */
const MORE_NAV = [
  { to: "/story", label: "Story" },
  { to: "/proof", label: "Proof" },
  { to: "/genesis", label: "Genesis" },
  { to: "/roots", label: "Dashboard" },
  { to: "/raid", label: "Raid" },
  { to: "/ai", label: "Dumb AI" },
  { to: "/culture", label: "Culture" },
  { to: "/plan", label: "Plan" },
  { to: "/whitepaper", label: "Whitepaper" },
];

const NAV_LINK =
  "rounded-md px-3 py-1.5 font-display text-sm uppercase tracking-widest whitespace-nowrap text-muted-foreground transition-colors hover:bg-secondary hover:text-primary";

function DesktopNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const moreActive = MORE_NAV.some((n) => pathname === n.to);

  return (
    <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
      {PRIMARY_NAV.map((n) => (
        <Link key={n.to} to={n.to} activeProps={{ className: "text-primary" }} className={NAV_LINK}>
          {n.label}
        </Link>
      ))}
      <DropdownMenu>
        <DropdownMenuTrigger
          className={`${NAV_LINK} inline-flex cursor-pointer items-center gap-1 ${
            moreActive ? "text-primary" : ""
          }`}
          aria-label="More pages"
        >
          More <ChevronDown className="size-3.5" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          {MORE_NAV.map((n) => (
            <DropdownMenuItem key={n.to} asChild>
              <Link
                to={n.to}
                activeProps={{ className: "text-primary" }}
                className="cursor-pointer font-display text-sm uppercase tracking-widest"
              >
                {n.label}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-0">
      {/* Skip link: keyboard and screen-reader users otherwise tab through the
          entire sticky header (nav, dropdown, wallet connect, Trade CTA) on
          every page before reaching the page's own content. Routes render their
          own <main>, so the skip target is a plain focusable wrapper. */}
      <a
        href="#page-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-gold focus:px-4 focus:py-2 focus:font-display focus:text-sm focus:font-bold focus:uppercase focus:tracking-widest focus:text-background"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-20 border-b-2 border-foreground/20 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <img
              src={smileyFace}
              alt="Smiley, the Dumb Money mascot"
              width={64}
              height={64}
              className="size-8 shrink-0 rounded-full"
            />
            <span className="flex min-w-0 flex-col leading-none">
              <span className="truncate font-display text-base uppercase tracking-wide">
                Dumb Money Hub
              </span>
              <span className="hidden text-[10px] font-bold uppercase tracking-[0.25em] text-pink sm:block">
                PulseChain-first
              </span>
            </span>
          </Link>
          <DesktopNav />
          <div className="flex shrink-0 items-center gap-2">
            <ConnectButton compact />
            <Button
              asChild
              size="sm"
              className="shrink-0 rounded-md bg-primary font-display text-sm uppercase tracking-widest text-primary-foreground hover:bg-primary/90"
            >
              <Link to="/trade">
                <span className="sm:hidden">Trade</span>
                <span className="hidden sm:inline">Trade DUMB</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* tabIndex -1 so anchor activation moves focus here, not just scroll. */}
      <div id="page-content" tabIndex={-1} className="outline-none">
        {children}
      </div>

      <footer className="border-t-2 border-foreground/20">
        <div className="mx-auto max-w-6xl px-4 py-8 text-xs leading-relaxed text-muted-foreground">
          <p className="font-display text-base uppercase tracking-wide text-foreground">
            Dumb Money Hub <span className="text-pink">·</span> Meme first. Proof second. Community
            always.
          </p>
          <Disclaimer variant="long" className="mt-3 max-w-3xl" />
          <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
            <Link
              to="/whitepaper"
              className="font-display uppercase tracking-wide text-foreground hover:text-pink"
            >
              Read the whitepaper
            </Link>
            <Link
              to="/feedback"
              className="font-display uppercase tracking-wide text-foreground hover:text-pink"
            >
              Report a bug · Suggest a feature
            </Link>
            <Link
              to="/terms"
              className="font-display uppercase tracking-wide text-foreground hover:text-pink"
            >
              Terms
            </Link>
            <Link
              to="/privacy"
              className="font-display uppercase tracking-wide text-foreground hover:text-pink"
            >
              Privacy
            </Link>
          </p>
          <p className="mt-3">
            Anonymous visit counts only — no cookies, no tracking, no wallet data.
          </p>
        </div>
      </footer>

      <MobileNav />
    </div>
  );
}
