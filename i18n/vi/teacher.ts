import type { Dictionary } from '../types';

/**
 * Vietnamese copy for Teacher Mode. Mirrors `en/teacher.ts` key for key — the
 * `Dictionary` type makes a missing or mistyped entry a compile error.
 */
export const teacher: Dictionary['teacher'] = {
  dashboard: 'Bảng điều khiển',

  setup: {
    subtitle: 'Mỗi bài một trình độ, số từ cố định, cuối bài có báo cáo — không tính mạng, không tính điểm.',
    sourceAria: 'Nguồn từ cho bài kiểm tra',

    tabs: {
      level: 'Kiểm tra trình độ',
      decks: 'Bộ từ của tôi',
      decksCount: (count: number) => `Bộ từ của tôi (${count})`,
    },

    levelAria: 'Trình độ',
    levelTaglines: {
      A1: 'Movers — từ thường ngày, nhỉnh hơn danh sách đầu tiên một bước.',
      A2: 'Flyers + A2 Key — gộp cả hai bộ A2.',
      B1: 'B1 Preliminary — từ trừu tượng, có cả cụm động từ.',
      B2: 'B2 / Pre-IELTS — nhóm từ cao nhất trong kho.',
    },

    wordsInTest: 'Số từ trong bài',
    wordsInTestRange: (min: number, max: number) => `Nhập số từ ${min} đến ${max}.`,
    startTest: (level: string, count: number) => `Bắt đầu bài ${level} · ${count} từ`,
    levelLocked: (level: string) =>
      `Giới hạn trình độ: mọi từ trong bài đều thuộc ${level}. Học sinh gõ từ tiếng Anh cho gợi ý tiếng Việt.`,

    savedOnDevice: 'Đã lưu trên thiết bị này',
    newDeck: 'Bộ từ mới',
    noDecksTitle: 'Chưa có bộ từ nào',
    noDecksBody:
      'Dán danh sách từ của tuần này — mỗi dòng một từ. Nghĩa được điền tự động và bạn xem lại trước khi cả lớp thấy bài kiểm tra.',
    buildFirstDeck: 'Tạo bộ từ đầu tiên',
    guestNote:
      'Bạn có thể soạn và chạy thử bộ từ mà không cần tài khoản. Chỉ khi lưu mới cần đăng nhập — khách đóng tab là mất bộ từ.',

    deckMeta: (count: number, date: string) => `${count} từ · sửa ${date}`,
    editDeckAria: (name: string) => `Sửa ${name}`,
    deleteDeckAria: (name: string) => `Xóa ${name}`,
    testDeck: 'Học bộ từ này',

    savedToast: 'Đã lưu bộ từ trên thiết bị này.',
    deletedToast: 'Đã xóa bộ từ.',
    deleteAsk: (name: string, count: number) => `Xóa “${name}” và ${count} từ của bộ này?`,
  },

  editor: {
    nameLabel: 'Tên bộ từ',
    namePlaceholder: 'VD: Unit 4 — Travel',
    closeAria: 'Đóng trình soạn bộ từ',

    pasteTitle: 'Dán danh sách — mỗi dòng một từ',
    pasteHelpOr: 'hoặc',
    pasteHelpTail: '. Nghĩa bạn để trống sẽ được điền từ từ điển có sẵn.',
    pasteAria: 'Các từ cần thêm, mỗi dòng một từ',
    wordCount: (count: number, max: number) => `${count}/${max} từ`,
    detectedWords: (count: number) => `${count} từ sẵn sàng thêm`,
    addToDeck: 'Thêm vào bộ từ',
    previewTitle: 'Trong bộ từ',
    previewHint: 'Chạm vào một từ để xem lại & sửa',

    wordLabel: 'Từ',
    posLabel: 'Từ loại',
    meaningLabel: 'Nghĩa (học sinh nhìn thấy)',
    removeLabel: 'Xoá',
    openReview: (count: number) => `Xem lại & lưu · ${count} từ`,
    reviewDialogTitle: 'Xem lại bộ từ',
    reviewBack: 'Quay lại danh sách',
    warningsLeft: (count: number) => `${count} từ còn thiếu nghĩa`,
    wordAria: (index: number) => `Từ ${index}`,
    posAria: (word: string) => `Từ loại của ${word}`,
    meaningAria: (word: string) => `Nghĩa tiếng Việt của ${word}`,
    meaningPlaceholder: 'Nghĩa tiếng Việt',
    removeAria: (word: string) => `Xóa ${word}`,
    warningMissing: 'Thiếu nghĩa',
    warningDuplicate: 'Một từ khác có cùng nghĩa — câu hỏi có thể gây nhầm lẫn.',

    saveDeck: 'Lưu bộ từ',
    untitled: 'Bộ từ chưa đặt tên',

    noWordsInList: 'Không tìm thấy từ nào trong danh sách.',
    deckFull: (max: number) => `Mỗi bộ từ chỉ chứa tối đa ${max} từ.`,
    alreadyInDeck: 'Những từ này đã có trong bộ từ.',
    wordsAdded: (count: number) => `Đã thêm ${count} từ.`,
    wordsAddedMissing: (count: number, missing: number) =>
      `Đã thêm ${count} từ · ${missing} từ còn thiếu nghĩa.`,
    addAtLeastOne: 'Hãy thêm ít nhất một từ trước.',
    everyWordNeedsMeaning: 'Từ nào cũng cần có nghĩa — sửa các dòng báo đỏ.',
  },

  review: {
    exitAria: 'Quay lại danh sách bộ từ',
    progress: (current: number, total: number) => `Thẻ ${current}/${total}`,
    shuffleAria: 'Xáo trộn các thẻ',
    showWord: 'Xem từ',
    showMeaning: 'Xem nghĩa',
    tapToFlip: 'Chạm vào thẻ để xem nghĩa',
    tapToHide: 'Chạm vào thẻ để quay lại',
    noPos: 'từ',
    previous: 'Trước',
    next: 'Sau',
    startTest: (count: number) => `Bắt đầu bài kiểm tra · ${count} từ`,
  },

  test: {
    leaveAsk: 'Thoát bài kiểm tra? Các câu đã làm sẽ không được lưu.',
    leaveLabel: 'Thoát',
    leaveAria: 'Thoát bài kiểm tra',
    direction: 'Việt → Anh',
    answerPlaceholder: 'Nhập từ tiếng Anh',
    answerAria: 'Câu trả lời của bạn',
    check: 'Kiểm tra',
    finish: 'Kết thúc & xem báo cáo',
    correct: '✅ Đúng rồi',
    incorrect: '❌ Chưa đúng',
    youWrote: (guess: string) => `Bạn đã viết “${guess}”`,
    reveal: 'Không biết — xem đáp án',
  },

  report: {
    score: (correct: number, total: number) => `${correct} / ${total} câu đúng`,
    toRevisit: (missed: number) => `· ${missed} cần ôn lại`,
    wrote: (guess: string) => `Đã viết “${guess}”`,
    noAnswer: 'Không trả lời',
    retryMissed: (missed: number) => `Làm lại ${missed} câu sai`,
    testAgain: 'Kiểm tra lại',
  },
};
