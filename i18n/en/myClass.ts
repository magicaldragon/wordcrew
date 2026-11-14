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
    moveAria: (name: string) => `Move ${name} to another class`,
    moveTo: 'Move to…',
    movedMember: (name: string, className: string) => `${name} moved to ${className}.`,
    alreadyInClass: (name: string) => `That student is already in ${name}.`,
    moveFailed: 'Could not move that student.',
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
    assignmentSentMany: (count: number) => `Assignment sent to ${count} classes.`,
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
    dueInHours: (hours: number) => `Due in ${hours} ${hours === 1 ? 'hour' : 'hours'}`,
    dueInDays: (days: number) => `Due in ${days} ${days === 1 ? 'day' : 'days'}`,
    dueTomorrow: 'Due tomorrow',
    reminderTitle: (count: number) =>
      `${count} ${count === 1 ? 'assignment needs' : 'assignments need'} you before the deadline`,
    reminderBody: 'Open one to start. Late work is still collected, but it is marked overdue.',
    teacherFeedback: 'Teacher: ',
    attempt: (attempts: number) => `Attempt ${attempts}`,
    notStarted: 'Not started',
    readFeedback: 'Read feedback',
    retryForPass: 'Retry for the pass line',
    practiceAgain: 'Practise again',
    inProgress: 'In progress',
    continueWork: 'Continue',
    pendingLine: (attempts: number, score: number) =>
      attempts > 0
        ? `Attempt ${attempts} · ${score}% · not handed in`
        : `In progress · ${score}% · not handed in`,
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

    tabs: {
      progress: (done: number, total: number) => `${done} of ${total} parts done`,
      overall: (percent: number) => `${percent}% complete`,
      breakTitle: 'Take a breather',
      breakBody:
        'Each part is saved the moment you finish it, so you can stop here. Open the next part whenever you are ready.',
      done: 'Done',
      todo: 'Not started',
      score: (correct: number, total: number) => `${correct}/${total}`,
      review: 'Re-read the cards',
      next: (label: string) => `Next · ${label}`,
      submit: 'Submit to my teacher',
      needsAll: (parts: number) => `${parts} ${parts === 1 ? 'part' : 'parts'} still to do`,
      pendingHint: 'Submitting shows your teacher your best result — you can keep practising after.',
      submitBelow: (score: number) => `You need ${score}% to submit. Retry any part.`,
      part: (index: number, total: number) => `Part ${index} / ${total}`,
    },

    quiz: {
      counter: (current: number, total: number) => `Question ${current} / ${total}`,
      answered: (answered: number) => `${answered} answered`,
      review: 'Review answers',
      reviewTitle: 'Check before you submit',
      reviewHint: 'Tap a question to change the answer.',
      skipped: 'Not answered',
      backToQuestions: 'Keep editing',
      submit: 'Submit answers',
    },

    writing: {
      promptLabel: 'Prompt',
      placeholder: 'Write your answer here…',
      wordCount: (words: number, min: number) => `${words} / ${min} words`,
      gradedByTeacher: 'Your teacher grades this one.',
      moreWords: (count: number) => `Write ${count} more ${count === 1 ? 'word' : 'words'}`,
      confirmAsk: 'Submit this now? Your teacher will see it straight away.',
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
      reviewWords: 'Review the words',
      practiseAgain: 'Practise again',
      pendingTitle: 'Not handed in',
      pendingPassed:
        'You have cleared the pass line. Retry as often as you like — your teacher only sees this when you press Submit.',
      pendingBelow: (score: number) =>
        `You need ${score}% to hand this in. Retry as often as you like; nothing leaves your device yet.`,
      autoNote: (due: string) =>
        `On ${due} it is handed in automatically, with your best result.`,
      handIn: 'Submit to my teacher',
      handedIn: 'Handed in to your teacher',
      autoHandedIn: (due: string | null) =>
        due === null
          ? 'Handed in automatically when the deadline passed.'
          : `Handed in automatically when the deadline passed (${due}).`,
      later: 'Leave it for now',
      worthAnotherLook: 'Worth another look',
      answersTitle: 'How each answer went',
      yourAnswer: (answer: string | null) => (answer === null ? 'No answer' : `You: ${answer}`),
      correctAnswer: (answer: string) => `Answer: ${answer}`,
    },
  },

  editor: {
    backAria: 'Back to the class',
    title: 'New assignment',
    typeAria: 'Assignment type',
    kindHints: {
      vocabulary: 'One word list, asked one to four ways. Tick the test styles below.',
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
    noDecks: 'No decks yet. Build one in Teaching tools → Vocabulary Check → My decks.',
    pastePlaceholder: 'apple\tquả táo\nborrow\tvay, mượn\nfurniture\tnội thất',
    pasteSummary: (words: number, warnings: number, max: number) => {
      const parts = [`${words} ${words === 1 ? 'word' : 'words'}`];
      if (warnings > 0) parts.push(`${warnings} need a look`);
      if (words > max) parts.push(`first ${max} will be used`);
      return parts.join(' · ');
    },
    modesHint:
      'Tick one or more styles. Each becomes its own part — easiest first — and students can stop between parts.',
    setSummary: (words: number, parts: number) =>
      parts > 1
        ? `${words} words × ${parts} parts = ${words * parts} questions`
        : `${words} words in this set.`,
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
    assignTo: (count: number) => (count > 1 ? `Assign to ${count} classes` : 'Assign to class'),
    classesLabel: 'Classes',
    pickClass: 'Pick at least one class.',
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
    effort: (attempts: number, hints: number, skipped: boolean) => {
      const parts = [
        attempts > 1 ? `attempt ${attempts}` : '',
        hints > 0 ? `${hints} ${hints === 1 ? 'hint' : 'hints'}` : '',
        skipped ? 'skipped' : '',
      ].filter(Boolean);
      return parts.join(' · ');
    },
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
