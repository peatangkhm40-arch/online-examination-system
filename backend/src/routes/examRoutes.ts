import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, validateBody } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/auth';
import { paramId } from '../utils/params';
import { Role } from '../types/roles';
import {
  addQuestion,
  createExam,
  deleteExam,
  deleteQuestion,
  getExamById,
  importQuestionsToExam,
  listExams,
  listGradeLevels,
  updateExam,
  updateExamStatus,
  updateQuestion,
} from '../services/examService';

const router = Router();

const questionBodySchema = z.object({
  questionText: z.string().min(3),
  points: z.number().int().min(1).optional(),
  options: z
    .array(
      z.object({
        optionText: z.string().min(1),
        isCorrect: z.boolean(),
      })
    )
    .min(2)
    .max(6),
});

const importFileFields = {
  importFileName: z.string().min(1).max(255).optional(),
  importFileBase64: z.string().min(1).optional(),
};

const createExamSchema = z
  .object({
    subjectName: z.string().min(2).optional(),
    gradeLevel: z.string().max(50).optional(),
    title: z.string().min(2).optional(),
    examFormat: z.enum(['MANUAL', 'IMPORT_FILE']).optional(),
    roomStatus: z.enum(['OPEN', 'CLOSED']).optional(),
    classCode: z.string().min(3).max(20).optional(),
    examSource: z.string().optional(),
    useRandomCode: z.boolean().optional(),
    description: z.string().optional(),
    durationMinutes: z.number().int().min(1).max(480).optional(),
    passingScore: z.number().int().min(0).max(100).optional(),
    shuffleQuestions: z.boolean().optional(),
    ...importFileFields,
  })
  .refine((d) => !!(d.subjectName ?? d.title), { message: 'subjectName or title is required' })
  .refine(
    (d) => d.examFormat !== 'IMPORT_FILE' || (!!d.importFileName && !!d.importFileBase64),
    { message: 'กรุณาแนบไฟล์คลังข้อสอบเมื่อเลือกรูปแบบนำเข้าไฟล์' }
  );

router.use(authenticate);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const exams = await listExams(req.user!.userId, req.user!.role);
    res.json({ exams });
  })
);

router.get(
  '/grade-levels',
  authorize(Role.TEACHER, Role.ADMIN),
  asyncHandler(async (_req, res) => {
    const gradeLevels = await listGradeLevels();
    res.json({ gradeLevels });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    try {
      const exam = await getExamById(paramId(req.params.id), req.user!.userId, req.user!.role);
      res.json({ exam });
    } catch (error) {
      if (error instanceof Error) {
        const map: Record<string, { status: number; message: string }> = {
          NOT_FOUND: { status: 404, message: 'ไม่พบห้องสอบนี้ หรือห้องถูกลบไปแล้ว' },
          EXAM_CLOSED: { status: 403, message: 'ห้องสอบนี้ยังไม่เปิด หรือถูกปิดแล้ว' },
          EXAM_WRONG_CLASS: {
            status: 403,
            message: 'ห้องสอบนี้ไม่ตรงกับห้องเรียนของคุณ กรุณาเข้าห้องเรียนด้วยรหัสจากอาจารย์ก่อน',
          },
          FORBIDDEN: { status: 403, message: 'ไม่มีสิทธิ์เข้าดูห้องสอบนี้' },
          NOT_COLLEGE_VERIFIED: {
            status: 403,
            message: 'บัญชียังไม่พร้อมเข้าสอบ กรุณารอแอดมินยืนยัน และเข้าห้องเรียนด้วยรหัสจากอาจารย์ก่อน',
          },
        };
        const mapped = map[error.message];
        if (mapped) {
          res.status(mapped.status).json({ error: mapped.message });
          return;
        }
      }
      throw error;
    }
  })
);

router.post(
  '/',
  authorize(Role.TEACHER),
  validateBody(createExamSchema),
  asyncHandler(async (req, res) => {
    try {
      const exam = await createExam(req.user!.userId, req.body);
      res.status(201).json({ exam });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'CLASS_CODE_TAKEN') {
          res.status(409).json({ error: 'รหัสห้องนี้ถูกใช้แล้ว กรุณาเลือกรหัสอื่น' });
          return;
        }
        if (error.message === 'SUBJECT_REQUIRED') {
          res.status(400).json({ error: 'กรุณาระบุชื่อวิชา' });
          return;
        }
        if (error.message === 'IMPORT_FILE_REQUIRED') {
          res.status(400).json({ error: 'กรุณาเลือกไฟล์คลังข้อสอบ' });
          return;
        }
        if (error.message.startsWith('IMPORT_INVALID:')) {
          res.status(400).json({ error: error.message.replace('IMPORT_INVALID:', '') });
          return;
        }
      }
      throw error;
    }
  })
);

router.patch(
  '/:id',
  authorize(Role.TEACHER, Role.ADMIN),
  validateBody(
    z.object({
      subjectName: z.string().min(2).optional(),
      gradeLevel: z.string().max(50).nullable().optional(),
      roomStatus: z.enum(['OPEN', 'CLOSED']).optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    try {
      const exam = await updateExam(paramId(req.params.id), req.user!.userId, req.user!.role, req.body);
      res.json({ exam, message: 'บันทึกห้องสอบแล้ว' });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'NOT_FOUND') {
          res.status(404).json({ error: 'ไม่พบห้องสอบ' });
          return;
        }
        if (error.message === 'FORBIDDEN') {
          res.status(403).json({ error: 'ไม่มีสิทธิ์แก้ไขห้องสอบนี้' });
          return;
        }
        if (error.message === 'SUBJECT_REQUIRED') {
          res.status(400).json({ error: 'กรุณาระบุชื่อวิชา' });
          return;
        }
      }
      throw error;
    }
  })
);

