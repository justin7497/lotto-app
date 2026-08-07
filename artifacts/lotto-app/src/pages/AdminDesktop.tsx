import AdminShell from "@/components/admin/AdminShell";
import { useAdminPage } from "@/hooks/useAdminPage";

export default function AdminDesktop() {
  const admin = useAdminPage();
  return <AdminShell admin={admin} variant="desktop" />;
}
