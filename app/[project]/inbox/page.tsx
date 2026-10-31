import { getInbox } from "@/lib/data/inbox";
import { getPermissions } from "@/lib/data/permissions";
import { getCurrentUserId } from "@/lib/auth/currentUser";
import { inboxScope } from "@/lib/inbox";
import { InboxScreen } from "@/components/inbox/InboxScreen";

export default async function InboxPage(props: PageProps<"/[project]/inbox">) {
  const { project: projectId } = await props.params;
  const userId = await getCurrentUserId();
  const [inbox, permissions] = await Promise.all([getInbox(projectId), getPermissions(userId, projectId)]);
  const scope = inboxScope(permissions);

  // Chỉ gửi xuống client phần người dùng có quyền xử lý (F15.4) — server action vẫn tự kiểm tra.
  return (
    <InboxScreen
      projectId={projectId}
      revisions={scope.revisions ? inbox.revisions : []}
      reviewTasks={scope.reviewTasks ? inbox.reviewTasks : []}
      proposals={scope.proposals ? inbox.proposals : []}
      blockedTasks={inbox.blockedTasks}
      canReviewAnything={scope.revisions || scope.reviewTasks || scope.proposals}
    />
  );
}
