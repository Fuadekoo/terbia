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

export default function Layout({ children }: { children: React.ReactNode }) {
  const { wdt_ID, courseId, chapterId } = useParams() as {
    wdt_ID: string;
    courseId: string;
    chapterId: string;
  };
  const wdtIdNum = Number(wdt_ID);
  const searchParams = useSearchParams();
  const isClicked = searchParams?.get("isClicked");
  const [update] = useAction(
    updatePathProgressData,
    [true, () => {}],
    wdtIdNum
  );

  const updatedCourseId = update ? update[0] : courseId;
  const updatedChapterId = update ? update[1] : chapterId;

  const router = useRouter();

  console.log("🔧 Layout Debug:");
  console.log("  isClicked:", isClicked);
  console.log("  Current courseId:", courseId);
  console.log("  Current chapterId:", chapterId);
  console.log("  Updated courseId:", updatedCourseId);
  console.log("  Updated chapterId:", updatedChapterId);
  console.log("  Update data:", update);

  useEffect(() => {
    if (
      !isClicked &&
      ((updatedCourseId && updatedCourseId !== courseId) ||
        (updatedChapterId && updatedChapterId !== chapterId))
    ) {
      console.log(
        "🚀 Layout redirecting to:",
        `/en/student/${wdtIdNum}/${updatedCourseId}/${updatedChapterId}`
      );
      redirect(
        `/en/student/${wdtIdNum}/${updatedCourseId}/${updatedChapterId}`
      );
    } else {
      console.log("ℹ️ No redirect needed or isClicked=true");
    }
  }, [
    updatedCourseId,
    updatedChapterId,
    wdtIdNum,
    courseId,
    chapterId,
    router,
    isClicked,
  ]);

  return <div className="overflow-auto grid">{children}</div>;
}
