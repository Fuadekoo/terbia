import { requireAuthentication } from "@/actions/admin/authentication";
import StudentList from "@/components/custom/admin/student-list";
import {
  PageShell,
  PageHeader,
  PageBody,
} from "@/components/custom/common/page-shell";

export default async function StudentsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  await requireAuthentication();
  const { lang } = await params;

  return (
    <PageShell>
      <PageHeader
        title="Students"
        description="Browse every student and open their portal at /student/[wdt_ID]"
      />
      <PageBody>
        <div className="surface p-4 sm:p-6">
          <StudentList lang={lang} />
        </div>
      </PageBody>
    </PageShell>
  );
}
