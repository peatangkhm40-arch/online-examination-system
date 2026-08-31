import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { Exam } from '@/types';
import { colors, fonts, gradients } from '@/theme';

interface ExamCardProps {
  exam: Exam;
  onPress: () => void;
  cardWidth?: number;
}

function extractClassCode(description?: string): string | null {
  if (!description) return null;
  const match = description.match(/รหัสห้อง:\s*(\S+)/);
  return match?.[1] ?? null;
}

export function ExamCard({ exam, onPress, cardWidth }: ExamCardProps) {
  const classCode = extractClassCode(exam.description);
  const questionCount = exam._count?.questions ?? 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: cardWidth,
        backgroundColor: colors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
        opacity: pressed ? 0.95 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: 3,
      })}
    >
      <LinearGradient colors={[...gradients.hero]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 4 }} />

      <View style={{ padding: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          {classCode ? (
            <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: colors.backgroundSoft }}>
              <Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: colors.primary }}>{classCode}</Text>
            </View>
          ) : (
            <View />
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: '#ecfdf5' }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success }} />
            <Text style={{ fontFamily: fonts.medium, fontSize: 11, color: colors.success }}>เปิดสอบ</Text>
          </View>
        </View>

        <Text style={{ fontFamily: fonts.bold, fontSize: 17, color: colors.text, marginBottom: 6, lineHeight: 24 }} numberOfLines={2}>
          {exam.title}
        </Text>

        {exam.gradeLevel ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 }}>
            <Ionicons name="people-outline" size={13} color={colors.primary} />
            <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.primary }}>
              สำหรับห้อง {exam.gradeLevel}
            </Text>
          </View>
        ) : null}

        {exam.description ? (
          <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginBottom: 14, lineHeight: 20 }} numberOfLines={2}>
            {exam.description}
          </Text>
        ) : null}

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          {[
            { icon: 'time-outline' as const, value: `${exam.durationMinutes} นาที`, label: 'เวลา' },
            { icon: 'checkmark-circle-outline' as const, value: `${exam.passingScore}%`, label: 'ผ่าน' },
            { icon: 'list-outline' as const, value: `${questionCount}`, label: 'ข้อ' },
          ].map((item) => (
            <View key={item.label} style={{ flex: 1, alignItems: 'center', padding: 10, borderRadius: 10, backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border }}>
              <Ionicons name={item.icon} size={16} color={colors.primary} />
              <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.text, marginTop: 4 }}>{item.value}</Text>
              <Text style={{ fontFamily: fonts.regular, fontSize: 10, color: colors.textMuted }}>{item.label}</Text>
            </View>
          ))}
        </View>

        <LinearGradient colors={[...gradients.button]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: 10, overflow: 'hidden' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11 }}>
            <Ionicons name="enter-outline" size={16} color="#fff" />
            <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: '#fff' }}>เข้าห้องสอบ</Text>
          </View>
        </LinearGradient>
      </View>
    </Pressable>
  );
}
