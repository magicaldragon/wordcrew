import React, { useMemo, useState } from 'react';
import { FlashcardReviewScreen } from '../FlashcardReviewScreen';
import { TeacherTestScreen } from '../TeacherTestScreen';
import { assignmentModes, assignmentWords, type ClassAssignment } from '../../services/classes';
import type { TeacherAnswer, TeacherDeck, TeacherSession } from '../../services/teacherDeck';

interface VocabularyWorkProps {
  assignment: ClassAssignment;
  onFinish: (answers: TeacherAnswer[]) => void;
  onExit: () => void;
}

/**
 * Tool 1 — Vocabulary Check — run as homework.
 *
 * The assignment does not reimplement the vocabulary check: it hands the teacher's word
 * list to the same study-then-test flow the Teaching tools screen uses, so a student who
 * practised a deck this morning meets the same cards tonight.
 *
 * The teacher may ask the set one, two or three ways. The cards always come first — a
 * Vietnamese prompt with no prior exposure measures memory, not vocabulary — and then the
 * rounds run from recognition to recall to listening, so each round leans on the last.
 * Answers from every round are collected and scored as one submission.
 *
 * This file is the whole of "vocabulary homework". A multiple-choice assignment and a
 * writing assignment each have their own module (QuizWork, WritingWork); ClassWorkScreen
 * knows only the shell around them.
 */
export const VocabularyWork: React.FC<VocabularyWorkProps> = ({
  assignment,
  onFinish,
  onExit,
}) => {
  const modes = useMemo(() => assignmentModes(assignment), [assignment]);
  const [studying, setStudying] = useState(true);
  const [stage, setStage] = useState(0);
  // Answers from the rounds already finished; the last round is held in the test screen.
  const [collected, setCollected] = useState<TeacherAnswer[]>([]);

  const deck = useMemo<TeacherDeck>(
    () => ({
      id: assignment.id,
      name: assignment.title,
      words: assignmentWords(assignment),
      createdAt: assignment.createdAt,
      updatedAt: assignment.createdAt,
    }),
    [assignment],
  );

  const mode = modes[Math.min(stage, modes.length - 1)];

  const session = useMemo<TeacherSession>(
    () => ({
      origin: { kind: 'deck', name: assignment.title },
      mode,
      words: deck.words,
    }),
    [assignment.title, deck.words, mode],
  );

  if (studying) {
    return (
      <FlashcardReviewScreen
        deck={deck}
        lockedMode={modes[0]}
        onStartTest={() => setStudying(false)}
        onExit={onExit}
      />
    );
  }

  return (
    <TeacherTestScreen
      key={mode}
      session={session}
      onFinish={(answers) => {
        const all = [...collected, ...answers];
        // Another style still to ask: start its first word straight away.
        if (stage + 1 < modes.length) {
          setCollected(all);
          setStage(stage + 1);
          return;
        }
        onFinish(all);
      }}
      onExit={onExit}
    />
  );
};
