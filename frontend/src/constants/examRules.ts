import { Ionicons } from '@expo/vector-icons';

export const EXAM_RULES: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  detail: string;
}[] = [
  {
    icon: 'phone-portrait-outline',
    title: 'ห้ามสลับแอปหรือแท็บ',
    detail: 'ระหว่างทำข้อสอบ ห้ามสลับแท็บเบราว์เซอร์ หรือออกจากหน้าข้อสอบ ระบบจะบันทึกพฤติกรรมทันที',
  },
  {
    icon: 'expand-outline',
    title: 'อยู่ในหน้าข้อสอบตลอดเวลา',
    detail: 'หากหน้าต่างเสียโฟกัสหรือหน้าถูกซ่อน ระบบจะนับเป็นเหตุการณ์ที่น่าสงสัย',
  },
  {
    icon: 'warning-outline',
    title: 'ครบ 5 ครั้งถูกตัดสิทธิ์',
    detail: 'เมื่อพบพฤติกรรมทุจริตครบจำนวนที่กำหนด ระบบจะปิดการสอบและบันทึกคะแนนเท่าที่ทำได้',
  },
  {
    icon: 'eye-off-outline',
    title: 'ไม่แสดงเฉลยรายข้อ',
    detail: 'หลังสอบเสร็จจะเห็นเฉพาะคะแนนรวม ไม่บอกว่าข้อไหนถูกหรือผิด เพื่อป้องกันการส่งเฉลยต่อ',
  },
  {
    icon: 'time-outline',
    title: 'หมดเวลาส่งอัตโนมัติ',
    detail: 'เมื่อหมดเวลาทำข้อสอบ ระบบจะส่งคำตอบให้อัตโนมัติและบันทึกคะแนนทันที',
  },
];
