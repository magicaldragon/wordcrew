# WordCrew — Kế hoạch doanh thu (bản nội bộ)

> Trạng thái hiện tại: **đang mở full – không hiển thị bất kỳ nội dung thu phí nào**.
> Cờ duy nhất: `BILLING_ENABLED = false` trong [constants.ts](constants.ts).
> Bật lại = đổi cờ này thành `true` và deploy. Toàn bộ API (`/api/pricing`, `/api/orders`,
> `/api/licenses/verify`, Sepay webhook, admin grant/revoke) vẫn sống nguyên.

---

## 1. Nguyên tắc gốc

1. **Học sinh không bao giờ trả tiền.** Học sinh là người chơi, là lý do phụ huynh/giáo viên
   ở lại. Chặn học sinh = chặn vòng lặp tăng trưởng.
2. **Thu tiền ở phía có ngân sách**: giáo viên (tự bỏ tiền) và nhà trường (ngân sách tổ bộ môn).
3. **Free phải đủ dùng thật.** Nếu bản free không chạy được một buổi dạy thật thì người ta
   bỏ đi chứ không nâng cấp.
4. **Không bao giờ rút lại thứ đã cho**: tính năng đang free mà sau này thu tiền thì phải
   grandfather (xem §5).

---

## 2. Ba giai đoạn

### Giai đoạn 0 — Launch, mở full (hiện tại → 30/06/2027)

- Mục tiêu: **traffic + dữ liệu**, không doanh thu.
- Mọi thứ free: game, Hell/Team/Solo, 4 pack từ vựng, custom sound, Teacher Mode, My Class,
  không giới hạn số lớp / số bài giao.
- Không có giá, không có ngày hết hạn, không có nút "Unlock" ở bất kỳ đâu.
- Việc phải làm trong giai đoạn này: đo chỉ số (§4), sửa lỗi giáo viên gặp, thêm Tool 2
  (multiple choice) + Tool 3 (writing), hoàn thiện báo cáo lớp.

### Giai đoạn 1 — Free tier có biên (01/07/2027 → 31/08/2027)

Bắt đầu giới hạn **phía giáo viên**, không đụng phía học sinh:

| Hạng mục | Free | Pro Teacher |
|---|---|---|
| Lớp của tôi | 1 lớp | Không giới hạn |
| Học sinh / lớp | 40 | Không giới hạn |
| Bài giao | 2 bài / tháng | Không giới hạn |
| Tool 1 (Check Vocabulary) | 20 từ / bài | 300 từ / bài |
| Tool 2 / Tool 3 (sắp có) | Không | Có |
| Báo cáo lớp + "Words to reteach" | 7 ngày gần nhất | Toàn bộ lịch sử |
| Game đầy đủ cho học sinh | Có | Có |

Thông báo trước 30 ngày trong app + email cho giáo viên đang dùng.

### Giai đoạn 2 — Thu tiền đầy đủ (từ 01/09/2027, đầu năm học)

- Bật toàn bộ bảng giá dưới đây.
- Đây là thời điểm giáo viên lập kế hoạch năm học → tỉ lệ chuyển đổi cao nhất trong năm.
- Trước mốc này 2 tuần: bật banner "Pro sắp mở bán", thu email quan tâm (waitlist) để đo cầu.

---

## 3. Bảng giá

### Pro Teacher (cá nhân)

| Gói | Giá | Quy ra tháng | Ghi chú |
|---|---|---|---|
| Tháng | **129.000đ** | 129.000đ | Cổng vào, không cam kết |
| Năm | **990.000đ** | ~82.500đ | Tiết kiệm 36% — mặc định hiển thị |
| Lifetime | **2.490.000đ** | — | Bán giới hạn 100 suất đầu, sau đó đóng |

### School (tổ bộ môn)

| Gói | Giá | Quy ra / giáo viên |
|---|---|---|
| 10 giáo viên / năm | **3.900.000đ** | 390.000đ/năm |
| 30 giáo viên / năm | **9.900.000đ** | 330.000đ/năm |

