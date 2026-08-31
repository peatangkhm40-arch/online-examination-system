/** กฎรหัสผ่านมาตรฐาน — ใช้ร่วมกันทั้งหน้า Register และ Backend */
export const PASSWORD_RULES_MESSAGE =
  'รหัสผ่านต้องมีอย่างน้อย 8 ตัว ประกอบด้วยตัวอักษรและตัวเลข';

export const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export function isValidPassword(password: string): boolean {
  return PASSWORD_REGEX.test(password);
}

/** บัญชีทดสอบหลัง seed (อีเมลและรหัสผ่านแบบใช้งานจริง) */
export const DEMO_ACCOUNTS = {
  student: {
    email: 'nattapong.khaophad@gmail.com',
    password: 'Student@2026',
  },
  teacher: {
    email: 'kanya.teacher@college.ac.th',
    password: 'Teacher@2026',
  },
  admin: {
    email: 'admin@college.ac.th',
    password: 'Admin@2026',
  },
} as const;
