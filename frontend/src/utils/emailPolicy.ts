/**
 * กฎอีเมลที่ใช้จริง + โดเมนวิทยาลัย (ฝั่ง frontend — ให้ตรงกับ backend)
 */

export const COLLEGE_EMAIL_DOMAINS = ['college.ac.th'] as const;

/** โดเมนเมลชั่วคราวที่บล็อก — เทียบแบบ exact / subdomain เท่านั้น */
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com',
  'guerrillamail.com',
  'guerrillamail.net',
  'tempmail.com',
  'temp-mail.org',
  '10minutemail.com',
  'yopmail.com',
  'trashmail.com',
  'sharklasers.com',
  'getnada.com',
  'maildrop.cc',
  'discard.email',
  'fakeinbox.com',
  'example.com',
  'example.org',
]);

/** รองรับตัวอักษร ตัวเลข จุด และอักขระทั่วไปในอีเมล */
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const STUDENT_EMAIL_FORMAT_ERROR =
  'กรุณากรอกรูปแบบอีเมลให้ถูกต้องเพื่อใช้สำหรับรับรหัส OTP';

export function normalizeEmail(email: string) {
  return email
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '') // ลบอักขระล่องหน/ช่องว่างพิเศษตอนวาง
    .trim()
    .toLowerCase();
}

export function getEmailDomain(email: string) {
  const normalized = normalizeEmail(email);
  const at = normalized.lastIndexOf('@');
  if (at < 0) return '';
  return normalized.slice(at + 1);
}

export function isCollegeEmail(email: string) {
  const domain = getEmailDomain(email);
  return COLLEGE_EMAIL_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`));
}

export function isDisposableEmail(email: string) {
  const domain = getEmailDomain(email);
  if (!domain) return false;
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) return true;
  for (const blocked of DISPOSABLE_EMAIL_DOMAINS) {
    if (domain.endsWith(`.${blocked}`)) return true;
  }
  return false;
}

/** คืน null เมื่อผ่าน — ใช้ซ่อนกล่องแดงได้ทันที */
export function validateStudentEmail(email: string): string | null {
  const normalized = normalizeEmail(email);
  if (!normalized) return STUDENT_EMAIL_FORMAT_ERROR;
  if (!EMAIL_REGEX.test(normalized)) return STUDENT_EMAIL_FORMAT_ERROR;
  if (isDisposableEmail(normalized)) return STUDENT_EMAIL_FORMAT_ERROR;
  return null;
}

export function isValidStudentEmail(email: string): boolean {
  return validateStudentEmail(email) === null;
}

export function validateStaffEmail(email: string): string | null {
  const normalized = normalizeEmail(email);
  if (!EMAIL_REGEX.test(normalized)) return 'รูปแบบอีเมลไม่ถูกต้อง';
  if (!isCollegeEmail(normalized)) {
    return `อีเมลอาจารย์ต้องเป็นโดเมนวิทยาลัยเท่านั้น (@${COLLEGE_EMAIL_DOMAINS[0]})`;
  }
  return null;
}

export const STUDENT_EMAIL_HINT =
  'กรอกอีเมลจริงที่ใช้งานได้จริงของตนเอง เพื่อใช้รับรหัส OTP สำหรับยืนยันตัวตน หลังจากสมัครแอดมินจะยืนยันว่าเป็นนักเรียนวิทยาลัย';

export const STAFF_EMAIL_HINT = `ใช้อีเมลโดเมนวิทยาลัยของตนเอง เช่น somchai@${COLLEGE_EMAIL_DOMAINS[0]} หรือ nicha2549@${COLLEGE_EMAIL_DOMAINS[0]}`;
