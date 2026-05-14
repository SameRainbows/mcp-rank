import Link from "next/link";
import {
  FileText,
  Info,
  Landmark,
  ListOrdered,
  PanelLeft,
  Scale,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Home", icon: Landmark },
  { href: "/rankings", label: "Leaderboard", icon: ListOrdered },
  { href: "/search", label: "Search", icon: Search },
  { href: "/compare/github-vs-filesystem", label: "Compare", icon: Scale },
  { href: "/reports/weekly-best-mcp-service", label: "Reports", icon: FileText },
  { href: "/methodology", label: "Methodology", icon: ShieldCheck },
  { href: "/about", label: "About", icon: Info },
  { href: "/submit", label: "Submit", icon: Send },
];

type ArenaShellProps = {
  children: React.ReactNode;
  mode?: string;
};

export function ArenaShell({ children }: ArenaShellProps) {
  return (
    <div className="min-h-screen bg-[var(--arena-bg)] text-[var(--arena-ink)]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-14 flex-col border-r border-[var(--arena-line)] bg-[var(--arena-bg)] md:flex">
        <div className="flex h-14 items-center justify-center border-b border-[var(--arena-line)]">
          <PanelLeft size={18} aria-hidden="true" />
        </div>
        <nav className="flex flex-1 flex-col items-center gap-2 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group relative flex size-9 items-center justify-center rounded-md text-[var(--arena-muted)] transition hover:bg-[var(--arena-blue-soft)] hover:text-[var(--arena-ink)]"
                aria-label={item.label}
                title={item.label}
              >
                <Icon size={17} aria-hidden="true" />
                <span className="pointer-events-none absolute left-10 z-20 hidden whitespace-nowrap rounded-md border border-[var(--arena-line)] bg-white px-2 py-1 text-xs font-medium text-[var(--arena-ink)] shadow-sm group-hover:block">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="flex h-14 items-center justify-center border-t border-[var(--arena-line)]">
          <Link href="/methodology" aria-label="Review notes" title="Review notes">
            <FileText size={17} aria-hidden="true" />
          </Link>
        </div>
      </aside>

      <div className="md:pl-14">
        <header className="sticky top-0 z-20 border-b border-[var(--arena-line)] bg-[color-mix(in_srgb,var(--arena-bg)_92%,white)]/95 backdrop-blur">
          <div className="flex h-14 items-center justify-between px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-4">
              <Link href="/" className="flex shrink-0 items-center gap-2">
                <Landmark size={23} strokeWidth={1.7} aria-hidden="true" />
                <span className="font-serif text-xl font-semibold tracking-tight">MCP Rank</span>
              </Link>
            </div>
            <nav className="hidden items-center gap-6 text-sm text-[var(--arena-muted)] lg:flex">
              <Link href="/rankings" className="hover:text-[var(--arena-ink)]">
                Leaderboard
              </Link>
              <Link href="/search" className="hover:text-[var(--arena-ink)]">
                Search
              </Link>
              <Link href="/compare/github-vs-filesystem" className="hover:text-[var(--arena-ink)]">
                Compare
              </Link>
              <Link href="/reports/weekly-best-mcp-service" className="hover:text-[var(--arena-ink)]">
                Reports
              </Link>
              <Link href="/about" className="hover:text-[var(--arena-ink)]">
                About
              </Link>
              <Link href="/submit" className="hover:text-[var(--arena-ink)]">
                Submit
              </Link>
            </nav>
            <div className="flex items-center gap-2">
              <Link
                href="/methodology"
                className="hidden size-9 items-center justify-center rounded-md border border-[var(--arena-line)] bg-white text-[var(--arena-muted)] transition hover:border-[var(--arena-blue-line)] hover:bg-[var(--arena-blue-soft)] hover:text-[var(--arena-ink)] sm:flex"
                aria-label="Scoring controls"
                title="Scoring controls"
              >
                <SlidersHorizontal size={16} aria-hidden="true" />
              </Link>
              <Link
                href="/rankings"
                className="rounded-md bg-[var(--arena-ink)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-black"
              >
                View Leaderboard
              </Link>
            </div>
          </div>
        </header>
        {children}
        <footer className="border-t border-[var(--arena-line)] bg-[color-mix(in_srgb,var(--arena-bg)_88%,white)]">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 text-sm text-[var(--arena-muted)] sm:px-6 lg:px-8">
            <div className="flex flex-wrap gap-x-5 gap-y-2 font-medium">
              <Link href="/about" className="hover:text-[var(--arena-ink)]">
                About
              </Link>
              <Link href="/methodology" className="hover:text-[var(--arena-ink)]">
                Methodology
              </Link>
              <Link href="/submit" className="hover:text-[var(--arena-ink)]">
                Submit MCP Server
              </Link>
              <Link href="/privacy" className="hover:text-[var(--arena-ink)]">
                Privacy
              </Link>
            </div>
            <p>
              MCP Rank is independent and not affiliated with Anthropic, OpenAI, GitHub, or the official MCP project.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
