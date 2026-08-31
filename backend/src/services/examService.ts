import { ExamFormat, RoomStatus } from '@prisma/client';
import { prisma } from '../db/prisma';
import { Role } from '../types/roles';
import { parseExamImportFile, type ImportQuestion } from './examImportService';

function formatLabel(examFormat: string) {
  return examFormat === ExamFormat.IMPORT_FILE || examFormat === 'IMPORT_FILE'
    ? 'นำเข้าไฟล์'
    : 'พิมพ์เอง';
}

function mapRoomToExam(room: {
  id: string;
  subjectName: string;
  classCode: string;
  gradeLevel: string | null;
  roomStatus: RoomStatus;
  examFormat: string;
  examSource: string | null;
  createdAt: Date;
  _count?: { questions: number };
}) {
  return {
    id: room.id,
    title: room.subjectName,
    description: `รหัสห้อง: ${room.classCode} · รูปแบบ: ${formatLabel(room.examFormat)}`,
    classCode: room.classCode,
    gradeLevel: room.gradeLevel,
    examFormat: room.examFormat,
    examSource: room.examSource,
    durationMinutes: 30,
    passingScore: 50,
    status: room.roomStatus === RoomStatus.OPEN ? 'PUBLISHED' : 'DRAFT',
    createdAt: room.createdAt.toISOString(),
    _count: { questions: room._count?.questions ?? 0 },
  };
}

async function createQuestionsForRoom(examRoomId: string, questions: ImportQuestion[]) {
  for (const [index, q] of questions.entries()) {
    await prisma.question.create({
      data: {
        examRoomId,
        questionText: q.questionText,
        points: q.points,
        orderIndex: index,
        options: {
          create: q.options.map((o, i) => ({
            optionText: o.optionText,
            isCorrect: o.isCorrect,
            orderIndex: i,
          })),
        },
      },
    });
  }
}

const roomInclude = { _count: { select: { questions: true } } } as const;

