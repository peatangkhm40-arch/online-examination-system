import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EXAM_RULES } from '@/constants/examRules';
import { colors, fonts } from '@/theme';

interface ExamRulesNoticeProps {
  visible: boolean;
  onAccept: () => void;
  /** บังคับให้อ่านอย่างน้อย 1 ข้อก่อนกดรับทราบ */
  requireRead?: boolean;
}

export function ExamRulesNotice({ visible, onAccept, requireRead = true }: ExamRulesNoticeProps) {
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
  const [readTitles, setReadTitles] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!visible) {
      setSelectedTitle(null);
      setReadTitles(new Set());
    }
  }, [visible]);

  const selected = EXAM_RULES.find((r) => r.title === selectedTitle) ?? null;
  const canAccept = !requireRead || readTitles.size > 0;

  const openRule = (title: string) => {
    setSelectedTitle(title);
    setReadTitles((prev) => {
      const next = new Set(prev);
      next.add(title);
      return next;
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={canAccept ? onAccept : undefined}>
      <View style={{ flex: 1, backgroundColor: 'rgba(30,27,75,0.55)', justifyContent: 'center', padding: 20 }}>
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
          {selected ? (
            <>
              <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Pressable
                  onPress={() => setSelectedTitle(null)}
                  accessibilityLabel="ย้อนกลับไปรายการกฎ"
                  style={({ pressed }) => ({
                    alignSelf: 'flex-start',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    minHeight: 40,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 10,
                    borderWidth: 1.5,
                    borderColor: colors.primary,
                    backgroundColor: pressed ? colors.backgroundSoft : colors.surface,
                    cursor: 'pointer' as const,
                  })}
                >
                  <Ionicons name="arrow-back" size={18} color={colors.primary} />
                  <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.primary }}>ย้อนกลับ</Text>
                </Pressable>
              </View>

              <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
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
                  <Text style={{ fontFamily: fonts.bold, fontSize: 18, color: colors.text, textAlign: 'center' }}>
                    {selected.title}
                  </Text>
                </View>
                <Text style={{ fontFamily: fonts.regular, fontSize: 15, color: colors.text, lineHeight: 24 }}>
                  {selected.body}
                </Text>
              </ScrollView>

              <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: colors.border }}>
                <Pressable
                  onPress={() => setSelectedTitle(null)}
                  style={({ pressed }) => ({
                    backgroundColor: pressed ? colors.primaryDark : colors.primary,
                    borderRadius: 12,
                    minHeight: 48,
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer' as const,
                  })}
                >
                  <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: '#fff' }}>กลับไปรายการกฎ</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
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
                    สำหรับนักเรียน — กดเข้าไปอ่านแต่ละข้อก่อนรับทราบ
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
                    ระบบตรวจจับการสลับแท็บ การออกจากหน้าจอ แชทลอยที่แย่งโฟกัส และพฤติกรรมที่น่าสงสัยแบบเรียลไทม์ แล้วแจ้งอาจารย์ทันที
                  </Text>
                </View>

                {EXAM_RULES.map((rule) => {
                  const read = readTitles.has(rule.title);
                  return (
                    <Pressable
                      key={rule.title}
                      onPress={() => openRule(rule.title)}
                      style={({ pressed }) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        marginBottom: 10,
                        padding: 14,
                        borderRadius: 12,
                        borderWidth: 1.5,
                        borderColor: read ? colors.primary : colors.border,
                        backgroundColor: pressed ? colors.backgroundSoft : colors.surface,
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
                          flexShrink: 0,
                        }}
                      >
                        <Ionicons name={rule.icon} size={20} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.text }}>{rule.title}</Text>
                        <Text
                          style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 3 }}
                          numberOfLines={2}
                        >
                          {rule.detail}
                        </Text>
                        <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.primary, marginTop: 6 }}>
                          {read ? 'อ่านแล้ว — กดอ่านอีกครั้ง' : 'กดเข้าไปอ่าน'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.primary} />
                    </Pressable>
                  );
                })}
              </ScrollView>

              <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: colors.border }}>
                {!canAccept ? (
                  <Text
                    style={{
                      fontFamily: fonts.regular,
                      fontSize: 12,
                      color: colors.warning,
                      textAlign: 'center',
                      marginBottom: 10,
                    }}
                  >
                    กรุณากดเข้าไปอ่านอย่างน้อย 1 ข้อก่อนกดรับทราบ
                  </Text>
                ) : null}
                <Pressable
                  onPress={onAccept}
                  disabled={!canAccept}
                  style={({ pressed }) => ({
                    backgroundColor: !canAccept ? colors.border : pressed ? colors.primaryDark : colors.primary,
                    borderRadius: 12,
                    minHeight: 48,
                    paddingVertical: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: canAccept ? ('pointer' as const) : ('default' as const),
                    opacity: !canAccept ? 0.7 : 1,
                  })}
                >
                  <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: canAccept ? '#fff' : colors.textMuted }}>
                    รับทราบ
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
