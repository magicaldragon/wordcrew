import React, { useMemo, useState } from 'react';
import { FlashcardReviewScreen } from '../FlashcardReviewScreen';
import { TeacherTestScreen } from '../TeacherTestScreen';
import { useT } from '../../i18n/useT';
import { assignmentWords, type ClassAssignment } from '../../services/classes';
import type { TeacherAnswer, TeacherDeck, TeacherSession } from '../../services/teacherDeck';

interface VocabularyWorkProps {
  assignment: ClassAssignment;
  onFinish: (answers: TeacherAnswer[]) => void;
  onExit: () => void;
}

/**
 * Tool 1 — Check Vocabulary — run as homework.
 *
 * The assignment does not reimplement the vocabulary check: it hands the teacher's word
 * list to the same study-then-test flow the Teaching tools screen uses, so a student who
 * practised a deck this morning meets the same cards tonight.
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
  const t = useT('myClass');
  const [studying, setStudying] = useState(true);

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
      title: assignment.title,
      source: t.work.sessionSource(assignment.words.length),
      words: deck.words,
    }),
    [assignment.title, assignment.words.length, deck.words, t],
  );

  if (studying) {
    return (
      <FlashcardReviewScreen deck={deck} onStartTest={() => setStudying(false)} onExit={onExit} />
    );
  }

  return <TeacherTestScreen session={session} onFinish={onFinish} onExit={onExit} />;
};
