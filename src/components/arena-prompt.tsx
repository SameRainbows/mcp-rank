"use client";

import { useState } from "react";
import { ArrowRight, Code2, Globe2, Paperclip, Scale, Terminal } from "lucide-react";

const prompts = [
  "Is the GitHub MCP Server safe for a code-review agent?",
  "Compare Context7 and Filesystem for a Cursor setup",
  "Find low-risk MCP servers that work in Codex",
];

export function ArenaPrompt() {
  const [value, setValue] = useState("");

  return (
    <section className="mx-auto w-full max-w-3xl rounded-xl border border-[#9fd2e6] bg-white p-3 shadow-[0_18px_45px_rgba(90,174,209,0.16)]">
      <label className="sr-only" htmlFor="arena-prompt">
        Ask about an MCP server
      </label>
      <textarea
        id="arena-prompt"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Ask about an MCP server..."
        className="min-h-20 w-full resize-none bg-transparent px-2 py-2 text-base leading-7 text-[var(--arena-ink)] outline-none placeholder:text-zinc-400"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {[
            [Paperclip, "Attach manifest"],
            [Terminal, "Run install test"],
            [Globe2, "Web signals"],
            [Scale, "Compare"],
            [Code2, "Inspect config"],
          ].map(([Icon, label], index) => {
            const ToolIcon = Icon as typeof Paperclip;
            return (
              <button
                key={label as string}
                type="button"
                onClick={() => setValue(prompts[index % prompts.length])}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--arena-line)] bg-[var(--arena-surface)] px-3 text-sm font-medium text-[var(--arena-ink)] transition hover:border-[#9fd2e6] hover:bg-[#edf8fc]"
              >
                <ToolIcon size={15} aria-hidden="true" />
                <span>{label as string}</span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className="flex size-9 items-center justify-center rounded-md border border-[#9fd2e6] bg-[#edf8fc] text-[var(--arena-ink)] transition hover:bg-[var(--arena-highlight)]"
          aria-label="Submit MCP Arena prompt"
        >
          <ArrowRight size={17} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
