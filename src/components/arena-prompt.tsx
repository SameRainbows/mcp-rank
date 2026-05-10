"use client";

import { useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowRight,
  Code2,
  Globe2,
  LoaderCircle,
  Paperclip,
  RotateCcw,
  Scale,
  Terminal,
} from "lucide-react";

type ChatMessage = {
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

export function ArenaPrompt() {
  const [value, setValue] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "streaming">("idle");
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const canSubmit = useMemo(() => value.trim().length > 0 && status === "idle", [status, value]);

  async function submitPrompt(event?: FormEvent<HTMLFormElement>, retryMessage?: string) {
    event?.preventDefault();
    const prompt = (retryMessage ?? value).trim();
    if (!prompt || status !== "idle") return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: prompt }];
    setMessages([...nextMessages, { role: "assistant", content: "" }]);
    setValue("");
    setError("");
    setStatus("loading");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        signal: controller.signal,
        body: JSON.stringify({ messages: nextMessages }),
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
        setMessages((current) => {
          const updated = [...current];
          const last = updated[updated.length - 1];
          if (last?.role === "assistant") {
            updated[updated.length - 1] = { ...last, content: last.content + text };
          }
          return updated;
        });
      }
    } catch (caught) {
      if ((caught as Error).name === "AbortError") return;
      const message = caught instanceof Error ? caught.message : "MCP Arena chat failed.";
      setError(message);
      setMessages((current) => current.filter((item) => item.content.trim().length > 0));
      setValue(prompt);
    } finally {
      setStatus("idle");
    }
  }

  const lastUserPrompt = [...messages].reverse().find((message) => message.role === "user")?.content;

  return (
    <section className="mx-auto w-full max-w-3xl">
      <form
        onSubmit={(event) => void submitPrompt(event)}
        className="rounded-xl border border-[#9fd2e6] bg-white p-3 shadow-[0_18px_45px_rgba(90,174,209,0.16)]"
      >
        <label className="sr-only" htmlFor="arena-prompt">
          Ask about an MCP server
        </label>
        <textarea
          id="arena-prompt"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              void submitPrompt();
            }
          }}
          placeholder="Ask about an MCP server..."
          maxLength={2000}
          className="min-h-20 w-full resize-none bg-transparent px-2 py-2 text-base leading-7 text-[var(--arena-ink)] outline-none placeholder:text-zinc-400"
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {promptTools.map(({ icon: ToolIcon, label, prompt }) => (
              <button
                key={label}
                type="button"
                onClick={() => setValue(prompt)}
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
            className="flex size-9 items-center justify-center rounded-md border border-[#9fd2e6] bg-[#edf8fc] text-[var(--arena-ink)] transition hover:bg-[var(--arena-highlight)] disabled:cursor-not-allowed disabled:opacity-45"
            aria-label="Submit MCP Arena prompt"
          >
            {status === "idle" ? (
              <ArrowRight size={17} aria-hidden="true" />
            ) : (
              <LoaderCircle size={17} className="animate-spin" aria-hidden="true" />
            )}
          </button>
        </div>
        <p className="mt-3 px-2 text-xs leading-5 text-[var(--arena-muted)]">
          MCP Arena uses a third-party AI model to answer from internal leaderboard evidence.
          Answers can be incomplete, so verify scores and cautions before installing a server.
        </p>
      </form>

      {(messages.length > 0 || error) && (
        <div className="mt-4 overflow-hidden rounded-xl border border-[var(--arena-blue-line)] bg-white text-left shadow-[0_18px_45px_rgba(90,174,209,0.1)]">
          <div className="flex items-center justify-between border-b border-[var(--arena-line)] px-4 py-3">
            <div>
              <div className="text-sm font-semibold">MCP Arena answer</div>
              <div className="text-xs text-[var(--arena-muted)]">Read-only leaderboard and review tools</div>
            </div>
            {lastUserPrompt && (
              <button
                type="button"
                onClick={() => void submitPrompt(undefined, lastUserPrompt)}
                disabled={status !== "idle"}
                className="inline-flex h-8 items-center gap-2 rounded-md border border-[var(--arena-line)] px-3 text-xs font-semibold disabled:opacity-45"
              >
                <RotateCcw size={13} aria-hidden="true" />
                Retry
              </button>
            )}
          </div>
          <div className="max-h-[520px] overflow-y-auto px-4 py-4">
            <div className="grid gap-4">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`rounded-lg px-4 py-3 ${
                    message.role === "user"
                      ? "ml-auto max-w-[88%] bg-[var(--arena-ink)] text-white"
                      : "mr-auto max-w-full border border-[var(--arena-line)] bg-[var(--arena-blue-soft)] text-[var(--arena-ink)]"
                  }`}
                >
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-70">
                    {message.role === "user" ? "You" : "MCP Arena"}
                  </div>
                  <div className="whitespace-pre-wrap break-words text-sm leading-6">
                    {message.content || (status !== "idle" ? "Reading MCP Arena tools..." : "")}
                  </div>
                </div>
              ))}
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-[var(--arena-red)]">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
