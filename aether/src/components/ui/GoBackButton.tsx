import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { clsx } from "clsx";

interface GoBackButtonProps {
  to?: string;
  label?: string;
  className?: string;
}

export function GoBackButton({
  to,
  label = "Go back",
  className,
}: GoBackButtonProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (to) {
      navigate(to);
      return;
    }

    navigate(-1);
  };

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      whileHover={{ x: -2 }}
      whileTap={{ scale: 0.98 }}
      className={clsx(
        "group inline-flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-[13px] font-medium text-[#94969E] backdrop-blur-sm transition-colors hover:border-white/[0.14] hover:bg-white/[0.04] hover:text-[#F4F3EF]",
        className
      )}
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] transition-all group-hover:border-[#8B7FE8]/30 group-hover:bg-[#8B7FE8]/10 group-hover:shadow-[0_0_12px_rgba(139,127,232,0.15)]">
        <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
      </span>
      {label}
    </motion.button>
  );
}
