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
    moveAria: (name: string) => `Chuyển ${name} sang lớp khác`,
    moveTo: 'Chuyển sang…',
    movedMember: (name: string, className: string) => `Đã chuyển ${name} sang ${className}.`,
    alreadyInClass: (name: string) => `Học sinh này đã ở trong ${name}.`,
    moveFailed: 'Không chuyển được học sinh đó.',
    joined: 'Đã vào lớp',
    invited: 'Đã mời',

    codeCopied: 'Đã sao chép mã lớp.',
    codeIs: (code: string) => `Mã lớp: ${code}`,

    assignments: 'Bài tập',
    newAssignment: 'Giao bài mới',
    // Hai tab con trong một lớp, để danh sách học sinh dài không đẩy phần bài tập xuống.
    rosterTab: (count: number) => `Học sinh · ${count}`,
    workTab: (count: number) => `Bài tập · ${count}`,
    progressTab: 'Báo cáo',
    sectionsAria: 'Các mục trong lớp',
    report: {
      title: 'Tiến độ lớp',
      hint: 'Bấm vào cột để mở báo cáo của bài đó. Dấu – là chưa làm, màu vàng là đang làm, có điểm là đã nộp.',
      student: 'Học sinh',
      inProgress: 'Đang làm',
      auto: 'tự động',
      nothingYet: 'Giao bài rồi bảng này sẽ tự đầy lên.',
      summary: (students: number, assignments: number, toGrade: number) =>
        `${students} học sinh · ${assignments} bài tập${toGrade > 0 ? ` · ${toGrade} bài chờ chấm` : ''}`,
      viewsAria: 'Cách xem báo cáo',
      filterAll: 'Tất cả',
      filterToGrade: (count: number) => `Chờ chấm · ${count}`,
      filterMissing: (count: number) => `Còn thiếu · ${count}`,
      queueTitle: (count: number) => `${count} bài đang chờ chấm`,
      queueSubmitted: (date: string) => `Nộp ${date}`,
      queueEmpty: 'Không có bài nào chờ chấm. Bài viết sẽ hiện ở đây ngay khi học sinh nộp.',
      missingEmpty: 'Cả lớp đã nộp đủ mọi bài.',
      cellAria: (student: string, assignment: string, status: string) =>
        `${student} · ${assignment} · ${status}`,
    },
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
    assignmentSentMany: (count: number) => `Đã giao bài cho ${count} lớp.`,
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
    dueInHours: (hours: number) => `Còn ${hours} giờ`,
    dueInDays: (days: number) => `Còn ${days} ngày`,
    dueTomorrow: 'Hạn là ngày mai',
    reminderTitle: (count: number) => `${count} bài cần nộp trước hạn`,
    reminderBody: 'Mở một bài để bắt đầu. Nộp muộn vẫn được ghi nhận nhưng sẽ bị đánh dấu quá hạn.',
    teacherFeedback: 'Giáo viên: ',
    attempt: (attempts: number) => `Lần ${attempts}`,
    notStarted: 'Chưa bắt đầu',
    readFeedback: 'Xem nhận xét',
    retryForPass: 'Làm lại để đạt',
    practiceAgain: 'Luyện tập lại',
    inProgress: 'Đang làm',
    continueWork: 'Làm tiếp',
    pendingLine: (attempts: number, score: number) =>
      attempts > 0 ? `Lần ${attempts} · ${score}% · chưa nộp` : `Đang làm · ${score}% · chưa nộp`,
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

    tabs: {
      progress: (done: number, total: number) => `Đã xong ${done}/${total} phần`,
      overall: (percent: number) => `Hoàn thành ${percent}%`,
      breakTitle: 'Nghỉ một chút',
      breakBody:
        'Mỗi phần được lưu ngay khi làm xong, nên bạn dừng ở đây cũng không mất gì. Mở phần tiếp theo khi đã sẵn sàng.',
      done: 'Đã xong',
      todo: 'Chưa làm',
      score: (correct: number, total: number) => `${correct}/${total}`,
      review: 'Xem lại thẻ từ',
      next: (label: string) => `Tiếp · ${label}`,
      submit: 'Nộp bài cho giáo viên',
      needsAll: (parts: number) => `Còn ${parts} phần chưa làm`,
      pendingHint: 'Nộp là giáo viên thấy kết quả tốt nhất của bạn — sau đó vẫn luyện lại được.',
      submitBelow: (score: number) => `Cần ${score}% mới nộp được. Làm lại phần nào cũng được.`,
      part: (index: number, total: number) => `Phần ${index} / ${total}`,
    },

    quiz: {
      counter: (current: number, total: number) => `Câu ${current} / ${total}`,
      answered: (answered: number) => `Đã trả lời ${answered} câu`,
      review: 'Xem lại đáp án',
      reviewTitle: 'Kiểm tra trước khi nộp',
      reviewHint: 'Chạm vào một câu để đổi đáp án.',
      skipped: 'Chưa trả lời',
      backToQuestions: 'Sửa tiếp',
      submit: 'Nộp bài',
    },

    writing: {
      promptLabel: 'Đề bài',
      placeholder: 'Viết câu trả lời của bạn ở đây…',
      wordCount: (words: number, min: number) => `${words} / ${min} từ`,
      gradedByTeacher: 'Bài này giáo viên sẽ chấm.',
      moreWords: (count: number) => `Viết thêm ${count} từ`,
      confirmAsk: 'Nộp bài bây giờ? Giáo viên sẽ thấy ngay.',
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
      reviewWords: 'Ôn lại từ vựng',
      practiseAgain: 'Luyện lại bài',
      pendingTitle: 'Chưa nộp',
      pendingPassed:
        'Bạn đã đạt mức yêu cầu. Làm lại bao nhiêu lần cũng được — chỉ khi bấm Nộp bài thì giáo viên mới nhận được.',
      pendingBelow: (score: number) =>
        `Cần đạt ${score}% mới nộp được. Cứ làm lại tùy ý, giáo viên chưa thấy gì cả.`,
      autoNote: (due: string) =>
        `Hết hạn ${due}, bài sẽ tự nộp với kết quả tốt nhất.`,
      handIn: 'Nộp bài',
      handedIn: 'Đã nộp cho giáo viên',
      autoHandedIn: (due: string | null) =>
        due === null ? 'Đã tự nộp khi hết hạn.' : `Đã tự nộp khi hết hạn ${due}.`,
      later: 'Để sau, làm tiếp',
      worthAnotherLook: 'Cần xem lại',
      answersTitle: 'Từng câu đã làm',
      yourAnswer: (answer: string | null) => (answer === null ? 'Không trả lời' : `Bạn chọn: ${answer}`),
      correctAnswer: (answer: string) => `Đáp án: ${answer}`,
    },
  },

  editor: {
    backAria: 'Quay lại lớp',
    title: 'Giao bài mới',
    typeAria: 'Loại bài tập',
    pickHint: 'Chọn một loại — mỗi loại mở một biểu mẫu ngắn riêng. Chưa gửi gì cho đến khi bạn bấm Giao bài.',
    closeAria: 'Đóng',
    changeTypeAria: 'Quay lại chọn loại bài',
    wordsTitle: 'Danh sách từ',
    partsTitle: 'Các phần kiểm tra',
    partsEdit: 'Sửa',
    partsDone: 'Xong',
    partsSummary:
      'Mỗi phần là một tab riêng cho học sinh — kiểu dễ trước, có khoảng nghỉ giữa các phần.',
    kindHints: {
      vocabulary: 'Một danh sách từ, hỏi theo một đến bốn kiểu. Chọn kiểu bài bên dưới.',
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
    modesHint:
      'Chọn một hoặc nhiều kiểu. Mỗi kiểu thành một phần riêng — dễ trước — học sinh được nghỉ giữa các phần.',
    setSummary: (words: number, parts: number) =>
      parts > 1 ? `${words} từ × ${parts} phần = ${words * parts} câu hỏi` : `${words} từ trong bộ này.`,
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
    assignTo: (count: number) => (count > 1 ? `Giao cho ${count} lớp` : 'Giao cho lớp'),
    classesLabel: 'Lớp nhận bài',
    pickClass: 'Chọn ít nhất một lớp.',
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
    effort: (attempts: number, hints: number, skipped: boolean) => {
      const parts = [
        attempts > 1 ? `lần ${attempts}` : '',
        hints > 0 ? `${hints} gợi ý` : '',
        skipped ? 'bỏ qua' : '',
      ].filter(Boolean);
      return parts.join(' · ');
    },
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
