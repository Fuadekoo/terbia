"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { logout } from "@/actions/admin/authentication";

export const SidebarSignOut = () => {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const onSignOut = async () => {
    if (pending) return;
    setPending(true);
    try {
      const result = await logout();
      if (result?.success) {
        router.push("/en/login");
        router.refresh();
      } else {
        toast.error(result?.message || "Logout failed");
        setPending(false);
      }
    } catch {
      toast.error("Logout failed");
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onSignOut}
      disabled={pending}
      className="focus-ring flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/75 transition-colors duration-200 hover:bg-destructive/10 hover:text-destructive-tint-fg disabled:opacity-60"
    >
      {pending ? (
        <Loader2 size={18} className="shrink-0 animate-spin" />
      ) : (
        <LogOut size={18} className="shrink-0" />
      )}
      <span>{pending ? "Signing out…" : "Sign out"}</span>
    </button>
  );
};
