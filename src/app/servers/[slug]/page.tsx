import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, CheckCircle2, CircleAlert, Terminal } from "lucide-react";
import { ArenaShell } from "@/components/arena-shell";
import { getServer, getServers } from "@/lib/data";
import { overallScore, scoreLabels } from "@/lib/scoring";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const servers = await getServers();
  return servers.map((server) => ({ slug: server.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const server = await getServer(slug);
  if (!server) return {};

  return {
    title: `${server.name} Review`,
    description: server.tagline,
  };
}

export default async function ServerPage({ params }: PageProps) {
  const { slug } = await params;
  const server = await getServer(slug);
  if (!server) notFound();

  const total = overallScore(server.score);

  return (
    <ArenaShell mode="Server Review">
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div>
            <p className="text-sm font-semibold text-[var(--arena-green)]">{server.category}</p>
            <h1 className="mt-3 font-serif text-5xl font-semibold leading-tight">{server.name}</h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-[var(--arena-muted)]">{server.tagline}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {server.clients.map((client) => (
                <span
                  key={client}
                  className="rounded-md border border-[var(--arena-line)] bg-white px-2.5 py-1 text-sm font-medium capitalize text-[var(--arena-muted)]"
                >
                  {client === "vscode" ? "VS Code" : client}
                </span>
              ))}
            </div>
          </div>
          <aside className="rounded-lg border border-[var(--arena-line)] bg-white p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[var(--arena-muted)]">MCP Arena score</span>
              <span className="font-mono text-5xl font-semibold">{total}</span>
            </div>
            <div className="mt-5 grid gap-2 text-sm text-[var(--arena-muted)]">
              <span>Reviewed: {server.lastReviewed}</span>
              <span>Stars: {server.stars.toLocaleString()}</span>
              <span>Source: {server.source}</span>
              <span className="capitalize">Risk: {server.risk}</span>
            </div>
          </aside>
        </section>

        <section className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="grid gap-8">
            <section className="rounded-lg border border-[var(--arena-line)] bg-white p-6">
              <h2 className="font-serif text-2xl font-semibold">Score breakdown</h2>
              <div className="mt-5 grid gap-4">
                {Object.entries(scoreLabels).map(([key, label]) => {
                  const value = server.score[key as keyof typeof server.score];
                  return (
                    <div key={key}>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="font-medium text-[var(--arena-muted)]">{label}</span>
                        <span className="font-mono font-semibold">{value}</span>
                      </div>
                      <div className="h-2 rounded-full bg-[var(--arena-surface)]">
                        <div
                          className="h-2 rounded-full bg-[var(--arena-green)]"
                          style={{ width: `${value}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-lg border border-[var(--arena-line)] bg-white p-6">
              <h2 className="font-serif text-2xl font-semibold">Evidence notes</h2>
              <div className="mt-5 grid gap-4">
                {server.evidence.map((item) => (
                  <div key={item} className="flex gap-3 text-sm leading-6 text-[var(--arena-muted)]">
                    <CheckCircle2 className="mt-1 shrink-0 text-[var(--arena-green)]" size={17} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-[var(--arena-line)] bg-white p-6">
              <h2 className="font-serif text-2xl font-semibold">Battle examples</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {server.examples.map((item) => (
                  <div
                    key={item}
                    className="rounded-md border border-[var(--arena-line)] bg-[var(--arena-surface)] p-4 text-sm leading-6 text-[var(--arena-muted)]"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="grid content-start gap-5">
            <section className="rounded-lg border border-[var(--arena-line)] bg-white p-5">
              <h2 className="font-serif text-2xl font-semibold">Install test</h2>
              <div className="mt-4 rounded-md bg-[var(--arena-ink)] p-4 text-sm text-white">
                <div className="mb-2 flex items-center gap-2 text-zinc-300">
                  <Terminal size={15} aria-hidden="true" />
                  <span>Command</span>
                </div>
                <code className="break-words font-mono text-xs leading-6">{server.installCommand}</code>
              </div>
            </section>

            <section className="rounded-lg border border-[var(--arena-line)] bg-white p-5">
              <h2 className="font-serif text-2xl font-semibold">Risk review</h2>
              <div className="mt-4 grid gap-3">
                {server.cautions.map((item) => (
                  <div key={item} className="flex gap-3 text-sm leading-6 text-[var(--arena-muted)]">
                    <CircleAlert className="mt-1 shrink-0 text-[var(--arena-amber)]" size={17} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-[var(--arena-line)] bg-white p-5">
              <h2 className="font-serif text-2xl font-semibold">Repository</h2>
              <Link
                href={server.repositoryUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-2 text-sm font-semibold"
              >
                Open source repo
                <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            </section>
          </aside>
        </section>
      </main>
    </ArenaShell>
  );
}
