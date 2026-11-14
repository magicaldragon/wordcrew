# Thay SFX và nhạc nền — danh sách cần đặt + prompt Suno

Đi kèm [nguồn dữ liệu](../phap-ly/nguon-du-lieu.md). Mục tiêu: thay 11 tệp SFX lấy từ
myinstants.com (11 tệp này không có giấy phép) và làm lại 9 tệp nhạc nền bằng Suno gói trả phí.

## Trạng thái 15/11/2026

- Đã thay **9/9 tệp nhạc nền** bằng bản Suno mới, chuyển từ `.m4a` sang `.mp3`.
- Đã thay **4/11 tệp SFX**: `countdown-go`, `result`, `start`, `times-up` (đổi từ `.wav` sang
  `.mp3`); `constants.ts` đã cập nhật đuôi tệp tương ứng.
- **Còn 7 tệp SFX** vẫn là bản myinstants: `correct-sound.wav`, `skip-sound.wav`,
  `try-again.wav`, `powerup-collected.mp3`, `time-freeze.mp3`, `skip-freebie-used.mp3`,
  `points-doubler.mp3`. Bản build hiện tại vẫn chưa sạch về mặt giấy phép.
- Bốn tệp SFX mới đều **dài hơn mục tiêu** (xem bảng dưới): `times-up` 7,3 s và `countdown-go`
  6,2 s sẽ đè lên tiếng của từ kế tiếp — nên cắt lại trước khi phát hành.

## 0. Quy tắc chung để không phải sửa code

- **Giữ nguyên tên tệp.** Nếu đổi đuôi tệp thì phải sửa cả `constants.ts` — lần thay này đã đổi
  4 SFX và 9 bài nhạc sang `.mp3` nên `constants.ts` đã được cập nhật theo.
- SFX: mono, 44.1 kHz, 16-bit, đỉnh ≤ −3 dBFS, fade 5 ms ở cả hai đầu để không bị “click”.
  Không để khoảng lặng ở đầu tệp — âm thanh phải vào ngay khi bấm.
- Nhạc nền: stereo, MP3/AAC 128–192 kbps, loop liền mạch theo ô nhịp, **không** fade in/out ở hai
  đầu, loudness khoảng −16 LUFS. Nhạc nền phát ở 50% âm lượng mặc định nên đừng mix quá to; giữ
  dải trung thấp gọn để không lấn giọng announcer.
- Tổng 9 bài nhạc hiện ~27,3 MB (bản cũ 13,7 MB). Nếu APK quá nặng, cắt `rush-hour-3` (3:33) và
  `rush-hour-1` (2:17) xuống 30–60 giây là tiết kiệm được ~7 MB.
- **Cache:** đã đổi `cacheName` trong `vite.config.ts` thành `wordcrew-audio-v2` để máy đã cài
  PWA buộc tải lại tệp mới. Lần thay tệp sau này phải tăng tiếp lên `v3`.

## 1. 11 SFX cần thay

“Cũ” là độ dài tệp trước khi thay, “Thực tế” là độ dài đo lại sau khi thay (đo từ header).

