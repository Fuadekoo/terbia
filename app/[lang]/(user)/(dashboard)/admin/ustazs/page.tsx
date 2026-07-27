import { requireAuthentication } from "@/actions/admin/authentication";
import UstazManagement from "@/components/custom/admin/ustaz-management";
import {
  PageShell,
  PageHeader,
  PageBody,
} from "@/components/custom/common/page-shell";

export default async function UstazsPage() {
  await requireAuthentication();

  return (
    <PageShell>
      <PageHeader
        title="Ustazs"
        description="Add, edit, and manage ustaz permissions and settings"
      />
      <PageBody>
        <div className="surface p-4 sm:p-6">
          <UstazManagement />
        </div>
      </PageBody>
    </PageShell>
  );
}
