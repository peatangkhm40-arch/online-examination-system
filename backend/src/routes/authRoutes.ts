import { Router } from 'express';
import { TitlePrefix } from '@prisma/client';
import { z } from 'zod';
import { asyncHandler, validateBody } from '../middleware/validate';
import { authenticate, isStudentRole } from '../middleware/auth';
import { PASSWORD_REGEX, PASSWORD_RULES_MESSAGE } from '../constants/auth';
import { getMe, loginUser, registerStudent, updateProfile } from '../services/authService';
import { joinByCode } from '../services/studentService';

const router = Router();

const registerSchema = z.object({
  prefix: z.nativeEnum(TitlePrefix),
  firstName: z.string().trim().min(1, 'กรุณากรอกชื่อ'),
  lastName: z.string().trim().min(1, 'กรุณากรอกนามสกุล'),
  email: z
    .string()
    .trim()
    .refine((v) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v.toLowerCase()), {
      message: 'กรุณากรอกรูปแบบอีเมลให้ถูกต้องเพื่อใช้สำหรับรับรหัส OTP',
    }),
  password: z
    .string()
    .min(8, PASSWORD_RULES_MESSAGE)
    .regex(PASSWORD_REGEX, PASSWORD_RULES_MESSAGE),
  gradeLevel: z.string().trim().min(1, 'กรุณาเลือกระดับชั้น'),
  studentNumber: z.number().int().min(1).max(99),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const updateProfileSchema = z
  .object({
    email: z.string().trim().email('รูปแบบอีเมลไม่ถูกต้อง').optional(),
    fullName: z.string().trim().min(1, 'กรุณากรอกชื่อ-นามสกุล').optional(),
    prefix: z.nativeEnum(TitlePrefix).optional(),
    firstName: z.string().trim().min(1, 'กรุณากรอกชื่อ').optional(),
    lastName: z.string().trim().min(1, 'กรุณากรอกนามสกุล').optional(),
    gradeLevel: z.string().trim().min(1).optional(),
    studentNumber: z.number().int().min(1).max(99).optional(),
    currentPassword: z.string().optional(),
    newPassword: z
      .string()
      .min(8, PASSWORD_RULES_MESSAGE)
      .regex(PASSWORD_REGEX, PASSWORD_RULES_MESSAGE)
      .optional(),
  })
  .refine((d) => !d.newPassword || !!d.currentPassword, {
    message: 'กรุณากรอกรหัสผ่านปัจจุบันเมื่อต้องการเปลี่ยนรหัสผ่าน',
    path: ['currentPassword'],
  });

router.post(
  '/register',
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    try {
      const result = await registerStudent(req.body);
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'EMAIL_EXISTS') {
          res.status(409).json({ error: 'อีเมลนี้ถูกใช้งานแล้ว' });
          return;
        }
        if (error.message.startsWith('EMAIL_INVALID:')) {
          res.status(400).json({ error: error.message.replace('EMAIL_INVALID:', '') });
          return;
        }
        if (error.message === 'STUDENT_NUMBER_TAKEN') {
          res.status(409).json({ error: 'เลขที่นี้ถูกใช้แล้วในระดับชั้นนี้ กรุณาเลือกเลขที่อื่น' });
          return;
        }
      }
      throw error;
    }
  })
);

router.post(
  '/login',
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    try {
      const result = await loginUser(req.body.email, req.body.password);
      res.json(result);
    } catch (error) {
      if (error instanceof Error && error.message === 'INVALID_CREDENTIALS') {
        res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
        return;
      }
      throw error;
    }
  })
);

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await getMe(req.user!.userId, req.user!.role);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ user });
  })
);

router.patch(
  '/me',
  authenticate,
  validateBody(updateProfileSchema),
  asyncHandler(async (req, res) => {
    try {
      const user = await updateProfile(req.user!.userId, req.user!.role, req.body);
      res.json({ user, message: 'บันทึกโปรไฟล์สำเร็จ' });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'EMAIL_EXISTS') {
          res.status(409).json({ error: 'อีเมลนี้ถูกใช้งานแล้ว' });
          return;
        }
        if (error.message === 'STUDENT_NUMBER_TAKEN') {
          res.status(409).json({ error: 'เลขที่นี้ถูกใช้แล้วในระดับชั้นนี้ กรุณาเลือกเลขที่อื่น' });
          return;
        }
        if (error.message === 'CURRENT_PASSWORD_REQUIRED') {
          res.status(400).json({ error: 'กรุณากรอกรหัสผ่านปัจจุบัน' });
          return;
        }
        if (error.message === 'CURRENT_PASSWORD_INVALID') {
          res.status(400).json({ error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });
          return;
        }
        if (error.message === 'NOT_FOUND') {
          res.status(404).json({ error: 'ไม่พบผู้ใช้' });
          return;
        }
      }
      throw error;
    }
  })
);

/** นักเรียนเข้าห้องเรียนด้วยรหัส (รออาจารย์เปิดห้องสอบทีหลังได้) */
router.post(
  '/join-classroom',
  authenticate,
  validateBody(
    z.object({
      code: z.string().trim().min(3, 'กรุณากรอกรหัสอย่างน้อย 3 ตัวอักษร').max(30),
    })
  ),
  asyncHandler(async (req, res) => {
    if (!isStudentRole(req.user?.role)) {
      res.status(403).json({
        error: 'เฉพาะนักเรียนเท่านั้นที่เข้าห้องเรียนด้วยรหัสได้ — กรุณาออกจากระบบแล้วเข้าใหม่ด้วยบัญชีนักเรียน',
      });
      return;
    }

    try {
      const result = await joinByCode(req.user!.userId, req.body.code);
      res.json(result);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'CODE_REQUIRED') {
          res.status(400).json({ error: 'กรุณากรอกรหัสเข้าห้องเรียน' });
          return;
        }
        if (error.message === 'CODE_NOT_FOUND') {
          res.status(404).json({ error: 'ไม่พบรหัสนี้ กรุณาตรวจสอบรหัสเข้าห้องเรียนจากอาจารย์อีกครั้ง' });
          return;
        }
        if (error.message === 'EXAM_CLOSED') {
          res.status(403).json({ error: 'ห้องสอบนี้ยังไม่เปิด หรือถูกปิดแล้ว' });
          return;
        }
        if (error.message === 'EXAM_WRONG_CLASS') {
          res.status(403).json({
            error: 'ห้องสอบนี้ไม่ตรงกับห้องเรียนของคุณ กรุณาเข้าห้องเรียนด้วยรหัสจากอาจารย์ก่อน',
          });
          return;
        }
        if (error.message === 'STUDENT_NUMBER_TAKEN') {
          res.status(409).json({
            error: 'เลขที่ของคุณซ้ำกับนักเรียนในห้องนี้แล้ว ติดต่ออาจารย์เพื่อปรับเลขที่',
          });
          return;
        }
        if (error.message === 'NOT_FOUND') {
          res.status(404).json({ error: 'ไม่พบข้อมูลนักเรียน' });
          return;
        }
        if (error.message === 'NOT_COLLEGE_VERIFIED') {
          res.status(403).json({
            error: 'บัญชียังไม่ผ่านการยืนยันจากแอดมินว่าเป็นนักเรียนวิทยาลัย กรุณารอการตรวจสอบ',
          });
          return;
        }
      }
      throw error;
    }
  })
);

export default router;
