"use client";

import React, { useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  GraduationCap,
  Lock,
  PlayCircle,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Target,
  Trophy,
  UserCircle,
} from "lucide-react";

import useAction from "@/hooks/useAction";
import { getStudentDashboard } from "@/actions/student/dashboard";
import type {
  DashboardCourse,
  StudentDashboardData,
} from "@/actions/student/dashboard";
import {
  PageShell,
  PageHeader,
  PageBody,
  StatCard,
} from "@/components/custom/common/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn, FINAL_EXAM_SEGMENT, withRelearnParam } from "@/lib/utils";

/* ------------------------------------------------------------------ *
 * Telegram Mini App chrome
 *
 * The page is painted with the app's own design tokens rather than Telegram's
 * raw palette, so all that is taken from Telegram is the viewport handshake
 * (ready + expand) and its light/dark preference, which is mapped onto the
 * `dark` class the whole app already themes from.
 *
 * The mapping runs once per session so the light/dark toggle in the sidebar
 * still wins for the rest of the visit.
 * ------------------------------------------------------------------ */
interface TelegramWebApp {
  ready?: () => void;
  expand?: () => void;
  colorScheme?: "light" | "dark";
  themeParams?: { bg_color?: string };
}

const TELEGRAM_SCHEME_SYNCED = "tg-scheme-synced";

/** Falls back to the background colour when `colorScheme` is unavailable. */
function inferScheme(webApp: TelegramWebApp): "light" | "dark" | null {
  if (webApp.colorScheme === "light" || webApp.colorScheme === "dark") {
    return webApp.colorScheme;
  }

  const bg = webApp.themeParams?.bg_color;
  if (!bg || !/^#[0-9a-f]{6}$/i.test(bg)) return null;

  const value = parseInt(bg.slice(1), 16);
  const luminance =
    (((value >> 16) & 0xff) + ((value >> 8) & 0xff) + (value & 0xff)) / 3;
  return luminance > 128 ? "light" : "dark";
}

function useTelegramViewport() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    let retries = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const init = () => {
      const webApp = (
        window as unknown as { Telegram?: { WebApp?: TelegramWebApp } }
      ).Telegram?.WebApp;

      if (!webApp) {
        // The SDK script can land after hydration; give it a few beats.
        if (retries++ < 30) timer = setTimeout(init, 100);
        return;
      }

      webApp.ready?.();
      webApp.expand?.();

      try {
        if (sessionStorage.getItem(TELEGRAM_SCHEME_SYNCED)) return;
        const scheme = inferScheme(webApp);
        if (!scheme) return;
        document.documentElement.classList.toggle("dark", scheme === "dark");
        sessionStorage.setItem(TELEGRAM_SCHEME_SYNCED, "1");
      } catch {
        // Storage can be blocked inside the Telegram webview — the app just
        // keeps whatever theme it already had.
      }
    };

    init();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);
}

/* ------------------------------------------------------------------ *
 * Small presentational pieces
 * ------------------------------------------------------------------ */

