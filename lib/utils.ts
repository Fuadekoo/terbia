import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
// lib/utils.ts

/**
 * Shuffles an array in place using the Fisher-Yates (Knuth) algorithm.
 *
 * @param array The array to shuffle.
 * @returns The shuffled array.
 */
export function shuffleArray<T>(array: T[]): T[] {
  let currentIndex = array.length, randomIndex;

  // While there remain elements to shuffle.
  while (currentIndex !== 0) {

    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }

  return array;
}

/**
 * Sentinel returned by `updatePathProgressData` / `cousefailedsolve` in place of
 * a course id when the student has finished every chapter and should be sent to
 * the final exam instead of another chapter.
 *
 * MUST stay lowercase — it is used verbatim as the URL segment and the route
 * folder is `app/[lang]/(user)/student/[wdt_ID]/(main)/finalexam`.
 */
export const FINAL_EXAM_SEGMENT = "finalexam";

/**
 * Query flag that puts a chapter page into "re-learn" mode: the student opened
 * this lesson deliberately (from the course sidebar) rather than being routed
 * here by their progress. While it is set, nothing may bounce them onward to
 * the next chapter or the final exam — they stay on the lesson for as long as
 * they want.
 *
 * The flag MUST survive in the URL. Stripping it (or reading it once on mount)
 * lets a reload or a client-side navigation drop the student straight back into
 * the progress-driven redirect.
 */
export const RELEARN_PARAM = "isClicked";

/** Spellings accepted for {@link RELEARN_PARAM} — links get typed by hand. */
const RELEARN_PARAM_ALIASES = [RELEARN_PARAM, "isclick", "isClick", "isclicked"];

/** Reads the re-learn flag from any URLSearchParams-like object. */
export function isRelearnRequested(
  params: { get(name: string): string | null } | null | undefined
): boolean {
  if (!params) return false;
  return RELEARN_PARAM_ALIASES.some((key) => params.get(key) === "true");
}

/** Appends the re-learn flag to a path, preserving any existing query string. */
export function withRelearnParam(path: string): string {
  return `${path}${path.includes("?") ? "&" : "?"}${RELEARN_PARAM}=true`;
}

/** Shape returned by `updatePathProgressData`. */
export type ProgressPath = readonly (string | undefined)[] | false | undefined | null;

/**
 * Builds the next destination for a student from a progress tuple.
 *
 * The tuple is either `[courseId, chapterId]` or `[FINAL_EXAM_SEGMENT, packageId]`.
 * Returns `null` when the tuple is missing or contains an empty segment, so
 * callers never navigate to a path like `/en/student/1/finalExam/undefined`.
 */
export function buildStudentProgressPath(
  wdt_ID: number | string,
  progress: ProgressPath,
  lang = "en"
): string | null {
  if (!progress || !Array.isArray(progress)) return null;

  const [first, second] = progress;
  if (!wdt_ID || !first || !second) return null;
  if (first === "undefined" || second === "undefined") return null;

  if (first === FINAL_EXAM_SEGMENT) {
    return `/${lang}/student/${wdt_ID}/${FINAL_EXAM_SEGMENT}/${second}`;
  }

  return `/${lang}/student/${wdt_ID}/${first}/${second}`;
}