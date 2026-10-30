import { notFound, redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth/currentUser";
import { getProjectsByMember } from "@/lib/data/projects";

// "/" → màn Feature & Task của dự án đầu tiên người dùng thuộc về (F15.3).
export default async function RootPage() {
  const projects = await getProjectsByMember(await getCurrentUserId());
  // Ưu tiên dự án chưa lưu trữ (F13.7).
  const first = projects.find((p) => !p.archived) ?? projects[0];
  if (!first) notFound();
  redirect(`/${first.id}/work`);
}
