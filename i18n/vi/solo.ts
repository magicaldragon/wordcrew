import type { Dictionary } from '../types';

/**
 * Vietnamese copy for Solo. Mirrors `en/solo.ts` key for key — the `Dictionary` type
 * makes a missing or mistyped entry a compile error.
 */
export const solo: Dictionary['solo'] = {
  signInReason: 'Đăng nhập để lưu điểm Solo và tham gia bảng xếp hạng.',
  youSuffix: ' (bạn)',
  badges: {
    Regular: 'Đều đặn',
    Committed: 'Quyết tâm',
    Unstoppable: 'Không ngừng',
    Legend: 'Huyền thoại',
    Icon: 'Biểu tượng',
  },

  game: {
    score: 'Điểm',
    streak: (count: number) => `🔥 ${count} liên tiếp`,
    wordNumber: (count: number) => `Từ ${count}`,
    styleDescribe: '🎧 Nghe & đoán',
    styleMeaning: '🇻🇳 Nghĩa & đánh vần',
    clock: (seconds: number) => `${seconds} giây`,
    heartsAria: (left: number, total: number) => `Còn ${left}/${total} tim`,
    letters: (count: number) => `${count} chữ cái`,
    levelUp: (level: string) => `⬆️ Lên trình — ${level}`,

    hearClue: 'Nghe gợi ý',
    hint: '💡 Gợi ý',
    meaning: '🇻🇳 Nghĩa',
    loadingClue: 'Đang tải gợi ý…',
    noClue: '🤔 Chưa có gợi ý — cứ tin vào các chữ cái',
    noTranslation: '🤔 Chưa có bản dịch — cứ tin vào các chữ cái',
    answer: (word: string) => `Đáp án: ${word}`,

    placeholderChecking: 'Đang kiểm tra…',
    placeholderListening: 'Đang nghe…',
    placeholderType: 'Nhập từ…',
    inputAria: 'Câu trả lời của bạn',
    micStopTitle: 'Đang nghe — chạm để dừng',
    micStartTitle: 'Trả lời bằng giọng nói',
    micNeedsBrowserTitle: 'Giọng nói cần Chrome, Edge hoặc Safari',
    micStopAria: 'Dừng nghe',
    micStartAria: 'Trả lời bằng giọng nói',
    auto: 'Tự động',
    autoOnTitle: 'Đang rảnh tay — chạm để tắt',
    autoOffTitle: 'Rảnh tay: mic tự mở ở mỗi từ, không cần chạm',
    check: 'Kiểm tra',

    retryMask: (mask: string) => `Thử lại: ${mask}`,
    insecureHint: '🎤 Giọng nói cần trang bảo mật (https://) — hãy nhập từ thay thế.',
    unsupportedHint:
      '🎤 Trình duyệt trên thiết bị này không hỗ trợ giọng nói — hãy nhập từ thay thế.',
    checkingHeard: 'Đang kiểm tra những gì đã nghe…',
    listening: 'Đang nghe…',
    handsFreeOn: 'Đang rảnh tay — mic tự mở ở mỗi từ',
    inputHelp: 'Enter để kiểm tra · 🎤 để nói · Tự động để rảnh tay',

    wrongTryAgain: 'Chưa đúng — thử lại nhé.',
    wrongSpelling: 'Chưa đúng — xem lại chính tả.',
    heardWrong: (heard: string) => `Nghe thành “${heard}” — thử lại nhé.`,

    quit: 'Thoát',
    skipCostsHeart: 'Bỏ qua từ → (−1 ❤️)',
    skipFree: (count: number) => `Bỏ qua từ → (${count} lượt miễn phí)`,

    pausedAria: 'Ván đang tạm dừng',
    paused: 'Tạm dừng',
    pausedBody: 'Đồng hồ đã dừng khi bạn rời màn hình.',
    resume: '▶️ Tiếp tục',
    quitAria: 'Xác nhận thoát ván',
    quitTitle: 'Thoát ván này?',
    quitLost: (score: string) => `Điểm ${score} của bạn sẽ bị mất.`,
    keepPlaying: 'Chơi tiếp',
    quitRun: 'Thoát ván',

    speech: {
      micBlocked: 'Quyền truy cập micrô bị chặn — hãy cho phép hoặc nhập từ.',
      recogniserUnreachable: 'Không kết nối được bộ nhận dạng — thử lại hoặc nhập câu trả lời.',
      voiceResting: 'Trả lời bằng giọng nói tạm nghỉ — hãy nhập câu trả lời.',
      notCaught: 'Không nghe rõ — thử lại nhé.',
      micStartFailed: 'Không khởi động được micrô.',
      network: 'Mạng chập chờn — thử lại hoặc nhập câu trả lời.',
      unresponsive: 'Giọng nói không phản hồi trên thiết bị này — hãy nhập từ.',
    },
  },

  results: {
    titleDaily: 'Hoàn thành thử thách 🌅',
    title: 'Kết thúc ván 🎯',
    reached: (level: string) => `đạt ${level}`,
    finalScore: 'Điểm cuối',
    newBest: '⭐ Kỷ lục cá nhân mới!',
    streak: (days: number) => `🔥 Chuỗi ${days} ngày — chơi mai để giữ chuỗi`,
    badgeUnlocked: (emoji: string, label: string) => `🎉 Đã mở huy hiệu ${emoji} ${label}`,
    badgeBest: (emoji: string, label: string, days: number) =>
      `${emoji} ${label} · tốt nhất ${days} ngày`,
    freezeUsed: (left: number) => `❄️ Đã dùng lượt băng — còn ${left} lượt tháng này`,

    wordsGuessed: 'Từ đã đoán',
    bestStreak: 'Chuỗi dài nhất',
    accuracy: 'Độ chính xác',

    reviewTitle: '📌 Từ cần ôn',
    reviewBody: 'Đã ghim trên thiết bị này — chúng quay lại ở các ván sau cho đến khi bạn nhớ.',

    trackBoard: (name: string) => `🏆 Bảng ${name}`,
    periodDaily: 'Chỉ hôm nay — mai sẽ có bảng mới.',
    periodMonth: 'Tháng này — bảng mới vào ngày 1.',
    signInPrompt: 'Đăng nhập để lưu điểm và đua với người chơi khác.',
    noScores: 'Chưa có điểm — bạn đang dẫn đầu!',
    unavailable: 'Bảng xếp hạng tạm thời không khả dụng.',
    rankDay: (rank: number, total: number) => `Bạn đứng #${rank}/${total} trong ngày này.`,
    rankMonth: (rank: number, total: number) => `Bạn đứng #${rank}/${total} tháng này.`,

    home: 'Trang chủ',
    playAgain: '▶ Chơi lại',
  },

  board: {
    title: 'Bảng xếp hạng Solo',
    subtitle: 'Mỗi bảng giữ điểm riêng, để mỗi ván được so với cùng một bộ từ.',
    chooseBoardAria: 'Chọn bảng',
    chooseDayAria: 'Chọn ngày',
    archive: 'Lưu trữ theo ngày',
    today: 'Hôm nay',
    yesterday: 'Hôm qua',

    signInPrompt:
      'Đăng nhập để đăng điểm và đua với người chơi khác. Điểm tốt nhất trên thiết bị vẫn được giữ.',
    unavailable: 'Bảng xếp hạng tạm thời không khả dụng.',
    noScoresDay: 'Ngày đó chưa có điểm.',
    noScores: 'Chưa có điểm — bạn đang dẫn đầu!',
    rankToday: (rank: number, total: number) => `Bạn đứng #${rank}/${total} hôm nay.`,
    rankThatDay: (rank: number, total: number) => `Bạn đứng #${rank}/${total} ngày đó.`,
    rankMonth: (rank: number, total: number) => `Bạn đứng #${rank}/${total} tháng này.`,

    todayOnly: 'Chỉ hôm nay — đặt lại lúc nửa đêm. Các ngày trước vẫn trong lưu trữ.',
    archived: (date: string) => `Bảng lưu trữ · ${date}`,
    thisMonth: 'Tháng này — đặt lại vào ngày 1.',
    yourBest: 'Điểm tốt nhất của bạn',
    words: (count: number) => `${count} từ`,
    boardOf: (name: string) => `Bảng ${name}`,
    trackLocked: 'Bảng này thuộc bản đầy đủ — mở khóa để đăng điểm.',
  },
};
