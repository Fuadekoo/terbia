"use client";

import { Toaster as HotToaster } from "react-hot-toast";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

/**
 * The app emits toasts through two libraries: `react-hot-toast` (admin/login)
 * and `sonner` (student screens). Both renderers must be mounted or one set of
 * toasts silently never appears.
 */
export const ToasterProvider = () => {
  return (
    <>
      <HotToaster
        position="top-right"
        gutter={10}
        toastOptions={{
          duration: 4000,
          className: "!bg-popover !text-popover-foreground !shadow-lg",
          style: {
            background: "var(--popover)",
            color: "var(--popover-foreground)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "10px 14px",
            fontSize: "0.875rem",
            boxShadow:
              "0 4px 8px -4px var(--shadow-tint-weak), 0 12px 28px -6px var(--shadow-tint)",
          },
          success: { iconTheme: { primary: "var(--success)", secondary: "white" } },
          error: {
            iconTheme: { primary: "var(--destructive)", secondary: "white" },
          },
        }}
      />
      <SonnerToaster position="top-right" richColors closeButton />
    </>
  );
};
