/** แก้คำไทยที่มักสะกดผิด / จัดรูปแบบข้อความแสดงผล */

/** แก้คำนำหน้าและช่องว่างที่พบบ่อย */
export function normalizeThaiPersonName(name: string): string {
  return name
    .replace(/นาวสาว/g, 'นางสาว')
    .replace(/นาว\s*สาว/g, 'นางสาว')
    .replace(/นาง\s+สาว/g, 'นางสาว')
    .replace(/\s+/g, ' ')
    .trim();
}

/** แสดงชื่ออาจารย์ — ไม่ซ้ำคำว่า「อาจารย์」ถ้ามีอยู่แล้ว */
export function formatTeacherLabel(teacherName: string): string {
  const name = normalizeThaiPersonName(teacherName);
  if (!name) return 'อาจารย์';
  if (/^(อาจารย์|ครู)/.test(name)) return name;
  return `อาจารย์ ${name}`;
}

/**
 * ข้อความ「คุณอยู่ใน…แล้ว」
 * ถ้าชื่อห้องขึ้นต้นด้วย「ห้อง」อยู่แล้ว จะไม่ซ้ำเป็น「ห้อง ห้อง…」
 */
export function formatInClassroomMessage(classroomName: string): string {
  const name = classroomName.trim();
  if (!name) return 'คุณอยู่ในห้องเรียนแล้ว';
  if (name.startsWith('ห้อง')) {
    return `คุณอยู่ใน${name} แล้ว`;
  }
  return `คุณอยู่ในห้อง ${name} แล้ว`;
}
