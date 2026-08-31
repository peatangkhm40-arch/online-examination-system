import { readFileSync } from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { importQuestionsToExam } from '../src/services/examService';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const room = await prisma.examRoom.findFirst({
    orderBy: { createdAt: 'desc' },
  });
  if (!room) {
    console.error('ไม่พบห้องสอบ — ให้สร้างห้องสอบก่อนแล้วค่อยรันสคริปต์นี้');
    process.exit(1);
  }

  const samplePath = path.resolve(__dirname, '../../frontend/public/sample-exam.json');
  const base64 = readFileSync(samplePath).toString('base64');

  const exam = await importQuestionsToExam(room.id, room.teacherId, {
    importFileName: 'sample-exam.json',
    importFileBase64: base64,
    replaceExisting: true,
  });

  console.log('โหลดข้อสอบตัวอย่างสำเร็จ:', {
    subject: exam.title,
    classCode: exam.classCode,
    questions: exam._count?.questions,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
