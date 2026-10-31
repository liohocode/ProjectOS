import { randomBytes } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { getSessionMemberId } from "@/lib/auth/session";
import { getCredentialsByProject } from "@/lib/data/credentials";
import { resolveCredential } from "@/lib/domain/apiCredentials";
import { addApiCredential, revokeApiCredential } from "./credentials";

// F29.2 — API key mã hoá (ADR-025). Seed rv-web: hieu là tech lead, nam là thành viên thường; FEAT-118 thuộc rv-web.
const PROJECT_KEY = "sk-ant-api03-PROJECTKEY-0001";
const FEATURE_KEY = "sk-ant-api03-FEATUREKEY-0002";

const MASTER_KEY = randomBytes(32).toString("base64");
beforeEach(() => {
  vi.stubEnv("MERIDIAN_ENCRYPTION_KEY", MASTER_KEY);
});

afterAll(async () => {
  vi.unstubAllEnvs();
  await prisma.apiCredential.deleteMany({ where: { projectId: "rv-web" } });
});

describe("API key dự án / feature (F29.2)", () => {
  it("chỉ tech lead gắn được; key lưu dạng mã hoá, danh sách chỉ có 4 ký tự cuối", async () => {
    vi.mocked(getSessionMemberId).mockResolvedValue("nam");
    try {
      expect(await addApiCredential({ projectId: "rv-web", featureId: null, provider: "anthropic", label: "IT", key: PROJECT_KEY })).toEqual({
        ok: false,
        error: "Chỉ tech lead được gắn / thu hồi API key",
      });
    } finally {
      vi.mocked(getSessionMemberId).mockResolvedValue("hieu");
    }
    expect(await addApiCredential({ projectId: "rv-web", featureId: null, provider: "anthropic", label: "Team web", key: PROJECT_KEY })).toEqual({ ok: true, last4: "0001" });

    const row = await prisma.apiCredential.findFirstOrThrow({ where: { projectId: "rv-web", revokedAt: null } });
    expect(JSON.stringify(row)).not.toContain("PROJECTKEY");
    const list = await getCredentialsByProject("rv-web");
    expect(list).toMatchObject([{ label: "Team web", last4: "0001", provider: "Anthropic", featureId: null, createdBy: "Trung Hiếu" }]);
    expect(JSON.stringify(list)).not.toContain("PROJECTKEY");
  });

  it("key của feature ghi đè key dự án khi chạy; gắn key mới cùng phạm vi thu hồi key cũ", async () => {
    expect(await addApiCredential({ projectId: "rv-web", featureId: "FEAT-118", provider: "anthropic", label: "Listing", key: FEATURE_KEY })).toMatchObject({ ok: true });
    expect(await resolveCredential("rv-web", "FEAT-118", "anthropic")).toMatchObject({ ok: true, key: FEATURE_KEY });
    expect(await resolveCredential("rv-web", "FEAT-119", "anthropic")).toMatchObject({ ok: true, key: PROJECT_KEY });

    expect(await addApiCredential({ projectId: "rv-web", featureId: null, provider: "anthropic", label: "Team web 2", key: "sk-ant-api03-NEWPROJECT-0003" })).toMatchObject({ ok: true });
    expect((await getCredentialsByProject("rv-web")).map((c) => c.label)).toEqual(["Team web 2", "Listing"]);
    expect(await resolveCredential("rv-web", null, "anthropic")).toMatchObject({ ok: true, key: "sk-ant-api03-NEWPROJECT-0003" });
  });

  it("chặn: feature dự án khác, key quá ngắn, thiếu khoá chủ; khoá chủ đổi → không giải mã được", async () => {
    const crmFeature = (await prisma.feature.findFirstOrThrow({ where: { projectId: "crm" } })).id;
    expect(await addApiCredential({ projectId: "rv-web", featureId: crmFeature, provider: "anthropic", label: "x", key: PROJECT_KEY })).toEqual({ ok: false, error: "Feature không thuộc dự án này" });
    expect(await addApiCredential({ projectId: "rv-web", featureId: null, provider: "anthropic", label: "x", key: "ngan" })).toEqual({ ok: false, error: "API key không hợp lệ" });
    vi.stubEnv("MERIDIAN_ENCRYPTION_KEY", "");
    expect(await addApiCredential({ projectId: "rv-web", featureId: null, provider: "anthropic", label: "x", key: PROJECT_KEY })).toMatchObject({ ok: false, error: expect.stringContaining("MERIDIAN_ENCRYPTION_KEY") });
    vi.stubEnv("MERIDIAN_ENCRYPTION_KEY", randomBytes(32).toString("base64"));
    expect(await resolveCredential("rv-web", null, "anthropic")).toMatchObject({ ok: false, error: expect.stringContaining("Không giải mã được") });
  });

  it("thu hồi → không còn dùng; thu hồi lần hai báo lỗi", async () => {
    const [feature] = (await getCredentialsByProject("rv-web")).filter((c) => c.featureId === "FEAT-118");
    expect(await revokeApiCredential(feature.id)).toEqual({ ok: true });
    expect(await revokeApiCredential(feature.id)).toEqual({ ok: false, error: "API key đã bị thu hồi" });
    expect(await resolveCredential("rv-web", "FEAT-118", "anthropic")).toMatchObject({ ok: true, key: "sk-ant-api03-NEWPROJECT-0003" });
  });
});
