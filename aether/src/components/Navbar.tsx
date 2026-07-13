"use client";
// Suggested path: components/Navbar.tsx
// Marketing navbar — shared by Hero and Pricing (and any future public page).
// Extracted from Hero.tsx so it isn't duplicated per page. If Hero.tsx still
// has its own inline copy, replace it with this import.

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, ArrowRight,  } from "lucide-react";
import { Logo } from "./Logo";
import { FaGithub } from "react-icons/fa";

const NAV_LINKS = [
  { label: "Agents", href: "/#agents" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Pricing", href: "/pricing" },
  { label: "Docs", href: "/docs" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0A0B0D]/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <a href="/" className="flex items-center gap-2.5">
          <Logo size={60} />
         
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-[14px] text-[#94969E] transition-colors hover:text-[#F4F3EF]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-5 md:flex">
          <a
            href="https://github.com"
            className="flex items-center gap-1.5 text-[14px] text-[#94969E] transition-colors hover:text-[#F4F3EF]"
          >
            <FaGithub className="h-4 w-4" />
            GitHub
          </a>
          <a
            href="/signin"
            className="text-[14px] text-[#94969E] transition-colors hover:text-[#F4F3EF]"
          >
            Sign in
          </a>
          <a
            href="/signup"
            className="group flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#8B7FE8] to-[#22A67D] px-4 py-2 text-[13px] font-medium text-[#0A0B0D] transition-all hover:brightness-[1.05]"
          >
            Get started
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>

        <button
          className="text-[#F4F3EF] md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-white/[0.06] md:hidden"
          >
            <div className="flex flex-col gap-1 px-6 py-4">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="py-2 text-[14px] text-[#94969E] hover:text-[#F4F3EF]"
                >
                  {link.label}
                </a>
              ))}
              <div className="mt-2 flex flex-col gap-2 border-t border-white/[0.06] pt-4">
                <a href="/signin" className="py-1 text-[14px] text-[#94969E]">
                  Sign in
                </a>
                <a
                  href="/signup"
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-[#8B7FE8] to-[#22A67D] py-2.5 text-[14px] font-medium text-[#0A0B0D]"
                >
                  Get started
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}