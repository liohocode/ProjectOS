"use client";

import { useUrlDialog } from "@/components/ui/urlDialog";
import type { MemberOption } from "@/lib/types";
import { FeatureDialog } from "./FeatureDialog";
import { NEW_FEATURE_PARAM } from "./featureDialogParam";

/** "Feature mới" ở màn work — mở bằng `?newFeature=1` (ADR-018, F21.1). */
export function NewFeatureDialog({ projectId, members }: { projectId: string; members: MemberOption[] }) {
  const { close } = useUrlDialog(NEW_FEATURE_PARAM);
  return <FeatureDialog projectId={projectId} members={members} onClose={close} />;
}
