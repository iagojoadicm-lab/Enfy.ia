"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

const navItems = [
  { href: "/pacientes", label: "Pacientes" }
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-slate-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="text-lg font-semibold text-brand-700">Enfy</div>
          <nav className="flex items-center gap-4 text-sm font-medium text-slate-600">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded px-2 py-1 transition hover:text-brand-700 ${pathname.startsWith(item.href) ? "text-brand-600" : ""}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
