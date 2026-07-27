import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Book } from "lucide-react";
import { CourseMaterialsSelector } from "@/components/custom/admin/course-materials-selector";
import { getCoursePackages } from "@/actions/admin/course-packages";
import {
  PageShell,
  PageHeader,
  PageBody,
} from "@/components/custom/common/page-shell";

function ErrorState({ title, detail }: { title: string; detail: string }) {
  return (
    <PageShell>
      <PageHeader title="Course Materials" />
      <PageBody>
        <Card className="border-destructive/25 bg-destructive/6">
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <div className="mb-4 grid size-16 place-items-center rounded-full bg-destructive/10">
              <AlertTriangle className="size-7 text-destructive-tint-fg" />
            </div>
            <h3 className="mb-1 text-lg font-semibold">{title}</h3>
            <p className="max-w-md text-sm text-muted-foreground">{detail}</p>
          </CardContent>
        </Card>
      </PageBody>
    </PageShell>
  );
}

const CourseMaterialsPage = async () => {
  try {
    const result = await getCoursePackages();

    if (!result.success) {
      console.error("Error in getCoursePackages:", result.error);
      return (
        <ErrorState
          title="Failed to load course packages"
          detail={result.error || "Unknown error occurred"}
        />
      );
    }

    const coursePackages = result.data || [];

    return (
      <PageShell>
        <PageHeader
          title="Course Materials"
          description="Upload and manage PDFs, presentations, documents and other resources"
        />
        <PageBody className="pb-20">
          {coursePackages.length > 0 ? (
            <CourseMaterialsSelector coursePackages={coursePackages} />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 grid size-20 place-items-center rounded-full bg-muted">
                  <Book className="size-9 text-muted-foreground" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">
                  No course packages found
                </h3>
                <p className="max-w-md text-sm text-muted-foreground">
                  Create course packages first to upload and manage course
                  materials.
                </p>
              </CardContent>
            </Card>
          )}
        </PageBody>
      </PageShell>
    );
  } catch (error) {
    console.error("Unexpected error in CourseMaterialsPage:", error);
    return (
      <ErrorState
        title="Unexpected error occurred"
        detail="Please try refreshing the page."
      />
    );
  }
};

export default CourseMaterialsPage;
