import { Linking, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StudentPageShell } from '@/components/StudentPageShell';
import { colors, fonts } from '@/theme';

const FAQ = [
  {
    q: 'ลืมรหัสผ่านต้องทำอย่างไร?',
    a: 'ติดต่ออาจารย์ประจำวิชาหรือผู้ดูแลระบบเพื่อรีเซ็ตรหัสผ่านให้',
  },
  {
    q: 'เข้าห้องสอบไม่เจอข้อสอบ?',
    a: 'ต้องเข้าห้องเรียนด้วยรหัสจากอาจารย์ก่อน แล้วรออาจารย์สร้าง/เปิดห้องสอบ เมื่อเปิดแล้ว ข้อสอบจะขึ้นที่หน้าหลักเอง',
  },
  {
    q: 'ทำไมถูกตัดสิทธิ์?',
    a: 'ระบบนับพฤติกรรมทุจริต เช่น สลับแท็บหรือออกจากหน้าข้อสอบ หากครบจำนวนที่กำหนดจะถูกตัดสิทธิ์อัตโนมัติ',
  },
  {
    q: 'คะแนนอยู่ที่ไหน?',
    a: 'หลังส่งข้อสอบ ดูได้ที่เมนู "ประวัติการสอบ" และอาจารย์จะเห็นรายงานคะแนนด้วย',
  },
];

export default function HelpScreen() {
  return (
    <StudentPageShell title="ช่วยเหลือ / ติดต่อ">
      <Text style={{ fontFamily: fonts.bold, fontSize: 22, color: colors.text }}>ช่วยเหลือ / ติดต่อ</Text>
      <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginTop: 4, marginBottom: 20 }}>
        คำถามที่พบบ่อย และช่องทางติดต่อเมื่อมีปัญหา
      </Text>

      <View style={{ backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 18, marginBottom: 20 }}>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.text, marginBottom: 12 }}>ติดต่อผู้ดูแล</Text>
        {[
          { icon: 'mail-outline' as const, label: 'อีเมล', value: 'support@college.ac.th', href: 'mailto:support@college.ac.th' },
          { icon: 'call-outline' as const, label: 'โทร', value: '02-000-0000', href: 'tel:020000000' },
        ].map((c) => (
          <Pressable
            key={c.label}
            onPress={() => Linking.openURL(c.href)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}
          >
            <Ionicons name={c.icon} size={20} color={colors.primary} />
            <View>
              <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted }}>{c.label}</Text>
              <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.primary }}>{c.value}</Text>
            </View>
          </Pressable>
        ))}
      </View>

      <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.text, marginBottom: 12 }}>คำถามที่พบบ่อย</Text>
      {FAQ.map((item) => (
        <View
          key={item.q}
          style={{
            backgroundColor: colors.surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 16,
            marginBottom: 10,
          }}
        >
          <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.text }}>{item.q}</Text>
          <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginTop: 6, lineHeight: 20 }}>
            {item.a}
          </Text>
        </View>
      ))}
    </StudentPageShell>
  );
}
