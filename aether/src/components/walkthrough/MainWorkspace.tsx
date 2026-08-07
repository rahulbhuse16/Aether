import type { ReactNode } from "react";

interface MainWorkspaceProps {
  children: ReactNode;
}

export default function MainWorkspace({ children }: MainWorkspaceProps) {
  return (
    <main className="flex-1 overflow-hidden bg-[#0A0B0D]/30">
      <div className="h-full p-6">
        {children}
      </div>
    </main>
  );
}
