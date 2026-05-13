"use client";

import { useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { ArrowRight, Code2, Globe2, LoaderCircle, Paperclip, RotateCcw, Scale, Terminal } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const promptTools = [
  {
    icon: Paperclip,
    label: "Leaderboard",
    prompt: "What are the safest MCP servers for Codex? Include scores and confidence caveats.",
  },
  {
    icon: Terminal,
    label: "Install risk",
    prompt: "Which highly ranked MCP servers need the most careful install or auth review?",
  },
  {
    icon: Globe2,
    label: "Signals",
    prompt: "Summarize the evidence MCP Rank has for GitHub MCP Server, Context7, and Filesystem.",
  },
  {
    icon: Scale,
    label: "Compare",
    prompt: "Compare Context7 and Filesystem for a Cursor setup.",
  },
  {
    icon: Code2,
    label: "Inspect",
    prompt: "What should a team check before enabling the Slack MCP server?",
  },
];

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function toApiMessages(messages: ChatMessage[]) {
  return messages
    .filter((message) => message.content.trim())
    .map((message) => ({
      role: message.role,
      content: message.content,
    }));
}

export function ArenaPrompt() {
  const [value, setValue] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "streaming">("idle");
  const abortRef = useRef<AbortController | null>(null);

  const hasConversation = messages.length > 0;
  const canSubmit = useMemo(() => value.trim().length > 0 && status === "idle", [status, value]);
  const lastUserPrompt = [...messages].reverse().find((message) => message.role === "user")?.content;

  async function submitPrompt(event?: FormEvent<HTMLFormElement>, retryMessage?: string) {
    event?.preventDefault();
    const prompt = (retryMessage ?? value).trim();
    if (!prompt || status !== "idle") return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    trackEvent("assistant_query", { promptLength: prompt.length });

    const assistantId = newId("assistant");
    const nextMessages = retryMessage
      ? trimToLastUser(messages)
      : [...messages, { id: newId("user"), role: "user" as const, content: prompt }];

    setMessages([...nextMessages, { id: assistantId, role: "assistant", content: "" }]);
    setValue("");
    setStatus("loading");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        signal: controller.signal,
        body: JSON.stringify({ messages: toApiMessages(nextMessages) }),
      });

      if (!response.ok || !response.body) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "MCP Rank evidence search is unavailable right now.");
      }

      setStatus("streaming");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        const text = decoder.decode(chunk, { stream: true });
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId ? { ...message, content: message.content + text } : message,
          ),
        );
      }
    } catch (caught) {
      if ((caught as Error).name === "AbortError") return;
      const message = caught instanceof Error ? caught.message : "MCP Rank evidence search failed.";
      setMessages((current) =>
        current.map((item) => (item.id === assistantId ? { ...item, content: message } : item)),
      );
    } finally {
      setStatus("idle");
    }
  }

  function trimToLastUser(current: ChatMessage[]) {
    const lastUserIndex = current.findLastIndex((message) => message.role === "user");
    return lastUserIndex >= 0 ? current.slice(0, lastUserIndex + 1) : current;
  }

  function startNewReview() {
    abortRef.current?.abort();
    setMessages([]);
    setValue("");
    setStatus("idle");
  }

  return (
    <section className="mx-auto w-full max-w-4xl">
      <div
        className={`overflow-hidden rounded-xl border bg-white text-left shadow-[0_18px_45px_rgba(90,174,209,0.12)] ${
          hasConversation ? "border-[var(--arena-blue-line)]" : "border-[var(--arena-line)]"
        }`}
      >
        {hasConversation && (
          <div className="border-b border-[var(--arena-line)] px-4 py-3 sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">MCP Evidence Assistant</div>
                <p className="mt-1 text-xs leading-5 text-[var(--arena-muted)]">
                  Evidence from leaderboards, server reviews, and confidence-gated tool records.
                </p>
              </div>
              <button
                type="button"
                onClick={startNewReview}
                className="h-9 rounded-md border border-[var(--arena-line)] px-3 text-sm font-semibold hover:bg-[var(--arena-blue-soft)]"
              >
                New review
              </button>
            </div>
          </div>
        )}

        {hasConversation && (
          <div className="max-h-[460px] overflow-y-auto px-4 py-5 sm:px-5">
            <div className="grid gap-5">
              {messages.map((message) =>
                message.role === "user" ? (
                  <div key={message.id} className="ml-auto max-w-[88%] rounded-lg bg-[var(--arena-ink)] px-4 py-3 text-sm leading-6 text-white">
                    {message.content}
                  </div>
                ) : (
                  <div key={message.id} className="max-w-3xl">
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                      <span className="rounded bg-[var(--arena-ink)] px-1.5 py-0.5 text-xs text-white">M</span>
                      MCP Rank
                    </div>
                    <AssistantAnswer content={message.content} pendingLabel={status !== "idle" ? "Reading MCP Rank evidence..." : ""} />
                    {message.content && lastUserPrompt && (
                      <button
                        type="button"
                        onClick={() => void submitPrompt(undefined, lastUserPrompt)}
                        disabled={status !== "idle"}
                        className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--arena-muted)] hover:text-[var(--arena-ink)] disabled:opacity-50"
                      >
                        <RotateCcw size={15} aria-hidden="true" />
                        Refresh evidence
                      </button>
                    )}
                  </div>
                ),
              )}
            </div>
          </div>
        )}

        <PromptComposer
          value={value}
          status={status}
          canSubmit={canSubmit}
          compact={hasConversation}
          onChange={setValue}
          onSubmit={(event) => void submitPrompt(event)}
        />
      </div>

      {!hasConversation && (
        <p className="mt-3 text-center text-xs leading-5 text-[var(--arena-muted)]">
          Answers use MCP Rank&apos;s reviewed dataset and may say there is not enough evidence.
        </p>
      )}
    </section>
  );
}

