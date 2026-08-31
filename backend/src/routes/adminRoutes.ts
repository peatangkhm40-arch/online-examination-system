import { Router } from 'express';
import { z } from 'zod';
import { TitlePrefix } from '@prisma/client';
import { asyncHandler, validateBody } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/auth';
import { paramId } from '../utils/params';
import { Role } from '../types/roles';
import { PASSWORD_REGEX, PASSWORD_RULES_MESSAGE } from '../constants/auth';
import {
  createTeacherAccount,
  deleteClassroom,
  deleteStudentAccount,
  deleteTeacherAccount,
  listAllClassrooms,
  listAllExams,
  listStudents,
  listTeachers,
  setTeacherActive,
  updateStudentAccount,
  updateTeacherAccount,
} from '../services/adminService';
import { deleteExam, updateExamStatus } from '../services/examService';

const router = Router();

router.use(authenticate);
router.use(authorize(Role.ADMIN));

const createTeacherSchema = z.object({
  fullName: z.string().trim().min(2, 'กรุณากรอกชื่อ-นามสกุลอาจารย์'),
  email: z.string().trim().email('รูปแบบอีเมลไม่ถูกต้อง'),
  password: z
    .string()
    .min(8, PASSWORD_RULES_MESSAGE)
    .regex(PASSWORD_REGEX, PASSWORD_RULES_MESSAGE),
});

const updateTeacherSchema = z.object({
  fullName: z.string().trim().min(2).optional(),
  email: z.string().trim().email().optional(),
  password: z
    .string()
    .min(8, PASSWORD_RULES_MESSAGE)
    .regex(PASSWORD_REGEX, PASSWORD_RULES_MESSAGE)
    .optional(),
  isActive: z.boolean().optional(),
});

const updateStudentSchema = z.object({
  email: z.string().trim().email().optional(),
  prefix: z.nativeEnum(TitlePrefix).optional(),
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().trim().min(1).optional(),
  gradeLevel: z.string().trim().min(1).optional(),
  studentNumber: z.number().int().min(1).max(99).optional(),
  password: z
    .string()
    .min(8, PASSWORD_RULES_MESSAGE)
    .regex(PASSWORD_REGEX, PASSWORD_RULES_MESSAGE)
    .optional(),
  isActive: z.boolean().optional(),
  isCollegeVerified: z.boolean().optional(),
});

function mapAdminError(error: unknown, res: import('express').Response): boolean {
  if (!(error instanceof Error)) return false;
  const map: Record<string, { status: number; message: string }> = {
    EMAIL_EXISTS: { status: 409, message: 'อีเมลนี้ถูกใช้งานแล้ว' },
    FULL_NAME_REQUIRED: { status: 400, message: 'กรุณากรอกชื่อ-นามสกุล' },
    NOT_FOUND: { status: 404, message: 'ไม่พบข้อมูล' },
    HAS_EXAMS: { status: 409, message: 'ลบไม่ได้ — อาจารย์ยังมีห้องสอบในระบบ กรุณาลบห้องสอบก่อน' },
    PASSWORD_INVALID: { status: 400, message: PASSWORD_RULES_MESSAGE },
    STUDENT_NUMBER_TAKEN: { status: 409, message: 'เลขที่นี้ถูกใช้แล้วในระดับชั้นเดียวกัน' },
    FORBIDDEN: { status: 403, message: 'ไม่มีสิทธิ์ดำเนินการ' },
  };
  if (error.message.startsWith('EMAIL_INVALID:')) {
    res.status(400).json({ error: error.message.replace('EMAIL_INVALID:', '') });
    return true;
  }
  const mapped = map[error.message];
  if (!mapped) return false;
  res.status(mapped.status).json({ error: mapped.message });
  return true;
}

router.get(
  '/teachers',
  asyncHandler(async (_req, res) => {
    const teachers = await listTeachers();
    res.json({ teachers });
  })
);

router.post(
  '/teachers',
  validateBody(createTeacherSchema),
  asyncHandler(async (req, res) => {
    try {
      const teacher = await createTeacherAccount(req.body);
      res.status(201).json({ teacher, message: 'สร้างบัญชีอาจารย์สำเร็จ' });
    } catch (error) {
      if (mapAdminError(error, res)) return;
      throw error;
    }
  })
);

