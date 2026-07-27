import { MobileSidebar } from "./mobile-sidebar";
import { Logo } from "./logo";

export const Navbar = () => {
  return (
    <div className="surface-glass flex h-full items-center gap-3 px-3 shadow-xs">
      <MobileSidebar />
      <div className="flex min-w-0 items-center gap-2">
        <div className="grid size-8 shrink-0 place-items-center rounded-md bg-card border border-border">
          <Logo />
        </div>
        <span className="truncate text-sm font-semibold tracking-tight">
          Darelkubra
        </span>
      </div>
    </div>
  );
};
