"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@/lib/zodSchema";
import { authenticate } from "@/actions/admin/authentication";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { AlertCircle, Eye, EyeOff, Loader2, Lock, Phone } from "lucide-react";
import useAction from "@/hooks/useAction";

type FormValues = z.infer<typeof loginSchema>;

function LoginPage() {
  const router = useRouter();
  const {
    handleSubmit,
    register,
    formState: { errors },
    setError,
  } = useForm<FormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onSubmit",
    reValidateMode: "onBlur",
  });

  const [pending, setPending] = useState(false);
  const [showPasscode, setShowPasscode] = useState(false);
  const [] = useAction(authenticate, [, () => {}]);

  const onSubmit = async (values: FormValues) => {
    setPending(true);
    try {
      const result = await authenticate(values);

      if (result?.ok) {
        toast.success(result.message);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        router.push((result as any).redirectTo ?? "/en/admin/coursesPackages");
        return;
      }

      if (result?.field && result.field !== "form") {
        setError(result.field, { type: "server", message: result.message });
      } else {
        setError("root", {
          type: "server",
          message: result?.message || "Authentication failed",
        });
      }
      toast.error(result?.message || "Authentication failed");
    } catch (error) {
      // Check if it's a Next.js redirect error (which is expected)
      if (
        error &&
        typeof error === "object" &&
        "digest" in error &&
        typeof error.digest === "string" &&
        error.digest.includes("NEXT_REDIRECT")
      ) {
        // This is a successful redirect, show success toast
        toast.success("Login successful");
        return;
      }

      console.error("Authentication error:", error);
      setError("root", {
        type: "server",
        message: "Authentication failed. Please try again.",
      });
      toast.error("Authentication failed. Please try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="app-canvas relative min-h-dvh flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[26rem] animate-rise-in">
        {/* Brand */}
        <div className="flex flex-col items-center gap-3 mb-7">
          <div className="grid place-items-center size-16 rounded-2xl bg-card border border-border shadow-md">
            <Image
              src="/logo.png"
              alt="Darelkubra"
              width={44}
              height={44}
              className="h-10 w-auto object-contain"
              priority
            />
          </div>
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">
              Welcome back
            </h1>
            <p className="text-sm text-muted-foreground">
              Sign in to the Darelkubra portal
            </p>
          </div>
        </div>

        <div className="surface shadow-lg p-6 sm:p-7">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5"
            noValidate
          >
            <div className="space-y-1.5">
              <label
                htmlFor="phoneno"
                className="block text-sm font-medium text-foreground"
              >
                Phone number
              </label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="phoneno"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="09*********"
                  className="pl-9.5"
                  aria-invalid={!!errors.phoneno || undefined}
                  aria-describedby={
                    errors.phoneno ? "phoneno-error" : undefined
                  }
                  disabled={pending}
                  {...register("phoneno")}
                />
              </div>
              {errors.phoneno && (
                <p
                  id="phoneno-error"
                  className="text-sm text-destructive-tint-fg"
                >
                  {errors.phoneno.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="passcode"
                className="block text-sm font-medium text-foreground"
              >
                Passcode
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="passcode"
                  type={showPasscode ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="pl-9.5 pr-10"
                  aria-invalid={!!errors.passcode || undefined}
                  aria-describedby={
                    errors.passcode ? "passcode-error" : undefined
                  }
                  disabled={pending}
                  {...register("passcode")}
                />
                <button
                  type="button"
                  onClick={() => setShowPasscode((v) => !v)}
                  disabled={pending}
                  className="focus-ring absolute right-1.5 top-1/2 -translate-y-1/2 grid place-items-center size-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  aria-label={showPasscode ? "Hide passcode" : "Show passcode"}
                >
                  {showPasscode ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
              {errors.passcode && (
                <p
                  id="passcode-error"
                  className="text-sm text-destructive-tint-fg"
                >
                  {errors.passcode.message}
                </p>
              )}
            </div>

            {errors.root?.message && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/25 text-destructive-tint-fg text-sm p-3"
              >
                <AlertCircle className="size-4 mt-0.5 shrink-0" />
                <span>{errors.root.message}</span>
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={pending}
              aria-busy={pending}
            >
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Darelkubra Academy · Learning portal
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
