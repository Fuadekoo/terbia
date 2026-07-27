"use client";
import React, { createContext, useContext, useState } from "react";
import MainMenu from "@/components/custom/student/main-menu";
import MenuTitle from "@/components/custom/student/menu-title";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { MenuIcon, X } from "lucide-react";
import { useMediaQuery } from "@/hooks/use-media-query";
import useAction from "@/hooks/useAction";
import { getPackageData } from "@/actions/student/package";
import { useParams } from "next/navigation";

const MenuContext = createContext<{ refresh: () => void } | null>(null);

export const useMainMenu = () => {
  const value = useContext(MenuContext);

  if (!value) throw new Error("you need to provide first");

  return value;
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const isMobile = useMediaQuery("(max-width: 768px)");

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const params = useParams<{ wdt_ID: string }>();
  const wdt_ID = params?.wdt_ID;
  const [data, refresh] = useAction(
    getPackageData,
    [true, (response) => console.log(response)],
    Number(wdt_ID)
  );

  return (
    <div className="h-auto overflow-hidden md:grid md:grid-cols-[250px_1fr]">
      <MainMenu
        data={data}
        className="hidden border-r border-sidebar-border bg-sidebar md:flex"
      />
      {isMobile && (
        <div className="surface-glass sticky left-0 top-0 z-40 flex items-center justify-between gap-3 px-4 py-3 shadow-xs md:hidden">
          <MenuTitle />
          {/* Hamburger button outside Drawer */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="focus-ring grid size-9 shrink-0 place-items-center rounded-lg text-foreground/70 transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Open menu"
          >
            <MenuIcon className="size-5" />
          </button>
          <Drawer
            direction="right"
            open={mobileMenuOpen}
            onOpenChange={(open) => setMobileMenuOpen(open)}
          >
            <DrawerContent className="flex h-dvh w-72 flex-col bg-sidebar p-0">
              <div className="min-h-0 flex-1 overflow-y-auto">
                <MainMenu data={data} className="w-full" />
              </div>
              {/* Close button pinned to the bottom of the drawer */}
              <div className="shrink-0 border-t border-sidebar-border p-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <X className="size-4" />
                  Close
                </Button>
              </div>
            </DrawerContent>
          </Drawer>
        </div>
      )}
      <MenuContext.Provider value={{ refresh }}>
        <div className="grid h-dvh overflow-hidden">{children}</div>
      </MenuContext.Provider>
    </div>
  );
}
