import { Logo } from "./logo";
import { SidebarRoutes } from "./sidebar-routes";
import { SidebarSignOut } from "./sidebar-sign-out";

export const Sidebar = () => {
  return (
    <div className="flex h-full flex-col overflow-hidden border-r border-sidebar-border bg-sidebar">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-sidebar-border/70">
        <div className="grid place-items-center size-9 shrink-0 rounded-lg bg-card border border-sidebar-border shadow-xs">
          <Logo />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight text-sidebar-foreground">
            Darelkubra
          </p>
          <p className="truncate text-xs text-sidebar-foreground/60">
            Admin console
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-3">
        <p className="px-3 pb-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-sidebar-foreground/45">
          Manage
        </p>
        <SidebarRoutes />
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border/70 p-2.5">
        <SidebarSignOut />
      </div>
    </div>
  );
};
