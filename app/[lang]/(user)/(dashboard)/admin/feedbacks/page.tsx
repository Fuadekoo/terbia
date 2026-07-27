import prisma from "@/lib/db";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Star, User, Calendar, Package } from "lucide-react";
import { FeedbackFilters } from "@/components/custom/admin/feedback-filters";
import { FeedbackChart } from "@/components/custom/admin/feedback-chart";
import {
  PageShell,
  PageHeader,
  PageBody,
  StatCard,
} from "@/components/custom/common/page-shell";

const FeedbacksPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) => {
  const params = await searchParams;
  const packageFilter = params.package as string;
  const ratingFilter = params.rating as string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const whereClause: any = {};
  if (packageFilter) {
    whereClause.coursePackageId = packageFilter;
  }
  if (ratingFilter) {
    whereClause.rating = parseInt(ratingFilter);
  }

  const [feedbacks, coursePackages] = await Promise.all([
    prisma.feedback.findMany({
      where: whereClause,
      include: {
        student: {
          select: {
            name: true,
            phoneno: true,
          },
        },
        coursePackage: {
          select: {
            name: true,
            isPublished: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.coursePackage.findMany({
      select: {
        id: true,
        name: true,
        isPublished: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
  ]);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={
          i < rating
            ? "size-4 fill-warning text-warning"
            : "size-4 text-muted-foreground/35"
        }
      />
    ));
  };

  const ratingTone = (rating: number) =>
    rating >= 4 ? "success" : rating >= 3 ? "warning" : "destructive";

  const averageRating =
    feedbacks.length > 0
      ? (
          feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length
        ).toFixed(1)
      : "0.0";

  return (
    <PageShell>
      <PageHeader
        title="Student Feedback"
        description="View and analyze student feedback to improve your courses"
        actions={<FeedbackFilters coursePackages={coursePackages} />}
      />

      <PageBody className="pb-20">
        {/* Stats */}
        <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard
            label="Total Feedback"
            value={feedbacks.length}
            icon={MessageSquare}
            tone="primary"
          />
          <StatCard
            label="Average Rating"
            value={averageRating}
            icon={Star}
            tone="warning"
          />
          <StatCard
            label="Positive Reviews"
            value={feedbacks.filter((f) => f.rating >= 4).length}
            icon={Star}
            tone="success"
          />
          <StatCard
            label="Needs Attention"
            value={feedbacks.filter((f) => f.rating <= 2).length}
            icon={Star}
            tone="destructive"
          />
        </div>

        <div className="mb-6">
          <FeedbackChart feedbacks={feedbacks} />
        </div>

        {feedbacks.length > 0 ? (
          <div className="space-y-3.5">
            {feedbacks.map((feedback) => (
              <Card
                key={feedback.id}
                className="gap-3 py-5 transition-shadow duration-200 hover:shadow-md"
              >
                <CardHeader>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <User className="size-4 text-muted-foreground" />
                          <span className="font-medium">
                            {feedback.student.name || "Anonymous"}
                          </span>
                        </div>
                        <Badge variant="outline" className="max-w-full">
                          <Package className="size-3" />
                          <span className="truncate">
                            {feedback.coursePackage.name}
                          </span>
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1">
                          {renderStars(feedback.rating)}
                          <span className="ml-1 text-sm font-medium tabular-nums">
                            {feedback.rating}/5
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="size-3" />
                          {new Date(feedback.createdAt).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant={ratingTone(feedback.rating)}
                      className="rounded-full px-2.5 py-1"
                    >
                      {feedback.rating >= 4
                        ? "Positive"
                        : feedback.rating >= 3
                        ? "Neutral"
                        : "Negative"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-foreground/80">
                    {feedback.feedback}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 grid size-20 place-items-center rounded-full bg-muted">
                <MessageSquare className="size-9 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">No feedback yet</h3>
              <p className="max-w-md text-sm text-muted-foreground">
                Student feedback will appear here once they start reviewing your
                courses.
              </p>
            </CardContent>
          </Card>
        )}
      </PageBody>
    </PageShell>
  );
};

export default FeedbacksPage;
