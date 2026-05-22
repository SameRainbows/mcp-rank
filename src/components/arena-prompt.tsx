"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { ArrowRight, CheckCircle2, ListChecks, LoaderCircle, RotateCcw, Scale, ShieldCheck, Terminal } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const launcherTools = [
  {
    id: "compare",
    icon: Scale,
    label: "Compare servers",
  },
  {
    id: "ranked",
    icon: ShieldCheck,
    label: "Why ranked?",
  },
  {
    id: "risk",
    icon: Terminal,
    label: "Rollout risk",
  },
] as const;

const compareServers = ["GitHub MCP Server", "Context7", "Filesystem", "Playwright MCP"];

const rankedServers = ["GitHub MCP Server", "Context7", "Filesystem", "Brave Search"];

const rolloutCategories = [
  "database tools",
  "browser automation",
  "payments",
  "workspace/chat",
  "local files",
];

const evidenceSteps = [
  "Finding matching reviewed servers",
  "Checking scores, risks, and confidence gates",
  "Reading source notes and cautions",
  "Preparing a cited answer",
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
  const [activityIndex, setActivityIndex] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const hasConversation = messages.length > 0;
  const canSubmit = useMemo(() => value.trim().length > 0 && status === "idle", [status, value]);
  const lastUserPrompt = [...messages].reverse().find((message) => message.role === "user")?.content;
  const activeAssistantId = useMemo(() => messages.findLast((message) => message.role === "assistant")?.id, [messages]);

  useEffect(() => {
    if (status === "idle") return;

    const timer = window.setInterval(() => {
      setActivityIndex((current) => Math.min(current + 1, evidenceSteps.length - 1));
    }, 850);

    return () => window.clearInterval(timer);
  }, [status]);

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

    setActivityIndex(0);
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
    setActivityIndex(0);
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
                    {message.id === activeAssistantId && status !== "idle" && (
                      <AssistantActivity
                        activeStep={activityIndex}
                        compact={Boolean(message.content)}
                        status={status}
                      />
                    )}
                    {message.content && <AssistantAnswer content={message.content} />}
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

function AssistantActivity({
  activeStep,
  compact,
  status,
}: {
  activeStep: number;
  compact: boolean;
  status: "loading" | "streaming";
}) {
  if (compact) {
    return (
      <div className="mb-3 inline-flex max-w-full items-center gap-2 rounded-full border border-[#b9ddec] bg-[#edf8fc] px-3 py-1.5 text-xs font-medium text-[var(--arena-muted)]">
        <LoaderCircle size={14} className="shrink-0 animate-spin text-[var(--arena-green)]" aria-hidden="true" />
        <span>{status === "streaming" ? "Streaming cited answer" : evidenceSteps[activeStep]}</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#b9ddec] bg-[#f5fbfd] p-4 text-sm text-[var(--arena-ink)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-semibold">Reviewing MCP Rank evidence</div>
          <p className="mt-1 text-xs leading-5 text-[var(--arena-muted)]">
            Using reviewed server pages, leaderboard scores, and confidence gates.
          </p>
        </div>
        <LoaderCircle size={18} className="shrink-0 animate-spin text-[var(--arena-green)]" aria-hidden="true" />
      </div>
      <div className="mt-4 grid gap-2">
        {evidenceSteps.map((step, index) => {
          const isComplete = index < activeStep;
          const isActive = index === activeStep;

          return (
            <div
              key={step}
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${
                isActive ? "bg-white shadow-sm" : "text-[var(--arena-muted)]"
              }`}
            >
              {isComplete ? (
                <CheckCircle2 size={15} className="shrink-0 text-[var(--arena-green)]" aria-hidden="true" />
              ) : (
                <span
                  className={`size-2.5 shrink-0 rounded-full ${
                    isActive ? "animate-pulse bg-[var(--arena-green)]" : "bg-[#c8d7dc]"
                  }`}
                  aria-hidden="true"
                />
              )}
              <span className={isActive ? "font-semibold" : undefined}>{step}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AssistantAnswer({ content }: { content: string }) {
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
  const [activeLauncher, setActiveLauncher] = useState<(typeof launcherTools)[number]["id"] | null>(null);
  const [selectedServers, setSelectedServers] = useState(compareServers.slice(0, 3));

  function toggleCompareServer(server: string) {
    setSelectedServers((current) => {
      if (current.includes(server)) return current.filter((item) => item !== server);
      return [...current, server].slice(0, 4);
    });
  }

  function setComparePrompt() {
    const servers = selectedServers.length >= 2 ? selectedServers : compareServers.slice(0, 2);
    onChange(`Compare ${servers.join(", ")} by trust score, risk, confidence, source evidence, and rollout caveats.`);
  }

  return (
    <form onSubmit={onSubmit} className={compact ? "border-t border-[var(--arena-line)] p-3" : "p-3"}>
      {!compact && (
        <div className="mb-1 flex items-center justify-between gap-3 px-2 pt-1 text-xs text-[var(--arena-muted)]">
          <span className="font-semibold text-[var(--arena-ink)]">MCP Evidence Assistant</span>
          <span className="hidden sm:inline">Ask anything about MCP servers and leaderboards.</span>
        </div>
      )}
      <label className="sr-only" htmlFor="arena-prompt">
        Search MCP Rank evidence
      </label>
      <textarea
        id="arena-prompt"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }}
        placeholder={status === "idle" ? "Search MCP Rank evidence, scores, risks, or rollout notes..." : "Working..."}
        maxLength={2000}
        className={`${compact ? "min-h-16" : "min-h-20"} w-full resize-none bg-transparent px-2 py-2 text-base leading-7 text-[var(--arena-ink)] outline-none placeholder:text-zinc-400`}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap gap-2">
          {launcherTools.map(({ id, icon: ToolIcon, label }) => (
            <button
              key={label}
              type="button"
              onClick={() => setActiveLauncher((current) => (current === id ? null : id))}
              className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium transition ${
                activeLauncher === id
                  ? "border-[#9fd2e6] bg-[#edf8fc] text-[var(--arena-ink)]"
                  : "border-[var(--arena-line)] bg-[var(--arena-surface)] text-[var(--arena-ink)] hover:border-[#9fd2e6] hover:bg-[#edf8fc]"
              }`}
            >
              <ToolIcon size={15} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-xs text-[var(--arena-muted)] sm:inline">
            Enter to send · Shift+Enter for newline
          </span>
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
      </div>
      {activeLauncher && (
        <div className="mt-3 rounded-lg border border-[var(--arena-line)] bg-[var(--arena-surface)] p-3">
          {activeLauncher === "compare" && (
            <div className="grid gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--arena-muted)]">
                <Scale size={14} aria-hidden="true" />
                Pick two to four servers
              </div>
              <div className="flex flex-wrap gap-2">
                {compareServers.map((server) => {
                  const active = selectedServers.includes(server);
                  return (
                    <button
                      key={server}
                      type="button"
                      onClick={() => toggleCompareServer(server)}
                      className={`rounded-md border px-3 py-1.5 text-sm ${
                        active
                          ? "border-[#9fd2e6] bg-white font-semibold"
                          : "border-[var(--arena-line)] bg-transparent text-[var(--arena-muted)]"
                      }`}
                    >
                      {server}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={setComparePrompt}
                className="w-fit rounded-md bg-[var(--arena-ink)] px-3 py-2 text-xs font-semibold text-white"
              >
                Build comparison question
              </button>
            </div>
          )}

          {activeLauncher === "ranked" && (
            <div className="grid gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--arena-muted)]">
                <ListChecks size={14} aria-hidden="true" />
                Ask why a reviewed server ranks where it does
              </div>
              <div className="flex flex-wrap gap-2">
                {rankedServers.map((server) => (
                  <button
                    key={server}
                    type="button"
                    onClick={() =>
                      onChange(`Why is ${server} ranked where it is? Explain the score, source evidence, confidence, and main cautions.`)
                    }
                    className="rounded-md border border-[var(--arena-line)] bg-white px-3 py-1.5 text-sm font-medium hover:border-[#9fd2e6] hover:bg-[#edf8fc]"
                  >
                    {server}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeLauncher === "risk" && (
            <div className="grid gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--arena-muted)]">
                <Terminal size={14} aria-hidden="true" />
                Choose the rollout surface
              </div>
              <div className="flex flex-wrap gap-2">
                {rolloutCategories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() =>
                      onChange(`What should a team verify before enabling MCP ${category}? Include source evidence, auth or permission risk, and rollout cautions.`)
                    }
                    className="rounded-md border border-[var(--arena-line)] bg-white px-3 py-1.5 text-sm font-medium hover:border-[#9fd2e6] hover:bg-[#edf8fc]"
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </form>
  );
}
