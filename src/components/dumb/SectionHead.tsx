type Props = {
  index: string;
  eyebrow: string;
  title: string;
  blurb: string;
  /** Set for the page-level headline so every page has exactly one h1. */
  asH1?: boolean;
};

/** Shared poster-style header for every hub section: number, kicker, headline. */
export function SectionHead({ index, eyebrow, title, blurb, asH1 }: Props) {
  const Headline = asH1 ? "h1" : "h2";
  return (
    <div className="mb-6 sm:mb-8">
      <p className="font-display text-sm uppercase tracking-[0.3em] text-pink">
        {index} <span className="text-muted-foreground">/</span> {eyebrow}
      </p>
      <Headline className="mt-2 font-display text-4xl uppercase leading-[0.95] tracking-tight sm:text-6xl">
        {title}
      </Headline>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{blurb}</p>
    </div>
  );
}
