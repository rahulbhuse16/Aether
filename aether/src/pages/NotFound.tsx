import { motion } from "framer-motion";
import {
  ArrowLeft,
  Home,
  Search,
  Sparkles,
  Orbit,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#08090C] text-[#F4F3EF]">
      {/* Background Glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#8B7FE8]/10 blur-[140px]" />

        <div className="absolute left-[15%] top-[20%] h-1 w-1 rounded-full bg-white/60 shadow-[0_0_20px_8px_rgba(255,255,255,0.15)]" />
        <div className="absolute right-[20%] top-[30%] h-1 w-1 rounded-full bg-white/60 shadow-[0_0_20px_8px_rgba(255,255,255,0.15)]" />
        <div className="absolute bottom-[25%] left-[25%] h-1 w-1 rounded-full bg-white/60 shadow-[0_0_20px_8px_rgba(255,255,255,0.15)]" />
        <div className="absolute bottom-[20%] right-[15%] h-1 w-1 rounded-full bg-white/60 shadow-[0_0_20px_8px_rgba(255,255,255,0.15)]" />
      </div>

      {/* Grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Content */}
      <main className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl text-center">
          {/* Orbital Icon */}
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="relative mx-auto mb-8 flex h-28 w-28 items-center justify-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{
                duration: 18,
                repeat: Infinity,
                ease: "linear",
              }}
              className="absolute inset-0 rounded-full border border-[#8B7FE8]/30"
            />

            <motion.div
              animate={{ rotate: -360 }}
              transition={{
                duration: 12,
                repeat: Infinity,
                ease: "linear",
              }}
              className="absolute inset-3 rounded-full border border-dashed border-[#22A67D]/30"
            />

            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.1] bg-white/[0.05] shadow-2xl backdrop-blur-xl">
              <Orbit className="h-7 w-7 text-[#8B7FE8]" />
            </div>

            <span className="absolute right-1 top-5 h-2 w-2 rounded-full bg-[#22A67D] shadow-[0_0_12px_4px_rgba(34,166,125,0.35)]" />
          </motion.div>

          {/* 404 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6 }}
          >
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.35em] text-[#8B7FE8]">
              Signal Lost
            </p>

            <h1 className="bg-gradient-to-b from-white via-white to-white/40 bg-clip-text text-[clamp(6rem,18vw,11rem)] font-semibold leading-none tracking-[-0.08em] text-transparent">
              404
            </h1>

            <h2 className="mt-4 text-2xl font-medium tracking-tight text-[#F4F3EF] sm:text-3xl">
              This page drifted out of orbit.
            </h2>

            <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[#94969E]">
              The destination you're looking for doesn't exist, has moved, or
              is currently outside Aether's known universe.
            </p>
          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <button
              onClick={() => navigate(-1)}
              className="group flex items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-5 py-3 text-sm text-[#D5D4D0] transition-all hover:border-white/[0.18] hover:bg-white/[0.08]"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Go back
            </button>

            <button
              onClick={() => navigate("/")}
              className="group flex items-center gap-2 rounded-xl bg-[#F4F3EF] px-5 py-3 text-sm font-medium text-[#08090C] transition-all hover:bg-white hover:shadow-[0_0_30px_rgba(244,243,239,0.12)]"
            >
              <Home className="h-4 w-4" />
              Return home
            </button>
          </motion.div>

          {/* Footer Hint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-12 flex items-center justify-center gap-2 text-xs text-[#55575F]"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#8B7FE8]" />
            <span>Aether is still watching the signal</span>
            <Search className="h-3.5 w-3.5" />
          </motion.div>
        </div>
      </main>
    </div>
  );
}