import { describe, expect, it } from "vitest";
import { getProjectById, getProjects } from "./projects";
import { getMemberById, getMemberCountByProject, getPipelineAgents, getTeam, getTeamByProject } from "./team";
import { getFeaturesByProject, getTaskCountsByProject, getTasksByProject } from "./features";
import { getMcpLog, getMcpServers, getMcpSessions } from "./mcp";

// Số liệu mốc: docs/architecture/data-model.md → "Số lượng sau seed".

describe("projects", () => {
  it("có 3 dự án mẫu", async () => {
    const projects = await getProjects();
    expect(projects.map((p) => p.id).sort()).toEqual(["crm", "rv-app", "rv-web"]);
  });

  it("tìm theo id; id lạ trả undefined", async () => {
    expect((await getProjectById("rv-web"))?.name).toBe("Rever Web v3");
    expect(await getProjectById("khong-ton-tai")).toBeUndefined();
  });

  it("nhãn sprint dựng lại từ model Sprint giống hệt dữ liệu gốc", async () => {
    const sprints = Object.fromEntries((await getProjects()).map((p) => [p.id, p.sprint]));
    expect(sprints).toEqual({
      "rv-web": "Sprint 14 · 12–26/08",
      "rv-app": "Sprint 9 · 11–25/08",
      crm: "Sprint 22 · 18/08–01/09",
    });
  });
});

describe("team", () => {
  it("7 thành viên toàn tổ chức: 4 agent, 3 người", async () => {
    const team = await getTeam();
    expect(team).toHaveLength(7);
    expect(team.filter((m) => m.kind === "agent")).toHaveLength(4);
  });

  it("phân bổ theo dự án khớp seed (18 dòng ProjectMember)", async () => {
    const sizes = await Promise.all(["rv-web", "rv-app", "crm"].map(async (p) => (await getTeamByProject(p)).length));
    expect(sizes).toEqual([7, 6, 5]);
  });

  it("agent có config + skill rows + activity có thời gian tương đối", async () => {
    const atlas = await getMemberById("agent-atlas");
    expect(atlas?.config?.some(([label]) => label === "Model")).toBe(true);
    expect(atlas?.skillRows.length).toBeGreaterThan(0);
    expect(atlas?.activity[0]?.when).toMatch(/trước|Hôm qua/);
  });

  it("trạng thái thành viên hiển thị bằng nhãn tiếng Việt", async () => {
    const statuses = Object.fromEntries((await getTeam()).map((m) => [m.id, m.status]));
    expect(statuses).toMatchObject({ "agent-atlas": "Đang chạy", "agent-scout": "Chờ", hieu: "Đang review", nam: "Đang làm" });
  });

  it("pipeline agent đúng thứ tự BA → TA → Dev → Index", async () => {
    const pipeline = await getPipelineAgents();
    expect(pipeline.map((p) => `${p.stage}:${p.agent.name}`)).toEqual(["BA:Bảo", "TA:Vega", "Dev:Atlas", "Index:Scout"]);
  });
});

