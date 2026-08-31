import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EXAM_RULES } from '@/constants/examRules';
import { colors, fonts } from '@/theme';

interface ExamRulesNoticeProps {
  visible: boolean;
  onAccept: () => void;
}

export function ExamRulesNotice({ visible, onAccept }: ExamRulesNoticeProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onAccept}>
      <View style={{ flex: 1, backgroundColor: 'rgba(30,27,75,0.5)', justifyContent: 'center', padding: 20 }}>
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 20,
            maxWidth: 480,
            width: '100%',
            maxHeight: '88%',
            alignSelf: 'center',
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: colors.backgroundSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.bold, fontSize: 18, color: colors.text }}>กฎการสอบ</Text>
              <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginTop: 2 }}>
                กรุณาอ่านก่อนเข้าใช้งานระบบ
              </Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
            <View
              style={{
                padding: 14,
                borderRadius: 12,
                backgroundColor: colors.backgroundSoft,
                borderWidth: 1,
                borderColor: '#c7d2fe',
                marginBottom: 14,
                flexDirection: 'row',
                gap: 10,
              }}
            >
              <Ionicons name="notifications-outline" size={20} color={colors.primary} style={{ marginTop: 2 }} />
              <Text style={{ flex: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.text, lineHeight: 20 }}>
                ระบบตรวจจับการสลับแท็บ การออกจากหน้าจอ และพฤติกรรมที่น่าสงสัยแบบเรียลไทม์ และแจ้งอาจารย์ทันที
              </Text>
            </View>

            {EXAM_RULES.map((rule) => (
              <View key={rule.title} style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: colors.backgroundSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Ionicons name={rule.icon} size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.text }}>{rule.title}</Text>
                  <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginTop: 2, lineHeight: 19 }}>
                    {rule.detail}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: colors.border }}>
            <Pressable
              onPress={onAccept}
              style={({ pressed }) => ({
                backgroundColor: pressed ? colors.primaryDark : colors.primary,
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center',
              })}
            >
              <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: '#fff' }}>รับทราบ</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
