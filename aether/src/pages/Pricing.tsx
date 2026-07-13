"use client";
// Suggested path: app/pricing/page.tsx

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";
import { AmbientBackground } from "../components/AmbientBackGround";
import { Footer } from "../components/Footer";
import { Navbar } from "../components/Navbar";


type Cycle = "monthly" | "annual";

const PLANS = [
  {
    name: "Free",
    price: { monthly: 0, annual: 0 },
    description: "Try Aether on a single project.",
    cta: "Start for free",
    href: "/signup",
    highlight: false,
    features: [
      "1 project",
      "Chat with repository",
      "Limited AI credits / month",
      "GitHub integration",
    ],
  },
  {
    name: "Pro",
    price: { monthly: 20, annual: 16 },
    description: "For individual developers shipping fast.",
    cta: "Start free trial",
    href: "/signup",
    highlight: true,
    features: [
      "Unlimited projects",
      "Full agent suite",
      "Higher AI credit pool",
      "GitHub + calendar integrations",
      "Priority support",
    ],
  },
  {
    name: "Team",
    price: { monthly: 40, annual: 32 },
    description: "For engineering teams working together.",
    cta: "Start free trial",
    href: "/signup",
    highlight: false,
    features: [
      "Everything in Pro",
      "Jira + Slack integrations",
      "Shared agent memory",
      "Audit trail & approvals",
      "Admin controls",
    ],
  },
  {
    name: "Enterprise",
    price: { monthly: null, annual: null },
    description: "Custom deployment for larger orgs.",
    cta: "Contact sales",
    href: "mailto:sales@aether.dev",
    highlight: false,
    features: [
      "Everything in Team",
      "Self-hosted / VPC option",
      "SSO",
      "Custom agents",
      "Dedicated SLA",
    ],
  },
];

function BillingToggle({
  cycle,
  onChange,
}: {
  cycle: Cycle;
  onChange: (c: Cycle) => void;
}) {
  return (
    <div className="mx-auto flex w-fit items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.02] p-1">
      {(["monthly", "annual"] as Cycle[]).map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className={`relative rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors ${
            cycle === c ? "text-[#0A0B0D]" : "text-[#94969E] hover:text-[#F4F3EF]"
          }`}
        >
          {cycle === c && (
            <motion.span
              layoutId="billingToggle"
              className="absolute inset-0 rounded-full bg-[#F4F3EF]"
              transition={{ type: "spring", duration: 0.4, bounce: 0.2 }}
            />
          )}
          <span className="relative z-10 capitalize">
            {c}
            {c === "annual" && (
              <span className="ml-1 text-[11px] text-[#22A67D]">-20%</span>
            )}
          </span>
        </button>
      ))}
    </div>
  );
}

export default function Pricing() {
  const [cycle, setCycle] = useState<Cycle>("monthly");

  return (
    <div className="relative min-h-screen bg-[#0A0B0D]">
      <AmbientBackground />
      <Navbar />

      <main className="px-6 pb-24 pt-20">
        <div className="mx-auto max-w-2xl text-center">
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-[#22A67D]">
            Pricing
          </span>
          <h1 className="mt-3 text-[36px] font-medium tracking-tight text-[#F4F3EF] sm:text-[42px]">
            Simple pricing, real engineering work
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-[#94969E]">
            Usage-based AI credits on top of every plan — no surprise bills,
            tracked live by the cost governor.
          </p>

          <div className="mt-8">
            <BillingToggle cycle={cycle} onChange={setCycle} />
          </div>
        </div>

        <div className="mx-auto mt-14 grid max-w-6xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.06 }}
              className={`flex flex-col rounded-2xl border p-6 ${
                plan.highlight
                  ? "border-[#8B7FE8]/40 bg-gradient-to-br from-[#8B7FE8]/[0.08] to-[#22A67D]/[0.05]"
                  : "border-white/[0.08] bg-white/[0.02]"
              }`}
            >
              {plan.highlight && (
                <span className="mb-3 w-fit rounded-full border border-[#8B7FE8]/30 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-[#8B7FE8]">
                  Most popular
                </span>
              )}

              <h3 className="text-[16px] font-medium text-[#F4F3EF]">{plan.name}</h3>
              <p className="mt-1 text-[12.5px] text-[#94969E]">{plan.description}</p>

              <div className="mt-5 flex items-baseline gap-1">
                {plan.price[cycle] === null ? (
                  <span className="text-[28px] font-medium text-[#F4F3EF]">Custom</span>
                ) : (
                  <>
                    <span className="text-[28px] font-medium text-[#F4F3EF]">
                      ${plan.price[cycle]}
                    </span>
                    <span className="text-[13px] text-[#55575F]">/user/mo</span>
                  </>
                )}
              </div>

              <a
                href={plan.href}
                className={`group mt-6 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[13.5px] font-medium transition-all ${
                  plan.highlight
                    ? "bg-gradient-to-r from-[#8B7FE8] to-[#22A67D] text-[#0A0B0D] hover:brightness-[1.05]"
                    : "border border-white/[0.1] bg-white/[0.02] text-[#F4F3EF] hover:bg-white/[0.05]"
                }`}
              >
                {plan.cta}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </a>

              <ul className="mt-6 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[13px] text-[#94969E]">
                    <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#22A67D]" />
                    {f}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}