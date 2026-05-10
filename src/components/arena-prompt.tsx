"use client";

import { useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowRight,
  Code2,
  Globe2,
  LoaderCircle,
  MessageCircle,
  MoreHorizontal,
  PanelLeft,
  Paperclip,
  PlusCircle,
  RotateCcw,
  Scale,
  Search,
  Terminal,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  tone?: "default" | "error";
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
    label: "Web signals",
    prompt: "Summarize the public evidence MCP Arena has for GitHub MCP Server, Context7, and Filesystem.",
  },
  {
    icon: Scale,
    label: "Compare",
    prompt: "Compare Context7 and Filesystem for a Cursor setup.",
  },
  {
    icon: Code2,
    label: "Inspect config",
    prompt: "What should a team check before enabling the Slack MCP server?",
  },
];

const historyItems = [
  "Safest servers for Codex",
  "Context7 vs Filesystem",
  "Slack OAuth cautions",
  "Weekly best MCP service",
];

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function toApiMessages(messages: ChatMessage[]) {
  return messages
    .filter((message) => message.tone !== "error" && message.content.trim())
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
        throw new Error(data?.error ?? "MCP Arena chat is unavailable right now.");
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
      const message = caught instanceof Error ? caught.message : "MCP Arena chat failed.";
      setMessages((current) =>
        current.map((item) =>
          item.id === assistantId
            ? {
                ...item,
                content: message,
                tone: "error",
              }
            : item,
        ),
      );
    } finally {
      setStatus("idle");
    }
  }

  function trimToLastUser(current: ChatMessage[]) {
    const lastUserIndex = current.findLastIndex((message) => message.role === "user");
    return lastUserIndex >= 0 ? current.slice(0, lastUserIndex + 1) : current;
  }

  function startNewChat() {
    abortRef.current?.abort();
    setMessages([]);
    setValue("");
    setStatus("idle");
  }

  return hasConversation ? (
    <section className="fixed inset-x-0 bottom-0 top-14 z-30 bg-white text-left md:left-14">
      <div className="grid h-full lg:grid-cols-[300px_1fr]">
        <aside className="hidden border-r border-[var(--arena-line)] bg-[color-mix(in_srgb,var(--arena-bg)_88%,white)] p-4 lg:block">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-serif text-2xl font-semibold">
              <span className="text-2xl leading-none">▥</span>
              MCP Arena
            </div>
            <button
              type="button"
              className="flex size-8 items-center justify-center rounded-md border border-[var(--arena-line)] bg-white"
              aria-label="Collapse sidebar"
            >
              <PanelLeft size={15} aria-hidden="true" />
            </button>
          </div>

          <nav className="mt-8 grid gap-2 text-sm font-medium">
            <button
              type="button"
              onClick={startNewChat}
              className="flex h-10 items-center gap-3 rounded-md px-2 text-left hover:bg-white"
            >
              <PlusCircle size={16} aria-hidden="true" />
              New Chat
            </button>
            <a href="/rankings" className="flex h-10 items-center gap-3 rounded-md px-2 hover:bg-white">
              <Scale size={16} aria-hidden="true" />
              Leaderboard
            </a>
            <a href="/search" className="flex h-10 items-center gap-3 rounded-md px-2 hover:bg-white">
              <Search size={16} aria-hidden="true" />
              Search
            </a>
          </nav>

          <div className="mt-10">
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--arena-muted)]">Today</div>
            <div className="mt-3 grid gap-1">
              {historyItems.map((item, index) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setValue(promptTools[index]?.prompt ?? item)}
                  className={`truncate rounded-md px-3 py-2 text-left text-sm ${
                    index === 0 ? "bg-white" : "hover:bg-white"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-12 rounded-lg border border-[var(--arena-blue-line)] bg-[var(--arena-blue-soft)] p-3 text-xs leading-5 text-[var(--arena-muted)]">
            Answers use read-only MCP Arena leaderboards, reviews, and confidence gates.
          </div>
        </aside>

        <div className="flex min-h-0 flex-col">
          <header className="flex h-14 items-center justify-between border-b border-[var(--arena-line)] px-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={startNewChat}
                className="flex size-8 items-center justify-center rounded-md border border-[var(--arena-line)] bg-white lg:hidden"
                aria-label="Start a new chat"
              >
                <PlusCircle size={16} aria-hidden="true" />
              </button>
              <button className="inline-flex items-center gap-2 text-sm font-semibold" type="button">
                <MessageCircle size={18} aria-hidden="true" />
                Direct
              </button>
              <button className="inline-flex items-center gap-2 text-sm font-semibold" type="button">
                <span className="rounded bg-[var(--arena-ink)] px-1.5 py-0.5 text-xs text-white">M</span>
                MCP Arena
              </button>
            </div>
            <button
              type="button"
              className="flex size-8 items-center justify-center rounded-md hover:bg-[var(--arena-surface)]"
              aria-label="More chat options"
            >
              <MoreHorizontal size={17} aria-hidden="true" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-8 lg:px-16">
            <div className="mx-auto grid max-w-4xl gap-8">
              {messages.map((message) =>
                message.role === "user" ? (
                  <div key={message.id} className="flex justify-end">
                    <div className="max-w-[76%] rounded-full bg-[var(--arena-surface)] px-5 py-3 text-sm leading-6 text-[var(--arena-ink)]">
                      {message.content}
                    </div>
                  </div>
                ) : (
                  <div key={message.id} className="max-w-3xl">
                    <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold">
                      <span className="rounded bg-[var(--arena-ink)] px-1.5 py-0.5 text-xs text-white">M</span>
                      MCP Arena
                    </div>
                    <div
                      className={`whitespace-pre-wrap break-words text-base leading-7 ${
                        message.tone === "error" ? "text-[var(--arena-red)]" : "text-[var(--arena-ink)]"
                      }`}
                    >
                      {message.content || (status !== "idle" ? "Reading MCP Arena tools..." : "")}
                    </div>
                    {message.content && (
                      <div className="mt-4 flex items-center gap-4 text-[var(--arena-muted)]">
                        <button type="button" className="hover:text-[var(--arena-ink)]" aria-label="Good answer">
                          <ThumbsUp size={15} aria-hidden="true" />
                        </button>
                        <button type="button" className="hover:text-[var(--arena-ink)]" aria-label="Bad answer">
                          <ThumbsDown size={15} aria-hidden="true" />
                        </button>
                        {message.tone === "error" && lastUserPrompt && (
                          <button
                            type="button"
                            onClick={() => void submitPrompt(undefined, lastUserPrompt)}
                            disabled={status !== "idle"}
                            className="inline-flex items-center gap-2 text-sm font-semibold hover:text-[var(--arena-ink)] disabled:opacity-50"
                          >
                            <RotateCcw size={15} aria-hidden="true" />
                            Retry
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ),
              )}
            </div>
          </div>

          <div className="px-4 pb-4 sm:px-8 lg:px-16">
            <div className="mx-auto max-w-4xl">
              <PromptComposer
                value={value}
                status={status}
                canSubmit={canSubmit}
                onChange={setValue}
                onSubmit={(event) => void submitPrompt(event)}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  ) : (
    <section className="mx-auto w-full max-w-4xl">
      <h2 className="mb-6 font-serif text-4xl leading-tight text-[var(--arena-muted)] sm:text-5xl">
        What would you like to know?
      </h2>
      <PromptComposer
        value={value}
        status={status}
        canSubmit={canSubmit}
        onChange={setValue}
        onSubmit={(event) => void submitPrompt(event)}
      />
      <p className="mt-3 text-center text-xs leading-5 text-[var(--arena-muted)]">
        MCP Arena uses a third-party AI model to answer from internal leaderboard evidence. Answers can be incomplete.
      </p>
    </section>
  );
}

type PromptComposerProps = {
  value: string;
  status: "idle" | "loading" | "streaming";
  canSubmit: boolean;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function PromptComposer({ value, status, canSubmit, onChange, onSubmit }: PromptComposerProps) {
  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-[var(--arena-line)] bg-white p-3 shadow-sm">
      <label className="sr-only" htmlFor="arena-prompt">
        Ask about an MCP server
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
        placeholder={status === "idle" ? "Ask about MCP servers, rankings, risk, or rollout..." : "Working..."}
        maxLength={2000}
        className="min-h-20 w-full resize-none bg-transparent px-2 py-2 text-base leading-7 text-[var(--arena-ink)] outline-none placeholder:text-zinc-400"
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
          aria-label="Submit MCP Arena prompt"
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
