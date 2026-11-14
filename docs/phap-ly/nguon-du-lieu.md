# Rà soát nguồn và giấy phép nội dung đóng gói trong WordCrew

Ngày rà soát: 15/11/2026. Phạm vi: mọi tài nguyên không phải mã nguồn được đóng gói vào bản
build — danh sách từ, bản dịch nghĩa, phông chữ, âm thanh, hình ảnh.

Mục đích: đây là điều kiện của P2 (trước khi scale và trước khi mở bán). Kết luận ngắn: **ba
danh sách từ chưa từng được ghi công, và hai tệp âm thanh có dấu hiệu vi phạm bản quyền — phải
xử lý trước khi thu tiền.**

## 1. Bảng tổng hợp

| Tài nguyên | Nguồn / giấy phép | Trạng thái | Việc phải làm |
| --- | --- | --- | --- |
| `scripts/data/ngsl.txt`, `nawl.txt`, `tsl.txt`, `bsl.txt` | NGSL Project 1.2, **CC BY-SA 4.0**, header ghi “Free to use with attribution” | Thiếu ghi công hoàn toàn | Đã ghi công tại mục 9.2 Điều khoản sử dụng |
| `vietnameseGlosses.generated.ts` (bản đồ nghĩa tiếng Việt, **có ship trong bundle**) | Sinh từ 4 danh sách trên bằng `scripts/generate-glosses.mjs` | Là tác phẩm phái sinh của CC BY-SA 4.0 nhưng trước đây Điều khoản tuyên bố sở hữu tuyệt đối | Đã sửa mục 9.2: phần dữ liệu từ vựng chia sẻ theo CC BY-SA 4.0 |
| `scripts/data/common-words.txt` | Google Web Trillion Word Corpus (`first20hours/google-10000-english`) | Chỉ dùng lúc build, không ship | Không cần ghi công trong app |
| `assets/fonts/*.woff2` — Exo 2, Orbitron | Google Fonts, **SIL OFL 1.1** | Chưa ghi công | Đã ghi công tại mục 9.3 |
| `public/audio/announcer-*.wav` (4 tệp) | Render sẵn bằng **Deepgram Aura** qua Cloudflare Workers AI (`scripts/generate-announcer.mjs`) | Chưa khai báo | Đã ghi tại mục 9.4; cần đối chiếu điều khoản thương mại của Cloudflare/Deepgram trước khi bán |
| `public/audio/game-music-*.m4a`, `rush-hour-*.m4a`, `setup-music-*.m4a` (9 tệp) | **Không có metadata, không có ghi chép nguồn trong repo** | **Chưa xác định được quyền** | Phải xác nhận nguồn (mua bản quyền / tự sản xuất / AI sinh) và lưu bằng chứng, hoặc thay bằng nhạc có giấy phép rõ ràng |
| `public/audio/points-doubler.mp3` | Thẻ ID3 ghi `TIT2: Power Up Mario`, `TALB: Nintendo Sound FX and Themes`, `TPE2: Various Artists` | **Rủi ro cao — âm thanh của Nintendo** | Thay ngay bằng SFX tự tạo hoặc có giấy phép |
| `public/audio/countdown-go.mp3` | Thẻ ID3 có `TXXX: HTTP://YOUTUBE.COM/STREAMING/OTF/DURATIONS/112015`, encoder `Lavf57.83.100` | **Rủi ro cao — dấu hiệu tải từ YouTube** | Thay ngay; không dùng bản tải từ YouTube cho sản phẩm bán |
| `public/audio/skip-freebie-used.mp3` | `TXXX Software: FL Studio 12` | Chưa rõ nguồn sample | Xác nhận tự sản xuất, nếu không thì thay |
| Các SFX còn lại (`correct-sound.wav`, `result.wav`, `start.wav`, `times-up.wav`, `try-again.wav`, `skip-sound.wav`, `powerup-collected.mp3`, `time-freeze.mp3`) | Không có metadata | Chưa xác định được quyền | Cùng xử lý như nhạc nền |
| `public/icons/*.png`, `public/favicon.svg` | Không có metadata | Nhiều khả năng do dự án tạo | Xác nhận lại nguồn trước khi đăng lên store |

## 2. Điều đã sửa trong đợt này

- `public/phap-ly/dieu-khoan-su-dung.html` mục 9: đổi từ “Quyền sở hữu trí tuệ của WordCrew”
  thành “Quyền sở hữu trí tuệ và nội dung của bên thứ ba”, thêm ghi công NGSL/NAWL/TSL/BSL
  (CC BY-SA 4.0), phông chữ (OFL 1.1) và giọng đọc (Deepgram Aura), kèm quy trình xử lý khiếu nại.

## 3. Việc còn lại phải làm trước khi mở bán

1. Thay `points-doubler.mp3` và `countdown-go.mp3`. Đây là hai tệp duy nhất có bằng chứng rõ
   ràng về nguồn gốc không hợp lệ.
2. Lập bảng nguồn cho 9 tệp nhạc nền + các SFX còn lại: mỗi tệp một dòng (tên, tác giả, giấy
   phép, nơi mua/ngày tạo, đường dẫn hoá đơn hoặc prompt AI). Nếu một tệp không chứng minh được
   nguồn, thay bằng tệp khác — rẻ hơn nhiều so với một khiếu nại bản quyền.
3. Đối chiếu điều khoản Cloudflare Workers AI / Deepgram về việc dùng thương mại đầu ra của mô
   hình Aura; lưu ảnh chụp điều khoản tại thời điểm mở bán.
4. Vì dữ liệu từ vựng là tác phẩm phái sinh của CC BY-SA 4.0, không được tuyên bố độc quyền
   phần đó và không được ngăn người khác dùng lại theo CC BY-SA. Mã nguồn và giao diện thì không
   bị ràng buộc bởi giấy phép này.
5. Kiểm tra lại ngay trước khi đóng gói APK: bản build không được chứa tệp nào chưa có dòng
   tương ứng trong bảng nguồn.
