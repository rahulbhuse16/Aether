import { motion } from "framer-motion";
import clsx from "clsx";

interface LogoProps {
  size?: number | string;
  className?: string;
  animated?: boolean;
  alt?: string;
}

export const Logo = ({
  size = 120,
  className,
  animated = false,
  alt = "Aether Logo",
}: LogoProps) => {
  const logo = (
    <img
      src="/aether_logo.png"
      alt={alt}
      style={{
        width: typeof size === "number" ? `${size}px` : size,
        height: "auto",
      }}
      className={clsx("object-contain select-none", className)}
      draggable={false}
    />
  );

  if (!animated) {
    return logo;
  }

  return (
    <motion.div
      animate={{
        y: [0, -8, 0],
        scale: [1, 1.03, 1],
      }}
      transition={{
        duration: 5,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className="inline-flex"
    >
      {logo}
    </motion.div>
  );
};

