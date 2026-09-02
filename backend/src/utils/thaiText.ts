/** แก้คำไทยที่มักสะกดผิดตอนบันทึก/แสดงผล */

export function normalizeThaiPersonName(name: string): string {
  return name
    .replace(/นาวสาว/g, 'นางสาว')
    .replace(/นาว\s*สาว/g, 'นางสาว')
    .replace(/นาง\s+สาว/g, 'นางสาว')
    .replace(/\s+/g, ' ')
    .trim();
}
