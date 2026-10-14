import Link from "next/link";
import { connection } from "next/server";
import { getProjects } from "@/lib/data/projects";

// Hiện khi URL trỏ tới dự án không tồn tại (notFound() trong app/[project]/layout.tsx)
// hoặc route không có. Liệt kê dự án thật để người dùng chọn lại.
export default async function NotFound() {
  // Render lúc request, không prerender lúc build (build trên CI không có DB).
  await connection();
  const projects = await getProjects();

  return (
    <main className="error-page">
      <div className="error-state">
        <i className="ph ph-compass error-state-icon" aria-hidden />
        <h4>Không tìm thấy dự án hoặc trang này</h4>
        <p className="text-muted">Đường dẫn có thể đã sai hoặc dự án đã bị xoá. Chọn một dự án để tiếp tục:</p>
        <ul className="not-found-projects">
          {projects.map((p) => (
            <li key={p.id}>
              <Link href={`/${p.id}/work`} className="not-found-project">
                <span className="switcher-badge">{p.code}</span>
                <span>{p.name}</span>
                <i className="ph ph-arrow-right" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
