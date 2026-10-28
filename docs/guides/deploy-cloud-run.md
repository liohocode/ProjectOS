# Triển khai Meridian lên Google Cloud Run + Neon

Hướng dẫn cho F19 (ADR-016, ADR-015). Mỗi phần ghi rõ **ai làm**: người dùng (cần tài khoản Google Cloud) hay agent (sửa code trong repo).

| Phần | Task | Ai làm | Trạng thái |
|---|---|---|---|
| [1. Thiết lập Google Cloud](#1-thiết-lập-google-cloud-f193) | F19.3 | Người dùng | Hướng dẫn sẵn sàng |
| 2. Neon production | F19.4 | Agent + người dùng | Chưa viết |
| 3. Secrets | F19.5 | Agent + người dùng | Chưa viết |
| 4. Deploy thủ công lần đầu | F19.6 | Người dùng chạy lệnh agent soạn | Chưa viết |
| 5. Deploy tự động từ `main` | F19.7 | Agent | Chưa viết |

> **Chưa chia sẻ URL production cho tới khi F15.3 xong** (đăng nhập Google + chặn route). Trước đó ai có link cũng sửa được dữ liệu.

## Chạy thử image production ở máy (F19.2)
```bash
docker compose up -d                      # Postgres
npx prisma migrate deploy && npx prisma db seed
docker compose --profile app up --build   # build Dockerfile → http://localhost:8080
```
Hoặc không qua compose: `docker build -t meridian .` rồi `docker run -p 8080:8080 -e DATABASE_URL=... meridian`. Container không chạy migrate; production sẽ do CI chạy `prisma migrate deploy` trước khi deploy (F19.7).

---

## 1. Thiết lập Google Cloud (F19.3)

**Ai làm**: người dùng. Mất khoảng 20–30 phút. Làm trên trình duyệt ở https://console.cloud.google.com, chạy lệnh trong **Cloud Shell** (biểu tượng `>_` góc trên bên phải console — có sẵn `gcloud`, không cần cài gì).

**Kết quả cần gửi lại cho agent** (không phải secret, sẽ thành GitHub Variables ở F19.7): `PROJECT_ID`, `PROJECT_NUMBER`, region, đường dẫn Artifact Registry, tên đầy đủ của WIF provider, email 2 service account. Bước 1.7 in sẵn tất cả.

Số liệu giá/hạn mức dưới đây tra ngày 2026-10-28 — kiểm tra lại trên [trang giá Cloud Run](https://cloud.google.com/run/pricing) và [Artifact Registry](https://cloud.google.com/artifact-registry/pricing) nếu cần chắc chắn.

### 1.1 Tạo project
1. Console → chọn project (thanh trên cùng) → **New project**. Tên: `meridian`. Ghi lại **Project ID** (Google có thể thêm hậu tố, vd `meridian-471203`).
2. **Billing** → gắn project vào billing account đã có thẻ / credit 300 USD.

Cùng project này sẽ dùng cho Google OAuth (đăng nhập, F15.2) — không tạo project riêng.

### 1.2 Budget alert — làm trước mọi thứ khác
**Billing → Budgets & alerts → Create budget**:
- **Scope**: chỉ project `meridian`.
- **Credits**: **bỏ chọn** các loại credit (Free Trial / promotional) để cảnh báo tính trên chi phí thật — nếu để mặc định, credit 300 USD sẽ "che" chi phí và cảnh báo không bao giờ kêu.
- **Amount**: 5 USD/tháng.
- **Thresholds**: 50%, 90%, 100% (actual) — gửi email cho billing admin.

Budget alert **chỉ cảnh báo, không tự dừng dịch vụ**. Giới hạn chi phí thật nằm ở cấu hình Cloud Run (`--max-instances 1`, F19.6).

### 1.3 Đặt biến cho Cloud Shell
Dán vào Cloud Shell (sửa `PROJECT_ID` cho đúng). Nếu Cloud Shell bị ngắt, dán lại khối này trước khi chạy tiếp.
```bash
export PROJECT_ID="meridian-xxxxxx"          # Project ID ở bước 1.1
export REGION="asia-southeast1"              # Singapore — cùng thành phố với Neon (aws-ap-southeast-1)
export REPO="meridian"                       # Artifact Registry repo
export GITHUB_REPO="liohocode/ProjectOS"     # repo được phép deploy

gcloud config set project "$PROJECT_ID"
export PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
echo "$PROJECT_ID / $PROJECT_NUMBER"
```

Region: hạn mức free của Cloud Run (2M request, 180K vCPU-giây, 360K GiB-giây mỗi tháng) tính chung cho cả billing account và áp dụng mọi region, nhưng Singapore thuộc nhóm giá Tier 2 nên tiêu hạn mức nhanh hơn ~1.4 lần so với Tier 1. Với tool nội bộ vẫn dư; đổi region là ngoài phạm vi trừ khi số liệu thật cho thấy cần.

### 1.4 Bật API
```bash
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com
```

### 1.5 Artifact Registry + dọn image cũ
```bash
gcloud artifacts repositories create "$REPO" \
  --repository-format=docker --location="$REGION" \
  --description="Meridian container images"

cat > cleanup.json <<'EOF'
[
  { "name": "giu-5-ban-moi-nhat", "action": { "type": "Keep" }, "mostRecentVersions": { "keepCount": 5 } },
  { "name": "xoa-ban-cu",         "action": { "type": "Delete" }, "condition": { "tagState": "any", "olderThan": "7d" } }
]
EOF
# Chạy thử (dry run) trước, rồi bật thật
gcloud artifacts repositories set-cleanup-policies "$REPO" --location="$REGION" --policy=cleanup.json --dry-run
gcloud artifacts repositories set-cleanup-policies "$REPO" --location="$REGION" --policy=cleanup.json --no-dry-run
```
Giữ 5 image gần nhất (đủ để rollback), xoá các bản cũ hơn 7 ngày. Image Meridian nén ~90 MB và các bản chia sẻ lớp base, nên 5 bản nằm trong hạn mức lưu trữ free. Policy có hiệu lực trong khoảng 1 ngày.

### 1.6 Service account + Workload Identity Federation
Hai service account, quyền tối thiểu:
- `meridian-run` — danh tính **app** khi chạy trên Cloud Run; chỉ được đọc secret.
- `meridian-deploy` — danh tính **GitHub Actions** khi deploy; đẩy image, deploy Cloud Run, "đóng vai" `meridian-run`.

GitHub Actions đăng nhập Google bằng **Workload Identity Federation** (token OIDC của GitHub, chỉ chấp nhận repo `liohocode/ProjectOS`) — **không tạo JSON key** (key bị lộ là mất quyền project).

```bash
# Service account
gcloud iam service-accounts create meridian-run    --display-name="Meridian runtime (Cloud Run)"
gcloud iam service-accounts create meridian-deploy --display-name="Meridian deploy (GitHub Actions)"
export RUN_SA="meridian-run@${PROJECT_ID}.iam.gserviceaccount.com"
export DEPLOY_SA="meridian-deploy@${PROJECT_ID}.iam.gserviceaccount.com"

# Runtime: chỉ đọc secret (DATABASE_URL, AUTH_* — tạo ở F19.5)
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${RUN_SA}" --role="roles/secretmanager.secretAccessor"

# Deploy: quản lý Cloud Run, đẩy image vào đúng repo, dùng runtime SA khi deploy
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${DEPLOY_SA}" --role="roles/run.admin"
gcloud artifacts repositories add-iam-policy-binding "$REPO" --location="$REGION" \
  --member="serviceAccount:${DEPLOY_SA}" --role="roles/artifactregistry.writer"
gcloud iam service-accounts add-iam-policy-binding "$RUN_SA" \
  --member="serviceAccount:${DEPLOY_SA}" --role="roles/iam.serviceAccountUser"

# Workload Identity Federation cho GitHub
gcloud iam workload-identity-pools create github \
  --location=global --display-name="GitHub Actions"
gcloud iam workload-identity-pools providers create-oidc github \
  --location=global --workload-identity-pool=github \
  --display-name="GitHub OIDC" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository == '${GITHUB_REPO}'"

# Chỉ workflow của repo này được "đóng vai" deploy SA
gcloud iam service-accounts add-iam-policy-binding "$DEPLOY_SA" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github/attribute.repository/${GITHUB_REPO}"
```

### 1.7 In thông tin gửi lại cho agent
```bash
cat <<EOF
GCP_PROJECT_ID=${PROJECT_ID}
GCP_PROJECT_NUMBER=${PROJECT_NUMBER}
GCP_REGION=${REGION}
GCP_ARTIFACT_REPO=${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}
GCP_WIF_PROVIDER=projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github/providers/github
GCP_DEPLOY_SA=${DEPLOY_SA}
GCP_RUN_SA=${RUN_SA}
EOF
```
Các giá trị này **không phải secret** (WIF chỉ chấp nhận token từ repo `liohocode/ProjectOS`) — dán vào chat hoặc tự thêm vào GitHub → Settings → Secrets and variables → Actions → **Variables**.

### Kiểm tra đã xong F19.3
- [ ] Budget alert 5 USD tồn tại, đã bỏ chọn credit
- [ ] `gcloud artifacts repositories describe "$REPO" --location="$REGION"` thấy repo + cleanup policy
- [ ] `gcloud iam workload-identity-pools providers describe github --location=global --workload-identity-pool=github` có `attributeCondition` đúng repo
- [ ] Đã gửi 7 giá trị ở bước 1.7