router.post(
  '/:id/import',
  authorize(Role.TEACHER, Role.ADMIN),
  validateBody(
    z.object({
      importFileName: z.string().min(1).max(255),
      importFileBase64: z.string().min(1),
      replaceExisting: z.boolean().optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    try {
      const exam = await importQuestionsToExam(
        paramId(req.params.id),
        req.user!.userId,
        req.user!.role,
        req.body
      );
      res.json({ exam, message: `นำเข้าข้อสอบ ${exam._count?.questions ?? 0} ข้อเรียบร้อย` });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'NOT_FOUND') {
          res.status(404).json({ error: 'ไม่พบห้องสอบ' });
          return;
        }
        if (error.message === 'FORBIDDEN') {
          res.status(403).json({ error: 'ไม่มีสิทธิ์นำเข้าข้อสอบในห้องนี้' });
          return;
        }
        if (error.message.startsWith('IMPORT_INVALID:')) {
          res.status(400).json({ error: error.message.replace('IMPORT_INVALID:', '') });
          return;
        }
      }
      throw error;
    }
  })
);

router.patch(
  '/:id/status',
  authorize(Role.TEACHER, Role.ADMIN),
  validateBody(z.object({ status: z.enum(['PUBLISHED', 'DRAFT', 'ARCHIVED']) })),
  asyncHandler(async (req, res) => {
    try {
      const open = req.body.status === 'PUBLISHED';
      const exam = await updateExamStatus(paramId(req.params.id), req.user!.userId, req.user!.role, open);
      res.json({ exam });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'NOT_FOUND') {
          res.status(404).json({ error: 'ไม่พบห้องสอบ' });
          return;
        }
        if (error.message === 'FORBIDDEN') {
          res.status(403).json({ error: 'ไม่มีสิทธิ์เปลี่ยนสถานะห้องสอบนี้' });
          return;
        }
      }
      throw error;
    }
  })
);

router.delete(
  '/:id',
  authorize(Role.TEACHER, Role.ADMIN),
  asyncHandler(async (req, res) => {
    try {
      const deleted = await deleteExam(paramId(req.params.id), req.user!.userId, req.user!.role);
      res.json({ ok: true, exam: deleted });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'NOT_FOUND') {
          res.status(404).json({ error: 'ไม่พบห้องสอบ' });
          return;
        }
        if (error.message === 'FORBIDDEN') {
          res.status(403).json({ error: 'ไม่มีสิทธิ์ลบห้องสอบนี้' });
          return;
        }
      }
      throw error;
    }
  })
);

router.post(
  '/:id/questions',
  authorize(Role.TEACHER, Role.ADMIN),
  validateBody(questionBodySchema),
  asyncHandler(async (req, res) => {
    try {
      const question = await addQuestion(
        paramId(req.params.id),
        req.user!.userId,
        req.user!.role,
        req.body
      );
      res.status(201).json({ question });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'NOT_FOUND') {
          res.status(404).json({ error: 'ไม่พบห้องสอบ' });
          return;
        }
        if (error.message === 'FORBIDDEN') {
          res.status(403).json({ error: 'ไม่มีสิทธิ์เพิ่มข้อสอบในห้องนี้' });
          return;
        }
        if (error.message === 'NO_CORRECT_OPTION') {
          res.status(400).json({ error: 'ต้องมีตัวเลือกที่ถูกต้องอย่างน้อย 1 ข้อ' });
          return;
        }
      }
      throw error;
    }
  })
);

router.patch(
  '/:id/questions/:questionId',
  authorize(Role.TEACHER, Role.ADMIN),
  validateBody(questionBodySchema),
  asyncHandler(async (req, res) => {
    try {
      const question = await updateQuestion(
        paramId(req.params.id),
        paramId(req.params.questionId),
        req.user!.userId,
        req.user!.role,
        req.body
      );
      res.json({ question, message: 'บันทึกข้อสอบแล้ว' });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'NOT_FOUND') {
          res.status(404).json({ error: 'ไม่พบห้องสอบ' });
          return;
        }
        if (error.message === 'QUESTION_NOT_FOUND') {
          res.status(404).json({ error: 'ไม่พบข้อสอบ' });
          return;
        }
        if (error.message === 'FORBIDDEN') {
          res.status(403).json({ error: 'ไม่มีสิทธิ์แก้ไขข้อสอบในห้องนี้' });
          return;
        }
        if (error.message === 'NO_CORRECT_OPTION') {
          res.status(400).json({ error: 'ต้องมีตัวเลือกที่ถูกต้องอย่างน้อย 1 ข้อ' });
          return;
        }
      }
      throw error;
    }
  })
);

router.delete(
  '/:id/questions/:questionId',
  authorize(Role.TEACHER, Role.ADMIN),
  asyncHandler(async (req, res) => {
    try {
      const deleted = await deleteQuestion(
        paramId(req.params.id),
        paramId(req.params.questionId),
        req.user!.userId,
        req.user!.role
      );
      res.json({ ok: true, question: deleted });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'NOT_FOUND') {
          res.status(404).json({ error: 'ไม่พบห้องสอบ' });
          return;
        }
        if (error.message === 'QUESTION_NOT_FOUND') {
          res.status(404).json({ error: 'ไม่พบข้อสอบ' });
          return;
        }
        if (error.message === 'FORBIDDEN') {
          res.status(403).json({ error: 'ไม่มีสิทธิ์ลบข้อสอบในห้องนี้' });
          return;
        }
      }
      throw error;
    }
  })
);

export default router;
