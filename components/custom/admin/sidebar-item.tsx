"use client";
import { LucideIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  href: string;
}

export const SidebarItem = ({
  icon: Icon,
  label,
  href,
}: SidebarItemProps) => {
  const pathname = usePathname();
  const router = useRouter();

  const isActive =
    (pathname === "/" && href === "/") ||
    pathname === href ||
    pathname?.startsWith(`${href}/`);

  return (
    <button
      onClick={() => router.push(href)}
      type="button"
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group focus-ring relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
        "transition-all duration-200 ease-out-soft",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-xs"
          : "text-sidebar-foreground/75 hover:bg-sidebar-accent/55 hover:text-sidebar-foreground"
      )}
    >
      {/* Active rail */}
      <span
        className={cn(
          "absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-sidebar-primary",
          "transition-all duration-200",
          isActive ? "opacity-100" : "opacity-0 scale-y-50"
        )}
      />
      <Icon
        size={18}
        className={cn(
          "shrink-0 transition-colors",
          isActive
            ? "text-sidebar-primary"
            : "text-sidebar-foreground/55 group-hover:text-sidebar-foreground/85"
        )}
      />
      <span className="truncate text-left">{label}</span>
    </button>
  );
};
