/**
 * My Class: the teacher console, the student's work list, the assignment editor,
 * the marking report, and the screen a student works through.
 */
export const myClass = {
  kinds: {
    vocabulary: 'Word set',
    quiz: 'Multiple choice',
    writing: 'Writing',
  },

  meta: {
    noDueDate: 'No due date',
    dueOn: (date: string) => `Due ${date}`,
  },

  teacher: {
    loading: 'Loading classes…',
    loadClassesFailed: 'Could not load your classes.',
    loadClassFailed: 'Could not load that class.',
    classesAria: 'Your classes',

    emptyTitle: 'Start your first class',
    emptyBody:
      'Add students by email, set work, and read the report. Students join with a six-letter code.',
    classNamePlaceholder: 'Class 8A · Thursday evening',
    createClass: 'Create class',
    nameRequired: 'Give the class a name.',
    classCreated: (code: string) => `Class created. Code ${code}.`,
    createFailed: 'Could not create the class. Check that your account has the teacher role.',

    summary: (students: number, joined: number) =>
      `${students} ${students === 1 ? 'student' : 'students'} · ${joined} joined`,
    copyCodeTitle: 'Copy the class code to share with students',
    deleteClassAria: 'Delete this class',
    deleteClassAsk: (name: string) => `Delete “${name}”? Assignments and submissions go with it.`,
    deleteClassLabel: 'Delete class',
    deleteClassFailed: 'Could not delete that class.',

    addBody:
      'Add a student’s email and they are in — no code needed. Or share the code above and anyone who has it can join.',
    emailPlaceholder: 'student@school.edu',
    emailAria: 'Student email',
    studentNamePlaceholder: 'Name (optional)',
    studentNameAria: 'Student name',
    emailInvalid: 'That does not look like an email address.',
    alreadyAdded: 'That student is already on the roster.',
    addFailed: 'Could not add that student.',
    removeAsk: (name: string) => `Remove ${name} from this class? Their submitted work stays.`,
    removeAria: (name: string) => `Remove ${name}`,
    removeFailed: 'Could not remove that student.',
    joined: 'Joined',
    invited: 'Invited',

    codeCopied: 'Class code copied.',
    codeIs: (code: string) => `Class code: ${code}`,

    assignments: 'Assignments',
    newAssignment: 'New',
    noAssignments:
      'Nothing set yet. A word set, a multiple-choice quiz or a writing prompt — all three end in a report.',
    metaLine: (kind: string, due: string, words: number | null, questions: number | null) => {
      const parts = [kind, due];
      if (words !== null) parts.push(`${words} ${words === 1 ? 'word' : 'words'}`);
      if (questions !== null) parts.push(`${questions} ${questions === 1 ? 'question' : 'questions'}`);
      return parts.join(' · ');
    },
    doneOf: (done: number, total: number) => `${done}/${total} done`,
    passedCount: (passed: number) => `${passed} passed`,
    openReport: 'Open report',
    deleteAssignmentAria: (title: string) => `Delete ${title}`,
    deleteAssignmentAsk: (title: string) => `Delete “${title}”? Submitted answers go with it.`,
    assignmentSent: 'Assignment sent to the class.',
    deleteAssignmentFailed: 'Could not delete that assignment.',
  },

  student: {
    loading: 'Loading your class…',
    loadFailed: 'Could not load your assignments.',
    classesAria: 'Your classes',
    joinTitle: 'Join your class',
    joinBody:
      'Enter the six-letter code your teacher gave you — or ask them to add this email address. Either way the class appears here with your work.',
    codeAria: 'Class code',
    join: 'Join',
    joining: 'Joining…',
    joinedClass: (name: string) => `Joined ${name}.`,
    joinFailed: 'Could not join that class.',
    teacherFallback: 'Teacher',
    classSummary: (teacher: string, done: number, total: number) =>
      `${teacher} · ${done}/${total} done`,
    joinAnother: 'Join another',
    noAssignments: 'Nothing set yet. Your teacher will post work here.',
    metaLine: (kind: string, due: string, passScore: number | null) => {
      const parts = [kind, due];
      if (passScore !== null) parts.push(`pass ${passScore}%`);
      return parts.join(' · ');
    },
    waitingForTeacher: 'Waiting for teacher',
    overdue: 'Overdue',
    todo: 'To do',
    teacherFeedback: 'Teacher: ',
    attempt: (attempts: number) => `Attempt ${attempts}`,
    notStarted: 'Not started',
    readFeedback: 'Read feedback',
    retryForPass: 'Retry for the pass line',
  },

  work: {
    leaveAria: 'Leave this assignment',
    submitFailed: 'Could not submit. Check your connection and try again.',
    headerMeta: (kind: string, passScore: number | null, due: string | null) => {
      const parts = [kind];
      if (passScore !== null) parts.push(`pass ${passScore}%`);
      if (due !== null) parts.push(`due ${due}`);
      return parts.join(' · ');
    },
    notSignedIn: 'Sign in with the email your teacher added to the class to do this assignment.',
    sessionSource: (words: number) =>
      `${words} ${words === 1 ? 'word' : 'words'} · class assignment`,

    quiz: {
      counter: (current: number, total: number) => `Question ${current} / ${total}`,
      answered: (answered: number) => `${answered} answered`,
      submit: 'Submit answers',
    },

    writing: {
      promptLabel: 'Prompt',
      placeholder: 'Write your answer here…',
      wordCount: (words: number, min: number) => `${words} / ${min} words`,
      gradedByTeacher: 'Your teacher grades this one.',
      moreWords: (count: number) => `Write ${count} more ${count === 1 ? 'word' : 'words'}`,
      submit: 'Submit to my teacher',
    },

    result: {
      submitted: 'Submitted',
      submittedBody:
        'Your teacher will read it and send a score back. You can open this assignment again to see the feedback.',
      attempt: (attempts: number) => `Attempt ${attempts}`,
      backToClass: 'Back to My Class',
      passed: 'Passed',
      passLine: (score: number) => `Pass line is ${score}%`,
      attemptLine: (attempts: number, questions: number) =>
        `Attempt ${attempts} · ${questions} ${questions === 1 ? 'question' : 'questions'}`,
      worthAnotherLook: 'Worth another look',
    },
  },

  editor: {
    backAria: 'Back to the class',
    title: 'New assignment',
    typeAria: 'Assignment type',
    kindHints: {
      vocabulary: 'Vietnamese prompt, English answer. Scored automatically.',
      quiz: 'Four options per question. Order is shuffled for every student.',
      writing: 'A prompt and a word floor. You grade it.',
    },
    titleLabel: 'Title',
    titlePlaceholder: 'Unit 4 revision',
    titlePlaceholderWriting: 'A letter to a friend',
    noteLabel: 'Note for students',
    optional: '(optional)',
    notePlaceholder: 'Do this before Friday. No dictionary.',
    dueLabel: 'Due',
    passLineLabel: (score: number) => `Pass line · ${score}%`,
    passLineAria: 'Pass line',
    minWordsLabel: 'Min words',
    source: {
      level: 'By level',
      deck: 'My decks',
      paste: 'Paste list',
    },
    deckAria: 'Saved deck',
    deckPlaceholder: 'Pick a deck…',
    deckOption: (name: string, words: number) =>
      `${name} · ${words} ${words === 1 ? 'word' : 'words'}`,
    noDecks: 'No decks yet. Build one in Teaching tools → Check Vocabulary → My decks.',
    pastePlaceholder: 'apple\tquả táo\nborrow\tvay, mượn\nfurniture\tnội thất',
    pasteSummary: (words: number, warnings: number, max: number) => {
      const parts = [`${words} ${words === 1 ? 'word' : 'words'}`];
      if (warnings > 0) parts.push(`${warnings} need a look`);
      if (words > max) parts.push(`first ${max} will be used`);
      return parts.join(' · ');
    },
    setSummary: (words: number) =>
      `${words} ${words === 1 ? 'word' : 'words'} in this set · Vietnamese prompt, English answer.`,
    question: (number: number) => `Question ${number}`,
    removeQuestionAria: (number: number) => `Remove question ${number}`,
    questionPlaceholder: 'Choose the word that means “to lend”',
    correctOptionAria: (number: number) => `Mark option ${number} as correct`,
    optionPlaceholder: (letter: string) => `Option ${letter}`,
    addQuestion: 'Add question',
    promptLabel: 'Prompt',
    promptPlaceholder:
      'Write 80–100 words to a friend about your last holiday. Use the past simple.',
    assigning: 'Assigning…',
    assign: 'Assign to class',
    problems: {
      title: 'Give the assignment a title.',
      tooFewWords: 'A word set needs at least three words.',
      missingMeaning: 'Every word needs a meaning before you assign it.',
      pickDeck: 'Pick one of your saved decks.',
      noQuestions: 'Add at least one question with four options.',
      noPrompt: 'Write the prompt students will answer.',
    },
  },

  review: {
    backAria: 'Back to the class',
    headerMeta: (kind: string, passScore: number | null) =>
      passScore === null ? `${kind} · you grade this` : `${kind} · pass ${passScore}%`,
    submitted: 'Submitted',
    passed: 'Passed',
    average: 'Average',
    wordsToReteach: 'Words to reteach',
    missed: (missed: number, attempts: number) => `${missed}/${attempts} missed`,
    noStudents: 'Add students to the class before assigning work.',
    toGrade: 'To grade',
    notDone: 'Not done',
    invited: 'Invited',
    attemptLine: (attempts: number, date: string) => `Attempt ${attempts} · ${date}`,
    wrote: (guess: string) => `wrote “${guess}”`,
    blank: 'blank',
    quizAnswer: (picked: string | null, correct: string | null) => {
      const head = picked === null ? 'skipped' : `picked: ${picked}`;
      return correct === null ? head : `${head} · answer: ${correct}`;
    },
    emptyText: '(empty)',
    gradedLine: (score: number, passed: boolean) => (passed ? `${score}% · passed` : `${score}%`),
    scoreLabel: 'Score',
    feedbackPlaceholder: 'What to fix next time…',
    saveScore: 'Save score',
    scoreSaved: 'Score saved.',
    saveFailed: 'Could not save that score.',
    changeScore: 'Change score',
    gradeThis: 'Grade this',
  },
};
