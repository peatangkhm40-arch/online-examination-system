import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StudentPageShell } from '@/components/StudentPageShell';
import { EXAM_RULES } from '@/constants/examRules';
import { colors, fonts } from '@/theme';

export default function ExamRulesScreen() {
  return (
    <StudentPageShell title="กฎการสอบ">
      <Text style={{ fontFamily: fonts.bold, fontSize: 22, color: colors.text }}>กฎการสอบ</Text>
      <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginTop: 4, marginBottom: 20 }}>
        ข้อปฏิบัติระหว่างทำข้อสอบและระบบป้องกันการทุจริต
      </Text>

      <View style={{ padding: 16, borderRadius: 14, backgroundColor: colors.backgroundSoft, borderWidth: 1, borderColor: '#c7d2fe', marginBottom: 16, flexDirection: 'row', gap: 12 }}>
        <Ionicons name="shield-checkmark" size={22} color={colors.primary} />
        <Text style={{ flex: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.text, lineHeight: 20 }}>
          ระบบตรวจจับการสลับแท็บ การออกจากหน้าจอ และพฤติกรรมที่น่าสงสัยแบบเรียลไทม์ และแจ้งอาจารย์ทันที
        </Text>
      </View>

      {EXAM_RULES.map((rule) => (
        <View
          key={rule.title}
          style={{
            backgroundColor: colors.surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 16,
            marginBottom: 12,
            flexDirection: 'row',
            gap: 14,
          }}
        >
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.backgroundSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={rule.icon} size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.text }}>{rule.title}</Text>
            <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginTop: 4, lineHeight: 20 }}>
              {rule.detail}
            </Text>
          </View>
        </View>
      ))}
    </StudentPageShell>
  );
}
