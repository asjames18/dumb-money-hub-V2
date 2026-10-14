import { useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  BookOpen,
  Bot,
  FileText,
  Flame,
  Library,
  Map,
  Megaphone,
  MoreHorizontal,
  Network,
  Palette,
  PieChart,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";

import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const PRIMARY_TABS = [
  { to: "/trade", label: "Trade", icon: ArrowLeftRight },
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/story", label: "Story", icon: BookOpen },
  { to: "/proof", label: "Proof", icon: ShieldCheck },
];

const MORE_LINKS = [
  { to: "/burn", label: "Burn", icon: Flame },
  { to: "/scan", label: "Scan", icon: ScanSearch },
  { to: "/directory", label: "Directory", icon: Library },
  { to: "/portfolio", label: "Portfolio", icon: PieChart },
  { to: "/genesis", label: "Genesis", icon: Sparkles },
  { to: "/roots", label: "Dashboard", icon: Network },
  { to: "/raid", label: "Raid", icon: Megaphone },
  { to: "/ai", label: "Dumb AI", icon: Bot },
  { to: "/culture", label: "Culture", icon: Palette },
  { to: "/plan", label: "Plan", icon: Map },
  { to: "/whitepaper", label: "Whitepaper", icon: FileText },
];

export function MobileNav() {
  const { pathname } = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = MORE_LINKS.some((l) => l.to === pathname);

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-foreground/20 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <div className="grid grid-cols-5">
          {PRIMARY_TABS.map((t) => {
            const active = pathname === t.to;
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                to={t.to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[60px] flex-col items-center justify-center gap-1 font-display text-[10px] uppercase tracking-widest transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-5" aria-hidden />
                {t.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-expanded={moreOpen}
            aria-haspopup="dialog"
            className={cn(
              "flex min-h-[60px] flex-col items-center justify-center gap-1 font-display text-[10px] uppercase tracking-widest transition-colors",
              moreActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <MoreHorizontal className="size-5" aria-hidden />
            More
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          aria-label="More pages"
          className="max-h-[80dvh] overflow-y-auto rounded-t-2xl pb-[env(safe-area-inset-bottom)]"
        >
          <SheetHeader className="text-left">
            <SheetTitle className="font-display text-base uppercase tracking-widest">
              More pages
            </SheetTitle>
          </SheetHeader>
          <ul className="mt-2 divide-y divide-border">
            {MORE_LINKS.map((l) => {
              const active = pathname === l.to;
              const Icon = l.icon;
              return (
                <li key={l.to}>
                  <SheetClose asChild>
                    <Link
                      to={l.to}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-[52px] items-center gap-3 px-1 font-display text-sm uppercase tracking-widest transition-colors",
                        active ? "text-primary" : "text-foreground hover:text-primary",
                      )}
                    >
                      <Icon className="size-5 shrink-0" aria-hidden />
                      {l.label}
                    </Link>
                  </SheetClose>
                </li>
              );
            })}
          </ul>
        </SheetContent>
      </Sheet>
    </>
  );
}
