// Suggested path: components/AmbientBackground.tsx
// Shared ambient background (dot grid + drifting glow + faint rotating hexagon)
// used behind Hero and Pricing. Same brand tokens as AuthPage.tsx.

import { motion, useReducedMotion } from "framer-motion";

export function AmbientBackground() {
  const reduce = useReducedMotion();

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#0A0B0D]">
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(244,243,239,0.6) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
        }}
      />

      <motion.div
        className="absolute -top-40 left-[8%] h-[420px] w-[420px] rounded-full blur-[110px]"
        style={{ background: "rgba(139,127,232,0.16)" }}
        animate={reduce ? {} : { y: [0, 30, 0], x: [0, 20, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-[30%] right-[6%] h-[380px] w-[380px] rounded-full blur-[110px]"
        style={{ background: "rgba(34,166,125,0.14)" }}
        animate={reduce ? {} : { y: [0, -26, 0], x: [0, -18, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
      />

      <motion.svg
        viewBox="0 0 100 100"
        className="absolute left-1/2 top-[18%] h-[640px] w-[640px] -translate-x-1/2 opacity-[0.05]"
        animate={reduce ? {} : { rotate: 360 }}
        transition={{ duration: 180, repeat: Infinity, ease: "linear" }}
      >
        <polygon
          points="50,4 93,27 93,73 50,96 7,73 7,27"
          fill="none"
          stroke="#F4F3EF"
          strokeWidth="0.6"
        />
      </motion.svg>
    </div>
  );
}