function ProgressRing({
  value,
  size = 132,
  stroke = 11,
  caption,
}: {
  value: number;
  size?: number;
  stroke?: number;
  caption?: string;
}) {
  const safeValue = Math.min(Math.max(value, 0), 100);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safeValue / 100) * circumference;

  return (
    <div
      className="relative grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${safeValue}% complete`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-primary/15"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="stroke-primary transition-[stroke-dashoffset] duration-700"
          style={{ transitionTimingFunction: "var(--ease-out-soft)" }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl font-bold tabular-nums tracking-tight">
          {safeValue}%
        </div>
        {caption ? (
          <div className="text-[0.6875rem] font-medium text-muted-foreground">
            {caption}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ProgressBar({
  value,
  className,
  label,
}: {
  value: number;
  className?: string;
  label?: string;
}) {
  const safeValue = Math.min(Math.max(value, 0), 100);
  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}
      role="progressbar"
      aria-valuenow={safeValue}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-700"
        style={{
          width: `${safeValue}%`,
          transitionTimingFunction: "var(--ease-out-soft)",
        }}
      />
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight sm:text-lg">
        <Icon className="size-4.5 text-primary" />
        {title}
      </h2>
      {action}
    </div>
  );
}

function relativeDay(iso: string) {
  const then = new Date(iso);
  const days = Math.floor((Date.now() - then.getTime()) / 86_400_000);

  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(then);
}

/* ------------------------------------------------------------------ *
 * Loading / empty states
 * ------------------------------------------------------------------ */

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="surface shimmer h-44 w-full" />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="surface shimmer h-22" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="surface shimmer h-80 lg:col-span-2" />
        <div className="surface shimmer h-80" />
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="surface flex flex-col items-center gap-3 px-6 py-14 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-primary/12 text-primary">
        <Icon className="size-6" />
      </div>
      <div>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Course path
 * ------------------------------------------------------------------ */

function CoursePath({
  courses,
  basePath,
  openCourseId,
}: {
  courses: DashboardCourse[];
  basePath: string;
  openCourseId?: string;
}) {
  return (
    <Accordion
      type="single"
      collapsible
      defaultValue={openCourseId ? `course-${openCourseId}` : undefined}
      className="space-y-2.5"
    >
      {courses.map((course) => (
        <AccordionItem
          key={course.id}
          value={`course-${course.id}`}
          className="overflow-hidden rounded-xl border border-border bg-card shadow-xs"
        >
          <AccordionTrigger className="px-3 py-3 hover:bg-accent/40 hover:no-underline sm:px-4">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-lg text-xs font-bold",
                  course.state === "completed"
                    ? "bg-success/12 text-success-tint-fg"
                    : course.state === "in-progress"
                    ? "bg-primary/12 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {course.state === "completed" ? (
                  <CheckCircle2 className="size-4" />
                ) : (
                  course.order
                )}
              </span>
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-semibold">{course.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {course.completedChapters} of {course.totalChapters} lessons
                </p>
              </div>
              <span className="shrink-0 pl-1 text-xs font-semibold tabular-nums text-muted-foreground">
                {course.percent}%
              </span>
            </div>
          </AccordionTrigger>

          <ProgressBar
            value={course.percent}
            className="h-1 rounded-none"
            label={`${course.title} progress`}
          />

          <AccordionContent className="space-y-1 p-2">
            {course.chapters.length === 0 ? (
              <p className="px-2 py-3 text-xs text-muted-foreground">
                No lessons published in this course yet.
              </p>
            ) : (
              course.chapters.map((chapter) => {
                const href = `${basePath}/${course.id}/${chapter.id}`;
                const isLocked = chapter.state === "locked";

                const row = (
                  <>
                    <span
                      className={cn(
                        "grid size-7 shrink-0 place-items-center rounded-md",
                        chapter.state === "completed"
                          ? "bg-success/12 text-success-tint-fg"
                          : chapter.state === "current"
                          ? "bg-primary/12 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {chapter.state === "completed" ? (
                        <CheckCircle2 className="size-4" />
                      ) : chapter.state === "current" ? (
                        <PlayCircle className="size-4" />
                      ) : (
                        <Lock className="size-3.5" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        Lesson {chapter.position}: {chapter.title}
                      </span>
                      {chapter.completedAt ? (
                        <span className="block text-xs text-muted-foreground">
                          Completed {relativeDay(chapter.completedAt)}
                        </span>
                      ) : null}
                    </span>
                    {chapter.state === "completed" ? (
                      <Badge variant="muted" className="shrink-0 gap-1">
                        <RotateCcw className="size-3" />
                        Review
                      </Badge>
                    ) : chapter.state === "current" ? (
                      <Badge className="shrink-0">Continue</Badge>
                    ) : (
                      <Badge variant="muted" className="shrink-0">
                        Locked
                      </Badge>
                    )}
                  </>
                );

                if (isLocked) {
                  return (
                    <div
                      key={chapter.id}
                      aria-disabled="true"
                      className="flex cursor-not-allowed items-center gap-2.5 rounded-lg px-2.5 py-2 opacity-60"
                    >
                      {row}
                    </div>
                  );
                }

                return (
                  <Link
                    key={chapter.id}
                    // A completed lesson is re-opened deliberately, so it carries
                    // the re-learn flag; the current lesson is left to the
                    // progress-driven route so it always lands on the right place.
                    href={
                      chapter.state === "completed"
                        ? withRelearnParam(href)
                        : href
                    }
                    className="focus-ring flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-accent"
                  >
                    {row}
                  </Link>
                );
              })
            )}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

/* ------------------------------------------------------------------ *
 * Page
 * ------------------------------------------------------------------ */

function Dashboard({
  data,
  basePath,
  onRefresh,
}: {
  data: StudentDashboardData;
  basePath: string;
  onRefresh: () => void;
}) {
  const { stats, nextLesson, finalExam, courses, recent, attendance } = data;

  const firstName = (data.student.name ?? "").trim().split(/\s+/)[0] || "there";

  const finalExamHref =
    finalExam.packageId && finalExam.unlocked
      ? `${basePath}/${FINAL_EXAM_SEGMENT}/${finalExam.packageId}`
      : null;

  const continueHref = nextLesson
    ? `${basePath}/${nextLesson.courseId}/${nextLesson.chapterId}`
    : finalExamHref;

  const openCourseId = nextLesson?.courseId ?? courses.at(-1)?.id;

  return (
    <PageShell className="app-canvas">
      <PageHeader
        title={`Assalamu alaikum, ${firstName}`}
        description={
          data.activePackage
            ? `${data.activePackage.name}${
                data.student.subject ? ` · ${data.student.subject}` : ""
              }`
            : "No active package"
        }
        actions={
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={onRefresh}
              aria-label="Refresh dashboard"
            >
              <RefreshCw className="size-4" />
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`${basePath}/profile`}>
                <UserCircle className="size-4" />
                Profile
              </Link>
            </Button>
          </>
        }
      />

      <PageBody className="space-y-6">
        {/* ---------------------------------------------------------- *
         * Hero — one clear next action
         * ---------------------------------------------------------- */}
        <section className="surface animate-rise-in overflow-hidden">
          <div className="flex flex-col gap-6 bg-linear-to-br from-primary/10 via-transparent to-transparent p-5 sm:p-6 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0 flex-1">
              {nextLesson ? (
                <>
                  <Badge variant="info" className="mb-2.5">
                    {nextLesson.isFirstLesson
                      ? "Start learning"
                      : "Continue where you left off"}
                  </Badge>
                  <h2 className="truncate text-xl font-bold tracking-tight sm:text-2xl">
                    {nextLesson.chapterTitle}
                  </h2>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {nextLesson.courseTitle} · Lesson {nextLesson.position}
                  </p>
                </>
              ) : finalExam.taken ? (
                <>
                  <Badge variant="success" className="mb-2.5">
                    Package complete
                  </Badge>
                  <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                    You finished {data.activePackage?.name ?? "your package"}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {finalExam.percent !== null
                      ? `Final exam score ${finalExam.percent}% (${finalExam.correct}/${finalExam.total} correct).`
                      : "Your final exam has been submitted."}
                  </p>
                </>
              ) : finalExam.unlocked ? (
                <>
                  <Badge variant="warning" className="mb-2.5">
                    Final exam unlocked
                  </Badge>
                  <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                    Every lesson is done — sit the final exam
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Answer the questions from all {stats.totalCourses} courses to
                    earn your certificate.
                  </p>
                </>
              ) : (
                <>
                  <Badge variant="muted" className="mb-2.5">
                    Nothing to continue
                  </Badge>
                  <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                    No lessons are available yet
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your package has no published lessons right now. Please check
                    back later.
                  </p>
                </>
              )}

              {continueHref ? (
                <Button size="lg" className="mt-5 w-full sm:w-auto" asChild>
                  <Link href={continueHref}>
                    {nextLesson ? (
                      <>
                        <PlayCircle className="size-4.5" />
                        {nextLesson.isFirstLesson
                          ? "Start first lesson"
                          : "Continue learning"}
                      </>
                    ) : (
                      <>
                        <Trophy className="size-4.5" />
                        {finalExam.taken ? "Review final exam" : "Go to final exam"}
                      </>
                    )}
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              ) : null}
            </div>

            <div className="flex items-center justify-center gap-5 md:justify-end">
              <ProgressRing value={stats.percent} caption="complete" />
              <div className="hidden space-y-2 sm:block">
                <p className="text-sm font-semibold">Package progress</p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold tabular-nums text-foreground">
                    {stats.completedChapters}
                  </span>{" "}
                  of {stats.totalChapters} lessons done
                </p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold tabular-nums text-foreground">
                    {stats.remainingChapters}
                  </span>{" "}
                  lessons to go
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------- *
         * Key numbers
         * ---------------------------------------------------------- */}
        <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard
            label="Overall progress"
            value={`${stats.percent}%`}
            icon={Target}
            tone="primary"
            hint={`${stats.completedChapters}/${stats.totalChapters} lessons`}
          />
          <StatCard
            label="Courses completed"
            value={`${stats.completedCourses}/${stats.totalCourses}`}
            icon={BookOpen}
            tone="info"
            hint={
              stats.totalCourses - stats.completedCourses > 0
                ? `${stats.totalCourses - stats.completedCourses} in progress`
                : "All courses done"
            }
          />
          <StatCard
            label="Lessons left"
            value={stats.remainingChapters}
            icon={GraduationCap}
            tone={stats.remainingChapters === 0 ? "success" : "warning"}
            hint={
              stats.remainingChapters === 0
                ? "Ready for the exam"
                : "Keep going, you're close"
            }
          />
          {attendance ? (
            <StatCard
              label="Attendance"
              value={`${attendance.present}/${attendance.present + attendance.absent}`}
              icon={CalendarCheck}
              tone="success"
              hint={`${attendance.absent} missed`}
            />
          ) : (
            <StatCard
              label="Final exam"
              value={
                finalExam.taken
                  ? finalExam.percent !== null
                    ? `${finalExam.percent}%`
                    : "Submitted"
                  : finalExam.unlocked
                  ? "Unlocked"
                  : "Locked"
              }
              icon={Trophy}
              tone={
                finalExam.taken
                  ? "success"
                  : finalExam.unlocked
                  ? "warning"
                  : "muted"
              }
              hint={
                finalExam.taken
                  ? "Completed"
                  : finalExam.unlocked
                  ? "Ready to take"
                  : `${stats.remainingChapters} lessons to unlock`
              }
            />
          )}
        </section>

        {/* ---------------------------------------------------------- *
         * Path + side panels
         * ---------------------------------------------------------- */}
        <section className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SectionTitle
              icon={BookOpen}
              title="Your course path"
              action={
                <span className="text-xs text-muted-foreground">
                  {stats.totalCourses} courses · {stats.totalChapters} lessons
                </span>
              }
            />
            {courses.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="No courses yet"
                description="This package doesn't have any courses assigned. Please contact your ustaz."
              />
            ) : (
              <CoursePath
                courses={courses}
                basePath={basePath}
                openCourseId={openCourseId}
              />
            )}
          </div>

          <div className="space-y-5">
            {/* Final exam */}
            <div>
              <SectionTitle icon={Trophy} title="Final exam" />
              <div
                className={cn(
                  "surface p-4 sm:p-5",
                  finalExam.unlocked && "border-primary/30"
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "grid size-10 shrink-0 place-items-center rounded-lg",
                      finalExam.taken
                        ? "bg-success/12 text-success-tint-fg"
                        : finalExam.unlocked
                        ? "bg-warning/15 text-warning-tint-fg"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {finalExam.unlocked ? (
                      <Trophy className="size-5" />
                    ) : (
                      <Lock className="size-5" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">
                      {finalExam.taken
                        ? "Exam submitted"
                        : finalExam.unlocked
                        ? "Ready to take"
                        : "Locked"}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {finalExam.taken
                        ? finalExam.percent !== null
                          ? `You scored ${finalExam.correct}/${finalExam.total} (${finalExam.percent}%).`
                          : "Your answers have been recorded."
                        : finalExam.unlocked
                        ? "Finish the exam to earn your certificate."
                        : `Complete the remaining ${stats.remainingChapters} lesson${
                            stats.remainingChapters === 1 ? "" : "s"
                          } to unlock the exam.`}
                    </p>
                  </div>
                </div>

                {!finalExam.unlocked ? (
                  <ProgressBar
                    value={stats.percent}
                    className="mt-4"
                    label="Progress towards the final exam"
                  />
                ) : null}

                {finalExamHref ? (
                  <Button className="mt-4 w-full" asChild>
                    <Link href={finalExamHref}>
                      {finalExam.taken ? "View exam" : "Take the exam"}
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>

            {/* Recent activity */}
            <div>
              <SectionTitle icon={Sparkles} title="Recent activity" />
              {recent.length === 0 ? (
                <div className="surface px-4 py-8 text-center text-sm text-muted-foreground">
                  No lessons completed yet. Your progress will show up here.
                </div>
              ) : (
                <ul className="surface divide-y divide-border">
                  {recent.map((item) => (
                    <li
                      key={item.chapterId}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-success/12 text-success-tint-fg">
                        <CheckCircle2 className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {item.chapterTitle}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {item.courseTitle}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {relativeDay(item.completedAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      </PageBody>
    </PageShell>
  );
}

export default function Page() {
  const params = useParams();
  const wdt_ID = Number(params?.wdt_ID);
  const lang = typeof params?.lang === "string" ? params.lang : "en";
  const basePath = `/${lang}/student/${wdt_ID}`;

  useTelegramViewport();

  const [data, refresh, loading] = useAction(
    getStudentDashboard,
    [true, undefined],
    wdt_ID
  );

  // `data` is undefined until the first fetch settles, and null when the
  // student (or their package) could not be read.
  const isLoading = loading || data === undefined;

  const content = useMemo(() => {
    if (isLoading) return <DashboardSkeleton />;

    if (!data) {
      return (
        <EmptyState
          icon={UserCircle}
          title="We couldn't load this student"
          description="This learning link may be invalid or expired. Please open the link from your Telegram message again."
          action={
            <Button variant="outline" size="sm" onClick={() => refresh()}>
              <RefreshCw className="size-4" />
              Try again
            </Button>
          }
        />
      );
    }

    if (!data.activePackage) {
      return (
        <EmptyState
          icon={BookOpen}
          title="No active package"
          description="You don't have a course package assigned yet. Once your ustaz assigns one, your lessons will appear here."
          action={
            <Button variant="outline" size="sm" asChild>
              <Link href={`${basePath}/profile`}>
                <UserCircle className="size-4" />
                View profile
              </Link>
            </Button>
          }
        />
      );
    }

    return null;
  }, [isLoading, data, refresh, basePath]);

  if (content) {
    return (
      <PageShell className="app-canvas">
        <PageHeader
          title="Dashboard"
          description="Your learning progress at a glance"
        />
        <PageBody>{content}</PageBody>
      </PageShell>
    );
  }

  return (
    <Dashboard
      data={data as StudentDashboardData}
      basePath={basePath}
      onRefresh={() => refresh()}
    />
  );
}
