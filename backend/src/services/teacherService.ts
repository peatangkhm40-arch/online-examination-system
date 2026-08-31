import { prisma } from '../db/prisma';

/** ตัดช่องว่างให้เทียบระดับชั้น/ชื่อห้องตรงกัน เช่น "ปวส.2/5" กับ "ปวส. 2/5" */
export function normalizeGradeKey(value: string) {
  return value.replace(/\s+/g, '').toLowerCase();
}

/** สร้างชุดชื่อห้องที่อาจสะกดต่างกันเล็กน้อย สำหรับ query */
function gradeNameVariants(name: string): string[] {
  const trimmed = name.trim();
  const compact = trimmed.replace(/\s+/g, '');
  const spaced = trimmed.replace(/\s+/g, ' ');
  const afterDot = compact.replace(/\.(\d)/g, '. $1');
  return [...new Set([trimmed, compact, spaced, afterDot].filter(Boolean))];
}

function mapStudent(
  student: {
    id: string;
    prefix: string;
    firstName: string;
    lastName: string;
    email: string;
    gradeLevel: string;
    studentNumber: number;
    joinedClassroom?: { id: string; name: string } | null;
  },
  classroomNameFallback?: string | null
) {
  const prefixLabel =
    student.prefix === 'MR' ? 'นาย' : student.prefix === 'MISS' ? 'นางสาว' : 'นาง';
  return {
    id: student.id,
    prefix: student.prefix,
    prefixLabel,
    firstName: student.firstName,
    lastName: student.lastName,
    fullName: `${prefixLabel}${student.firstName} ${student.lastName}`,
    email: student.email,
    gradeLevel: student.gradeLevel,
    studentNumber: student.studentNumber,
    classroomName: student.joinedClassroom?.name ?? classroomNameFallback ?? null,
  };
}

async function loadTeacherClassrooms(teacherId: string, classroomId?: string) {
  const classrooms = await prisma.teacherClassroom.findMany({
    where: {
      teacherId,
      ...(classroomId ? { id: classroomId } : {}),
    },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });
  return classrooms;
}

/** ดึงนักเรียนในห้องของอาจารย์ — เข้าด้วยรหัส หรือระดับชั้นตรงชื่อห้อง */
async function findStudentsInClassrooms(
  classrooms: { id: string; name: string }[]
) {
  if (classrooms.length === 0) return [];

  const classroomIds = classrooms.map((c) => c.id);
  const gradeVariants = [...new Set(classrooms.flatMap((c) => gradeNameVariants(c.name)))];
  const classroomByGradeKey = new Map(
    classrooms.flatMap((c) => gradeNameVariants(c.name).map((v) => [normalizeGradeKey(v), c] as const))
  );

  const [joined, byGrade] = await Promise.all([
    prisma.student.findMany({
      where: { isActive: true, joinedClassroomId: { in: classroomIds } },
      include: { joinedClassroom: { select: { id: true, name: true } } },
      orderBy: [{ gradeLevel: 'asc' }, { studentNumber: 'asc' }],
    }),
    prisma.student.findMany({
      where: {
        isActive: true,
        joinedClassroomId: null,
        gradeLevel: { in: gradeVariants },
      },
      include: { joinedClassroom: { select: { id: true, name: true } } },
      orderBy: [{ gradeLevel: 'asc' }, { studentNumber: 'asc' }],
    }),
  ]);

  const byId = new Map<string, ReturnType<typeof mapStudent>>();

  for (const s of joined) {
    byId.set(s.id, mapStudent(s));
  }
  for (const s of byGrade) {
    if (byId.has(s.id)) continue;
    const match = classroomByGradeKey.get(normalizeGradeKey(s.gradeLevel));
    byId.set(s.id, mapStudent(s, match?.name ?? null));
  }

  return [...byId.values()].sort((a, b) => {
    const g = a.gradeLevel.localeCompare(b.gradeLevel, 'th');
    if (g !== 0) return g;
    return a.studentNumber - b.studentNumber;
  });
}

export async function countStudentsInClassroom(
  classroom: { id: string; name: string }
) {
  const list = await findStudentsInClassrooms([classroom]);
  return list.length;
}

