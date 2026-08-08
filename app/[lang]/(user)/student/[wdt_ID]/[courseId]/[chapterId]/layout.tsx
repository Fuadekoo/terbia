"use client";
import React, { useEffect } from "react";
import {
  redirect,
  useParams,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { updatePathProgressData } from "@/actions/student/progress";
import useAction from "@/hooks/useAction";
import { buildStudentProgressPath, isRelearnRequested } from "@/lib/utils";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { lang, wdt_ID, courseId, chapterId } = useParams() as {
    lang: string;
    wdt_ID: string;
    courseId: string;
    chapterId: string;
  };
  const wdtIdNum = Number(wdt_ID);
  const searchParams = useSearchParams();
  const isRelearning = isRelearnRequested(searchParams);
  const [update] = useAction(
    updatePathProgressData,
    [true, () => {}],
    wdtIdNum
  );

  const router = useRouter();

  // `update` is [courseId, chapterId] or [FINAL_EXAM_SEGMENT, packageId], and is
  // `false` when there is nowhere to move on to. The builder returns null for
  // anything it cannot turn into a real route, so we never navigate to a path
  // containing "undefined".
  const nextPath = buildStudentProgressPath(wdtIdNum, update, lang || "en");
  const currentPath = `/${lang || "en"}/student/${wdtIdNum}/${courseId}/${chapterId}`;

  useEffect(() => {
    // While re-learning, the student picked this lesson on purpose — never pull
    // them forward to their progress position (which, once the package is
    // finished, is the final exam).
    if (isRelearning) return;
    if (nextPath && nextPath !== currentPath) {
      redirect(nextPath);
    }
  }, [nextPath, currentPath, router, isRelearning]);

  return <div className="overflow-auto grid">{children}</div>;
}
