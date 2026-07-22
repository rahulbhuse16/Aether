import { clsx } from "clsx";

export function GlassCard({
  children,
  className,
  highlight,
  onclick
}: {
  children: React.ReactNode;
  className?: string;
  highlight?: boolean;
  onclick?: () => void;
}) {
  return (
    <div
      className={clsx(
        "rounded-xl border p-5",
        highlight
          ? "border-[#8B7FE8]/20 bg-gradient-to-br from-[#8B7FE8]/[0.06] to-[#22A67D]/[0.04]"
          : "border-white/[0.08] bg-white/[0.02]",
        className
      )}
    >
      {children}
    </div>
  );
}
