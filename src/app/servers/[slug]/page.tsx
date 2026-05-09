import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, CheckCircle2, CircleAlert, Terminal } from "lucide-react";
import { Header } from "@/components/header";
import { ScoreBadge } from "@/components/score-badge";
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
    title: `${server.name} Review | MCP Rank`,
    description: server.tagline,
  };
}

export default async function ServerPage({ params }: PageProps) {
  const { slug } = await params;
  const server = await getServer(slug);
  if (!server) notFound();

  const total = overallScore(server.score);

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <Header />
      <section className="border-b border-zinc-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_300px] lg:px-8">
          <div>
            <p className="text-sm font-semibold text-emerald-700">{server.category}</p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight">{server.name}</h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-zinc-600">{server.tagline}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {server.clients.map((client) => (
                <span
                  key={client}
                  className="rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-sm font-medium capitalize text-zinc-700"
                >
                  {client === "vscode" ? "VS Code" : client}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-zinc-500">Overall score</span>
              <ScoreBadge score={total} size="lg" />
            </div>
            <div className="mt-5 grid gap-2 text-sm text-zinc-700">
              <span>Reviewed: {server.lastReviewed}</span>
              <span>Stars: {server.stars.toLocaleString()}</span>
              <span>Source: {server.source}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <div className="grid gap-8">
          <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Score breakdown</h2>
            <div className="mt-5 grid gap-4">
              {Object.entries(scoreLabels).map(([key, label]) => {
                const value = server.score[key as keyof typeof server.score];
                return (
                  <div key={key}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-medium text-zinc-700">{label}</span>
                      <span className="font-semibold text-zinc-950">{value}</span>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-100">
                      <div
                        className="h-2 rounded-full bg-emerald-600"
                        style={{ width: `${value}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Evidence notes</h2>
            <div className="mt-5 grid gap-4">
              {server.evidence.map((item) => (
                <div key={item} className="flex gap-3 text-sm leading-6 text-zinc-700">
                  <CheckCircle2 className="mt-1 shrink-0 text-emerald-600" size={17} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Example value</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {server.examples.map((item) => (
                <div
                  key={item}
                  className="rounded-md border border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 text-zinc-700"
                >
                  {item}
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="grid content-start gap-5">
          <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold">Install test</h2>
            <div className="mt-4 rounded-md bg-zinc-950 p-4 text-sm text-zinc-50">
              <div className="mb-2 flex items-center gap-2 text-zinc-400">
                <Terminal size={15} aria-hidden="true" />
                <span>Command</span>
              </div>
              <code className="break-words font-mono text-xs leading-6">{server.installCommand}</code>
            </div>
          </section>

          <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold">Risk review</h2>
            <div className="mt-4 grid gap-3">
              {server.cautions.map((item) => (
                <div key={item} className="flex gap-3 text-sm leading-6 text-zinc-700">
                  <CircleAlert className="mt-1 shrink-0 text-amber-600" size={17} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold">Repository</h2>
            <Link
              href={server.repositoryUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-zinc-950"
            >
              Open source repo
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </section>
        </aside>
      </section>
    </main>
  );
}
