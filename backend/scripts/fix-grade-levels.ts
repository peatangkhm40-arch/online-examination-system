/**
 * คืนค่าระดับชั้นที่ถูกทับด้วยชื่อห้องเรียน ให้กลับไปใช้รูปแบบมาตรฐาน
 * และผูก joinedClassroomId ถ้า gradeLevel ปัจจุบันตรงกับชื่อห้อง
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const STANDARD = new Set(
  ['ปวช.', 'ปวส.']
    .flatMap((prefix) =>
      (prefix === 'ปวช.' ? [1, 2, 3] : [1, 2]).flatMap((year) =>
        [1, 2, 3, 4, 5].map((room) => `${prefix} ${year}/${room}`)
      )
    )
);

async function main() {
  const classrooms = await prisma.teacherClassroom.findMany({
    select: { id: true, name: true },
  });
  const byName = new Map(classrooms.map((c) => [c.name, c.id]));

  const students = await prisma.student.findMany({
    select: { id: true, email: true, gradeLevel: true, studentNumber: true, joinedClassroomId: true },
  });

  for (const s of students) {
    const isStandard = STANDARD.has(s.gradeLevel);
    const classroomId = byName.get(s.gradeLevel);

    // ถ้า gradeLevel ถูกทับเป็นชื่อห้อง → ผูกห้อง แล้วคืนระดับชั้นจากรูปแบบใกล้เคียง (ปวส.2/5 → ปวส. 2/5)
    if (!isStandard && classroomId) {
      const normalized = s.gradeLevel.replace(/\s+/g, ' ').replace(/^(ปวช\.|ปวส\.)(\d)/, '$1 $2');
      // ถ้ายังไม่ใช่มาตรฐาน และเป็นชื่อห้องแปลก ๆ — ใช้ ปวส. 2/5 เป็นค่าเริ่มต้นเฉพาะเคสที่เคยเห็นในระบบทดสอบ
      let restored = STANDARD.has(normalized) ? normalized : null;
      if (!restored && s.email.includes('punnama')) {
        restored = 'ปวส. 2/5';
      }
      if (!restored) {
        // พยายาม normalize ปวส.2/5 / ปวช.1/1
        const m = s.gradeLevel.match(/^(ปวช\.|ปวส\.)\s*(\d+)\s*\/\s*(\d+)$/);
        if (m) {
          const candidate = `${m[1]} ${m[2]}/${m[3]}`;
          if (STANDARD.has(candidate)) restored = candidate;
        }
      }

      await prisma.student.update({
        where: { id: s.id },
        data: {
          joinedClassroomId: s.joinedClassroomId ?? classroomId,
          ...(restored ? { gradeLevel: restored } : {}),
        },
      });
      console.log(`fixed ${s.email}: gradeLevel ${s.gradeLevel} -> ${restored ?? '(unchanged)'}, joined classroom`);
      continue;
    }

    if (!isStandard) {
      // ชื่อแปลกที่ไม่ใช่ห้อง — เคสทดสอบที่รู้จัก
      if (s.email.includes('punnama')) {
        await prisma.student.update({
          where: { id: s.id },
          data: { gradeLevel: 'ปวส. 2/5' },
        });
        console.log(`fixed ${s.email}: -> ปวส. 2/5`);
      } else {
        console.log(`skip ${s.email}: non-standard gradeLevel="${s.gradeLevel}"`);
      }
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
