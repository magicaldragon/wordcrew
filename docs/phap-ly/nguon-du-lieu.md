# Rà soát nguồn và giấy phép nội dung đóng gói trong WordCrew

Ngày rà soát: 15/11/2026. Phạm vi: mọi tài nguyên không phải mã nguồn được đóng gói vào bản
build — danh sách từ, bản dịch nghĩa, phông chữ, âm thanh, hình ảnh.

Kết luận ngắn: **ba danh sách từ chưa từng được ghi công; 11 tệp SFX từng lấy từ
myinstants.com — một trang soundboard không cấp giấy phép tái sử dụng; 9 tệp nhạc nền làm bằng
Suno gói trả phí nên có quyền thương mại, nhưng phải lưu bằng chứng.** Ngày 15/11/2026 cả 11 tệp
SFX đã được thay: 4 tệp bằng Suno Pro, 7 tệp tự tổng hợp trong dự án. Bản build không còn tệp nào
từ myinstants.

## 1. Bảng tổng hợp

| Tài nguyên | Nguồn / giấy phép | Trạng thái | Việc phải làm |
| --- | --- | --- | --- |
| `scripts/data/ngsl.txt`, `nawl.txt`, `tsl.txt`, `bsl.txt` | NGSL Project 1.2, **CC BY-SA 4.0**, header ghi “Free to use with attribution” | Thiếu ghi công hoàn toàn | Đã ghi công tại mục 9.2 Điều khoản sử dụng |
| `vietnameseGlosses.generated.ts` (bản đồ nghĩa tiếng Việt, **có ship trong bundle**) | Sinh từ 4 danh sách trên bằng `scripts/generate-glosses.mjs` | Là tác phẩm phái sinh của CC BY-SA 4.0 nhưng trước đây Điều khoản tuyên bố sở hữu tuyệt đối | Đã sửa mục 9.2: phần dữ liệu từ vựng chia sẻ theo CC BY-SA 4.0 |
| `scripts/data/common-words.txt` | Google Web Trillion Word Corpus (`first20hours/google-10000-english`) | Chỉ dùng lúc build, không ship | Không cần ghi công trong app |
| `assets/fonts/*.woff2` — Exo 2, Orbitron | Google Fonts, **SIL OFL 1.1** | Chưa ghi công | Đã ghi công tại mục 9.3 |
| `public/audio/announcer-*.wav` (4 tệp) | Render sẵn bằng **Deepgram Aura** qua Cloudflare Workers AI (`scripts/generate-announcer.mjs`) | Chưa khai báo | Đã ghi tại mục 9.4; cần đối chiếu điều khoản thương mại của Cloudflare/Deepgram trước khi bán |
| `public/audio/game-music-*.mp3`, `rush-hour-*.mp3`, `setup-music-*.mp3` (9 tệp) | **Suno, gói trả phí (Pro, 10 USD/tháng)** — người dùng xác nhận; tag ID3 của cả 9 tệp đều ghi `suno.com` | Đã thay bằng bản làm lại ngày 15/11/2026 và cắt đúng ô nhịp còn 0:44–1:31 mỗi bài; có quyền thương mại **nếu** từng bài được tạo và tải về trong thời gian gói còn hiệu lực | Lưu hoá đơn gói Pro + bảng ngày tạo/ngày tải từng bài; bài tạo ở gói miễn phí **không** được thương mại hoá, và nâng cấp sau không có hiệu lực hồi tố |
| `countdown-go.mp3`, `result.mp3`, `start.mp3`, `times-up.mp3` (4 tệp) | **Suno, gói Pro** — người dùng xác nhận; `result.mp3` còn mang tag ID3 `suno.com`. Đã cắt còn 1,0–2,2 s | Đã thay và đã cắt ngày 15/11/2026 | Lưu cùng một bộ bằng chứng với 9 bài nhạc: ngày tạo/ngày tải từng đoạn. Đoạn cắt ra từ bài Pro thì giữ nguyên hiệu lực thương mại của bài gốc |
| 7 tệp SFX: `points-doubler.mp3`, `skip-freebie-used.mp3`, `powerup-collected.mp3`, `time-freeze.mp3`, `correct-sound.wav`, `skip-sound.wav`, `try-again.wav` | **Tự tổng hợp** bằng oscillator và filtered noise — `scripts/generate-sfx.mjs`. Trước 15/11/2026 là bản myinstants.com | **Đã thay.** Bản hiện tại là tác phẩm gốc của dự án, không có giấy phép bên thứ ba, và tái tạo được bằng một lệnh | Không phải làm gì thêm; nếu sửa âm sắc thì sửa tham số trong script rồi chạy lại |
| `public/icons/*.png`, `public/favicon.svg` | Không có metadata | Nhiều khả năng do dự án tạo | Xác nhận lại nguồn trước khi đăng lên store |

