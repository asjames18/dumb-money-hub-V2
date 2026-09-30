import { Fragment, type ReactNode } from "react";

/**
 * Minimal safe Markdown renderer for AI chat answers.
 * Supports: headings (##–####), **bold**, *italic*, `code`, code fences,
 * unordered/ordered lists, blockquotes, [links](http(s)://…), --- rules,
 * paragraphs. Everything else renders as plain text.
 *
 * Safety: no HTML is ever interpreted — all text goes through React
 * children (escaped by default) and links are restricted to http/https.
 * Deliberately dependency-free (Antonio's minimalism rule).
 */

const INLINE_RE =
  /(`[^`\n]+`)|(\[([^\]]+)\]\((https?:\/\/[^)\s]+)\))|(\*\*([^*][^*]*?)\*\*)|(\*([^*][^*]*?)\*)/g;

function renderInline(text: string, prefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let k = 0;
  INLINE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = INLINE_RE.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const key = `${prefix}-i${k++}`;
    if (m[1] !== undefined) {
      out.push(
        <code
          key={key}
          className="rounded bg-surface px-1 py-0.5 font-mono text-[0.85em] text-primary"
        >
          {m[1].slice(1, -1)}
        </code>,
      );
    } else if (m[2] !== undefined) {
      out.push(
        <a
          key={key}
          href={m[4]}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-primary underline underline-offset-2"
        >
          {m[3]}
        </a>,
      );
    } else if (m[5] !== undefined) {
      out.push(<strong key={key}>{m[6]}</strong>);
    } else {
      out.push(<em key={key}>{m[8]}</em>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const UL_RE = /^\s*[-*•]\s+(.*)$/;
const OL_RE = /^\s*\d+[.)]\s+(.*)$/;
const H_RE = /^(#{2,4})\s+(.*)$/;
const QUOTE_RE = /^\s*>\s?(.*)$/;
const HR_RE = /^\s*-{3,}\s*$/;

export function ChatMarkdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  let key = 0;
  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let quote: string[] | null = null;
  let fence: string[] | null = null;

  const flushPara = () => {
    if (para.length) {
      const k = key++;
      blocks.push(
        <p key={k} className="leading-relaxed">
          {renderInline(para.join(" "), `p${k}`)}
        </p>,
      );
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      const k = key++;
      const items = list.items.map((it, i) => (
        <li key={i} className="leading-relaxed">
          {renderInline(it, `l${k}-${i}`)}
        </li>
      ));
      blocks.push(
        list.ordered ? (
          <ol key={k} className="list-decimal space-y-1 pl-5">
            {items}
          </ol>
        ) : (
          <ul key={k} className="list-disc space-y-1 pl-5">
            {items}
          </ul>
        ),
      );
      list = null;
    }
  };
  const flushQuote = () => {
    if (quote) {
      const k = key++;
      blocks.push(
        <blockquote key={k} className="border-l-2 border-primary/60 pl-3 text-muted-foreground">
          {renderInline(quote.join(" "), `q${k}`)}
        </blockquote>,
      );
      quote = null;
    }
  };

  for (const line of lines) {
    // Code fence handling first — everything inside is literal.
    if (line.trimStart().startsWith("```")) {
      if (fence) {
        const k = key++;
        blocks.push(
          <pre
            key={k}
            className="overflow-x-auto rounded-md bg-surface p-3 font-mono text-xs leading-relaxed"
          >
            {fence.join("\n")}
          </pre>,
        );
        fence = null;
      } else {
        flushPara();
        flushList();
        flushQuote();
        fence = [];
      }
      continue;
    }
    if (fence) {
      fence.push(line);
      continue;
    }

    if (!line.trim()) {
      flushPara();
      flushList();
      flushQuote();
      continue;
    }

    const h = line.match(H_RE);
    if (h) {
      flushPara();
      flushList();
      flushQuote();
      const k = key++;
      blocks.push(
        <p key={k} className="font-black tracking-tight text-foreground">
          {renderInline(h[2]!, `h${k}`)}
        </p>,
      );
      continue;
    }
    if (HR_RE.test(line)) {
      flushPara();
      flushList();
      flushQuote();
      blocks.push(<hr key={key++} className="border-border" />);
      continue;
    }
    const q = line.match(QUOTE_RE);
    if (q) {
      flushPara();
      flushList();
      (quote ??= []).push(q[1] ?? "");
      continue;
    }
    const ul = line.match(UL_RE);
    const ol = line.match(OL_RE);
    if (ul || ol) {
      flushPara();
      flushQuote();
      const ordered = !!ol;
      const item = (ul?.[1] ?? ol?.[1] ?? "").trim();
      if (!list || list.ordered !== ordered) {
        flushList();
        list = { ordered, items: [] };
      }
      list.items.push(item);
      continue;
    }
    flushList();
    flushQuote();
    para.push(line.trim());
  }
  flushPara();
  flushList();
  flushQuote();
  if (fence) {
    const k = key++;
    blocks.push(
      <pre
        key={k}
        className="overflow-x-auto rounded-md bg-surface p-3 font-mono text-xs leading-relaxed"
      >
        {fence.join("\n")}
      </pre>,
    );
  }

  return (
    <div className="space-y-2.5 break-words text-sm text-foreground">
      {blocks.map((b, i) => (
        <Fragment key={i}>{b}</Fragment>
      ))}
    </div>
  );
}
