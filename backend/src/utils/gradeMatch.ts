/** เทียบระดับชั้นแบบยืดหยุ่น เช่น "ปวส. 2/4" กับ "ปวส.2/4" */
export function normalizeGradeKey(value: string) {
  return value.replace(/\s+/g, '').toLowerCase();
}

export function gradesMatch(a: string | null | undefined, b: string | null | undefined) {
  if (!a || !b) return false;
  return normalizeGradeKey(a) === normalizeGradeKey(b);
}