## 2. Vì sao “free” trên myinstants không dùng được cho sản phẩm bán

- Myinstants là soundboard cộng đồng: người dùng tải clip lên, phần lớn là đoạn cắt từ phim,
  game, video và nhạc. Trang **không công bố giấy phép** nào cho việc tái sử dụng; trang pháp lý
  duy nhất là chính sách DMCA, tức cơ chế gỡ nội dung khi bị khiếu nại — không phải cơ chế cấp
  quyền.
- Tải được miễn phí ≠ được dùng thương mại. Với một sản phẩm thu tiền, mỗi tệp cần một chuỗi
  quyền hợp lệ từ chủ sở hữu gốc, không phải từ nơi tải về.
- Hai tệp từng có bằng chứng rõ ràng nhất đã được thay ngay từ đợt đầu: `points-doubler.mp3`
  (âm thanh của Nintendo) và `countdown-go.mp3` (bản tải từ YouTube). Bảy tệp SFX còn lại được
  thay nốt ngày 15/11/2026 bằng bản tự tổng hợp, nên bản build hiện tại không còn tệp nào của
  myinstants. Lý do vẫn ghi lại lịch sử này: nếu sau này ai thêm một tệp “nghe hay trên mạng” vào
  `public/audio/`, câu hỏi giấy phép phải được trả lời y như đã trả lời ở đây.

## 3. Vì sao nhạc Suno ổn hơn, nhưng vẫn cần bằng chứng

- Suno chỉ cấp quyền thương mại cho bài **tạo ra khi đang dùng gói Pro/Premier** và **được tải
  về qua Suno** trong thời gian đó. Bài tạo ở gói miễn phí chỉ dùng cá nhân, và nâng cấp sau
  không có hiệu lực hồi tố.
- Quyền thương mại không đồng nghĩa với việc bạn có bản quyền đối với tác phẩm; Suno không bảo
  đảm tác phẩm được đăng ký bảo hộ. Vì vậy đừng tuyên bố độc quyền với nhạc nền, chỉ nói có
  quyền sử dụng thương mại.
- Cần lưu: hoá đơn gói Pro, email tài khoản Suno, và với từng tệp một dòng (tên bài, ngày tạo,
  ngày tải). Nếu có bài nào tạo trước khi mua gói, thay bài đó.

## 4. Điều đã sửa trong đợt này

- `public/phap-ly/dieu-khoan-su-dung.html` mục 9: đổi từ “Quyền sở hữu trí tuệ của WordCrew”
  thành “Quyền sở hữu trí tuệ và nội dung của bên thứ ba”, thêm ghi công NGSL/NAWL/TSL/BSL
  (CC BY-SA 4.0), phông chữ (OFL 1.1), giọng đọc (Deepgram Aura) và nhạc nền (Suno, gói trả
  phí), kèm quy trình xử lý khiếu nại.

## 5. Việc còn lại phải làm trước khi mở bán

1. ~~Thay 7 tệp SFX còn lại từ myinstants~~ — **đã xong 15/11/2026**: 7 tệp tự tổng hợp bằng
   `scripts/generate-sfx.mjs`, 4 tệp Suno Pro đã cắt còn 1,0–2,2 s. Chi tiết độ dài và cách cắt
   nằm trong [danh-sach-thay-the.md](../am-thanh/danh-sach-thay-the.md).
2. Đã thay 9 tệp nhạc nền bằng bản Suno mới (tag `suno.com`). Vẫn cần lưu bộ bằng chứng: hoá đơn
   gói Pro + bảng ngày tạo/ngày tải của từng bài. Bài nào không chứng minh được là tạo trong kỳ
   trả phí thì thay.
3. Đối chiếu điều khoản Cloudflare Workers AI / Deepgram về việc dùng thương mại đầu ra của mô
   hình Aura; lưu ảnh chụp điều khoản tại thời điểm mở bán.
4. Vì dữ liệu từ vựng là tác phẩm phái sinh của CC BY-SA 4.0, không được tuyên bố độc quyền
   phần đó và không được ngăn người khác dùng lại theo CC BY-SA. Mã nguồn và giao diện thì không
   bị ràng buộc bởi giấy phép này.
5. Kiểm tra lại ngay trước khi đóng gói APK: bản build không được chứa tệp nào chưa có dòng
   tương ứng trong bảng nguồn.
