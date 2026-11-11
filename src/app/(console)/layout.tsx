import type { ReactNode } from "react";

import { RoleGate } from "@/components/layout/RoleGate";
import { Sidebar } from "@/components/layout/Sidebar";

export default function ConsoleLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGate>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </RoleGate>
  );
}
