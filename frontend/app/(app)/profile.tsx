import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StudentPageShell } from '@/components/StudentPageShell';
import { useAuth } from '@/context/AuthContext';
import { colors, fonts, gradients } from '@/theme';

const PREFIX: Record<string, string> = { MR: 'นาย', MISS: 'นางสาว', MRS: 'นาง' };

export default function StudentProfileScreen() {
  const { user } = useAuth();
  if (!user) return null;

  const initials = user.fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const rows = [
    { label: 'คำนำหน้า', value: user.prefix ? PREFIX[user.prefix] ?? user.prefix : '-' },
    { label: 'ชื่อ-นามสกุล', value: user.fullName },
    { label: 'อีเมล', value: user.email },
    { label: 'ระดับชั้น', value: user.gradeLevel ?? '-' },
    { label: 'เลขที่', value: user.studentNumber != null ? String(user.studentNumber) : '-' },
    { label: 'บทบาท', value: 'นักเรียน' },
  ];

  return (
    <StudentPageShell title="โปรไฟล์">
      <Text style={{ fontFamily: fonts.bold, fontSize: 22, color: colors.text, marginBottom: 20 }}>โปรไฟล์</Text>

      <LinearGradient colors={[...gradients.hero]} style={{ borderRadius: 16, padding: 20, marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontFamily: fonts.bold, fontSize: 22 }}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 18, color: '#fff' }}>{user.fullName}</Text>
            <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>{user.email}</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={{ backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
        {rows.map((row, i) => (
          <View
            key={row.label}
            style={{
              flexDirection: 'row',
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderBottomWidth: i < rows.length - 1 ? 1 : 0,
              borderBottomColor: colors.border,
            }}
          >
            <Text style={{ width: 110, fontFamily: fonts.medium, fontSize: 14, color: colors.textMuted }}>{row.label}</Text>
            <Text style={{ flex: 1, fontFamily: fonts.semibold, fontSize: 14, color: colors.text }}>{row.value}</Text>
          </View>
        ))}
      </View>

      <View style={{ marginTop: 16, flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
        <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} style={{ marginTop: 1 }} />
        <Text style={{ flex: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, lineHeight: 20 }}>
          หากต้องการแก้ไขข้อมูลโปรดติดต่ออาจารย์หรือผู้ดูแลระบบ
        </Text>
      </View>
    </StudentPageShell>
  );
}
