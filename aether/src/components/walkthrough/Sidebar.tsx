import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface SidebarProps {
  activeNav: string;
  navItems: Array<{
    id: string;
    icon: LucideIcon;
    label: string;
  }>;
}

export default function Sidebar({ activeNav, navItems }: SidebarProps) {
  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-64 border-r border-white/[0.08] bg-[#0A0B0D]/50 backdrop-blur-sm"
    >
      <nav className="flex flex-col p-3 space-y-1">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = activeNav === item.id;

          return (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * index }}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition-all ${
                isActive
                  ? "bg-[#8B7FE8]/10 text-[#A69DF0]"
                  : "text-[#94969E] hover:bg-white/[0.04] hover:text-[#F4F3EF]"
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? "text-[#8B7FE8]" : ""}`} />
              <span className="font-medium">{item.label}</span>
              {isActive && (
                <motion.div
                  layoutId="activeNav"
                  className="ml-auto h-1.5 w-1.5 rounded-full bg-[#8B7FE8]"
                />
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* User Section */}
    
    </motion.aside>
  );
}
