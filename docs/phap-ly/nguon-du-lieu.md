# Rà soát nguồn và giấy phép nội dung đóng gói trong WordCrew

Ngày rà soát: 15/11/2026. Phạm vi: mọi tài nguyên không phải mã nguồn được đóng gói vào bản
build — danh sách từ, bản dịch nghĩa, phông chữ, âm thanh, hình ảnh.

Kết luận ngắn: **ba danh sách từ chưa từng được ghi công; 11 tệp SFX lấy từ myinstants.com —
một trang soundboard không cấp giấy phép tái sử dụng; 9 tệp nhạc nền làm bằng Suno gói trả phí
nên có quyền thương mại, nhưng phải lưu bằng chứng.**

## 1. Bảng tổng hợp

| Tài nguyên | Nguồn / giấy phép | Trạng thái | Việc phải làm |
| --- | --- | --- | --- |
| `scripts/data/ngsl.txt`, `nawl.txt`, `tsl.txt`, `bsl.txt` | NGSL Project 1.2, **CC BY-SA 4.0**, header ghi “Free to use with attribution” | Thiếu ghi công hoàn toàn | Đã ghi công tại mục 9.2 Điều khoản sử dụng |
| `vietnameseGlosses.generated.ts` (bản đồ nghĩa tiếng Việt, **có ship trong bundle**) | Sinh từ 4 danh sách trên bằng `scripts/generate-glosses.mjs` | Là tác phẩm phái sinh của CC BY-SA 4.0 nhưng trước đây Điều khoản tuyên bố sở hữu tuyệt đối | Đã sửa mục 9.2: phần dữ liệu từ vựng chia sẻ theo CC BY-SA 4.0 |
| `scripts/data/common-words.txt` | Google Web Trillion Word Corpus (`first20hours/google-10000-english`) | Chỉ dùng lúc build, không ship | Không cần ghi công trong app |
| `assets/fonts/*.woff2` — Exo 2, Orbitron | Google Fonts, **SIL OFL 1.1** | Chưa ghi công | Đã ghi công tại mục 9.3 |
| `public/audio/announcer-*.wav` (4 tệp) | Render sẵn bằng **Deepgram Aura** qua Cloudflare Workers AI (`scripts/generate-announcer.mjs`) | Chưa khai báo | Đã ghi tại mục 9.4; cần đối chiếu điều khoản thương mại của Cloudflare/Deepgram trước khi bán |
| `public/audio/game-music-*.m4a`, `rush-hour-*.m4a`, `setup-music-*.m4a` (9 tệp) | **Suno, gói trả phí (Pro, 10 USD/tháng)** — người dùng xác nhận | Có quyền thương mại **nếu** từng bài được tạo và tải về trong thời gian gói còn hiệu lực | Lưu hoá đơn gói Pro + bảng ngày tạo/ngày tải từng bài; bài tạo ở gói miễn phí **không** được thương mại hoá, và nâng cấp sau không có hiệu lực hồi tố |
| 11 tệp SFX: `points-doubler.mp3`, `countdown-go.mp3`, `skip-freebie-used.mp3`, `powerup-collected.mp3`, `time-freeze.mp3`, `correct-sound.wav`, `result.wav`, `start.wav`, `times-up.wav`, `try-again.wav`, `skip-sound.wav` | **myinstants.com** — người dùng xác nhận | **Không có giấy phép.** Trang này chỉ công bố chính sách DMCA (`dmca@myinstants.com`), nội dung do người dùng tải lên, không có điều khoản cấp quyền tái sử dụng. Tag của hai tệp còn cho thấy nguồn gốc bên thứ ba: `points-doubler.mp3` mang `TIT2: Power Up Mario` / `TALB: Nintendo Sound FX and Themes`; `countdown-go.mp3` mang dấu tải từ YouTube (`HTTP://YOUTUBE.COM/STREAMING/OTF/...`) | **Phải thay toàn bộ 11 tệp** trước khi bán, hoặc truy ngược từng clip về chủ quyền gốc và xin phép bằng văn bản |
| `public/icons/*.png`, `public/favicon.svg` | Không có metadata | Nhiều khả năng do dự án tạo | Xác nhận lại nguồn trước khi đăng lên store |

## 2. Vì sao “free” trên myinstants không dùng được cho sản phẩm bán

- Myinstants là soundboard cộng đồng: người dùng tải clip lên, phần lớn là đoạn cắt từ phim,
  game, video và nhạc. Trang **không công bố giấy phép** nào cho việc tái sử dụng; trang pháp lý
  duy nhất là chính sách DMCA, tức cơ chế gỡ nội dung khi bị khiếu nại — không phải cơ chế cấp
  quyền.
- Tải được miễn phí ≠ được dùng thương mại. Với một sản phẩm thu tiền, mỗi tệp cần một chuỗi
  quyền hợp lệ từ chủ sở hữu gốc, không phải từ nơi tải về.
- Hai tệp đang có bằng chứng rõ ràng nhất: `points-doubler.mp3` là âm thanh của Nintendo, và
  `countdown-go.mp3` là bản tải từ YouTube. Cả hai đều không thể nằm trong bản bán.

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

1. Thay 11 tệp SFX lấy từ myinstants. Danh sách cần đặt (mô tả âm thanh, độ dài, prompt Suno)
   nằm trong [danh-sach-thay-the.md](../am-thanh/danh-sach-thay-the.md). Nguồn thay thế gợi ý:
   Freesound (lọc CC0), Pixabay Audio, hoặc tự thu/mô phỏng lại bằng DAW. Ghi lại giấy phép của
   từng tệp mới ngay khi thay.
2. Lưu bộ bằng chứng Suno: hoá đơn gói Pro + bảng ngày tạo/ngày tải của 9 bài. Bài nào không
   chứng minh được là tạo trong kỳ trả phí thì thay.
3. Đối chiếu điều khoản Cloudflare Workers AI / Deepgram về việc dùng thương mại đầu ra của mô
   hình Aura; lưu ảnh chụp điều khoản tại thời điểm mở bán.
4. Vì dữ liệu từ vựng là tác phẩm phái sinh của CC BY-SA 4.0, không được tuyên bố độc quyền
   phần đó và không được ngăn người khác dùng lại theo CC BY-SA. Mã nguồn và giao diện thì không
   bị ràng buộc bởi giấy phép này.
5. Kiểm tra lại ngay trước khi đóng gói APK: bản build không được chứa tệp nào chưa có dòng
   tương ứng trong bảng nguồn.
