import { AttemptStatus, CheatEventType, Prisma, RoomStatus } from '@prisma/client';
import { config } from '../config';
import { prisma } from '../db/prisma';

const EXAM_DURATION_MINUTES = 30;

function mapAttempt(attempt: {
  id: string;
  examRoomId: string;
  status: AttemptStatus;
  score: number | null;
  maxScore: number | null;
  startedAt: Date;
  submittedAt: Date | null;
  examRoom?: { subjectName: string };
  _count?: { answers: number };
}, cheatFlags = 0) {
  return {
    id: attempt.id,
    examId: attempt.examRoomId,
    status: attempt.status,
    score: attempt.score ?? undefined,
    maxScore: attempt.maxScore ?? undefined,
    startedAt: attempt.startedAt.toISOString(),
    submittedAt: attempt.submittedAt?.toISOString(),
    cheatFlags,
    exam: attempt.examRoom
      ? { title: attempt.examRoom.subjectName, durationMinutes: EXAM_DURATION_MINUTES }
      : undefined,
  };
}

export async function startAttempt(studentId: string, examRoomId: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { isActive: true, isCollegeVerified: true },
  });
  if (!student?.isActive) throw new Error('NOT_FOUND');
  if (!student.isCollegeVerified) throw new Error('NOT_COLLEGE_VERIFIED');

  const room = await prisma.examRoom.findUnique({
    where: { id: examRoomId },
    include: { _count: { select: { questions: true } } },
  });
  if (!room || room.roomStatus !== RoomStatus.OPEN) throw new Error('EXAM_NOT_AVAILABLE');

  // นักเรียนต้องมีสิทธิ์ตามระดับชั้นตอนสมัคร หรือห้องเรียนที่เข้าด้วยรหัส
  if (room.gradeLevel) {
    const { getStudentExamAccessKeys, studentCanAccessExamGrade } = await import('./studentAccess');
    const access = await getStudentExamAccessKeys(studentId);
    if (!studentCanAccessExamGrade(room.gradeLevel, access.keys)) throw new Error('EXAM_NOT_AVAILABLE');
  }

  if (room._count.questions === 0) throw new Error('EXAM_NO_QUESTIONS');

  const existing = await prisma.examAttempt.findUnique({
    where: { studentId_examRoomId: { studentId, examRoomId } },
    include: { examRoom: { select: { subjectName: true } } },
  });

  if (existing) {
    if (existing.status !== AttemptStatus.IN_PROGRESS) throw new Error('ALREADY_COMPLETED');
    const cheatFlags = await prisma.cheatLog.count({ where: { studentId, examRoomId } });
    return mapAttempt(existing, cheatFlags);
  }

  const attempt = await prisma.examAttempt.create({
    data: { studentId, examRoomId },
    include: { examRoom: { select: { subjectName: true } } },
  });
  return mapAttempt(attempt);
}

export async function saveAnswer(
  attemptId: string,
  studentId: string,
  questionId: string,
  selectedOptionId: string
) {
  const attempt = await prisma.examAttempt.findFirst({
    where: { id: attemptId, studentId, status: AttemptStatus.IN_PROGRESS },
  });
  if (!attempt) throw new Error('ATTEMPT_NOT_FOUND');

  // คำถามและตัวเลือกต้องอยู่ในห้องสอบเดียวกับ attempt นี้
  const option = await prisma.questionOption.findFirst({
    where: { id: selectedOptionId, questionId, question: { examRoomId: attempt.examRoomId } },
  });
  if (!option) throw new Error('ATTEMPT_NOT_FOUND');

  await prisma.attemptAnswer.upsert({
    where: { attemptId_questionId: { attemptId, questionId } },
    update: { selectedOptionId, answeredAt: new Date() },
    create: { attemptId, questionId, selectedOptionId },
  });

  return { ok: true };
}

export async function submitAttempt(attemptId: string, studentId: string) {
  const attempt = await prisma.examAttempt.findFirst({
    where: { id: attemptId, studentId },
    include: {
      answers: { include: { selectedOption: true, question: true } },
      examRoom: { select: { subjectName: true, id: true } },
    },
  });
  if (!attempt) throw new Error('ATTEMPT_NOT_FOUND');
  if (attempt.status !== AttemptStatus.IN_PROGRESS) throw new Error('ALREADY_SUBMITTED');

  const questions = await prisma.question.findMany({
    where: { examRoomId: attempt.examRoomId },
    select: { points: true },
  });
  const maxScore = questions.reduce((sum, q) => sum + q.points, 0);
  const score = attempt.answers.reduce(
    (sum, a) => sum + (a.selectedOption.isCorrect ? a.question.points : 0),
    0
  );

  const updated = await prisma.examAttempt.update({
    where: { id: attempt.id },
    data: { status: AttemptStatus.SUBMITTED, score, maxScore, submittedAt: new Date() },
    include: { examRoom: { select: { subjectName: true } } },
  });

  const cheatFlags = await prisma.cheatLog.count({
    where: { studentId, examRoomId: attempt.examRoomId },
  });
  return mapAttempt(updated, cheatFlags);
}

