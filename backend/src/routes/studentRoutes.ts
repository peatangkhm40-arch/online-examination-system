import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, validateBody } from '../middleware/validate';
import { authenticate, isStudentRole } from '../middleware/auth';
import { joinByCode } from '../services/studentService';

const router = Router();

router.use(authenticate);

router.post(
  '/join',
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
          res.status(400).json({ error: 'กรุณากรอกรหัสเข้าห้อง' });
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
      }
      throw error;
    }
  })
);

export default router;
