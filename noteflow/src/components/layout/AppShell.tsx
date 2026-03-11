import type { ReactNode } from "react";
import Sidebar from "./Sidebar";

interface AppShellProps {
  topBar: ReactNode;
  children: ReactNode;
}

export default function AppShell({ topBar, children }: AppShellProps): JSX.Element {
  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        {topBar}
        <main className="flex-1 overflow-auto px-8 pb-8 pt-6">{children}</main>
      </div>
    </div>
  );
}
