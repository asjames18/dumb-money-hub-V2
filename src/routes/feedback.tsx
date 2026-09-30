import { createFileRoute } from "@tanstack/react-router";
import { Bug, Lightbulb, MessageCircle, Send, Shapes } from "lucide-react";
import { useEffect, useState } from "react";

import { PageShell } from "@/components/dumb/PageShell";
import { pageMeta } from "@/lib/page-meta";

const TITLE = "Feedback — Dumb Money Hub";
const DESCRIPTION =
  "Found a bug, want a feature, or have a comment about the hub? Tell the build crew directly — no account, no email needed.";

export const Route = createFileRoute("/feedback")({
  head: () => pageMeta("/feedback", TITLE, DESCRIPTION),
  component: Feedback,
});

const CATEGORIES = [
  { key: "bug", label: "Bug report", icon: Bug },
  { key: "feature", label: "Feature request", icon: Lightbulb },
  { key: "comment", label: "Comment", icon: MessageCircle },
  { key: "other", label: "Other", icon: Shapes },
] as const;

type Category = (typeof CATEGORIES)[number]["key"];
type Status = "idle" | "sending" | "sent" | "error";

function Feedback() {
  const [category, setCategory] = useState<Category>("bug");
  const [message, setMessage] = useState("");
  const [page, setPage] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  // Prefill "which page" from where they came from (same site only).
  useEffect(() => {
    try {
      const ref = new URL(document.referrer);
      if (ref.origin === window.location.origin && ref.pathname !== "/feedback") {
        setPage(ref.pathname);
      }
    } catch {
      // No usable referrer — the field stays blank and optional.
    }
  }, []);

  const valid = message.trim().length >= 4 && message.trim().length <= 2000;

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!valid || status === "sending") return;
    setStatus("sending");
    try {
      const website = String(new FormData(e.currentTarget).get("website") ?? "");
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ category, message: message.trim(), page, website }),
      });
      setStatus(res.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  };

  return (
    <PageShell>
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="font-display text-3xl uppercase tracking-wide">
          Talk to the <span className="text-pink">build crew</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Found a bug, want a feature, or have something to say about the hub? It lands straight in
          the private build inbox — no account, no email, no tracking.
        </p>

        {status === "sent" ? (
          <div className="mt-8 rounded-lg border-2 border-green bg-green/10 p-6 text-center">
            <p className="font-display text-xl uppercase tracking-wide text-green">
              Got it — thank you
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Your note is in the inbox. Real reports from real users are how this place gets
              better.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-6">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                What&apos;s this about?
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {CATEGORIES.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCategory(key)}
                    aria-pressed={category === key}
                    className={`flex items-center justify-center gap-1.5 rounded-lg border-2 px-3 py-2.5 text-sm font-bold transition-colors ${
                      category === key
                        ? "border-pink bg-pink/10 text-foreground"
                        : "border-border bg-surface text-muted-foreground hover:border-pink/50"
                    }`}
                  >
                    <Icon className="size-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="feedback-message"
                className="mb-2 block text-xs font-bold uppercase tracking-widest text-muted-foreground"
              >
                Your message
              </label>
              <textarea
                id="feedback-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                maxLength={2000}
                placeholder={
                  category === "bug"
                    ? "What went wrong? What were you doing, and what did you expect to happen?"
                    : category === "feature"
                      ? "What should the hub do that it doesn't? Who would it help?"
                      : "Say what's on your mind…"
                }
                className="w-full rounded-lg border-2 border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-pink focus:outline-none"
              />
              <p className="mt-1 text-right text-xs text-muted-foreground">
                {message.trim().length}/2000
              </p>
            </div>

            <div>
              <label
                htmlFor="feedback-page"
                className="mb-2 block text-xs font-bold uppercase tracking-widest text-muted-foreground"
              >
                Which page is this about? <span className="font-normal">(optional)</span>
              </label>
              <input
                id="feedback-page"
                type="text"
                value={page}
                onChange={(e) => setPage(e.target.value)}
                placeholder="/scan"
                maxLength={200}
                className="w-full rounded-lg border-2 border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-pink focus:outline-none"
              />
            </div>

            {/* Honeypot — humans never see it. */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="absolute h-px w-px overflow-hidden opacity-0"
            />

            {status === "error" && (
              <p className="rounded-lg border border-red/40 bg-red/10 px-3 py-2 text-sm text-red">
                Couldn&apos;t send that — check your connection and try again.
              </p>
            )}

            <button
              type="submit"
              disabled={!valid || status === "sending"}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-pink px-4 py-3 font-display text-base uppercase tracking-wide text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="size-4" />
              {status === "sending" ? "Sending…" : "Send feedback"}
            </button>
            <p className="text-center text-xs text-muted-foreground">
              Anonymous — nothing here can identify you or your wallet.
            </p>
          </form>
        )}
      </main>
    </PageShell>
  );
}