- Trường trả bằng chuyển khoản + hoá đơn; cấp quyền thủ công qua `/api/admin/grant`
  (đã có), không cần cổng thanh toán riêng.
- Không bán theo học sinh. Trường càng đông học sinh càng tốt cho cả hai bên.

### Neo giá

- 129k ≈ một buổi gia sư 45 phút → câu chốt: *"một buổi gia sư đổi lấy cả năm soạn bài"*.
- Năm là gói mặc định (badge "Tiết kiệm 36%"), tháng chỉ để hạ rào cản thử.
- Lifetime đóng sau 100 suất để không tự bào mòn doanh thu định kỳ.

---

## 4. Chỉ số quyết định (đo trước khi bật paywall)

### 4.1 Trả lời thẳng: **đồng thời**, không phải "một khía cạnh nào cũng được"

Ba nhóm số dưới đây phải **cùng đạt, trong 2 tháng liên tiếp**. Lý do:

- Nhiều traffic mà ít giáo viên → không có ai trả tiền, bật paywall chỉ làm mất traffic.
- Nhiều giáo viên mà D7 thấp → họ dùng thử rồi bỏ; bật paywall là chốt cửa trước khi
  họ thấy giá trị.
- Nhiều lớp nhưng ít học sinh nộp bài → lớp "mở cho có", không phải thói quen dạy thật.

Ngưỡng cũ (150 GV / 1.000 HS / 40 lớp) là ngưỡng của một app đã có kênh phân phối, không
phải của một app nhỏ chưa tới 50 giáo viên. Hạ xuống mức **thực tế đo được**:

| Chỉ số | Vai trò | Bật GĐ1 (free tier có biên) | Mở rộng GĐ2 (bảng giá đầy đủ) |
|---|---|---|---|
| Giáo viên **giao bài** trong tháng (uid riêng) | **Cứng — phải đạt** | ≥ 30 | ≥ 120 |
| Lớp **active** (≥ 10 lượt nộp / 4 tuần) | **Cứng — phải đạt** | ≥ 8 | ≥ 40 |
| Giáo viên quay lại tuần thứ 2 (**D7**) | **Cứng — chất lượng** | ≥ 20% | ≥ 30% |
| Học sinh **nộp bài** trong tháng | Phụ — kiểm tra chéo | ≥ 200 | ≥ 1.000 |
| Lớp còn hoạt động sau 30 ngày | Phụ — kiểm tra chéo | ≥ 50% | ≥ 60% |

Quy tắc đọc bảng:

1. **Cứng** = điều kiện bật. Thiếu một cái là không bật, bất kể các số khác đẹp thế nào.
2. **Phụ** = chỉ để phát hiện số liệu sai. Ví dụ 30 giáo viên giao bài mà chỉ có 40 học
   sinh nộp → đang đếm sai hoặc giáo viên giao bài rồi không dùng; phải xem lại trước khi bật.
3. Đạt ngưỡng **một tháng** thì chưa bật; cần **2 tháng liên tiếp** để loại đợt spike
   (đầu năm học, một trường đăng ký ồ ạt).
4. Nếu sau **6 tháng** kể từ 01/07/2027 vẫn chưa đạt 30 giáo viên giao bài/tháng: **không hạ
   ngưỡng thêm nữa** — nghĩa là vấn đề nằm ở kênh tăng trưởng, bật paywall lúc đó chỉ làm
   chậm hơn. Khi đó chuyển sang phương án B: chỉ bán gói School (1 hợp đồng 10–30 ghế, không
   cần đông giáo viên lẻ).

Tín hiệu thay thế (được phép bật sớm nếu có): **≥ 30 email trong waitlist** hoặc **≥ 10 đơn
đặt trước** — tức là đã có người sẵn sàng trả tiền trước khi đông người dùng.

### 4.2 Cách đo (làm được ngay, không cần thêm hạ tầng)

Đo vào ngày 1 mỗi tháng, ghi một dòng vào bảng tính nội bộ:

