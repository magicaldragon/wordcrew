import type { Dictionary } from '../types';

/**
 * Vietnamese copy for My Class. Mirrors `en/myClass.ts` key for key — the `Dictionary`
 * type makes a missing or mistyped entry a compile error.
 */
export const myClass: Dictionary['myClass'] = {
  kinds: {
    vocabulary: 'Bộ từ',
    quiz: 'Trắc nghiệm',
    writing: 'Bài viết',
  },

  meta: {
    noDueDate: 'Không có hạn',
    dueOn: (date: string) => `Hạn ${date}`,
  },

  teacher: {
    loading: 'Đang tải danh sách lớp…',
    loadClassesFailed: 'Không tải được danh sách lớp của bạn.',
    loadClassFailed: 'Không tải được lớp này.',
    classesAria: 'Các lớp của bạn',

    emptyTitle: 'Tạo lớp đầu tiên của bạn',
    emptyBody:
      'Thêm học sinh bằng email, giao bài và đọc báo cáo. Học sinh vào lớp bằng mã sáu ký tự.',
    classNamePlaceholder: 'Lớp 8A · Tối thứ Năm',
    createClass: 'Tạo lớp',
    nameRequired: 'Hãy đặt tên cho lớp.',
    classCreated: (code: string) => `Đã tạo lớp. Mã lớp ${code}.`,
    createFailed: 'Không tạo được lớp. Kiểm tra xem tài khoản của bạn đã có vai trò giáo viên chưa.',

    summary: (students: number, joined: number) =>
      `${students} học sinh · ${joined} đã vào lớp`,
    copyCodeTitle: 'Sao chép mã lớp để chia sẻ với học sinh',
    deleteClassAria: 'Xóa lớp này',
    deleteClassAsk: (name: string) => `Xóa lớp “${name}”? Bài tập và bài nộp sẽ bị xóa theo.`,
    deleteClassLabel: 'Xóa lớp',
    deleteClassFailed: 'Không xóa được lớp đó.',

    addBody:
      'Thêm email học sinh là em ấy vào lớp ngay — không cần mã. Hoặc chia sẻ mã ở trên, ai có mã cũng vào được.',
    emailPlaceholder: 'student@school.edu',
    emailAria: 'Email học sinh',
    studentNamePlaceholder: 'Tên (không bắt buộc)',
    studentNameAria: 'Tên học sinh',
    emailInvalid: 'Địa chỉ này không giống một email.',
    alreadyAdded: 'Học sinh này đã có trong lớp.',
    addFailed: 'Không thêm được học sinh đó.',
    removeAsk: (name: string) => `Xóa ${name} khỏi lớp này? Bài em đã nộp vẫn được giữ lại.`,
    removeAria: (name: string) => `Xóa ${name}`,
    removeFailed: 'Không xóa được học sinh đó.',
    joined: 'Đã vào lớp',
    invited: 'Đã mời',

    codeCopied: 'Đã sao chép mã lớp.',
    codeIs: (code: string) => `Mã lớp: ${code}`,

    assignments: 'Bài tập',
    newAssignment: 'Mới',
    noAssignments:
      'Chưa giao bài nào. Bộ từ, trắc nghiệm hay đề viết — cả ba đều kết thúc bằng một báo cáo.',
    metaLine: (kind: string, due: string, words: number | null, questions: number | null) => {
      const parts = [kind, due];
      if (words !== null) parts.push(`${words} từ`);
      if (questions !== null) parts.push(`${questions} câu hỏi`);
      return parts.join(' · ');
    },
    doneOf: (done: number, total: number) => `${done}/${total} đã làm`,
    passedCount: (passed: number) => `${passed} đạt`,
    openReport: 'Xem báo cáo',
    deleteAssignmentAria: (title: string) => `Xóa ${title}`,
    deleteAssignmentAsk: (title: string) => `Xóa “${title}”? Câu trả lời đã nộp sẽ bị xóa theo.`,
    assignmentSent: 'Đã giao bài cho lớp.',
    deleteAssignmentFailed: 'Không xóa được bài tập đó.',
  },

  student: {
    loading: 'Đang tải lớp của bạn…',
    loadFailed: 'Không tải được bài tập của bạn.',
    classesAria: 'Các lớp của bạn',
    joinTitle: 'Vào lớp của bạn',
    joinBody:
      'Nhập mã sáu ký tự giáo viên đã đưa — hoặc nhờ thầy cô thêm địa chỉ email này. Cách nào thì lớp cũng hiện ở đây kèm bài tập của bạn.',
    codeAria: 'Mã lớp',
    join: 'Vào lớp',
    joining: 'Đang vào…',
    joinedClass: (name: string) => `Đã vào lớp ${name}.`,
    joinFailed: 'Không vào được lớp đó.',
    teacherFallback: 'Giáo viên',
    classSummary: (teacher: string, done: number, total: number) =>
      `${teacher} · ${done}/${total} đã làm`,
    joinAnother: 'Vào lớp khác',
    noAssignments: 'Chưa có bài nào. Giáo viên sẽ đăng bài ở đây.',
    metaLine: (kind: string, due: string, passScore: number | null) => {
      const parts = [kind, due];
      if (passScore !== null) parts.push(`đạt ${passScore}%`);
      return parts.join(' · ');
    },
    waitingForTeacher: 'Chờ giáo viên chấm',
    overdue: 'Quá hạn',
    todo: 'Chưa làm',
    teacherFeedback: 'Giáo viên: ',
    attempt: (attempts: number) => `Lần ${attempts}`,
    notStarted: 'Chưa bắt đầu',
    readFeedback: 'Xem nhận xét',
    retryForPass: 'Làm lại để đạt',
  },

  work: {
    leaveAria: 'Rời bài tập này',
    submitFailed: 'Không nộp được. Kiểm tra kết nối rồi thử lại.',
    headerMeta: (kind: string, passScore: number | null, due: string | null) => {
      const parts = [kind];
      if (passScore !== null) parts.push(`đạt ${passScore}%`);
      if (due !== null) parts.push(`hạn ${due}`);
      return parts.join(' · ');
    },
    notSignedIn: 'Đăng nhập bằng email mà giáo viên đã thêm vào lớp để làm bài này.',
    sessionSource: (words: number) => `${words} từ · bài tập trên lớp`,

    quiz: {
      counter: (current: number, total: number) => `Câu ${current} / ${total}`,
      answered: (answered: number) => `Đã trả lời ${answered} câu`,
      submit: 'Nộp bài',
    },

    writing: {
      promptLabel: 'Đề bài',
      placeholder: 'Viết câu trả lời của bạn ở đây…',
      wordCount: (words: number, min: number) => `${words} / ${min} từ`,
      gradedByTeacher: 'Bài này giáo viên sẽ chấm.',
      moreWords: (count: number) => `Viết thêm ${count} từ`,
      submit: 'Nộp cho giáo viên',
    },

    result: {
      submitted: 'Đã nộp',
      submittedBody:
        'Giáo viên sẽ đọc bài và trả điểm. Bạn có thể mở lại bài này để xem nhận xét.',
      attempt: (attempts: number) => `Lần ${attempts}`,
      backToClass: 'Về Lớp của tôi',
      passed: 'Đạt',
      passLine: (score: number) => `Cần đạt ${score}%`,
      attemptLine: (attempts: number, questions: number) =>
        `Lần ${attempts} · ${questions} câu hỏi`,
      worthAnotherLook: 'Cần xem lại',
    },
  },

  editor: {
    backAria: 'Quay lại lớp',
    title: 'Giao bài mới',
    typeAria: 'Loại bài tập',
    kindHints: {
      vocabulary: 'Đề bằng tiếng Việt, trả lời bằng tiếng Anh. Chấm tự động.',
      quiz: 'Mỗi câu bốn lựa chọn. Thứ tự được xáo cho từng học sinh.',
      writing: 'Một đề bài và số từ tối thiểu. Bạn chấm bài.',
    },
    titleLabel: 'Tiêu đề',
    titlePlaceholder: 'Ôn tập Unit 4',
    titlePlaceholderWriting: 'Lá thư gửi một người bạn',
    noteLabel: 'Lời nhắn cho học sinh',
    optional: '(không bắt buộc)',
    notePlaceholder: 'Làm trước thứ Sáu. Không dùng từ điển.',
    dueLabel: 'Hạn nộp',
    passLineLabel: (score: number) => `Mức đạt · ${score}%`,
    passLineAria: 'Mức đạt',
    minWordsLabel: 'Số từ tối thiểu',
    source: {
      level: 'Theo trình độ',
      deck: 'Bộ từ của tôi',
      paste: 'Dán danh sách',
    },
    deckAria: 'Bộ từ đã lưu',
    deckPlaceholder: 'Chọn một bộ từ…',
    deckOption: (name: string, words: number) => `${name} · ${words} từ`,
    noDecks:
      'Chưa có bộ từ nào. Tạo trong Công cụ giảng dạy → Kiểm tra từ vựng → Bộ từ của tôi.',
    pastePlaceholder: 'apple\tquả táo\nborrow\tvay, mượn\nfurniture\tnội thất',
    pasteSummary: (words: number, warnings: number, max: number) => {
      const parts = [`${words} từ`];
      if (warnings > 0) parts.push(`${warnings} mục cần xem lại`);
      if (words > max) parts.push(`chỉ dùng ${max} từ đầu`);
      return parts.join(' · ');
    },
    setSummary: (words: number) => `${words} từ trong bộ này · đề tiếng Việt, đáp án tiếng Anh.`,
    question: (number: number) => `Câu ${number}`,
    removeQuestionAria: (number: number) => `Xóa câu ${number}`,
    questionPlaceholder: 'Chọn từ có nghĩa là “cho vay”',
    correctOptionAria: (number: number) => `Đánh dấu lựa chọn ${number} là đáp án đúng`,
    optionPlaceholder: (letter: string) => `Lựa chọn ${letter}`,
    addQuestion: 'Thêm câu hỏi',
    promptLabel: 'Đề bài',
    promptPlaceholder:
      'Viết 80–100 từ cho một người bạn về kỳ nghỉ gần nhất. Dùng thì quá khứ đơn.',
    assigning: 'Đang giao…',
    assign: 'Giao cho lớp',
    problems: {
      title: 'Hãy đặt tiêu đề cho bài tập.',
      tooFewWords: 'Bộ từ cần ít nhất ba từ.',
      missingMeaning: 'Mỗi từ cần có nghĩa trước khi giao bài.',
      pickDeck: 'Hãy chọn một bộ từ đã lưu.',
      noQuestions: 'Thêm ít nhất một câu hỏi có bốn lựa chọn.',
      noPrompt: 'Hãy viết đề bài để học sinh trả lời.',
    },
  },

  review: {
    backAria: 'Quay lại lớp',
    headerMeta: (kind: string, passScore: number | null) =>
      passScore === null ? `${kind} · bạn chấm bài` : `${kind} · đạt ${passScore}%`,
    submitted: 'Đã nộp',
    passed: 'Đạt',
    average: 'Trung bình',
    wordsToReteach: 'Từ cần dạy lại',
    missed: (missed: number, attempts: number) => `${missed}/${attempts} lần sai`,
    noStudents: 'Hãy thêm học sinh vào lớp trước khi giao bài.',
    toGrade: 'Chờ chấm',
    notDone: 'Chưa làm',
    invited: 'Đã mời',
    attemptLine: (attempts: number, date: string) => `Lần ${attempts} · ${date}`,
    wrote: (guess: string) => `viết “${guess}”`,
    blank: 'bỏ trống',
    quizAnswer: (picked: string | null, correct: string | null) => {
      const head = picked === null ? 'bỏ qua' : `đã chọn: ${picked}`;
      return correct === null ? head : `${head} · đáp án: ${correct}`;
    },
    emptyText: '(trống)',
    gradedLine: (score: number, passed: boolean) => (passed ? `${score}% · đạt` : `${score}%`),
    scoreLabel: 'Điểm',
    feedbackPlaceholder: 'Lần sau cần sửa gì…',
    saveScore: 'Lưu điểm',
    scoreSaved: 'Đã lưu điểm.',
    saveFailed: 'Không lưu được điểm đó.',
    changeScore: 'Sửa điểm',
    gradeThis: 'Chấm bài này',
  },
};
