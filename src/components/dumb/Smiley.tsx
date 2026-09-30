/**
 * CSS/HTML rendition of Smiley, the official mascot.
 * variant="face" -> coin head only (avatars, nav)
 * variant="full" -> coin head + black hoodie, gold $DUMB pendant,
 *                   white gloves, green legs, black sneakers w/ pink accents
 */
export function Smiley({
  className = "",
  variant = "face",
}: {
  className?: string;
  variant?: "face" | "full";
}) {
  if (variant === "face") {
    return (
      <div className={`relative ${className}`} aria-hidden="true">
        <div className="absolute inset-0 rounded-full bg-primary/30 blur-xl" />
        <CoinFace />
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} aria-hidden="true">
      <div className="absolute -inset-4 rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute bottom-2 left-6 right-6 h-10 rounded-full bg-pink/30 blur-2xl" />

      <div className="relative flex flex-col items-center">
        {/* head */}
        <div className="relative z-20 w-[52%]">
          <CoinFace />
        </div>

        {/* hoodie */}
        <div className="relative z-10 -mt-[8%] w-full">
          {/* hood collar */}
          <div className="mx-auto h-[10%] w-[64%] rounded-t-full bg-[oklch(0.22_0.008_285)]" />
          <div className="relative rounded-[10px] bg-[oklch(0.17_0.006_285)] px-[6%] pb-[8%] pt-[10%] shadow-[inset_0_1px_0_color-mix(in_oklab,var(--foreground)_10%,transparent)]">
            {/* gold DUMB chain + pendant */}
            <div className="mx-auto h-[8px] w-[54%] rounded-b-full border-x-[3px] border-b-[3px] border-gold/90" />
            <div className="mx-auto -mt-[2px] w-fit rounded-[4px] bg-gold px-1.5 py-[2px] text-[7px] font-black leading-none tracking-tight text-[oklch(0.2_0.03_90)] shadow-[0_2px_8px_-2px_color-mix(in_oklab,var(--gold)_70%,transparent)]">
              $DUMB
            </div>
            {/* kangaroo pocket */}
            <div className="mx-auto mt-[14%] h-[26%] w-[62%] rounded-b-[8px] border-t border-foreground/10 bg-[oklch(0.2_0.006_285)]" />

            {/* sleeves */}
            <span className="absolute -left-[7%] top-[26%] h-[46%] w-[16%] -rotate-6 rounded-[8px] bg-[oklch(0.19_0.006_285)]" />
            <span className="absolute -right-[7%] top-[26%] h-[46%] w-[16%] rotate-6 rounded-[8px] bg-[oklch(0.19_0.006_285)]" />
            {/* white gloves */}
            <span className="absolute -left-[8%] top-[70%] size-[15%] rounded-full bg-[oklch(0.97_0_0)] shadow-[0_2px_6px_-2px_oklch(0_0_0/0.6)]" />
            <span className="absolute -right-[8%] top-[70%] size-[15%] rounded-full bg-[oklch(0.97_0_0)] shadow-[0_2px_6px_-2px_oklch(0_0_0/0.6)]" />
          </div>
        </div>

        {/* legs */}
        <div className="flex w-[58%] items-start justify-between">
          <span className="h-[18px] w-[26%] rounded-b-[3px] bg-primary/90" />
          <span className="h-[18px] w-[26%] rounded-b-[3px] bg-primary/90" />
        </div>

        {/* sneakers with hot-pink accents */}
        <div className="-mt-[2px] flex w-[74%] items-end justify-between">
          <Sneaker />
          <Sneaker flip />
        </div>
      </div>
    </div>
  );
}

function CoinFace() {
  return (
    <div className="relative grid aspect-square w-full place-items-center rounded-full bg-[radial-gradient(circle_at_32%_26%,oklch(0.93_0.22_135),var(--primary)_58%,oklch(0.6_0.2_138))] shadow-[var(--shadow-glow)] ring-2 ring-gold/70">
      <span className="absolute inset-[7%] rounded-full border border-[oklch(0.55_0.18_138)]/60" />
      <span className="absolute left-[12%] top-[10%] h-[18%] w-[26%] -rotate-[25deg] rounded-full bg-[oklch(1_0_0)]/35 blur-[2px]" />
      <div className="relative grid w-[52%] grid-cols-2 gap-[26%]">
        <span className="aspect-[3/4] rounded-full bg-[oklch(0.12_0_0)]" />
        <span className="aspect-[3/4] rounded-full bg-[oklch(0.12_0_0)]" />
      </div>
      <div className="relative mt-[7%] h-[22%] w-[54%] overflow-hidden rounded-b-[999px] bg-[oklch(0.12_0_0)]">
        <span className="absolute inset-x-[6%] top-0 h-[42%] rounded-b-[4px] bg-[oklch(0.98_0_0)]" />
      </div>
    </div>
  );
}

function Sneaker({ flip = false }: { flip?: boolean }) {
  return (
    <div className={`relative w-[38%] ${flip ? "scale-x-[-1]" : ""}`}>
      <div className="h-[14px] rounded-[4px] rounded-tl-[10px] bg-[oklch(0.14_0.004_285)]" />
      <span className="absolute left-[10%] top-[3px] h-[3px] w-[55%] -rotate-6 rounded-full bg-pink" />
      <div className="mt-[1px] h-[5px] rounded-[3px] bg-pink shadow-[0_4px_14px_-6px_color-mix(in_oklab,var(--pink)_80%,transparent)]" />
    </div>
  );
}
