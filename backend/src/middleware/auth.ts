import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../db/prisma';
import { Role } from '../types/roles';

export interface AuthPayload {
  userId: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function normalizeRole(role: unknown): Role | null {
  const value = String(role ?? '')
    .trim()
    .toUpperCase();
  if (value === 'STUDENT') return Role.STUDENT;
  if (value === 'TEACHER') return Role.TEACHER;
  if (value === 'ADMIN') return Role.ADMIN;
  return null;
}

export function isStudentRole(role: unknown): boolean {
  return normalizeRole(role) === Role.STUDENT;
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'กรุณาเข้าสู่ระบบก่อน' });
      return;
    }

    const token = header.slice(7);
    const payload = jwt.verify(token, config.jwtSecret) as AuthPayload;
    const role = normalizeRole(payload.role);

    if (role === Role.STUDENT) {
      const student = await prisma.student.findUnique({
        where: { id: payload.userId },
        select: { id: true, isActive: true },
      });
      if (!student?.isActive) {
        res.status(401).json({ error: 'บัญชีไม่ถูกต้องหรือถูกระงับ' });
        return;
      }
    } else if (role === Role.TEACHER) {
      const teacher = await prisma.teacher.findUnique({
        where: { id: payload.userId },
        select: { id: true, isActive: true },
      });
      if (!teacher?.isActive) {
        res.status(401).json({ error: 'บัญชีไม่ถูกต้องหรือถูกระงับ' });
        return;
      }
    } else if (role === Role.ADMIN) {
      const admin = await prisma.admin.findUnique({
        where: { id: payload.userId },
        select: { id: true, isActive: true },
      });
      if (!admin?.isActive) {
        res.status(401).json({ error: 'บัญชีไม่ถูกต้องหรือถูกระงับ' });
        return;
      }
    } else {
      res.status(401).json({ error: 'บัญชีไม่ถูกต้องหรือถูกระงับ' });
      return;
    }

    req.user = { userId: payload.userId, role };
    next();
  } catch {
    res.status(401).json({ error: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' });
  }
}

export function authorize(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'กรุณาเข้าสู่ระบบก่อน' });
      return;
    }
    const userRole = normalizeRole(req.user.role);
    const allowed = roles.map((r) => normalizeRole(r)).filter(Boolean);
    if (!userRole || !allowed.includes(userRole)) {
      res.status(403).json({ error: 'บัญชีนี้ไม่มีสิทธิ์ใช้งานส่วนนี้ กรุณาเข้าสู่ระบบด้วยบัญชีที่ถูกต้อง' });
      return;
    }
    next();
  };
}
