"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { fail, ok, type ActionResult } from "./result";
import { recordActivity } from "./_activity";

// Thành viên dự án (F13.2). Hồ sơ thành viên là của toàn tổ chức; ProjectMember gắn họ vào dự án.

const projectIdSchema = z.string().trim().min(1, "Thiếu dự án");
const memberIdSchema = z.string().trim().min(1, "Chọn thành viên");

// Danh sách thành viên ở màn team, picker giao task ở màn work, badge sidebar — mọi dự án.
const revalidateMemberViews = () => revalidatePath("/[project]", "layout");

/** Gán người/agent có sẵn trong tổ chức vào dự án. */
export async function addProjectMember(projectId: string, memberId: string): Promise<ActionResult> {
  // TODO(F15.4): kiểm tra quyền
  const input = z.object({ projectId: projectIdSchema, memberId: memberIdSchema }).safeParse({ projectId, memberId });
  if (!input.success) return fail(input.error.issues[0].message);
  const { projectId: project, memberId: member } = input.data;

  const [projectRow, memberRow, existing] = await Promise.all([
    prisma.project.findUnique({ where: { id: project }, select: { name: true } }),
    prisma.member.findUnique({ where: { id: member }, select: { name: true } }),
    prisma.projectMember.findUnique({ where: { projectId_memberId: { projectId: project, memberId: member } } }),
  ]);
  if (!projectRow) return fail("Không tìm thấy dự án");
  if (!memberRow) return fail("Không tìm thấy thành viên");
  if (existing) return fail(`${memberRow.name} đã thuộc dự án này`);

  await prisma.projectMember.create({ data: { projectId: project, memberId: member } });
  await recordActivity("ph-user-plus", `Thêm ${memberRow.name} vào ${projectRow.name}`);
  revalidateMemberViews();
  return ok();
}

const newMemberSchema = z
  .object({
    projectId: projectIdSchema,
    kind: z.enum(["human", "agent"], { message: "Chọn người hoặc agent" }),
    name: z.string().trim().min(1, "Nhập tên").max(60, "Tên tối đa 60 ký tự"),
    handle: z.string().trim().max(60, "Handle tối đa 60 ký tự"),
    role: z.string().trim().min(1, "Nhập vai trò").max(60, "Vai trò tối đa 60 ký tự"),
    /** Cách nhau bằng dấu phẩy */
    skills: z.string().trim().max(300, "Skills tối đa 300 ký tự"),
    /** Email Google để đăng nhập — chỉ người; trống = chưa cho đăng nhập */
    email: z.string().trim().toLowerCase().email("Email không hợp lệ").or(z.literal("")),
  })
  .refine((m) => m.kind === "human" || m.email === "", "Agent không có email đăng nhập");

export type NewMemberInput = z.input<typeof newMemberSchema>;

/** Id trống đầu tiên trong `base`, `base-2`… */
async function freeMemberId(base: string): Promise<string> {
  const taken = new Set((await prisma.member.findMany({ where: { id: { startsWith: base } }, select: { id: true } })).map((m) => m.id));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

/** Tạo thành viên mới cho tổ chức rồi gán vào dự án. Id: slug tên (người) hoặc `agent-<slug>` (agent). */
export async function createMember(input: NewMemberInput): Promise<ActionResult<{ memberId: string }>> {
  // TODO(F15.4): kiểm tra quyền
  const parsed = newMemberSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const data = parsed.data;

  if (!(await prisma.project.findUnique({ where: { id: data.projectId }, select: { id: true } }))) return fail("Không tìm thấy dự án");
  if (data.email && (await prisma.member.findUnique({ where: { email: data.email }, select: { id: true } }))) {
    return fail("Email này đã thuộc một thành viên khác");
  }

  const slug = slugify(data.name, "thanh-vien");
  const id = await freeMemberId(data.kind === "agent" ? `agent-${slug}` : slug);
  const handle = data.handle || (data.kind === "agent" ? "agent" : `@${slug}`);
  const skills = data.skills
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  await prisma.member.create({
    data: {
      id,
      name: data.name,
      handle,
      kind: data.kind,
      role: data.role,
      skills,
      current: "Chưa có việc",
      status: "Cho",
      email: data.email || null,
      projects: { create: { projectId: data.projectId } },
    },
  });
  await recordActivity("ph-user-plus", `Thêm thành viên mới ${data.name}`);
  revalidateMemberViews();
  return { ok: true, memberId: id };
}
