import AdminShell from "@/components/admin/AdminShell";
import { useAdminPage } from "@/hooks/useAdminPage";

export default function Admin() {
  const admin = useAdminPage();
  return <AdminShell admin={admin} variant="mobile" />;
}
