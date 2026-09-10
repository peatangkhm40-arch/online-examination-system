/** กฎรหัสผ่านมาตรฐาน — ใช้ร่วมกันทั้งหน้า Register และ Backend */
export const PASSWORD_RULES_MESSAGE =
  'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร ประกอบด้วยตัวพิมพ์เล็ก ตัวพิมพ์ใหญ่ ตัวเลข และอักขระพิเศษ (@$!%*#?&)';

export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*#?&]).{8,}$/;

/** ส่วนหน้าอีเมล (ก่อน @) ที่ห้ามนำมาใช้เป็นรหัสผ่าน */
function emailLocalPart(email?: string) {
  const value = (email ?? '').trim().toLowerCase();
  if (!value) return '';
  const at = value.indexOf('@');
  return at > 0 ? value.slice(0, at) : value;
}

export function passwordContainsEmail(password: string, email?: string) {
  const pw = password.toLowerCase();
  const full = (email ?? '').trim().toLowerCase();
  if (full && pw.includes(full)) return true;
  const local = emailLocalPart(email);
  return local.length >= 3 && pw.includes(local);
}

export type PasswordRule = {
  key: string;
  label: string;
  test: (password: string, email?: string) => boolean;
};

/** เงื่อนไขที่แสดงเป็นรายการติ๊กถูกใต้ช่องรหัสผ่าน */
export const PASSWORD_RULES: PasswordRule[] = [
  {
    key: 'length',
    label: 'ต้องมีอย่างน้อย 8 ตัวอักษร',
    test: (pw) => pw.length >= 8,
  },
  {
    key: 'noEmail',
    label: 'ไม่สามารถใส่ที่อยู่อีเมลของคุณได้',
    test: (pw, email) => pw.length > 0 && !passwordContainsEmail(pw, email),
  },
  {
    key: 'mix',
    label: 'จำเป็นต้องประกอบด้วย ภาษาอังกฤษตัวพิมพ์เล็ก, ภาษาอังกฤษตัวพิมพ์ใหญ่ และตัวเลข',
    test: (pw) => /[a-z]/.test(pw) && /[A-Z]/.test(pw) && /\d/.test(pw),
  },
  {
    key: 'special',
    label: 'ต้องมีอักขระพิเศษ (@$!%*#?&)',
    test: (pw) => /[@$!%*#?&]/.test(pw),
  },
];

export function isValidPassword(password: string, email?: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(password, email));
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
    password: 'Admin#K9mP2xQ7',
  },
} as const;
