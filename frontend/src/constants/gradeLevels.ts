/** ระดับชั้นสำหรับ dropdown ลงทะเบียนนักเรียน (ต้องตรงกับชื่อห้องเรียนของอาจารย์) */
const YEARS = [
  { prefix: 'ปวช.', years: [1, 2, 3] },
  { prefix: 'ปวส.', years: [1, 2] },
] as const;

const ROOMS = [1, 2, 3, 4, 5];

export const GRADE_LEVEL_OPTIONS = YEARS.flatMap(({ prefix, years }) =>
  years.flatMap((year) =>
    ROOMS.map((room) => {
      const value = `${prefix} ${year}/${room}`;
      return { label: value, value };
    })
  )
);