router.patch(
  '/teachers/:id',
  validateBody(updateTeacherSchema),
  asyncHandler(async (req, res) => {
    try {
      const teacher = await updateTeacherAccount(paramId(req.params.id), req.body);
      res.json({ teacher, message: 'บันทึกบัญชีอาจารย์แล้ว' });
    } catch (error) {
      if (mapAdminError(error, res)) return;
      throw error;
    }
  })
);

router.patch(
  '/teachers/:id/active',
  validateBody(z.object({ isActive: z.boolean() })),
  asyncHandler(async (req, res) => {
    try {
      const teacher = await setTeacherActive(paramId(req.params.id), req.body.isActive);
      res.json({
        teacher,
        message: teacher.isActive ? 'เปิดใช้งานบัญชีอาจารย์แล้ว' : 'ระงับบัญชีอาจารย์แล้ว',
      });
    } catch (error) {
      if (mapAdminError(error, res)) return;
      throw error;
    }
  })
);

router.delete(
  '/teachers/:id',
  asyncHandler(async (req, res) => {
    try {
      const deleted = await deleteTeacherAccount(paramId(req.params.id));
      res.json({ ok: true, teacher: deleted, message: 'ลบบัญชีอาจารย์แล้ว' });
    } catch (error) {
      if (mapAdminError(error, res)) return;
      throw error;
    }
  })
);

router.get(
  '/students',
  asyncHandler(async (_req, res) => {
    const students = await listStudents();
    res.json({ students });
  })
);

router.patch(
  '/students/:id',
  validateBody(updateStudentSchema),
  asyncHandler(async (req, res) => {
    try {
      const student = await updateStudentAccount(paramId(req.params.id), req.body);
      res.json({ student, message: 'บันทึกบัญชีนักเรียนแล้ว' });
    } catch (error) {
      if (mapAdminError(error, res)) return;
      throw error;
    }
  })
);

router.delete(
  '/students/:id',
  asyncHandler(async (req, res) => {
    try {
      const deleted = await deleteStudentAccount(paramId(req.params.id));
      res.json({ ok: true, student: deleted, message: 'ลบบัญชีนักเรียนแล้ว' });
    } catch (error) {
      if (mapAdminError(error, res)) return;
      throw error;
    }
  })
);

router.get(
  '/exams',
  asyncHandler(async (_req, res) => {
    const exams = await listAllExams();
    res.json({ exams });
  })
);

router.patch(
  '/exams/:id/status',
  validateBody(z.object({ isActive: z.boolean().optional(), open: z.boolean().optional() })),
  asyncHandler(async (req, res) => {
    try {
      const open = req.body.open ?? req.body.isActive ?? true;
      const exam = await updateExamStatus(paramId(req.params.id), req.user!.userId, Role.ADMIN, open);
      res.json({
        exam,
        message: open ? 'เปิดห้องสอบแล้ว' : 'ปิดห้องสอบแล้ว',
      });
    } catch (error) {
      if (mapAdminError(error, res)) return;
      throw error;
    }
  })
);

router.delete(
  '/exams/:id',
  asyncHandler(async (req, res) => {
    try {
      const deleted = await deleteExam(paramId(req.params.id), req.user!.userId, Role.ADMIN);
      res.json({ ok: true, exam: deleted, message: 'ลบห้องสอบแล้ว' });
    } catch (error) {
      if (mapAdminError(error, res)) return;
      throw error;
    }
  })
);

router.get(
  '/classrooms',
  asyncHandler(async (_req, res) => {
    const classrooms = await listAllClassrooms();
    res.json({ classrooms });
  })
);

router.delete(
  '/classrooms/:id',
  asyncHandler(async (req, res) => {
    try {
      const deleted = await deleteClassroom(paramId(req.params.id));
      res.json({ ok: true, classroom: deleted, message: 'ลบห้องเรียนแล้ว' });
    } catch (error) {
      if (mapAdminError(error, res)) return;
      throw error;
    }
  })
);

export default router;
