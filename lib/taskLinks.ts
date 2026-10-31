// Liên kết code của task (F22.4): PR, branch, commit — hàm thuần dùng chung cho server action (người nhập) và MCP (agent báo).

export interface TaskLinks {
  prUrl: string | null;
  branch: string | null;
  commitSha: string | null;
}

/** Giá trị nhập: chuỗi rỗng = xoá liên kết; undefined = giữ nguyên. */
export type TaskLinksInput = { [K in keyof TaskLinks]?: string | null };

// Ký tự hợp lệ cho tên ref git (rút gọn từ `git check-ref-format`): không khoảng trắng, ~ ^ : ? * [ \, không "..", không kết thúc bằng "/" hoặc ".lock".
const BRANCH = /^(?!\/)(?!.*\.\.)(?!.*\/$)(?!.*\.lock$)[^\s~^:?*[\\]{1,200}$/;
const COMMIT = /^[0-9a-f]{7,40}$/i;

export type ParsedLinks = { ok: true; links: Partial<TaskLinks> } | { ok: false; error: string };

export function parseTaskLinks(input: TaskLinksInput): ParsedLinks {
  const links: Partial<TaskLinks> = {};
  for (const key of ["prUrl", "branch", "commitSha"] as const) {
    const raw = input[key];
    if (raw === undefined) continue;
    const value = (raw ?? "").trim();
    if (!value) {
      links[key] = null;
      continue;
    }
    const error = validate(key, value);
    if (error) return { ok: false, error };
    links[key] = key === "commitSha" ? value.toLowerCase() : value;
  }
  return { ok: true, links };
}

function validate(key: keyof TaskLinks, value: string): string | null {
  if (key === "prUrl") {
    if (value.length > 500) return "Link PR tối đa 500 ký tự";
    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:" ? null : "Link PR phải là URL http(s)";
    } catch {
      return "Link PR phải là URL http(s)";
    }
  }
  if (key === "branch") return BRANCH.test(value) ? null : "Tên branch không hợp lệ";
  return COMMIT.test(value) ? null : "Commit phải là mã hash 7–40 ký tự hex";
}

/** Nhãn ngắn cho link PR: `#123` với URL pull request của GitHub / GitLab, còn lại là host + path. */
export function prLabel(url: string): string {
  try {
    const u = new URL(url);
    const m = /\/(?:pull|merge_requests)\/(\d+)/.exec(u.pathname);
    const repo = u.pathname.split("/").slice(1, 3).join("/");
    return m ? `${repo}#${m[1]}` : `${u.host}${u.pathname}`;
  } catch {
    return url;
  }
}
