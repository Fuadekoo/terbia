"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Course Materials Page Error:", error);
  }, [error]);

  return (
    <div className="bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="text-red-600 text-lg font-semibold mb-4">
              Failed to load course packages
            </div>
            <button
              onClick={reset}
              className="focus-ring rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
