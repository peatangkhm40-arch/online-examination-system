/**
 * คืนชื่ออาจารย์ demo ให้ถูกต้อง (แก้ชื่อที่อาจเพี้ยนจาก encoding)
 * รัน: npx tsx scripts/fix-teacher-name.ts
 */
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const prisma = new PrismaClient();

async function main() {
  const email = 'kanya.teacher@college.ac.th';
  const fullName = 'ครูกัญญา ผัดไทย';

  const updated = await prisma.teacher.update({
    where: { email },
    data: { fullName },
    select: { email: true, fullName: true },
  });

  console.log('Updated teacher:', updated.email, '->', updated.fullName);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
