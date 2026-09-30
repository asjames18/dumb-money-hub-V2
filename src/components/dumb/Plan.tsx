import { Revenue } from "./Revenue";
import { Roadmap } from "./Roadmap";
import { SectionHead } from "./SectionHead";

/** Merged section: where the project is going and how it sustains itself. */
export function Plan() {
  return (
    <section id="plan" className="scroll-mt-24">
      <SectionHead
        asH1
        index="06"
        eyebrow="Plan"
        title="The long game"
        blurb="Where Dumb Money is headed and how it funds itself along the way. Plans, not promises — the community steers the shipping order."
      />
      <Roadmap />
      <Revenue />
    </section>
  );
}
