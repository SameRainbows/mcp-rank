import Link from "next/link";
import { ShieldCheck } from "lucide-react";

const navItems = [
  { href: "/rankings", label: "Rankings" },
  { href: "/reports/weekly-best-mcp-service", label: "Reports" },
  { href: "/methodology", label: "Methodology" },
];

export function Header() {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 text-zinc-950">
          <span className="flex size-9 items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700">
            <ShieldCheck size={19} strokeWidth={2.2} aria-hidden="true" />
          </span>
          <span className="text-lg font-semibold">MCP Rank</span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-medium text-zinc-600 sm:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-zinc-950">
              {item.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/rankings"
          className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
        >
          View index
        </Link>
      </div>
    </header>
  );
}
