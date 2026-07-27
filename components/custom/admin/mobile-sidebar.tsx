"use client";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

export const MobileSidebar = () => {
  return (
    <Sheet>
      <SheetTrigger
        aria-label="Open navigation menu"
        className="focus-ring grid size-9 shrink-0 place-items-center rounded-lg text-foreground/70 transition-colors hover:bg-accent hover:text-foreground md:hidden"
      >
        <Menu className="size-5" />
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-68 border-sidebar-border bg-sidebar p-0"
        aria-describedby="mobile-nav-description"
      >
        <VisuallyHidden>
          <SheetTitle>Navigation menu</SheetTitle>
          <SheetDescription id="mobile-nav-description">
            Links to the admin console sections.
          </SheetDescription>
        </VisuallyHidden>

        <Sidebar />
      </SheetContent>
    </Sheet>
  );
};