| # | Tệp | Phát khi nào | Âm thanh cần đạt | Cũ | Mục tiêu | Thực tế |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `correct-sound.wav` | Người chơi đoán đúng một từ | Chuông 2 nốt đi lên (ví dụ C5→G5), tươi nhưng không chói, đuôi ngắn. Không dùng âm thanh nhận diện được từ game khác | 2,4 s | 0,35–0,6 s | **chưa thay** |
| 2 | `skip-sound.wav` | Bỏ qua một từ | Tiếng “whoosh” mảnh, trung tính, không mang cảm giác thất bại (bỏ qua là chiến thuật, không phải lỗi) | 0,55 s | 0,3–0,5 s | **chưa thay** |
| 3 | `times-up.mp3` | Hết giờ của một từ | Buzz/horn trầm, hụt hẫng, ngắn dứt khoát. Tránh tiếng buzzer quen thuộc của game truyền hình | 3,0 s | 0,8–1,2 s | 7,3 s — quá dài |
| 4 | `result.mp3` | Màn kết thúc ván | Fanfare 4–6 nốt, vui nhưng gọn, không phô trương kiểu “Mario” | 3,5 s | 1,5–2,5 s | 5,0 s — hơi dài |
| 5 | `start.mp3` | Bấm “Start Game” | Riser ngắn + một cú hit, cảm giác “vào trận” | 3,6 s | 1,0–1,5 s | 2,7 s |
| 6 | `try-again.wav` | Bấm “Play Again” ở màn kết quả | Pop/click mềm + đuôi ngắn, nhẹ hơn `start.mp3` | 1,4 s | 0,6–1,0 s | **chưa thay** |
| 7 | `countdown-go.mp3` | Tiếng “GO!” sau khi đếm ngược xong | Một tiếng hiệu lệnh duy nhất (còi/whistle/horn), **không lời**, không phải bài nhạc | 11,8 s | 0,8–1,2 s | 6,2 s — quá dài |
| 8 | `powerup-collected.mp3` | Nhặt power-up | Arpeggio 3–4 nốt ánh kim, “sparkle”, rất ngắn | 1,0 s | 0,5–0,8 s | **chưa thay** |
| 9 | `time-freeze.mp3` | Kích hoạt đóng băng thời gian | Swoosh đi xuống + shimmer băng, cảm giác thời gian khựng lại | 3,9 s | 1,0–1,5 s | **chưa thay** |
| 10 | `skip-freebie-used.mp3` | Dùng lượt bỏ qua miễn phí | Click + swoosh mảnh, nhẹ hơn `skip-sound.wav` để không trùng vai | 1,0 s | 0,4–0,7 s | **chưa thay** |
| 11 | `points-doubler.mp3` | Rush Hour bắt đầu (x2 điểm) | Còi báo động ngắn + hit, khẩn trương nhưng không hoảng; đây là tín hiệu “luật đổi”, không phải tiếng nhặt đồng xu | 1,3 s | 0,8–1,2 s | **chưa thay** |


Từ khoá tìm trên Freesound (lọc **CC0**) hoặc Pixabay Audio: `correct answer chime`,
`short whoosh`, `buzzer fail`, `short victory jingle`, `riser impact`, `ui button pop`,
`referee whistle`, `coin pickup`, `freeze whoosh`, `ui click swoosh`, `alarm hit`.

Ba vai dễ bị trùng âm sắc, cần nghe cạnh nhau trước khi chốt: `skip-sound` /
`skip-freebie-used` / `powerup-collected` — phải phân biệt được bằng tai mà không cần nhìn màn hình.

## 2. Nhạc nền: 3 nhóm, 3 biến thể mỗi nhóm

| Nhóm | Tệp | Vai trò | Hướng âm nhạc | Độ dài mục tiêu | Đã làm |
| --- | --- | --- | --- | --- | --- |
| Màn thiết lập | `setup-music-1..3.mp3` | Phát ở màn chọn chế độ, chờ vào trận | Nhẹ, không lời, ít giai điệu gây mỏi vì lặp lâu, BPM 90–100 | 60–120 s | 1:38 · 2:02 · 2:11 |
| Trong ván | `game-music-1..3.mp3` | Phát suốt ván Normal/Hell/Team | Năng lượng cao nhưng không lấn giọng đọc từ, BPM 110–125 | 90–150 s | 2:52 · 1:33 · 2:15 |
| Rush Hour | `rush-hour-1..3.mp3` | Phát đè khi Rush Hour bật | Căng, tối, nhiều nhịp, gần như không giai điệu, BPM 130–145 | 30–60 s | 2:17 · 2:26 · 3:33 |

Mỗi nhóm chọn ngẫu nhiên một bài mỗi ván, nên ba biến thể phải cùng “họ” âm thanh — đổi bài
không được làm người chơi tưởng đang chơi app khác.

## 3. Prompt Suno cho 9 bài nhạc nền

Cách dùng: Suno → **Instrumental bật** → dán khối “Style” vào ô style, để trống phần lyrics →
tạo 2–4 lần, chọn bản sạch nhất → tải WAV → cắt loop trong Audacity/Reaper → xuất `.m4a`.
Suno không bảo đảm loop hoàn hảo, nên hãy yêu cầu cấu trúc 8 ô và tự cắt tại điểm nối.

