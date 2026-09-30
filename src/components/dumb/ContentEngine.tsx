import { Sparkles, Trophy } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SOCIAL_BY_KEY } from "@/data/dump";
import { CONTENT_KIT, MEME_CONTEST, MISSION_PACKS, type PackMission } from "@/data/packs";
import { generateMission } from "@/lib/missions";

type Props = {
  onLoadMission?: (type: PackMission["type"], vibe: PackMission["vibe"]) => void;
};

export function ContentEngine({ onLoadMission }: Props) {
  const telegram = SOCIAL_BY_KEY.telegram.href;

  const runPackMission = (m: PackMission) => {
    if (onLoadMission) {
      onLoadMission(m.type, m.vibe);
      toast.message("Pack mission loaded in Raid Arcade", {
        description: `${m.type} · ${m.vibe}`,
      });
      document.getElementById("arcade")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    const mission = generateMission(m.type, m.vibe);
    toast.message(mission.title, { description: mission.brief.slice(0, 80) });
  };

  return (
    <div className="mt-8 space-y-6">
      <span className="sticker inline-block bg-primary px-2.5 py-1 font-display text-xs uppercase tracking-[0.2em] text-primary-foreground">
        Content packs
      </span>

      <div className="grid gap-3 lg:grid-cols-3">
        {MISSION_PACKS.map((pack) => (
          <div
            key={pack.id}
            className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary"
          >
            <div className="flex items-center justify-between gap-2">
              <Badge className="rounded-md bg-primary text-[10px] text-primary-foreground">
                {pack.theme}
              </Badge>
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {pack.missions.length} missions
              </span>
            </div>
            <h3 className="mt-2 text-base font-black tracking-tight">{pack.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{pack.blurb}</p>
            <ul className="mt-3 space-y-2">
              {pack.missions.map((m) => (
                <li key={`${pack.id}-${m.type}-${m.vibe}-${m.note}`}>
                  <button
                    type="button"
                    onClick={() => runPackMission(m)}
                    className="w-full rounded-md border border-border bg-surface px-2.5 py-2 text-left transition-colors hover:border-pink"
                  >
                    <p className="text-xs font-black">
                      {m.type} <span className="font-bold text-pink">· {m.vibe}</span>
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{m.note}</p>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="flex items-center gap-2 text-base font-black tracking-tight">
            <Trophy className="size-4 text-accent" /> {MEME_CONTEST.title}
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="outline" className="rounded-md border-pink text-pink">
              {MEME_CONTEST.status}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{MEME_CONTEST.blurb}</p>
          <ul className="mt-3 space-y-1.5">
            {MEME_CONTEST.rules.map((rule) => (
              <li key={rule} className="flex gap-2 text-xs text-muted-foreground">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                {rule}
              </li>
            ))}
          </ul>
          <Button
            asChild
            className="mt-4 gap-2 rounded-md bg-pink font-black text-pink-foreground hover:bg-pink/90"
          >
            <a href={telegram} target="_blank" rel="noreferrer noopener">
              {MEME_CONTEST.cta}
            </a>
          </Button>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="flex items-center gap-2 text-base font-black tracking-tight">
            <Sparkles className="size-4 text-primary" /> {CONTENT_KIT.title}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">{CONTENT_KIT.blurb}</p>
          <ul className="mt-3 space-y-1.5">
            {CONTENT_KIT.checklist.map((item) => (
              <li key={item} className="flex gap-2 text-xs text-muted-foreground">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-pink" />
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              asChild
              variant="outline"
              className="rounded-md border-border font-bold hover:border-pink"
            >
              <a href="/culture">Open Smiley Gallery</a>
            </Button>
            <Button
              asChild
              variant="outline"
              className="rounded-md border-border font-bold hover:border-pink"
            >
              <a href="/culture#brand">Brand checklist</a>
            </Button>
            <Button asChild className="rounded-md bg-primary font-black text-primary-foreground">
              <a href="#arcade">Build a share card</a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
