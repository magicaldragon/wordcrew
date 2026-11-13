import React, { useMemo, useState } from 'react';
import { FlashcardReviewScreen } from '../FlashcardReviewScreen';
import { TeacherTestScreen } from '../TeacherTestScreen';
import { assignmentWords, type ClassAssignment } from '../../services/classes';
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
 * The question style is the teacher's choice, made on the assignment (`mode`), so every
 * student in the class answers the same kind of question. Old assignments predate the
 * field and default to the letter boxes they used to show.
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
  const [studying, setStudying] = useState(true);
  const mode = assignment.mode ?? 'letters';

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
        lockedMode={mode}
        onStartTest={() => setStudying(false)}
        onExit={onExit}
      />
    );
  }

  return <TeacherTestScreen session={session} onFinish={onFinish} onExit={onExit} />;
};