function AssistantAnswer({ content, pendingLabel }: { content: string; pendingLabel: string }) {
  if (!content) {
    return <div className="text-sm leading-6 text-[var(--arena-ink)] sm:text-base sm:leading-7">{pendingLabel}</div>;
  }

  return <div className="space-y-4 break-words text-sm leading-6 text-[var(--arena-ink)] sm:text-base sm:leading-7">{renderMarkdownBlocks(content)}</div>;
}

function renderMarkdownBlocks(content: string) {
  const lines = content.split(/\r?\n/);
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index]?.trim() ?? "";

    if (!line) {
      index += 1;
      continue;
    }

    if (line.startsWith("### ")) {
      blocks.push(
        <h3 key={`heading-${index}`} className="text-sm font-semibold text-[var(--arena-ink)] sm:text-base">
          {renderInlineMarkdown(line.replace(/^###\s+/, ""))}
        </h3>,
      );
      index += 1;
      continue;
    }

    if (line.startsWith("|")) {
      const tableLines: string[] = [];
      while (index < lines.length && lines[index]?.trim().startsWith("|")) {
        tableLines.push(lines[index]?.trim() ?? "");
        index += 1;
      }
      blocks.push(<MarkdownTable key={`table-${index}`} lines={tableLines} />);
      continue;
    }

    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (index < lines.length && lines[index]?.trim().startsWith("- ")) {
        items.push((lines[index]?.trim() ?? "").replace(/^-\s+/, ""));
        index += 1;
      }
      blocks.push(
        <ul key={`list-${index}`} className="list-disc space-y-1 pl-5">
          {items.map((item, itemIndex) => (
            <li key={`${item}-${itemIndex}`}>{renderInlineMarkdown(item)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < lines.length) {
      const current = lines[index]?.trim() ?? "";
      if (!current || current.startsWith("### ") || current.startsWith("|") || current.startsWith("- ")) break;
      paragraphLines.push(current);
      index += 1;
    }
    blocks.push(<p key={`paragraph-${index}`}>{renderInlineMarkdown(paragraphLines.join(" "))}</p>);
  }

  return blocks;
}

function MarkdownTable({ lines }: { lines: string[] }) {
  const rows = lines
    .filter((line) => !/^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line))
    .map((line) =>
      line
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((cell) => cell.trim()),
    )
    .filter((row) => row.some(Boolean));

  const [head, ...body] = rows;
  if (!head) return null;

  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--arena-line)]">
      <table className="w-full min-w-[520px] border-collapse text-left text-sm">
        <thead className="bg-[var(--arena-surface)]">
          <tr>
            {head.map((cell, index) => (
              <th key={`${cell}-${index}`} className="border-b border-[var(--arena-line)] px-3 py-2 font-semibold">
                {renderInlineMarkdown(cell)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, rowIndex) => (
            <tr key={row.join("-") || rowIndex} className="border-b border-[var(--arena-line)] last:border-0">
              {row.map((cell, cellIndex) => (
                <td key={`${cell}-${cellIndex}`} className="px-3 py-2 align-top">
                  {renderInlineMarkdown(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderInlineMarkdown(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>;
    }

    return part;
  });
}

type PromptComposerProps = {
  value: string;
  status: "idle" | "loading" | "streaming";
  canSubmit: boolean;
  compact: boolean;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function PromptComposer({ value, status, canSubmit, compact, onChange, onSubmit }: PromptComposerProps) {
  return (
    <form onSubmit={onSubmit} className={compact ? "border-t border-[var(--arena-line)] p-3" : "p-3"}>
      <label className="sr-only" htmlFor="arena-prompt">
        Search MCP Rank evidence
      </label>
      <textarea
        id="arena-prompt"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.currentTarget.form?.requestSubmit();
          }
        }}
        placeholder={status === "idle" ? "Search MCP Rank evidence, scores, risks, or rollout notes..." : "Working..."}
        maxLength={2000}
        className={`${compact ? "min-h-16" : "min-h-24"} w-full resize-none bg-transparent px-2 py-2 text-base leading-7 text-[var(--arena-ink)] outline-none placeholder:text-zinc-400`}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {promptTools.map(({ icon: ToolIcon, label, prompt }) => (
            <button
              key={label}
              type="button"
              onClick={() => onChange(prompt)}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--arena-line)] bg-[var(--arena-surface)] px-3 text-sm font-medium text-[var(--arena-ink)] transition hover:border-[#9fd2e6] hover:bg-[#edf8fc]"
            >
              <ToolIcon size={15} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </div>
        <button
          type="submit"
          disabled={!canSubmit}
          className="flex size-10 items-center justify-center rounded-md border border-[var(--arena-line)] bg-white text-[var(--arena-ink)] transition hover:bg-[var(--arena-blue-soft)] disabled:cursor-not-allowed disabled:opacity-45"
          aria-label="Submit MCP Rank evidence search"
        >
          {status === "idle" ? (
            <ArrowRight size={18} aria-hidden="true" />
          ) : (
            <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />
          )}
        </button>
      </div>
    </form>
  );
}