function mapCheatLog(log: {
  id: string;
  eventType: string;
  description: string | null;
  isNotified: boolean;
  createdAt: Date;
  student: { prefix: string; firstName: string; lastName: string; gradeLevel: string; studentNumber: number };
  examRoom: { subjectName: string; classCode: string };
}) {
  const prefixLabel =
    log.student.prefix === 'MR' ? 'นาย' : log.student.prefix === 'MISS' ? 'นางสาว' : 'นาง';
  return {
    id: log.id,
    eventType: log.eventType,
    description: log.description,
    isNotified: log.isNotified,
    createdAt: log.createdAt.toISOString(),
    studentName: `${prefixLabel}${log.student.firstName} ${log.student.lastName}`,
    gradeLevel: log.student.gradeLevel,
    studentNumber: log.student.studentNumber,
    subjectName: log.examRoom.subjectName,
    classCode: log.examRoom.classCode,
  };
}

export async function getTeacherDashboard(teacherId: string) {
  const classrooms = await loadTeacherClassrooms(teacherId);
  const classroomStudents = await findStudentsInClassrooms(classrooms);

  const [examRoomCount, cheatCount, recentCheats] = await Promise.all([
    prisma.examRoom.count({ where: { teacherId } }),
    prisma.cheatLog.count({ where: { examRoom: { teacherId } } }),
    prisma.cheatLog.findMany({
      where: { examRoom: { teacherId } },
      include: { student: true, examRoom: true },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
  ]);

  return {
    stats: {
      studentCount: classroomStudents.length,
      examRoomCount,
      cheatCount,
    },
    recentCheats: recentCheats.map(mapCheatLog),
  };
}

export async function listStudents(
  teacherId: string,
  page = 1,
  limit = 10,
  classroomId?: string
) {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(50, Math.max(1, limit));
  const skip = (safePage - 1) * safeLimit;

  const classrooms = await loadTeacherClassrooms(teacherId, classroomId);
  if (classroomId && classrooms.length === 0) {
    return {
      students: [],
      total: 0,
      page: safePage,
      limit: safeLimit,
      totalPages: 1,
    };
  }

  const all = await findStudentsInClassrooms(classrooms);
  const total = all.length;
  const students = all.slice(skip, skip + safeLimit);

  return {
    students,
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.max(1, Math.ceil(total / safeLimit)),
  };
}

export async function listTeacherCheatLogs(teacherId: string, page = 1, limit = 20) {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(50, Math.max(1, limit));
  const skip = (safePage - 1) * safeLimit;

  const where = { examRoom: { teacherId } };

  const [logs, total] = await Promise.all([
    prisma.cheatLog.findMany({
      where,
      include: { student: true, examRoom: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take: safeLimit,
    }),
    prisma.cheatLog.count({ where }),
  ]);

  return {
    cheatLogs: logs.map(mapCheatLog),
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.max(1, Math.ceil(total / safeLimit)),
  };
}

/// รายงานคะแนนรายห้องสอบ — ใช้แสดงผลและ export CSV เพื่อเก็บคะแนน
export async function getExamResults(teacherId: string, examRoomId?: string) {
  const rooms = await prisma.examRoom.findMany({
    where: { teacherId, ...(examRoomId ? { id: examRoomId } : {}) },
    orderBy: { createdAt: 'desc' },
    include: {
      attempts: {
        orderBy: [{ submittedAt: 'desc' }],
        include: { student: true },
      },
      _count: { select: { questions: true } },
    },
  });

  // จำนวนทุจริตต่อคู่ (นักเรียน, ห้องสอบ)
  const cheatCounts = await prisma.cheatLog.groupBy({
    by: ['studentId', 'examRoomId'],
    where: { examRoom: { teacherId } },
    _count: { _all: true },
  });
  const cheatMap = new Map(cheatCounts.map((c) => [`${c.studentId}:${c.examRoomId}`, c._count._all]));

  return rooms.map((room) => ({
    room: {
      id: room.id,
      subjectName: room.subjectName,
      classCode: room.classCode,
      gradeLevel: room.gradeLevel,
      questionCount: room._count.questions,
    },
    attempts: room.attempts.map((a) => {
      const prefixLabel =
        a.student.prefix === 'MR' ? 'นาย' : a.student.prefix === 'MISS' ? 'นางสาว' : 'นาง';
      return {
        attemptId: a.id,
        studentId: a.studentId,
        studentNumber: a.student.studentNumber,
        fullName: `${prefixLabel}${a.student.firstName} ${a.student.lastName}`,
        gradeLevel: a.student.gradeLevel,
        email: a.student.email,
        status: a.status,
        score: a.score,
        maxScore: a.maxScore,
        startedAt: a.startedAt.toISOString(),
        submittedAt: a.submittedAt?.toISOString() ?? null,
        cheatCount: cheatMap.get(`${a.studentId}:${room.id}`) ?? 0,
      };
    }),
  }));
}

const ATTEMPT_STATUS_LABEL: Record<string, string> = {
  IN_PROGRESS: 'กำลังทำ',
  SUBMITTED: 'ส่งแล้ว',
  DISQUALIFIED: 'ถูกตัดสิทธิ์ (ทุจริต)',
};

/// สร้างไฟล์ CSV รายงานคะแนน (มี BOM ให้เปิดใน Excel ภาษาไทยได้)
export async function buildResultsCsv(teacherId: string, examRoomId?: string) {
  const results = await getExamResults(teacherId, examRoomId);

  const rows: string[][] = [
    ['วิชา', 'รหัสห้อง', 'ห้องเรียนที่เปิดสอบ', 'เลขที่', 'ชื่อ-นามสกุล', 'ระดับชั้น', 'อีเมล', 'คะแนน', 'คะแนนเต็ม', 'สถานะ', 'ทุจริต (ครั้ง)', 'ส่งเมื่อ'],
  ];

  for (const { room, attempts } of results) {
    for (const a of attempts) {
      rows.push([
        room.subjectName,
        room.classCode,
        room.gradeLevel ?? 'ทุกห้องเรียน',
        String(a.studentNumber),
        a.fullName,
        a.gradeLevel,
        a.email,
        a.score != null ? String(a.score) : '-',
        a.maxScore != null ? String(a.maxScore) : '-',
        ATTEMPT_STATUS_LABEL[a.status] ?? a.status,
        String(a.cheatCount),
        a.submittedAt ? new Date(a.submittedAt).toLocaleString('th-TH') : '-',
      ]);
    }
  }

  const escape = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const csv = rows.map((r) => r.map(escape).join(',')).join('\r\n');
  return `\uFEFF${csv}`;
}

export async function getTeacherSummary(teacherId: string) {
  const classrooms = await loadTeacherClassrooms(teacherId);
  const classroomStudents = await findStudentsInClassrooms(classrooms);
  const studentIdSet = new Set(classroomStudents.map((s) => s.id));

  const [cheatLogs, examRooms] = await Promise.all([
    prisma.cheatLog.findMany({
      where: { examRoom: { teacherId } },
      include: { student: true, examRoom: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.examRoom.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const cheatByStudent = new Map<string, number>();
  for (const log of cheatLogs) {
    if (!studentIdSet.has(log.studentId)) continue;
    cheatByStudent.set(log.studentId, (cheatByStudent.get(log.studentId) ?? 0) + 1);
  }

  const attempts = await prisma.examAttempt.findMany({
    where: { examRoom: { teacherId }, status: { not: 'IN_PROGRESS' }, maxScore: { not: null } },
    select: { studentId: true, score: true, maxScore: true },
  });
  const scoreAgg = new Map<string, { score: number; max: number }>();
  for (const a of attempts) {
    if (!studentIdSet.has(a.studentId)) continue;
    const agg = scoreAgg.get(a.studentId) ?? { score: 0, max: 0 };
    agg.score += a.score ?? 0;
    agg.max += a.maxScore ?? 0;
    scoreAgg.set(a.studentId, agg);
  }

  const studentSummaries = classroomStudents.map((s) => {
    const cheatCount = cheatByStudent.get(s.id) ?? 0;
    const agg = scoreAgg.get(s.id);
    return {
      id: s.id,
      studentNumber: s.studentNumber,
      fullName: s.fullName,
      gradeLevel: s.gradeLevel,
      email: s.email,
      score: agg && agg.max > 0 ? Math.round((agg.score / agg.max) * 100) : null,
      cheatCount,
      isCheating: cheatCount > 0,
    };
  });

  return {
    totalStudents: classroomStudents.length,
    totalExamRooms: examRooms.length,
    totalCheatEvents: cheatLogs.filter((l) => studentIdSet.has(l.studentId)).length,
    cheatAlerts: cheatLogs.filter((l) => studentIdSet.has(l.studentId)).slice(0, 20).map(mapCheatLog),
    students: studentSummaries,
  };
}
