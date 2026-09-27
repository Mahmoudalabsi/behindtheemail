"use client";

import { useEffect, useState } from "react";
import { Mail, Menu, X } from "lucide-react";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it Works", href: "#how-it-works" },
  { label: "Use Cases", href: "#use-cases" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#0B1117]/85 backdrop-blur-md border-b border-white/10"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <a href="#top" className="flex items-center gap-2 group">
            <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-primary/15 ring-1 ring-brand-primary/30">
              <Mail className="h-4 w-4 text-brand-primary" />
            </span>
            <span className="text-[15px] font-semibold tracking-tight">
              Behind<span className="text-brand-primary">The</span>Email
            </span>
          </a>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="px-3 py-2 text-sm text-text-accent hover:text-text-primary transition-colors"
              >
                {l.label}
              </a>
            ))}
          </nav>

          {/* Desktop auth */}
          <div className="hidden md:flex items-center gap-2">
            <a
              href="#login"
              className="px-3 py-1.5 text-sm text-text-accent hover:text-text-primary transition-colors"
            >
              Log in
            </a>
            <a
              href="#signup"
              className="px-4 py-1.5 text-sm font-medium rounded-md btn-brand"
            >
              Sign up
            </a>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md text-text-accent hover:text-text-primary"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#0B1117]/95 backdrop-blur-md">
          <div className="px-4 py-4 space-y-1">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 text-sm text-text-accent hover:text-text-primary hover:bg-white/5 rounded-md"
              >
                {l.label}
              </a>
            ))}
            <div className="pt-3 mt-3 border-t border-white/10 flex flex-col gap-2">
              <a
                href="#login"
                className="px-3 py-2 text-sm text-text-accent hover:text-text-primary"
              >
                Log in
              </a>
              <a
                href="#signup"
                className="px-3 py-2 text-sm font-medium rounded-md btn-brand text-center"
              >
                Sign up
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
