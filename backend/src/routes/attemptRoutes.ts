import { Router } from 'express';
import { CheatEventType } from '@prisma/client';
import { z } from 'zod';
import { asyncHandler, validateBody } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/auth';
import { paramId } from '../utils/params';
import { Role } from '../types/roles';
import {
  getAttemptResult,
  listStudentAttempts,
  recordCheatEvent,
  saveAnswer,
  startAttempt,
  submitAttempt,
} from '../services/attemptService';

const router = Router();

router.use(authenticate);

// ประวัติ/คะแนนของนักเรียนคนปัจจุบัน (ต้องอยู่ก่อน /:attemptId)
router.get(
  '/mine',
  authorize(Role.STUDENT),
  asyncHandler(async (req, res) => {
    const attempts = await listStudentAttempts(req.user!.userId);
    res.json({ attempts });
  })
);

router.post(
  '/start/:examId',
  authorize(Role.STUDENT),
  asyncHandler(async (req, res) => {
    try {
      const attempt = await startAttempt(req.user!.userId, paramId(req.params.examId));
      res.status(201).json({ attempt });
    } catch (error) {
      if (error instanceof Error) {
        const map: Record<string, { status: number; message: string }> = {
          EXAM_NOT_AVAILABLE: { status: 404, message: 'ไม่พบห้องสอบ หรือห้องสอบไม่เปิดให้ห้องเรียนของคุณ' },
          EXAM_NO_QUESTIONS: { status: 400, message: 'ห้องสอบนี้ยังไม่มีข้อสอบ' },
          ALREADY_COMPLETED: { status: 409, message: 'คุณทำข้อสอบห้องนี้ไปแล้ว' },
          NOT_COLLEGE_VERIFIED: {
            status: 403,
            message: 'บัญชียังไม่ผ่านการยืนยันจากแอดมินว่าเป็นนักเรียนวิทยาลัย กรุณารอการตรวจสอบ',
          },
          NOT_FOUND: { status: 401, message: 'บัญชีไม่ถูกต้องหรือถูกระงับ' },
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

router.put(
  '/:attemptId/answers',
  authorize(Role.STUDENT),
  validateBody(
    z.object({
      questionId: z.string(),
      selectedOptionId: z.string(),
    })
  ),
  asyncHandler(async (req, res) => {
    try {
      const result = await saveAnswer(
        paramId(req.params.attemptId),
        req.user!.userId,
        req.body.questionId,
        req.body.selectedOptionId
      );
      res.json(result);
    } catch (error) {
      if (error instanceof Error && error.message === 'ATTEMPT_NOT_FOUND') {
        res.status(404).json({ error: 'Active attempt not found' });
        return;
      }
      throw error;
    }
  })
);

router.post(
  '/:attemptId/submit',
  authorize(Role.STUDENT),
  asyncHandler(async (req, res) => {
    try {
      const attempt = await submitAttempt(paramId(req.params.attemptId), req.user!.userId);
      res.json({ attempt });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'ATTEMPT_NOT_FOUND') {
          res.status(404).json({ error: 'Attempt not found' });
          return;
        }
        if (error.message === 'ALREADY_SUBMITTED') {
          res.status(409).json({ error: 'Attempt already submitted' });
          return;
        }
      }
      throw error;
    }
  })
);

router.get(
  '/:attemptId',
  asyncHandler(async (req, res) => {
    const attempt = await getAttemptResult(
      paramId(req.params.attemptId),
      req.user!.userId,
      req.user!.role === Role.STUDENT
    );
    if (!attempt) {
      res.status(404).json({ error: 'Attempt not found' });
      return;
    }
    res.json({ attempt });
  })
);

router.post(
  '/:attemptId/cheat-events',
  authorize(Role.STUDENT),
  validateBody(
    z.object({
      // รับทั้งค่า Prisma และ alias จาก frontend แล้ว map ทีหลัง
      eventType: z.string().min(1),
      metadata: z.record(z.unknown()).optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    try {
      const raw = String(req.body.eventType).toUpperCase();
      const alias: Record<string, CheatEventType> = {
        TAB_SWITCH: CheatEventType.TAB_SWITCH,
        APP_SWITCH: CheatEventType.APP_SWITCH,
        WINDOW_BLUR: CheatEventType.WINDOW_BLUR,
        PAGE_HIDDEN: CheatEventType.PAGE_HIDDEN,
        FULLSCREEN_EXIT: CheatEventType.FULLSCREEN_EXIT,
        OTHER: CheatEventType.OTHER,
        COPY_ATTEMPT: CheatEventType.OTHER,
        PASTE_ATTEMPT: CheatEventType.OTHER,
        RIGHT_CLICK: CheatEventType.OTHER,
        DEVTOOLS_SUSPECTED: CheatEventType.OTHER,
      };
      const eventType = alias[raw] ?? CheatEventType.OTHER;

      const result = await recordCheatEvent(
        paramId(req.params.attemptId),
        req.user!.userId,
        eventType,
        { ...(req.body.metadata ?? {}), clientEventType: raw }
      );
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof Error && error.message === 'ATTEMPT_NOT_FOUND') {
        res.status(404).json({ error: 'ไม่พบการทำข้อสอบนี้' });
        return;
      }
      throw error;
    }
  })
);

export default router;
