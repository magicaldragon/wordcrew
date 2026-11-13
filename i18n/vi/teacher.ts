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
    levelLocked: (level: string) => `Giới hạn trình độ: mọi từ trong bài đều thuộc ${level}.`,

    modeTitle: 'Cách hỏi mỗi từ',
    modeHint: 'Cùng một danh sách từ, hỏi theo ba cách. Chọn một cách cho lượt này.',
    modes: {
      listen: {
        label: 'Nghe & viết',
        hint: 'Nghe phát âm rồi viết lại từ tiếng Anh.',
      },
      choice: {
        label: 'Từ → nghĩa',
        hint: 'Nhìn từ tiếng Anh, chọn nghĩa tiếng Việt đúng.',
      },
      letters: {
        label: 'Nghĩa → ô chữ',
        hint: 'Cho nghĩa, chữ cái đầu và số ô — điền nốt từ.',
      },
    },

    savedOnDevice: 'Đã lưu trên thiết bị này',
    newDeck: 'Bộ từ mới',
    noDecksTitle: 'Chưa có bộ từ nào',
    noDecksBody:
      'Dán danh sách từ của tuần này — mỗi dòng một từ. Nghĩa được điền tự động và bạn xem lại trước khi cả lớp thấy bài kiểm tra.',
    buildFirstDeck: 'Tạo bộ từ đầu tiên',
    guestNote:
      'Bạn có thể soạn và chạy thử bộ từ mà không cần tài khoản. Chỉ khi lưu mới cần đăng nhập — khách đóng tab là mất bộ từ.',

    deckMeta: (count: number, date: string) => `${count} từ · sửa ${date}`,
    draftBadge: 'Nháp',
    editDeckAria: (name: string) => `Sửa ${name}`,
    deleteDeckAria: (name: string) => `Xóa ${name}`,
    testDeck: 'Học bộ từ này',

    savedToast: 'Đã lưu bộ từ trên thiết bị này.',
    deletedToast: 'Đã xóa bộ từ.',
    deckLimit: (max: number) =>
      `Thiết bị này lưu tối đa ${max} bộ từ. Hãy xóa bớt một bộ trước khi thêm bộ mới.`,
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
    saveDraft: 'Lưu nháp',
    saveReady: 'Lưu & sẵn sàng dạy',
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
    done: 'Xong — quay lại kết quả',
  },

  test: {
    leaveAsk: 'Thoát bài kiểm tra? Các câu đã làm sẽ không được lưu.',
    leaveLabel: 'Thoát',
    leaveAria: 'Thoát bài kiểm tra',
    empty: 'Bài kiểm tra này không có từ nào để hỏi.',
    listenPrompt: 'Nghe rồi viết lại từ tiếng Anh',
    choicePrompt: 'Từ này nghĩa là gì?',
    lettersPrompt: 'Viết từ tiếng Anh',
    play: 'Phát âm từ',
    lettersHint: (count: number) => `${count} chữ cái`,
    continue: 'Tiếp tục',
    levelTitle: (level: string) => `Bài kiểm tra trình độ ${level}`,
    retrySuffix: ' · làm lại',
    sourceLevel: (level: string, count: number) => `${level} · ${count} từ`,
    sourceDeck: (count: number) => `${count} từ · bộ từ của bạn`,
    sourceRetry: (count: number) => `Làm lại ${count} câu sai`,
    answerPlaceholder: 'Nhập từ tiếng Anh',
    answerAria: 'Câu trả lời của bạn',
    check: 'Kiểm tra',
    finish: 'Kết thúc & xem báo cáo',
    correct: '✅ Đúng rồi',
    spelling: '⚠️ Gần đúng — sai chính tả',
    incorrect: '❌ Chưa đúng',
    youWrote: (guess: string) => `Bạn đã viết “${guess}”`,
    reveal: 'Không biết — xem đáp án',
    retryAsk: 'Thử lại một lần, hoặc bỏ qua để xem đáp án.',
    retry: 'Thử lại',
    skip: 'Bỏ qua — xem đáp án',
    hint: 'Gợi ý',
    hintClue: (first: string, count: number) => `Bắt đầu bằng “${first}” · ${count} chữ cái`,
  },

  report: {
    score: (correct: number, total: number) => `${correct} / ${total} câu đúng`,
    toRevisit: (missed: number) => `· ${missed} cần ôn lại`,
    wrote: (guess: string) => `Đã viết “${guess}”`,
    chose: (guess: string) => `Đã chọn “${guess}”`,
    noAnswer: 'Không trả lời',
    spellingTag: 'Chính tả',
    spellingNote: (count: number) => `· ${count} câu đúng từ nhưng sai chính tả`,
    attemptTag: (attempts: number) => `Lần thử ${attempts}`,
    hintTag: (hints: number) => `${hints} gợi ý`,
    skippedTag: 'Bỏ qua',
    effort: (retried: number, hints: number, skipped: number) => {
      const parts = [
        retried > 0 ? `${retried} từ phải thử lại` : '',
        hints > 0 ? `${hints} lượt gợi ý` : '',
        skipped > 0 ? `${skipped} từ bỏ qua` : '',
      ].filter(Boolean);
      return parts.join(' · ');
    },
    exportCsv: 'Xuất kết quả (CSV)',
    csv: {
      word: 'Từ',
      meaning: 'Nghĩa',
      answer: 'Trả lời',
      result: 'Kết quả',
      attempts: 'Số lần thử',
      hints: 'Gợi ý',
      skipped: 'Bỏ qua',
    },
    result: { correct: 'Đúng', spelling: 'Sai chính tả', wrong: 'Sai' },
    retryMissed: (missed: number) => `Làm lại ${missed} câu sai`,
    testAgain: 'Kiểm tra lại',
  },
};