### setup-music-1 — “Bàn giấy buổi sáng”

```text
Style: mellow lo-fi hip hop with soft marimba, warm Rhodes piano, brushed drums,
upright bass, vinyl crackle at very low level; calm classroom morning mood;
instrumental only; 92 BPM; C major
Structure: 8-bar intro that states the marimba motif, then a 16-bar section that
repeats the motif with small variations; no build-up, no drop, ends on the same
8-bar phrase it started with so it can loop
Mix: warm and mid-forward, gentle high shelf, no sub-bass boom, no lead vocal hook
Avoid: vocals, rap, choir, orchestral swells, dramatic transitions, loud cymbals
```

### setup-music-2 — “Phòng học tương lai, bản nhẹ”

```text
Style: light future-funk, clean electric piano chords, plucked synth arpeggio,
soft funk drums, round synth bass; optimistic but understated; instrumental only;
98 BPM; F major
Structure: repeating 16-bar groove, arpeggio as the only melodic anchor, variation
by muting layers in and out; loop-friendly, no intro riser
Mix: tight low end, clear but soft hats, leave 2–5 kHz room for a voice-over
Avoid: vocals, talkbox, brass stabs, aggressive sidechain pumping, key change
```

### setup-music-3 — “Góc thư viện”

```text
Style: acoustic chill, nylon guitar fingerpicking, kalimba, soft shaker, upright
bass, subtle room reverb; quiet and patient; instrumental only; 88 BPM; G major
Structure: 8-bar fingerpicking loop plus a second 8-bar variation, back to back;
no bridge, no solo; ends without a cadence so it loops cleanly
Mix: natural and dry-ish, gentle compression, no low-mid mud
Avoid: vocals, humming, strings crescendo, drum fills, reverb wash
```

### game-music-1 — “Ván chơi, bản synth-pop”

```text
Style: upbeat synth-pop instrumental, pulsing octave bass, bright plucks, four-on-
the-floor kick with offbeat hats, short chord stabs; energetic classroom game feel,
confident not frantic; instrumental only; 118 BPM; A minor
Structure: 8-bar loop with a two-bar drum break every 32 bars for breathing room;
keep the same chord cycle throughout; no long intro, no outro
Mix: punchy kick, controlled highs so speech still cuts through, mono-compatible bass
Avoid: vocals, big supersaw leads, dubstep drops, tempo changes, crowd noise
```

### game-music-2 — “Ván chơi, bản breakbeat vui”

```text
Style: playful electronic breakbeat, chopped amen-style drums at moderate density,
rubbery bass, marimba and woodblock accents, tiny vocal-free “hey!” stabs made from
synth; bouncy and competitive; instrumental only; 122 BPM; D minor
Structure: 16-bar groove built from a 2-bar drum pattern, layer additions every 8 bars,
then strip back; loop point at bar 16
Mix: drums forward, bass rounded, leave the 1–3 kHz band fairly open
Avoid: real vocal samples, scratching, distorted guitars, long snare rolls
```

### game-music-3 — “Ván chơi, bản indie-electronic”

```text
Style: energetic indie-electronic, driving bass line, tambourine and claps, muted
guitar chops used as percussion, simple two-chord organ pad; team-game energy;
instrumental only; 115 BPM; E minor
Structure: repeating 16-bar section, organ pad as the glue, guitar chops entering
on the second pass; loopable, no intro, no final chord
Mix: warm mid-range, controlled cymbal brightness, avoid mud around 200 Hz
Avoid: vocals, guitar solos, anthemic choruses, reverb tails longer than 1.5 s
```

### rush-hour-1 — “Rush Hour, bản drum & bass nhẹ”

```text
Style: stripped-back drum and bass, fast breakbeat, rolling sub bass, single
repeating synth stab, no melody; tense and driving; instrumental only; 138 BPM;
F minor
Structure: 8-bar loop only — one drum pattern, one bass figure, one stab; filter
opens slightly every 4 bars; no breakdown
Mix: sub bass mono, snare crisp but not harsh, minimal reverb
Avoid: vocals, MC chatter, ragga samples, big build-ups, half-time sections
```

