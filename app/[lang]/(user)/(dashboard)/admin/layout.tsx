import { Sidebar } from "@/components/custom/admin/sidebar";
import { Navbar } from "@/components/custom/admin/navbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-dvh overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 z-50 hidden w-60 flex-col md:flex">
        <Sidebar />
      </aside>

      {/* Mobile top bar — the only way to reach navigation below md */}
      <header className="fixed inset-x-0 top-0 z-40 h-14 md:hidden">
        <Navbar />
      </header>

      {/* The outer frame is fixed-height; the inner wrapper is the scroll
          container. Pages that manage their own scrolling (PageShell) sit at
          h-full inside it and never make it scroll. */}
      <main className="app-canvas flex h-dvh flex-col overflow-hidden pt-14 md:pl-60 md:pt-0">
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}
