// Import kế hoạch `docs/features/*.md` + tên phase trong `docs/ROADMAP.md` vào một dự án Meridian (F28.2).
// Chạy lại không nhân đôi (khớp theo mã kế hoạch). Dùng DATABASE_URL hiện tại — production chỉ chạy qua workflow (F28.5).
//
//   npx tsx scripts/import-plan.ts --assignee <memberId> [--project meridian] [--dry-run]
import "dotenv/config";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { parseDocMd, parseFeatureMd, parsePhaseNames, type PlanFeature } from "../lib/planImport";
import { importDocs, importPlan } from "../lib/domain/planImport";

// Tài liệu kỹ thuật đưa lên màn Docs (F28.3) — đường dẫn tương đối trong docs/.
const TECH_DOCS = [
  "product/overview.md",
  "product/requirements.md",
  "architecture/overview.md",
  "architecture/data-model.md",
  "architecture/decisions.md",
  "WORKFLOW.md",
  "guides/agent-workflow.md",
  "guides/connect-agent.md",
  "guides/deploy-cloud-run.md",
  "guides/backup-restore.md",
  "guides/google-oauth.md",
];

async function main() {
  const { values } = parseArgs({
    options: {
      project: { type: "string", default: "meridian" },
      assignee: { type: "string" },
      "dry-run": { type: "boolean", default: false },
    },
  });
  if (!values.assignee) throw new Error("Thiếu --assignee <memberId> (người / agent nhận task mới)");

  const root = join(__dirname, "..");
  const dir = join(root, "docs", "features");
  const features = readdirSync(dir)
    .filter((f) => /^F\d{2}-.*\.md$/.test(f))
    .sort()
    .map((f) => {
      const parsed = parseFeatureMd(readFileSync(join(dir, f), "utf8"));
      if (!parsed) throw new Error(`Không đọc được ${f}`);
      return parsed;
    }) satisfies PlanFeature[];
  const phaseNames = parsePhaseNames(readFileSync(join(root, "docs", "ROADMAP.md"), "utf8"));

  const summary = await importPlan(features, {
    projectId: values.project!,
    project: { code: "MER", name: "Meridian", desc: "Kế hoạch phát triển chính Meridian — import từ docs/ (F28)." },
    assigneeId: values.assignee,
    phaseNames,
    dryRun: values["dry-run"],
  });
  const docs = TECH_DOCS.map((path) => parseDocMd(path, readFileSync(join(root, "docs", path), "utf8"), values.project!));
  const docResult = await importDocs(values.project!, docs, values.assignee, values["dry-run"]);
  console.log(`${values["dry-run"] ? "[dry-run — không ghi] " : ""}Import vào dự án ${values.project}:`);
  console.log(JSON.stringify({ ...summary, docs: docResult }, null, 2));
  const { prisma } = await import("../lib/prisma");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
