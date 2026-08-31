import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, validateBody } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/auth';
import { paramId } from '../utils/params';
import { Role } from '../types/roles';
import {
  buildResultsCsv,
  getExamResults,
  getTeacherDashboard,
  getTeacherSummary,
  listStudents,
  listTeacherCheatLogs,
} from '../services/teacherService';

const router = Router();

router.use(authenticate, authorize(Role.TEACHER));

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  classroomId: z.string().min(1).optional(),
  gradeLevel: z.string().max(50).optional(), // legacy — ไม่ใช้แล้ว
});

router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const data = await getTeacherDashboard(req.user!.userId);
    res.json(data);
  })
);

router.get(
  '/students',
  asyncHandler(async (req, res) => {
    const { page, limit, classroomId } = paginationSchema.parse(req.query);
    const data = await listStudents(
      req.user!.userId,
      page ?? 1,
      limit ?? 10,
      classroomId || undefined
    );
    res.json(data);
  })
);

router.get(
  '/cheat-logs',
  asyncHandler(async (req, res) => {
    const { page, limit } = paginationSchema.parse(req.query);
    const data = await listTeacherCheatLogs(req.user!.userId, page ?? 1, limit ?? 20);
    res.json(data);
  })
);

router.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const data = await getTeacherSummary(req.user!.userId);
    res.json(data);
  })
);

// ---------- รายงานคะแนน ----------

router.get(
  '/results',
  asyncHandler(async (req, res) => {
    const examRoomId = typeof req.query.examRoomId === 'string' ? req.query.examRoomId : undefined;
    const results = await getExamResults(req.user!.userId, examRoomId);
    res.json({ results });
  })
);

