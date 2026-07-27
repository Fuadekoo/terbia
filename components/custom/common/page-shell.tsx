import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Standard dashboard page frame: a sticky, frosted header over an independently
 * scrolling body. Pages fill the height their layout gives them (`h-full`)
 * rather than `h-screen`, so they compose correctly under the mobile top bar.
 */
export function PageShell({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex h-full flex-col overflow-hidden", className)}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "surface-glass sticky top-0 z-30 shrink-0 shadow-xs",
        className
      )}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4 lg:px-8">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold tracking-tight sm:text-2xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-0.5 hidden text-sm text-muted-foreground sm:block">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}

export function PageBody({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div
        className={cn(
          "mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}

const TONES = {
  primary: "bg-primary/12 text-primary",
  success: "bg-success/12 text-success-tint-fg",
  warning: "bg-warning/15 text-warning-tint-fg",
  info: "bg-info/12 text-info-tint-fg",
  destructive: "bg-destructive/10 text-destructive-tint-fg",
  muted: "bg-muted text-muted-foreground",
} as const;

export type StatTone = keyof typeof TONES;

/** Compact metric tile — icon chip, label, value. */
export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "primary",
  hint,
  className,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: StatTone;
  hint?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("surface-interactive p-4 sm:p-5", className)}>
      <div className="flex items-center gap-3.5">
        {Icon ? (
          <div
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-lg sm:size-11",
              TONES[tone]
            )}
          >
            <Icon className="size-5" />
          </div>
        ) : null}
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground sm:text-sm">
            {label}
          </p>
          <p className="text-xl font-bold tabular-nums tracking-tight sm:text-2xl">
            {value}
          </p>
          {hint ? (
            <p className="truncate text-xs text-muted-foreground">{hint}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
