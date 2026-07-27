import { getCoursesPackages } from "@/actions/admin/package";
import { CreatedCoursePackageList } from "@/components/teachers-course-package-list";
import { Button } from "@/components/ui/button";
import { Plus, BookOpen, Users, Clock } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PageShell,
  PageHeader,
  PageBody,
  StatCard,
} from "@/components/custom/common/page-shell";

const lang = "en";

const coursesPackagePage = async () => {
  const coursesPackages = await getCoursesPackages();

  const published = coursesPackages.filter((pkg) => pkg.isPublished).length;

  return (
    <PageShell>
      <PageHeader
        title="Course Packages"
        description="Manage and organize your course packages"
        actions={
          <Link href={`/${lang}/admin/create`} className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto">
              <Plus className="size-4" />
              <span className="hidden sm:inline">Create New Package</span>
              <span className="sm:hidden">Create Package</span>
            </Button>
          </Link>
        }
      />

      <PageBody>
        <div className="mb-5 grid grid-cols-1 gap-3 sm:mb-7 sm:grid-cols-3 sm:gap-4">
          <StatCard
            label="Total Packages"
            value={coursesPackages.length}
            icon={BookOpen}
            tone="primary"
          />
          <StatCard
            label="Published"
            value={published}
            icon={Users}
            tone="success"
          />
          <StatCard
            label="Draft"
            value={coursesPackages.length - published}
            icon={Clock}
            tone="warning"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">All Packages</CardTitle>
            <p className="text-sm text-muted-foreground">
              Click on any package to view details and manage content
            </p>
          </CardHeader>
          <CardContent>
            <CreatedCoursePackageList coursesPackages={coursesPackages} />
          </CardContent>
        </Card>
      </PageBody>
    </PageShell>
  );
};

export default coursesPackagePage;
// This page is protected by the middleware, so it will only be accessible to authenticated users.
