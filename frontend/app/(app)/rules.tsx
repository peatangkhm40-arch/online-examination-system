import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StudentPageShell } from '@/components/StudentPageShell';
import { EXAM_RULES } from '@/constants/examRules';
import { colors, fonts } from '@/theme';

export default function ExamRulesScreen() {
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
  const selected = EXAM_RULES.find((r) => r.title === selectedTitle) ?? null;

  return (
    <StudentPageShell title="กฎการสอบ">
      {selected ? (
        <View>
          <Pressable
            onPress={() => setSelectedTitle(null)}
            accessibilityLabel="ย้อนกลับ"
            style={({ pressed }) => ({
              alignSelf: 'flex-start',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              minHeight: 44,
              paddingHorizontal: 14,
              paddingVertical: 10,
              marginBottom: 16,
              borderRadius: 12,
              borderWidth: 1.5,
              borderColor: colors.primary,
              backgroundColor: pressed ? colors.backgroundSoft : colors.surface,
              cursor: 'pointer' as const,
            })}
          >
            <Ionicons name="arrow-back" size={18} color={colors.primary} />
            <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.primary }}>ย้อนกลับ</Text>
          </Pressable>

          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 20,
            }}
          >
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  backgroundColor: colors.backgroundSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                }}
              >
                <Ionicons name={selected.icon} size={28} color={colors.primary} />
              </View>
              <Text style={{ fontFamily: fonts.bold, fontSize: 20, color: colors.text, textAlign: 'center' }}>
                {selected.title}
              </Text>
            </View>
            <Text style={{ fontFamily: fonts.regular, fontSize: 15, color: colors.text, lineHeight: 24 }}>
              {selected.body}
            </Text>
          </View>
        </View>
      ) : (
        <>
          <Text style={{ fontFamily: fonts.bold, fontSize: 22, color: colors.text }}>กฎการสอบ</Text>
          <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginTop: 4, marginBottom: 20 }}>
            สำหรับนักเรียน — กดแต่ละข้อเพื่อเข้าไปอ่านรายละเอียด
          </Text>

          <View
            style={{
              padding: 16,
              borderRadius: 14,
              backgroundColor: colors.backgroundSoft,
              borderWidth: 1,
              borderColor: '#c7d2fe',
              marginBottom: 16,
              flexDirection: 'row',
              gap: 12,
            }}
          >
            <Ionicons name="shield-checkmark" size={22} color={colors.primary} />
            <Text style={{ flex: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.text, lineHeight: 20 }}>
              ระบบตรวจจับการสลับแท็บ การออกจากหน้าจอ แชทลอยที่แย่งโฟกัส และพฤติกรรมที่น่าสงสัยแบบเรียลไทม์ แล้วแจ้งอาจารย์ทันที
            </Text>
          </View>

          {EXAM_RULES.map((rule) => (
            <Pressable
              key={rule.title}
              onPress={() => setSelectedTitle(rule.title)}
              style={({ pressed }) => ({
                backgroundColor: pressed ? colors.backgroundSoft : colors.surface,
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: colors.border,
                padding: 16,
                marginBottom: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                cursor: 'pointer' as const,
              })}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: colors.backgroundSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name={rule.icon} size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.text }}>{rule.title}</Text>
                <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginTop: 4 }} numberOfLines={2}>
                  {rule.detail}
                </Text>
                <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.primary, marginTop: 8 }}>
                  กดเข้าไปอ่าน
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.primary} />
            </Pressable>
          ))}
        </>
      )}
    </StudentPageShell>
  );
}
