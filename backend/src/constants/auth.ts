/** กฎรหัสผ่าน — 8 ตัวขึ้นไป มีพิมพ์เล็ก พิมพ์ใหญ่ ตัวเลข และอักขระพิเศษ */
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*#?&]).{8,}$/;

export const PASSWORD_RULES_MESSAGE =
  'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร ประกอบด้วยตัวพิมพ์เล็ก ตัวพิมพ์ใหญ่ ตัวเลข และอักขระพิเศษ (@$!%*#?&)';

export const PASSWORD_EMAIL_MESSAGE = 'รหัสผ่านต้องไม่มีที่อยู่อีเมลของคุณอยู่ในนั้น';

function emailLocalPart(email?: string) {
  const value = (email ?? '').trim().toLowerCase();
  if (!value) return '';
  const at = value.indexOf('@');
  return at > 0 ? value.slice(0, at) : value;
}

/** รหัสผ่านต้องไม่มีอีเมล (หรือส่วนหน้า @) ของผู้ใช้ */
export function passwordContainsEmail(password: string, email?: string) {
  const pw = password.toLowerCase();
  const full = (email ?? '').trim().toLowerCase();
  if (full && pw.includes(full)) return true;
  const local = emailLocalPart(email);
  return local.length >= 3 && pw.includes(local);
}

export const DEMO_STUDENT_EMAIL = 'nattapong.khaophad@gmail.com';
export const DEMO_STUDENT_PASSWORD = 'Student@2026';
export const DEMO_TEACHER_EMAIL = 'kanya.teacher@college.ac.th';
export const DEMO_TEACHER_PASSWORD = 'Teacher@2026';
export const DEMO_ADMIN_EMAIL = 'admin@college.ac.th';
export const DEMO_ADMIN_PASSWORD = 'Admin#K9mP2xQ7';
