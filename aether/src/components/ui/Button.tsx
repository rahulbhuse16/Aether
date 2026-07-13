import { clsx } from "clsx";

const variants = {
  default: "border-white/[0.1] bg-white/[0.02] text-[#F4F3EF] hover:bg-white/[0.04]",
  primary:
    "border-transparent bg-gradient-to-r from-[#8B7FE8] to-[#22A67D] text-[#0A0B0D] hover:opacity-90",
  ghost: "border-transparent bg-transparent text-[#94969E] hover:text-[#F4F3EF] hover:bg-white/[0.03]",
};

const sizes = {
  sm: "px-3 py-1.5 text-[12px]",
  md: "px-4 py-2 text-[13px]",
  lg: "px-5 py-2.5 text-[14px]",
};

export function Button({
  children,
  variant = "default",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-lg border font-medium transition-colors disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
