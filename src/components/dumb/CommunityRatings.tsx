import { useMemo, useState } from "react";
import { Copy, ExternalLink, MessageCircle, Star } from "lucide-react";

import { COMMUNITY_RATINGS, type CommunityRating } from "@/data/ratings";
import { SOCIAL_BY_KEY } from "@/data/dump";
import { SectionHead } from "./SectionHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { trackEvent } from "@/lib/analytics";

const MAX_HANDLE = 40;
const MIN_QUOTE = 20;
const MAX_QUOTE = 400;

const TELEGRAM_URL = SOCIAL_BY_KEY.telegram.href;

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          className={n <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}
        />
      ))}
    </span>
  );
}

function RatingCard({ rating }: { rating: CommunityRating }) {
  // Defense in depth: this wall is a community-content surface. Only allow
  // real http(s) links — a `javascript:` or other scheme in the data file
  // must never become a clickable anchor for every visitor.
  const href =
    rating.link && /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(rating.link) ? rating.link : null;
  const inner = (
    <>
      <Stars value={rating.stars} />
      <p className="mt-2 text-sm leading-relaxed text-foreground">&ldquo;{rating.quote}&rdquo;</p>
      <p className="mt-3 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">{rating.handle}</span>
        {" · "}
        <time dateTime={rating.date}>{rating.date}</time>
        {" · "}via {rating.source}
      </p>
    </>
  );
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
          >
            {inner}
            <ExternalLink size={12} className="ml-1 shrink-0 text-muted-foreground" />
          </a>
        ) : (
          <div>{inner}</div>
        )}
      </CardHeader>
    </Card>
  );
}

function SubmissionForm() {
  const [handle, setHandle] = useState("");
  const [stars, setStars] = useState(5);
  const [quote, setQuote] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const message = useMemo(
    () =>
      `My DUMB rating: ${"★".repeat(stars)}${"☆".repeat(5 - stars)}\n"${quote.trim()}"\n— ${handle.trim()}`,
    [stars, quote, handle],
  );

  const valid =
    handle.trim().length >= 2 &&
    handle.trim().length <= MAX_HANDLE &&
    quote.trim().length >= MIN_QUOTE &&
    quote.trim().length <= MAX_QUOTE;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) {
      setError(
        `Handle needs 2–${MAX_HANDLE} characters and your review needs ${MIN_QUOTE}–${MAX_QUOTE} characters.`,
      );
      return;
    }
    setError(null);
    setSubmitted(true);
    trackEvent("rating_submitted");
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copy didn't work in this browser — select the text and copy it manually.");
    }
  };

  if (submitted) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="font-display text-lg font-black uppercase tracking-tight">
            Looking good — now post it where the community lives
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Paste your review in the Telegram group. Reviews land on this wall{" "}
            <span className="font-semibold text-foreground">manually, after verification</span> —
            nothing is ever auto-posted, and we never invent reviews.
          </p>
          <pre className="mt-4 whitespace-pre-wrap rounded-lg border border-border bg-muted/40 p-4 text-sm leading-relaxed">
            {message}
          </pre>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={onCopy}>
              <Copy size={16} className="mr-2" />
              {copied ? "Copied!" : "Copy review"}
            </Button>
            <Button type="button" asChild>
              <a href={TELEGRAM_URL} target="_blank" rel="noreferrer">
                <MessageCircle size={16} className="mr-2" />
                Post in Telegram
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
            <div className="space-y-1.5">
              <Label htmlFor="rating-handle">Your handle</Label>
              <Input
                id="rating-handle"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="@yourhandle"
                maxLength={MAX_HANDLE}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Your rating</Label>
              <div
                className="flex items-center gap-1 pt-2"
                role="radiogroup"
                aria-label="Star rating"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={stars === n}
                    aria-label={`${n} star${n > 1 ? "s" : ""}`}
                    onClick={() => setStars(n)}
                    className="rounded p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink"
                  >
                    <Star
                      size={22}
                      className={
                        n <= stars ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"
                      }
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rating-quote">Your review</Label>
            <Textarea
              id="rating-quote"
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              placeholder="What do you actually think of DUMB? Real words only — no promises we won't keep."
              maxLength={MAX_QUOTE}
              rows={4}
            />
            <p className="text-right text-[11px] text-muted-foreground">
              {quote.trim().length}/{MAX_QUOTE}
            </p>
          </div>
          {error ? (
            <p role="alert" className="text-sm text-red-500">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={!valid}>
            Prepare my review
          </Button>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Reviews are added to the wall manually after verification — only real, opt-in reviews
            from real community members appear here. Never seeded, never faked.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

/** Community ratings wall: only real opt-in reviews, honest empty state, submission plumbing. */
export function CommunityRatings() {
  const ratings = COMMUNITY_RATINGS;
  const avg = ratings.length ? ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length : null;

  return (
    <section id="ratings" className="mt-16 scroll-mt-24">
      <SectionHead
        index="06"
        eyebrow="Community"
        title="Real voices, real stars"
        blurb="What the community actually says about DUMB — no bots, no bought praise, no invented reviews. If the wall is empty, that's the truth: real reviews only, from real people."
      />
      {avg !== null ? (
        <div className="mb-5 flex items-center gap-3">
          <Stars value={Math.round(avg)} size={18} />
          <p className="text-sm text-muted-foreground">
            <span className="font-black text-foreground">{avg.toFixed(1)}</span> average from{" "}
            <span className="font-semibold text-foreground">{ratings.length}</span> verified
            community {ratings.length === 1 ? "review" : "reviews"}
          </p>
        </div>
      ) : null}
      {ratings.length === 0 ? (
        <Card className="mb-8 border-dashed">
          <CardContent className="py-10 text-center">
            <div className="mx-auto mb-3 w-fit opacity-60" aria-hidden="true">
              <Stars value={0} size={22} />
            </div>
            <p className="font-display text-lg font-black uppercase tracking-tight">
              The wall is empty — on purpose
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              We never invent reviews, names, or enthusiasm. When a real community member rates the
              project, their unedited words land here. Yours could be first.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ratings.map((r, i) => (
            <RatingCard key={`${r.handle}-${r.date}-${i}`} rating={r} />
          ))}
        </div>
      )}
      <p className="mb-3 font-display text-sm font-black uppercase tracking-[0.2em] text-muted-foreground">
        Rate the project
      </p>
      <SubmissionForm />
    </section>
  );
}