/// ประวัติการสอบของนักเรียน — ใช้แสดงหน้าประวัติและคะแนน
export async function listStudentAttempts(studentId: string) {
  const attempts = await prisma.examAttempt.findMany({
    where: { studentId },
    orderBy: { startedAt: 'desc' },
    include: {
      examRoom: { select: { subjectName: true, classCode: true, gradeLevel: true } },
    },
  });

  const cheatCounts = await prisma.cheatLog.groupBy({
    by: ['examRoomId'],
    where: { studentId },
    _count: { _all: true },
  });
  const cheatMap = new Map(cheatCounts.map((c) => [c.examRoomId, c._count._all]));

  return attempts.map((a) => {
    const percent =
      a.score != null && a.maxScore != null && a.maxScore > 0
        ? Math.round((a.score / a.maxScore) * 100)
        : null;
    return {
      id: a.id,
      examId: a.examRoomId,
      subjectName: a.examRoom.subjectName,
      classCode: a.examRoom.classCode,
      gradeLevel: a.examRoom.gradeLevel,
      status: a.status,
      score: a.score,
      maxScore: a.maxScore,
      percent,
      startedAt: a.startedAt.toISOString(),
      submittedAt: a.submittedAt?.toISOString() ?? null,
      cheatFlags: cheatMap.get(a.examRoomId) ?? 0,
    };
  });
}

export async function getAttemptResult(attemptId: string, userId: string, isStudent: boolean) {
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: { examRoom: { select: { subjectName: true, teacherId: true } } },
  });
  if (!attempt) return null;

  // นักเรียนดูได้เฉพาะของตัวเอง / อาจารย์ดูได้เฉพาะห้องสอบของตัวเอง
  if (isStudent && attempt.studentId !== userId) return null;
  if (!isStudent && attempt.examRoom.teacherId !== userId) return null;

  const cheatFlags = await prisma.cheatLog.count({
    where: { studentId: attempt.studentId, examRoomId: attempt.examRoomId },
  });
  return mapAttempt(attempt, cheatFlags);
}

export async function recordCheatEvent(
  attemptId: string,
  studentId: string,
  eventType: CheatEventType,
  metadata?: Record<string, unknown>
) {
  const attempt = await prisma.examAttempt.findFirst({
    where: { id: attemptId, studentId },
  });
  if (!attempt) throw new Error('ATTEMPT_NOT_FOUND');

  const descriptions: Partial<Record<CheatEventType, string>> = {
    TAB_SWITCH: 'นักเรียนสลับแท็บออกจากหน้าข้อสอบ',
    APP_SWITCH: 'นักเรียนปัดแอปหรือออกจากหน้าจอ',
    WINDOW_BLUR: 'หน้าต่างข้อสอบเสียโฟกัส',
    PAGE_HIDDEN: 'หน้าข้อสอบถูกซ่อน (สลับหน้า/แท็บ)',
    FULLSCREEN_EXIT: 'นักเรียนออกจากโหมดเต็มจอ',
    OTHER: 'พบพฤติกรรมที่น่าสงสัย (คัดลอก/วาง หรืออื่น ๆ)',
  };

  // ถ้า attempt ถูกตัดสิทธิ์ไปแล้ว — ไม่บันทึกซ้ำ
  if (attempt.status === AttemptStatus.DISQUALIFIED) {
    return {
      event: null,
      cheatFlags: await prisma.cheatLog.count({
        where: { studentId, examRoomId: attempt.examRoomId },
      }),
      disqualified: true,
      warning: 'คุณถูกตัดสิทธิ์จากการสอบแล้ว เนื่องจากตรวจพบการทุจริต',
    };
  }

  const log = await prisma.cheatLog.create({
    data: {
      studentId,
      examRoomId: attempt.examRoomId,
      eventType,
      description: descriptions[eventType] ?? 'พบพฤติกรรมที่น่าสงสัย',
      metadata: metadata as Prisma.InputJsonValue | undefined,
      isNotified: false,
    },
  });

  const cheatFlags = await prisma.cheatLog.count({
    where: { studentId, examRoomId: attempt.examRoomId },
  });

  // พบทุจริตครบเกณฑ์ (ค่าเริ่มต้น 1 ครั้ง) — ล็อกทันที
  const disqualified = cheatFlags >= config.maxCheatFlags;

  if (disqualified && attempt.status === AttemptStatus.IN_PROGRESS) {
    const answers = await prisma.attemptAnswer.findMany({
      where: { attemptId: attempt.id },
      include: { selectedOption: true, question: true },
    });
    const questions = await prisma.question.findMany({
      where: { examRoomId: attempt.examRoomId },
      select: { points: true },
    });
    await prisma.examAttempt.update({
      where: { id: attempt.id },
      data: {
        status: AttemptStatus.DISQUALIFIED,
        score: answers.reduce((s, a) => s + (a.selectedOption.isCorrect ? a.question.points : 0), 0),
        maxScore: questions.reduce((s, q) => s + q.points, 0),
        submittedAt: new Date(),
      },
    });
  }

  return {
    event: log,
    cheatFlags,
    disqualified,
    warning: disqualified
      ? 'ตรวจพบการทุจริต ระบบได้ล็อกและตัดสิทธิ์การสอบของคุณทันที'
      : 'พบพฤติกรรมที่น่าสงสัย — หากทำอีกจะถูกตัดสิทธิ์',
  };
}