### rush-hour-2 — “Rush Hour, bản ostinato điện tử”

```text
Style: dark minimal electronic, hypnotic 16th-note ostinato, tight mechanical drums,
distorted low synth pulse; clock-ticking tension; instrumental only; 132 BPM; C minor
Structure: single 8-bar ostinato that repeats with timbral changes only; no chord
progression, no drop; loop end aligns with the start of the ostinato
Mix: dry, close, mono-compatible, almost no reverb; leave the top end clear
Avoid: vocals, orchestral hits, alarms, siren sounds (they clash with the SFX),
long white-noise sweeps
```

### rush-hour-3 — “Rush Hour, bản rock-điện tử lai”

```text
Style: driving electronic rock hybrid, palm-muted power-chord riff on a clean amp,
four-on-the-floor kick, clap on 2 and 4, fuzzy bass; urgent chase feel; instrumental
only; 142 BPM; E minor
Structure: 8-bar riff loop, alternating guitar and synth doubling each pass;
no solo, no bridge; hard stop avoided so the loop stays seamless
Mix: guitars panned wide but not loud, bass centred, hats soft
Avoid: vocals, guitar solo, double-kick metal, cymbal crashes on every bar
```

## 4. Nếu vẫn muốn dùng Suno cho SFX

Suno là mô hình làm **nhạc**, không phải mô hình hiệu ứng âm thanh: nó khó ra được tiếng “click”
0,4 giây sạch, và mỗi lần tạo tốn credit. Vì vậy:

- 6 tệp cơ học (`skip-sound`, `skip-freebie-used`, `powerup-collected`, `correct-sound`,
  `time-freeze`, `try-again`): lấy từ **Freesound lọc CC0** hoặc tự làm trong DAW. Nhanh hơn,
  đúng ý hơn, và không tốn credit.
- 4 tệp có thể coi là “đoạn nhạc ngắn” (`result`, `start`, `times-up`, `countdown-go`): Suno làm
  được nếu bạn tạo 10–15 giây rồi cắt lấy 1–2 giây đắt nhất. Prompt gợi ý:

```text
# result.wav — fanfare kết ván
Style: short bright victory fanfare for a classroom word game, brass and marimba,
four ascending notes then a clean final hit, no drums after the hit; instrumental;
~130 BPM; ends on a single sustained chord; 10 seconds total
Avoid: orchestral epic, choir, cymbal wash, melody resembling existing game themes

# start.wav — vào trận
Style: 3-second riser into a single impact, filtered noise sweep plus low synth hit,
confident sports-intro feel; instrumental; ends exactly on the impact, no tail
Avoid: vocals, long reverb, dubstep growl

# times-up.wav — hết giờ
Style: short descending buzzer, two low square-wave notes with a dry stop, mildly
disappointed not aggressive; instrumental; under 1.5 seconds; no melody
Avoid: game-show buzzer, siren, applause

# countdown-go.mp3 — hiệu lệnh “GO”
Style: single referee whistle blast with a short room tail, no voice, no music
underneath; bright and clean; under 1.2 seconds
Avoid: speech, stadium crowd, echo beyond 0.4 s
```

Sau khi cắt, luôn chuẩn hoá đỉnh về −3 dBFS và thêm fade 5 ms hai đầu.

## 5. Checklist sau khi có tệp mới

1. Đặt tệp đúng tên trong bảng; nếu đổi đuôi tệp thì sửa `constants.ts` theo.
2. Nghe thử một ván Normal và một ván Hell: ba tiếng `skip-sound` / `skip-freebie-used` /
   `powerup-collected` phải phân biệt được; `countdown-go` phải khớp lúc chữ “GO” hiện ra.
3. Đã đổi `cacheName` sang `wordcrew-audio-v2` (15/11/2026). Lần thay sau tăng lên `v3`.
4. `npm run build`, kiểm tra `dist/audio/` không còn tệp cũ.
5. Cập nhật bảng nguồn trong [nguon-du-lieu.md](../phap-ly/nguon-du-lieu.md): mỗi tệp mới một
   dòng (nguồn, giấy phép, ngày tải, hoặc ID bài Suno + ngày tạo).
