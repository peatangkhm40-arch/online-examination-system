/**
 * กฎอีเมลที่ใช้จริง + โดเมนวิทยาลัย
 * - นักเรียน: ใช้อีเมลจริง (ไม่รับเมลชั่วคราว) — แอดมินยืนยันภายหลังว่าเป็นนักเรียนวิทยาลัย
 * - อาจารย์/แอดมิน: ต้องเป็นอีเมลโดเมนวิทยาลัยเท่านั้น
 */

export const COLLEGE_EMAIL_DOMAINS = ['college.ac.th'] as const;

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
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '')
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

export type EmailValidationResult = { ok: true } | { ok: false; error: string };

export function validateStudentEmail(email: string): EmailValidationResult {
  const normalized = normalizeEmail(email);
  if (!normalized || !EMAIL_REGEX.test(normalized) || isDisposableEmail(normalized)) {
    return { ok: false, error: STUDENT_EMAIL_FORMAT_ERROR };
  }
  return { ok: true };
}

export function validateStaffEmail(email: string): EmailValidationResult {
  const normalized = normalizeEmail(email);
  if (!EMAIL_REGEX.test(normalized)) {
    return { ok: false, error: 'รูปแบบอีเมลไม่ถูกต้อง' };
  }
  if (!isCollegeEmail(normalized)) {
    return {
      ok: false,
      error: `อีเมลอาจารย์/ผู้ดูแลต้องเป็นโดเมนวิทยาลัยเท่านั้น (${COLLEGE_EMAIL_DOMAINS.map((d) => `@${d}`).join(', ')})`,
    };
  }
  return { ok: true };
}

export const STUDENT_EMAIL_HINT =
  'กรอกอีเมลจริงที่ใช้งานได้จริงของตนเอง เพื่อใช้รับรหัส OTP สำหรับยืนยันตัวตน หลังจากสมัครแอดมินจะยืนยันว่าเป็นนักเรียนวิทยาลัย';

export const STAFF_EMAIL_HINT = `ใช้อีเมลโดเมนวิทยาลัยของตนเอง เช่น somchai@${COLLEGE_EMAIL_DOMAINS[0]} หรือ nicha2549@${COLLEGE_EMAIL_DOMAINS[0]}`;
