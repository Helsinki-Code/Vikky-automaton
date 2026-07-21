"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const LINKS = [
  { href: "/", label: "Chat", icon: "💬" },
  { href: "/ledger", label: "Ledger", icon: "💰" },
  { href: "/children", label: "Children", icon: "🌱" },
  { href: "/soul", label: "Soul", icon: "🧭" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <>
      <button className="nav-hamburger" onClick={() => setMobileOpen((v) => !v)} aria-label="Toggle navigation">
        ☰
      </button>
      <nav className={`nav ${mobileOpen ? "nav-open" : ""}`}>
        <div className="nav-brand">
          <span className="nav-dot" />
          Vikky&apos;s Automaton
        </div>
        <div className="nav-links">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link ${pathname === link.href ? "active" : ""}`}
              onClick={() => setMobileOpen(false)}
            >
              <span className="nav-icon">{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </div>
        <button className="nav-logout" onClick={logout}>
          Sign out
        </button>
      </nav>
    </>
  );
}
