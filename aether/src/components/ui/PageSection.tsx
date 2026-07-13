import { motion } from "framer-motion";

export function PageSection({
  label,
  title,
  description,
  delay = 0,
  children,
}: {
  label?: string;
  title?: string;
  description?: string;
  delay?: number;
  children?: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="space-y-4"
    >
      {(label || title) && (
        <div>
          {label && (
            <div className="mb-2 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#22A67D]" />
              <span className="font-mono text-[11px] uppercase tracking-wide text-[#22A67D]">
                {label}
              </span>
            </div>
          )}
          {title && (
            <h2 className="text-[18px] font-medium tracking-tight text-[#F4F3EF]">
              {title}
            </h2>
          )}
          {description && (
            <p className="mt-1 text-[13px] text-[#94969E]">{description}</p>
          )}
        </div>
      )}
      {children}
    </motion.section>
  );
}
