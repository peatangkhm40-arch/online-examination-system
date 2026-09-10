/** ระดับชั้นสำหรับลงทะเบียนนักเรียน (ต้องตรงกับชื่อห้องเรียนของอาจารย์) */
const YEARS = [
  { prefix: 'ปวช.', years: [1, 2, 3] },
  { prefix: 'ปวส.', years: [1, 2] },
] as const;

/** จำนวนห้องต่อระดับชั้น — สูงสุด 10 ห้อง */
export const ROOM_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export const YEAR_OPTIONS = YEARS.flatMap(({ prefix, years }) =>
  years.map((year) => {
    const value = `${prefix} ${year}`;
    return { label: value, value };
  })
);

export const ROOM_OPTIONS = ROOM_NUMBERS.map((room) => ({
  label: String(room),
  value: String(room),
}));

export function buildGradeLevel(yearValue: string, roomValue: string): string {
  return `${yearValue.trim()}/${roomValue.trim()}`;
}

export const GRADE_LEVEL_OPTIONS = YEAR_OPTIONS.flatMap((year) =>
  ROOM_NUMBERS.map((room) => {
    const value = buildGradeLevel(year.value, String(room));
    return { label: value, value };
  })
);