describe("features & tasks", () => {
  it("rv-web có 5 feature (1 chưa giao), 13 task; số docs tính từ quan hệ", async () => {
    const features = await getFeaturesByProject("rv-web");
    expect(features.map((f) => f.id)).toEqual(["FEAT-118", "FEAT-119", "FEAT-120", "FEAT-124", "FEAT-126"]);
    expect(features.flatMap((f) => f.tasks)).toHaveLength(13);
    expect(Object.fromEntries(features.map((f) => [f.id, f.docs]))).toEqual({
      "FEAT-118": 4,
      "FEAT-119": 2,
      "FEAT-120": 2,
      "FEAT-124": 0,
      "FEAT-126": 0,
    });
  });

  it("owner đúng loại; feature chưa giao không owner, không task", async () => {
    const features = await getFeaturesByProject("rv-web");
    expect(features.find((f) => f.id === "FEAT-118")).toMatchObject({ owner: "Trần Mỹ Linh", ownerKind: "human" });
    expect(features.find((f) => f.id === "FEAT-119")).toMatchObject({ owner: "Atlas", ownerKind: "agent" });
    expect(features.find((f) => f.id === "FEAT-126")).toMatchObject({ owner: "Chưa giao", ownerKind: null, tasks: [] });
  });

  it("task giữ đúng người thực hiện, kind và cờ block/running", async () => {
    const tasks = await getTasksByProject("rv-web");
    const t418 = tasks.find((t) => t.id === "T-418");
    expect(t418).toMatchObject({ who: "Atlas", kind: "agent", blocked: "chờ ADR-11" });
    expect(tasks.find((t) => t.id === "T-405")?.running).toMatch(/^chạy 1[45] phút$/); // tính từ runningSince lúc seed
    expect(tasks.find((t) => t.id === "T-401")?.blocked).toBeUndefined();
  });

  it("field kiểu thật được format lại đúng chuỗi hiển thị cũ", async () => {
    const tasks = await getTasksByProject("rv-web");
    expect(tasks.find((t) => t.id === "T-401")).toMatchObject({ est: "5đ", due: "22/08", status: "Đang làm" });
    expect(tasks.find((t) => t.id === "T-430")).toMatchObject({ est: "—", due: "27/08", status: "Đang chạy" });
    expect(tasks.find((t) => t.id === "T-396")?.status).toBe("Chờ review");
    expect(tasks.find((t) => t.id === "T-418")?.running).toBeUndefined();
  });

  it("3 task block trên toàn hệ thống (T-418, T-402, T-522)", async () => {
    const all = (await Promise.all(["rv-web", "rv-app", "crm"].map(getTasksByProject))).flat();
    expect(all.filter((t) => t.blocked).map((t) => t.id).sort()).toEqual(["T-402", "T-418", "T-522"]);
  });

  it("project không tồn tại trả mảng rỗng", async () => {
    expect(await getFeaturesByProject("khong-ton-tai")).toEqual([]);
  });

  it("hàm đếm cho badge sidebar khớp với danh sách đầy đủ ở cả 3 dự án", async () => {
    for (const projectId of ["rv-web", "rv-app", "crm", "khong-ton-tai"]) {
      const [counts, tasks, memberCount, team] = await Promise.all([
        getTaskCountsByProject(projectId),
        getTasksByProject(projectId),
        getMemberCountByProject(projectId),
        getTeamByProject(projectId),
      ]);
      expect(counts).toEqual({ total: tasks.length, blocked: tasks.filter((t) => t.blocked).length });
      expect(memberCount).toBe(team.length);
    }
  });
});

describe("mcp", () => {
  it("3 server, 2 online", async () => {
    const servers = await getMcpServers();
    expect(servers).toHaveLength(3);
    expect(servers.filter((s) => s.status === "online")).toHaveLength(2);
    expect(servers[0].lastCommandAgo).toMatch(/trước|Hôm qua/);
  });

  it("phiên chạy và nhật ký map enum sang chuỗi tiếng Việt", async () => {
    const { items: sessions, nextCursor } = await getMcpSessions();
    expect(nextCursor).toBeNull(); // 8 phiên < 1 trang
    expect(sessions).toHaveLength(8);
    expect(new Set(sessions.map((s) => s.result))).toEqual(new Set(["Đang chạy", "Chờ review", "Bị chặn", "Xong"]));

    const s8f2a = sessions.find((s) => s.id === "sess-8f2a");
    expect(s8f2a).toMatchObject({ tokens: "182K", result: "Đang chạy" });
    expect(s8f2a?.durationMin).toBeGreaterThanOrEqual(14); // đang chạy → tăng theo thời gian
    expect(sessions.find((s) => s.id === "sess-5a77")).toMatchObject({ tokens: "95K", durationMin: 12 });

    const { items: log } = await getMcpLog();
    expect(log).toHaveLength(8);
    expect(log.every((e) => /^\d{2}:\d{2}:\d{2}$/.test(e.at))).toBe(true);
    expect(log.some((e) => e.result === "Bị chặn")).toBe(true);
  });
});