// ดาวน์โหลดรายงานคะแนนเป็น CSV (เปิดใน Excel ได้)
router.get(
  '/results.csv',
  asyncHandler(async (req, res) => {
    const examRoomId = typeof req.query.examRoomId === 'string' ? req.query.examRoomId : undefined;
    const csv = await buildResultsCsv(req.user!.userId, examRoomId);
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="exam-results-${date}.csv"`);
    res.send(csv);
  })
);

// ---------- ห้องเรียนที่อาจารย์ดูแล (แยกจากห้องสอบ) ----------

function randomJoinCode() {
  return `CLASS${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

async function uniqueJoinCode(prisma: typeof import('../db/prisma').prisma, preferred?: string) {
  if (preferred) {
    const code = preferred.trim().toUpperCase();
    const exists = await prisma.teacherClassroom.findUnique({ where: { joinCode: code } });
    if (exists) throw new Error('JOIN_CODE_TAKEN');
    return code;
  }
  for (let i = 0; i < 10; i++) {
    const code = randomJoinCode();
    const exists = await prisma.teacherClassroom.findUnique({ where: { joinCode: code } });
    if (!exists) return code;
  }
  throw new Error('JOIN_CODE_GENERATION_FAILED');
}

router.get(
  '/classrooms',
  asyncHandler(async (req, res) => {
    const { prisma } = await import('../db/prisma');
    const { countStudentsInClassroom } = await import('../services/teacherService');
    const classrooms = await prisma.teacherClassroom.findMany({
      where: { teacherId: req.user!.userId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, joinCode: true, createdAt: true },
    });

    const withCounts = await Promise.all(
      classrooms.map(async (c) => ({
        id: c.id,
        name: c.name,
        joinCode: c.joinCode,
        studentCount: await countStudentsInClassroom(c),
        createdAt: c.createdAt.toISOString(),
      }))
    );

    res.json({ classrooms: withCounts });
  })
);

router.post(
  '/classrooms',
  validateBody(
    z.object({
      name: z.string().min(2).max(50),
      joinCode: z.string().min(3).max(20).optional(),
      useRandomCode: z.boolean().optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    const { prisma } = await import('../db/prisma');
    const name = String(req.body.name).trim();
    const existing = await prisma.teacherClassroom.findUnique({
      where: { teacherId_name: { teacherId: req.user!.userId, name } },
    });
    if (existing) {
      res.status(409).json({ error: 'มีห้องเรียนนี้อยู่แล้ว' });
      return;
    }

    try {
      const joinCode = await uniqueJoinCode(
        prisma,
        req.body.useRandomCode === false && req.body.joinCode ? req.body.joinCode : undefined
      );
      const classroom = await prisma.teacherClassroom.create({
        data: { teacherId: req.user!.userId, name, joinCode },
        select: { id: true, name: true, joinCode: true, createdAt: true },
      });
      const studentCount = await prisma.student.count({
        where: { isActive: true, gradeLevel: name },
      });
      res.status(201).json({
        classroom: {
          id: classroom.id,
          name: classroom.name,
          joinCode: classroom.joinCode,
          studentCount,
          createdAt: classroom.createdAt.toISOString(),
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'JOIN_CODE_TAKEN') {
        res.status(409).json({ error: 'รหัสเข้าห้องเรียนนี้ถูกใช้แล้ว กรุณาเลือกรหัสอื่น' });
        return;
      }
      throw error;
    }
  })
);

router.delete(
  '/classrooms/:id',
  asyncHandler(async (req, res) => {
    const { prisma } = await import('../db/prisma');
    const classroom = await prisma.teacherClassroom.findFirst({
      where: { id: paramId(req.params.id), teacherId: req.user!.userId },
    });
    if (!classroom) {
      res.status(404).json({ error: 'ไม่พบห้องเรียนนี้' });
      return;
    }
    await prisma.teacherClassroom.delete({ where: { id: classroom.id } });
    res.json({ ok: true });
  })
);

// ---------- วิชาที่อาจารย์สอน ----------

router.get(
  '/subjects',
  asyncHandler(async (req, res) => {
    const { prisma } = await import('../db/prisma');
    const subjects = await prisma.teacherSubject.findMany({
      where: { teacherId: req.user!.userId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
    res.json({ subjects });
  })
);

router.post(
  '/subjects',
  validateBody(z.object({ name: z.string().min(2).max(100) })),
  asyncHandler(async (req, res) => {
    const { prisma } = await import('../db/prisma');
    const name = String(req.body.name).trim();
    const existing = await prisma.teacherSubject.findUnique({
      where: { teacherId_name: { teacherId: req.user!.userId, name } },
    });
    if (existing) {
      res.status(409).json({ error: 'มีวิชานี้อยู่แล้ว' });
      return;
    }
    const subject = await prisma.teacherSubject.create({
      data: { teacherId: req.user!.userId, name },
      select: { id: true, name: true },
    });
    res.status(201).json({ subject });
  })
);

router.delete(
  '/subjects/:id',
  asyncHandler(async (req, res) => {
    const { prisma } = await import('../db/prisma');
    const subject = await prisma.teacherSubject.findFirst({
      where: { id: paramId(req.params.id), teacherId: req.user!.userId },
    });
    if (!subject) {
      res.status(404).json({ error: 'ไม่พบวิชานี้' });
      return;
    }
    await prisma.teacherSubject.delete({ where: { id: subject.id } });
    res.json({ ok: true });
  })
);

// อัปเดตสถานะแจ้งเตือนว่าอ่านแล้ว
router.patch(
  '/cheat-logs/:id/notified',
  validateBody(z.object({ isNotified: z.boolean() })),
  asyncHandler(async (req, res) => {
    const { prisma } = await import('../db/prisma');
    const log = await prisma.cheatLog.findFirst({
      where: {
        id: paramId(req.params.id),
        examRoom: { teacherId: req.user!.userId },
      },
    });
    if (!log) {
      res.status(404).json({ error: 'Cheat log not found' });
      return;
    }
    const updated = await prisma.cheatLog.update({
      where: { id: log.id },
      data: { isNotified: req.body.isNotified },
    });
    res.json({ cheatLog: updated });
  })
);

export default router;
