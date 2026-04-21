import { getAllPhotographers } from "@/lib/queries/admin";
import { AdminShell } from "./admin-shell";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const photographers = await getAllPhotographers();
  return <AdminShell photographers={photographers} />;
}
