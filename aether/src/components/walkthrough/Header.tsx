import { motion } from "framer-motion";

export default function HeroHeader() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="relative flex flex-col items-center justify-center px-6 pt-28 pb-14 text-center bg-[#05070B]"
    >
      {/* Glow */}
      <div className="absolute top-10 h-56 w-56 rounded-full bg-cyan-500/10 blur-[120px]" />

      {/* Logo */}
      <motion.img
        src={'/aether_logo.png'}
        alt="Aether"
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          duration: 0.8,
          delay: 0.15,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="relative mb-8 h-16 w-auto select-none"
        draggable={false}
      />

      {/* Badge */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="mb-5 rounded-full border border-cyan-400/20 bg-cyan-400/5 px-4 py-1.5 text-xs font-medium tracking-wide text-cyan-300 backdrop-blur-xl"
      >
        AI Engineering Workspace
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="max-w-5xl text-5xl font-bold leading-tight tracking-tight text-white md:text-7xl"
      >
        Experience the Future of
        <br />
        <span className="bg-gradient-to-r from-cyan-300 via-sky-400 to-violet-400 bg-clip-text text-transparent">
          AI-Powered Software Engineering
        </span>
      </motion.h1>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.65 }}
        className="mt-8 max-w-3xl text-lg leading-8 text-slate-400"
      >
        Watch how Aether understands repositories, reviews pull requests,
        detects bugs, generates architecture, summarizes Slack discussions,
        syncs Notion knowledge, and accelerates your engineering workflow—
        automatically.
      </motion.p>

      {/* Decorative line */}
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: 140 }}
        transition={{ delay: 0.9, duration: 0.8 }}
        className="mt-12 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
      />
    </motion.section>
  );
}