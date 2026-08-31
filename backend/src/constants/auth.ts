/** กฎรหัสผ่าน — ต้องมีตัวอักษรและตัวเลขอย่างน้อย 8 ตัว */
export const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export const PASSWORD_RULES_MESSAGE =
  'รหัสผ่านต้องมีอย่างน้อย 8 ตัว ประกอบด้วยตัวอักษรและตัวเลข';

export const DEMO_STUDENT_EMAIL = 'nattapong.khaophad@gmail.com';
export const DEMO_STUDENT_PASSWORD = 'Student@2026';
export const DEMO_TEACHER_EMAIL = 'kanya.teacher@college.ac.th';
export const DEMO_TEACHER_PASSWORD = 'Teacher@2026';
export const DEMO_ADMIN_EMAIL = 'admin@college.ac.th';
export const DEMO_ADMIN_PASSWORD = 'Admin@2026';