| Số cần lấy | Lấy ở đâu |
|---|---|
| GV giao bài trong tháng | Firestore `classes/{id}/assignments` — đếm `createdBy` riêng biệt có `createdAt` trong tháng |
| HS nộp bài trong tháng | `classes/{id}/submissions` — đếm `studentUid` riêng biệt theo `submittedAt` |
| Lớp active | số lớp có ≥ 10 submission trong 28 ngày |
| D7 giáo viên | trong danh sách GV của tháng trước, bao nhiêu người có ít nhất 1 assignment ở tuần kế tiếp |

Nếu việc đếm tay mất quá 15 phút/tháng, thêm bảng `usage_month` trong D1
(`month, teacherUid, classes, assignments, submissions`) do client ghi một lần khi tạo bài —
chỉ số đếm, không chứa dữ liệu cá nhân của học sinh. **Chưa cần làm bây giờ**; làm khi
việc đếm tay bắt đầu tốn thời gian.

---

## 5. Grandfather — không lấy lại thứ đã cho

- **Ai đã mua 199.000đ** (giá cũ) → nâng thành **Lifetime**, không thu thêm.
- **Giáo viên tạo lớp trong giai đoạn 0** → giữ nguyên mức free hiện tại (không giới hạn lớp)
  đến **31/08/2028**, sau đó về Free tier hoặc mua Pro.
- **Học sinh** đã tham gia lớp → free vĩnh viễn, kể cả sau này.
- Ghi rõ trong `orders.plan` để đối soát, đừng dựa vào trí nhớ.

---

## 6. Việc kỹ thuật phải xong TRƯỚC khi bật cờ

### Bắt buộc — đã xong (2026-11-11)

- [x] D1 `orders`: thêm `plan`, `seats`, `access_until` (migration đã chạy trên D1 remote).
      `expires_at` cũ giữ nguyên nghĩa "hạn trả tiền của đơn", **không** phải hạn dùng.
- [x] `/api/pricing` trả cả bảng `plans` (tháng / năm / lifetime / school10 / school30).
- [x] `/api/orders` nhận `plan`, giá tính lại ở worker (`PLANS` + `planAmount`), client
      không quyết định được số tiền.
- [x] `/api/licenses/verify` và `/api/entitlements` trả `plan` + `accessUntil` + `active`;
      mã hết hạn nhận `410 licenceExpired` thay vì báo hợp lệ.
- [x] Gia hạn cộng dồn: đơn mới lấy `MAX(access_until)` cũ làm gốc, cộng thêm kỳ hạn
      (`accessUntilFor`), mua sớm không mất ngày.
- [x] Client: `isPro` = `isUnlocked` **hoặc** có ít nhất 1 quyền lợi `active`; hết hạn thì
      thu hồi cờ thiết bị (`clearUnlockFlag`) và quay về giới hạn demo.
- [x] Cờ thiết bị lưu mốc hết hạn (epoch-ms), nên mất mạng vẫn hết hạn đúng ngày.
- [x] Account tab hiện "Vĩnh viễn / Còn N ngày / Đã hết hạn" cho từng lần mua.
- [x] Lookup lỗi mạng **không** bị coi là "không có quyền": khách đang trả tiền vẫn dùng
      được khi offline, chỉ bị hạ khi server trả lời rõ ràng.

### Còn phải làm trước khi bật

- [x] Dialog mua có bước chọn kỳ hạn (tháng / năm / lifetime), giá lấy từ `/api/pricing`
      → `plans`; gói School vẫn cấp tay qua `/api/admin/grant` (có hoá đơn), không bán QR.
- [ ] Giới hạn free tier phía giáo viên trong `services/classAccess.ts` (1 lớp, 40 HS/lớp,
      2 bài/tháng) — hiện đã gỡ hết vì đang mở full; phải khôi phục trước GĐ1.
- [ ] Email nhắc gia hạn trước 7 ngày (UI đã có số ngày còn lại; email thì chưa).
- [ ] Chế độ chỉ đọc khi hết hạn: lớp và bài cũ vẫn xem được, chỉ khoá tạo bài mới.
- [ ] Test tay 5 trường hợp: chưa đăng nhập / free / Pro còn hạn / Pro hết hạn / đã mua 199k.

