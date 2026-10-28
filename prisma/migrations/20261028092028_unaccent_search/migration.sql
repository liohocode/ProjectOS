-- F14.2: tìm kiếm không phân biệt dấu tiếng Việt ("tieu chi" khớp "Tiêu chí").
-- unaccent là extension "trusted" (PG13+): owner của DB tạo được, Neon hỗ trợ.
-- Không khai báo trong schema.prisma (Prisma bỏ qua extension khi không bật postgresqlExtensions) → migrate diff không đụng tới.
CREATE EXTENSION IF NOT EXISTS unaccent;
