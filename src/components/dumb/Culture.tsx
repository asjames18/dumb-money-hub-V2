import { BrandSystem } from "./BrandSystem";
import { CommunityRatings } from "./CommunityRatings";
import { Gallery } from "./Gallery";
import { SectionHead } from "./SectionHead";

/** Merged section: Smiley scenes plus the official mascot rulebook. */
export function Culture() {
  return (
    <section id="culture" className="scroll-mt-24">
      <SectionHead
        asH1
        index="05"
        eyebrow="Culture"
        title="Smiley runs this"
        blurb="The mascot scenes, the brand rules, the whole visual language. Grab a scene for your next post — just follow the checklist so Smiley always looks like Smiley."
      />
      <Gallery />
      <BrandSystem />
      <CommunityRatings />
    </section>
  );
}