### Nên có (tăng chuyển đổi, không bắt buộc để chạy)

- [ ] Trang giá riêng (`/pricing`) thay vì chỉ dialog, có bảng so sánh Free/Pro/School.
- [ ] Mã giới thiệu / mã trường (một mã, nhiều giáo viên) — dùng lại `classCodes` pattern.
- [ ] Waitlist trước GĐ2: form email, đếm số đăng ký để quyết định ngày mở bán.
- [ ] Nhật ký sự kiện tối thiểu: `pricing_view`, `checkout_start`, `checkout_paid`.

### Cách bật (checklist deploy)

1. Kiểm tra các việc "Bắt buộc" ở trên đã xong.
2. Trong `constants.ts`: `BILLING_ENABLED = true`.
3. Trong `services/tools.ts`: `TOOL_GATE.mode = 'paid'`, `freeUntil` = ngày hết hạn free phase.
4. `services/classAccess.ts`: thêm lại giới hạn free tier (số lớp / số học sinh / số bài).
5. Chạy `npm run typecheck && npm run build`, deploy, rồi test tay: chưa đăng nhập, tài khoản
   free, tài khoản Pro còn hạn, tài khoản Pro hết hạn, và tài khoản đã mua 199k.
6. Bật thanh toán Sepay: kiểm tra 1 giao dịch thật end-to-end trước khi thông báo công khai.

---

## 7. Chi phí & điểm hoà vốn (ước lượng)

| Khoản | / tháng |
|---|---|
| Cloudflare Workers Paid + D1 | ~130.000đ |
| Firebase (Firestore/Auth, mức nhỏ) | 0 – 200.000đ |
| VPS Kokoro TTS | 200.000 – 400.000đ |
| Tên miền, lặt vặt | ~50.000đ |
| **Tổng** | **~400.000 – 800.000đ** |

→ **4–7 giáo viên gói tháng là đủ nuôi hạ tầng.** Toàn bộ phần còn lại là thời gian, không
phải tiền. Vì vậy mục tiêu GĐ2 không phải "thu thật nhiều" mà là **thu đủ và ổn định**:
100 giáo viên Pro ≈ 12,9 triệu/tháng, đủ để trả một người làm nội dung bán thời gian.

Lưu ý: TTS là chi phí biến đổi duy nhất tăng theo người dùng — cache 30 ngày đã có trong
Worker, nên theo dõi tỉ lệ cache hit trước khi mở rộng.

---

## 8. Rủi ro & cách chặn

| Rủi ro | Cách chặn |
|---|---|
| Bật paywall quá sớm, mất traffic | Chỉ bật khi đạt KPI §4; bật vào đầu năm học, không bật giữa kỳ thi |
| Giáo viên bỏ đi vì bị chặn giữa chừng | Grandfather 12 tháng cho lớp đang hoạt động; thông báo trước 30 ngày |
| Học sinh gặp màn hình khoá | Không bao giờ gate phía học sinh; mọi giới hạn chỉ ở phía giáo viên |
| Doanh thu lẻ tẻ, khó vận hành | Ưu tiên gói School (1 hợp đồng = 10–30 ghế) hơn là bán lẻ từng giáo viên |
| Giá 129k quá cao với giáo viên tỉnh | Giữ mã giảm giá theo trường / chương trình giới thiệu, đừng hạ giá niêm yết |
| Không ai mua vì free đã đủ tốt | Free tier phải có biên rõ (§2 GĐ1); nếu vẫn không ai mua thì vấn đề là giá trị, không phải giá |

---

## 9. Lịch rà soát

- **Mỗi 2 tháng**: xem bảng chỉ số §4, ghi 1 dòng kết luận (giữ nguyên / đẩy sớm / lùi).
- **2027-06-15**: quyết định cuối cùng cho GĐ1, chuẩn bị thông báo 30 ngày.
- **2027-08-15**: mở bán trước năm học; **2027-09-01**: chính thức áp bảng giá.
- Sau mỗi mốc: cập nhật lại chính file này, ghi rõ ngày và số liệu thực tế.
