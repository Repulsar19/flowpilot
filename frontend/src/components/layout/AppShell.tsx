import { Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-surface-border bg-white px-8 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Enterprise AI Workflow Redesign
          </p>
        </header>
        <main className="flex-1 px-8 py-6">{children}</main>
      </div>
    </div>
  );
}
