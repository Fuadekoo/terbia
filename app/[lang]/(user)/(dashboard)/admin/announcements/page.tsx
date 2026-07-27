import prisma from "@/lib/db";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
// import { IconBadge } from "@/components/icon-badge";
import { MessageCircle, Calendar, Package } from "lucide-react";
import { AnnouncementManager } from "@/components/custom/admin/announcement-manager";
import {
  PageShell,
  PageHeader,
  PageBody,
} from "@/components/custom/common/page-shell";
const AnnouncementsPage = async () => {
  const [announcements, coursePackages] = await Promise.all([
    prisma.announcement.findMany({
      include: {
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

  return (
    <PageShell>
      <PageHeader
        title="Announcements"
        description="Keep students informed about course updates"
        actions={<AnnouncementManager coursePackages={coursePackages} />}
      />

      <PageBody>
        {announcements.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3 sm:gap-5">
            {announcements.map((announcement) => (
              <Card
                key={announcement.id}
                className="gap-4 py-5 transition-all duration-200 ease-out-soft hover:-translate-y-0.5 hover:shadow-md"
              >
                <CardHeader className="pb-0">
                  <div className="space-y-2">
                    <Badge
                      variant={
                        announcement.coursePackage.isPublished
                          ? "info"
                          : "muted"
                      }
                      className="max-w-full"
                    >
                      <Package className="size-3" />
                      <span className="truncate">
                        {announcement.coursePackage.name}
                      </span>
                    </Badge>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="size-3" />
                      {new Date(announcement.createdAt).toLocaleDateString(
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
                </CardHeader>
                <CardContent>
                  <p className="line-clamp-4 text-sm leading-relaxed text-foreground/80">
                    {announcement.anouncementDescription}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="mb-4 grid size-20 place-items-center rounded-full bg-muted">
                <MessageCircle className="size-9 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">
                No announcements yet
              </h3>
              <p className="mb-6 max-w-md text-center text-sm text-muted-foreground">
                Create your first announcement to keep students informed about
                course updates and important information.
              </p>
              <AnnouncementManager coursePackages={coursePackages} />
            </CardContent>
          </Card>
        )}
      </PageBody>
    </PageShell>
  );
};

export default AnnouncementsPage;