function randomClassCode(): string {
  return `ROOM${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

async function uniqueClassCode(preferred?: string): Promise<string> {
  if (preferred) {
    const code = preferred.trim().toUpperCase();
    const exists = await prisma.examRoom.findUnique({ where: { classCode: code } });
    if (exists) throw new Error('CLASS_CODE_TAKEN');
    return code;
  }

  for (let i = 0; i < 10; i++) {
    const code = randomClassCode();
    const exists = await prisma.examRoom.findUnique({ where: { classCode: code } });
    if (!exists) return code;
  }
  throw new Error('CLASS_CODE_GENERATION_FAILED');
}

export async function listExams(userId: string, role: Role) {
  if (role === Role.STUDENT) {
    const { getStudentExamAccessKeys, studentCanAccessExamGrade, studentCanListExams } =
      await import('./studentAccess');
    const access = await getStudentExamAccessKeys(userId);
    // คนเพิ่งลงทะเบียน / ยังไม่ยืนยัน / ยังไม่เข้าห้อง → ไม่มีรายการข้อสอบ
    if (!studentCanListExams(access)) return [];

    const rooms = await prisma.examRoom.findMany({
      where: { roomStatus: RoomStatus.OPEN },
      orderBy: { createdAt: 'desc' },
      include: roomInclude,
    });
    return rooms
      .filter((room) => studentCanAccessExamGrade(room.gradeLevel, access.keys))
      .map(mapRoomToExam);
  }

  const rooms = await prisma.examRoom.findMany({
    where: role === Role.ADMIN ? undefined : { teacherId: userId },
    orderBy: { createdAt: 'desc' },
    include: roomInclude,
  });
  return rooms.map(mapRoomToExam);
}

export async function getExamById(examId: string, userId: string, role: Role) {
  const room = await prisma.examRoom.findUnique({
    where: { id: examId },
    include: {
      teacher: { select: { fullName: true } },
      ...roomInclude,
      questions: {
        orderBy: { orderIndex: 'asc' },
        include: { options: { orderBy: { orderIndex: 'asc' } } },
      },
    },
  });
  if (!room) throw new Error('NOT_FOUND');

  if (role === Role.STUDENT) {
    if (room.roomStatus !== RoomStatus.OPEN) throw new Error('EXAM_CLOSED');
    const { getStudentExamAccessKeys, studentCanAccessExamGrade, studentCanListExams } =
      await import('./studentAccess');
    const access = await getStudentExamAccessKeys(userId);
    if (!studentCanListExams(access)) throw new Error('NOT_COLLEGE_VERIFIED');
    if (!studentCanAccessExamGrade(room.gradeLevel, access.keys)) {
      throw new Error('EXAM_WRONG_CLASS');
    }
  }
  if (role === Role.TEACHER && room.teacherId !== userId) throw new Error('FORBIDDEN');

  // นักเรียนไม่เห็นเฉลย (isCorrect) — อาจารย์เห็นครบ
  const questions = room.questions.map((q) => ({
    id: q.id,
    questionText: q.questionText,
    points: q.points,
    orderIndex: q.orderIndex,
    options: q.options.map((o) => ({
      id: o.id,
      optionText: o.optionText,
      orderIndex: o.orderIndex,
      ...(role === Role.STUDENT ? {} : { isCorrect: o.isCorrect }),
    })),
  }));

  return {
    ...mapRoomToExam(room),
    questions,
    createdBy: { fullName: room.teacher.fullName },
  };
}

export async function createExam(
  userId: string,
  data: {
    subjectName: string;
    gradeLevel?: string;
    examFormat?: 'MANUAL' | 'IMPORT_FILE';
    roomStatus?: 'OPEN' | 'CLOSED';
    classCode?: string;
    examSource?: string;
    useRandomCode?: boolean;
    importFileName?: string;
    importFileBase64?: string;
    // legacy fields from old API
    title?: string;
    description?: string;
    durationMinutes?: number;
    passingScore?: number;
    shuffleQuestions?: boolean;
  }
) {
  const subjectName = data.subjectName ?? data.title;
  if (!subjectName) throw new Error('SUBJECT_REQUIRED');

  const wantsImport =
    data.examFormat === 'IMPORT_FILE' || !!(data.importFileBase64 && data.importFileName);

  let importedQuestions: ImportQuestion[] = [];
  if (wantsImport) {
    if (!data.importFileBase64 || !data.importFileName) {
      throw new Error('IMPORT_FILE_REQUIRED');
    }
    importedQuestions = await parseExamImportFile(data.importFileName, data.importFileBase64);
  }

  const classCode = await uniqueClassCode(
    data.useRandomCode === false && data.classCode ? data.classCode : undefined
  );

  const room = await prisma.examRoom.create({
    data: {
      classCode,
      subjectName,
      gradeLevel: data.gradeLevel?.trim() || null,
      examFormat: wantsImport ? ExamFormat.IMPORT_FILE : ExamFormat.MANUAL,
      roomStatus:
        data.roomStatus === 'OPEN' ? RoomStatus.OPEN : RoomStatus.CLOSED,
      examSource: data.importFileName ?? data.examSource ?? null,
      teacherId: userId,
    },
  });

  if (importedQuestions.length > 0) {
    await createQuestionsForRoom(room.id, importedQuestions);
  }

  const withCount = await prisma.examRoom.findUnique({
    where: { id: room.id },
    include: roomInclude,
  });
  return mapRoomToExam(withCount!);
}

/** นำเข้าข้อสอบเพิ่ม/แทนที่ในห้องสอบที่มีอยู่ (ใช้แก้ห้องที่ยัง 0 ข้อ) */
export async function importQuestionsToExam(
  examRoomId: string,
  userId: string,
  role: Role,
  data: { importFileName: string; importFileBase64: string; replaceExisting?: boolean }
) {
  const room = await prisma.examRoom.findUnique({
    where: { id: examRoomId },
    include: roomInclude,
  });
  if (!room) throw new Error('NOT_FOUND');
  if (role === Role.TEACHER && room.teacherId !== userId) throw new Error('FORBIDDEN');
  if (role !== Role.TEACHER && role !== Role.ADMIN) throw new Error('FORBIDDEN');

  const questions = await parseExamImportFile(data.importFileName, data.importFileBase64);

  if (data.replaceExisting || room._count.questions === 0) {
    await prisma.question.deleteMany({ where: { examRoomId } });
  }

  const last = await prisma.question.findFirst({
    where: { examRoomId },
    orderBy: { orderIndex: 'desc' },
    select: { orderIndex: true },
  });
  const startIndex = (last?.orderIndex ?? -1) + 1;

  for (const [i, q] of questions.entries()) {
    await prisma.question.create({
      data: {
        examRoomId,
        questionText: q.questionText,
        points: q.points,
        orderIndex: startIndex + i,
        options: {
          create: q.options.map((o, oi) => ({
            optionText: o.optionText,
            isCorrect: o.isCorrect,
            orderIndex: oi,
          })),
        },
      },
    });
  }

  await prisma.examRoom.update({
    where: { id: examRoomId },
    data: {
      examFormat: ExamFormat.IMPORT_FILE,
      examSource: data.importFileName,
    },
  });

  const updated = await prisma.examRoom.findUnique({
    where: { id: examRoomId },
    include: roomInclude,
  });
  return mapRoomToExam(updated!);
}

export async function updateExam(
  examId: string,
  userId: string,
  role: Role,
  data: {
    subjectName?: string;
    gradeLevel?: string | null;
    roomStatus?: 'OPEN' | 'CLOSED';
  }
) {
  const room = await prisma.examRoom.findUnique({ where: { id: examId } });
  if (!room) throw new Error('NOT_FOUND');
  if (role === Role.TEACHER && room.teacherId !== userId) throw new Error('FORBIDDEN');
  if (role !== Role.TEACHER && role !== Role.ADMIN) throw new Error('FORBIDDEN');

  const subjectName = data.subjectName?.trim();
  if (subjectName !== undefined && subjectName.length < 2) throw new Error('SUBJECT_REQUIRED');

  const updated = await prisma.examRoom.update({
    where: { id: examId },
    data: {
      ...(subjectName ? { subjectName } : {}),
      ...(data.gradeLevel !== undefined
        ? { gradeLevel: data.gradeLevel?.trim() ? data.gradeLevel.trim() : null }
        : {}),
      ...(data.roomStatus
        ? { roomStatus: data.roomStatus === 'OPEN' ? RoomStatus.OPEN : RoomStatus.CLOSED }
        : {}),
    },
    include: roomInclude,
  });

  return mapRoomToExam(updated);
}

export async function updateExamStatus(examId: string, userId: string, role: Role, open: boolean) {
  const room = await prisma.examRoom.findUnique({ where: { id: examId } });
  if (!room) throw new Error('NOT_FOUND');
  if (role === Role.TEACHER && room.teacherId !== userId) throw new Error('FORBIDDEN');
  if (role !== Role.TEACHER && role !== Role.ADMIN) throw new Error('FORBIDDEN');

  const updated = await prisma.examRoom.update({
    where: { id: examId },
    data: { roomStatus: open ? RoomStatus.OPEN : RoomStatus.CLOSED },
  });

  return mapRoomToExam(updated);
}

export async function deleteExam(examId: string, userId: string, role: Role = Role.TEACHER) {
  const room = await prisma.examRoom.findUnique({
    where: { id: examId },
    select: { id: true, teacherId: true, subjectName: true, classCode: true },
  });
  if (!room) throw new Error('NOT_FOUND');
  if (role === Role.TEACHER && room.teacherId !== userId) throw new Error('FORBIDDEN');
  if (role !== Role.TEACHER && role !== Role.ADMIN) throw new Error('FORBIDDEN');

  await prisma.examRoom.delete({ where: { id: examId } });
  return { id: room.id, subjectName: room.subjectName, classCode: room.classCode };
}

export async function addQuestion(
  examRoomId: string,
  userId: string,
  role: Role,
  data: {
    questionText: string;
    points?: number;
    options: { optionText: string; isCorrect: boolean }[];
  }
) {
  const room = await prisma.examRoom.findUnique({ where: { id: examRoomId } });
  if (!room) throw new Error('NOT_FOUND');
  if (role === Role.TEACHER && room.teacherId !== userId) throw new Error('FORBIDDEN');
  if (role !== Role.TEACHER && role !== Role.ADMIN) throw new Error('FORBIDDEN');
  if (!data.options.some((o) => o.isCorrect)) throw new Error('NO_CORRECT_OPTION');

  const lastQuestion = await prisma.question.findFirst({
    where: { examRoomId },
    orderBy: { orderIndex: 'desc' },
    select: { orderIndex: true },
  });

  const question = await prisma.question.create({
    data: {
      examRoomId,
      questionText: data.questionText,
      points: data.points ?? 1,
      orderIndex: (lastQuestion?.orderIndex ?? -1) + 1,
      options: {
        create: data.options.map((o, i) => ({
          optionText: o.optionText,
          isCorrect: o.isCorrect,
          orderIndex: i,
        })),
      },
    },
    include: { options: { orderBy: { orderIndex: 'asc' } } },
  });

  return question;
}

export async function updateQuestion(
  examRoomId: string,
  questionId: string,
  userId: string,
  role: Role,
  data: {
    questionText: string;
    points?: number;
    options: { optionText: string; isCorrect: boolean }[];
  }
) {
  const room = await prisma.examRoom.findUnique({ where: { id: examRoomId } });
  if (!room) throw new Error('NOT_FOUND');
  if (role === Role.TEACHER && room.teacherId !== userId) throw new Error('FORBIDDEN');
  if (role !== Role.TEACHER && role !== Role.ADMIN) throw new Error('FORBIDDEN');

  const existing = await prisma.question.findFirst({
    where: { id: questionId, examRoomId },
  });
  if (!existing) throw new Error('QUESTION_NOT_FOUND');
  if (!data.options.some((o) => o.isCorrect)) throw new Error('NO_CORRECT_OPTION');
  if (data.options.length < 2) throw new Error('OPTIONS_REQUIRED');

  await prisma.questionOption.deleteMany({ where: { questionId } });

  const question = await prisma.question.update({
    where: { id: questionId },
    data: {
      questionText: data.questionText.trim(),
      points: data.points ?? existing.points,
      options: {
        create: data.options.map((o, i) => ({
          optionText: o.optionText.trim(),
          isCorrect: o.isCorrect,
          orderIndex: i,
        })),
      },
    },
    include: { options: { orderBy: { orderIndex: 'asc' } } },
  });

  return question;
}

export async function deleteQuestion(
  examRoomId: string,
  questionId: string,
  userId: string,
  role: Role
) {
  const room = await prisma.examRoom.findUnique({ where: { id: examRoomId } });
  if (!room) throw new Error('NOT_FOUND');
  if (role === Role.TEACHER && room.teacherId !== userId) throw new Error('FORBIDDEN');
  if (role !== Role.TEACHER && role !== Role.ADMIN) throw new Error('FORBIDDEN');

  const existing = await prisma.question.findFirst({
    where: { id: questionId, examRoomId },
    select: { id: true },
  });
  if (!existing) throw new Error('QUESTION_NOT_FOUND');

  await prisma.question.delete({ where: { id: questionId } });
  return { id: questionId };
}

/// รายชื่อห้องเรียนทั้งหมดที่มีนักเรียนลงทะเบียน — ให้อาจารย์เลือกตอนสร้างห้องสอบ
export async function listGradeLevels() {
  const groups = await prisma.student.groupBy({
    by: ['gradeLevel'],
    where: { isActive: true },
    _count: { _all: true },
    orderBy: { gradeLevel: 'asc' },
  });
  return groups.map((g) => ({ gradeLevel: g.gradeLevel, studentCount: g._count._all }));
}
