/**
 * แก้ชื่ออาจารย์ที่มีคำสะกดผิด เช่น 「นาวสาว」→「นางสาว」
 * รัน: npx tsx scripts/fix-thai-names.ts
 */
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { normalizeThaiPersonName } from '../src/utils/thaiText';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const prisma = new PrismaClient();

async function main() {
  const teachers = await prisma.teacher.findMany({ select: { id: true, email: true, fullName: true } });
  let fixed = 0;

  for (const t of teachers) {
    const next = normalizeThaiPersonName(t.fullName);
    if (next !== t.fullName) {
      await prisma.teacher.update({ where: { id: t.id }, data: { fullName: next } });
      console.log(`Fixed teacher ${t.email}: "${t.fullName}" -> "${next}"`);
      fixed += 1;
    }
  }

  console.log(fixed === 0 ? 'No teacher names needed fixing.' : `Fixed ${fixed} teacher name(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
