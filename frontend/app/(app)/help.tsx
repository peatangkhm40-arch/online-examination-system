import { useEffect, useState } from 'react';
import { Alert, Linking, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StudentPageShell } from '@/components/StudentPageShell';
import { STUDENT_FAQ, type FaqItem } from '@/constants/faq';
import { colors, fonts } from '@/theme';

const NOTES_KEY = 'student_faq_notes_v1';

export default function HelpScreen() {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [editItem, setEditItem] = useState<FaqItem | null>(null);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    AsyncStorage.getItem(NOTES_KEY).then((raw) => {
      if (!raw) return;
      try {
        setNotes(JSON.parse(raw) as Record<string, string>);
      } catch {
        // ignore
      }
    });
  }, []);

  const saveNote = async (id: string, text: string) => {
    const next = { ...notes, [id]: text.trim() };
    if (!text.trim()) delete next[id];
    setNotes(next);
    await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(next));
    setEditItem(null);
    setEditText('');
  };

  const reportFaq = (item: FaqItem) => {
    const note = notes[item.id]?.trim();
    const body = [
      `หัวข้อ: ${item.q}`,
      '',
      'รายละเอียดปัญหา / คำถามเพิ่มเติม:',
      note || '(ยังไม่ได้บันทึกโน้ต)',
      '',
      '— ส่งจากหน้าช่วยเหลือของระบบสอบออนไลน์ —',
    ].join('\n');
    const href = `mailto:support@college.ac.th?subject=${encodeURIComponent(`[แจ้งปัญหา] ${item.q}`)}&body=${encodeURIComponent(body)}`;
    Linking.openURL(href).catch(() => {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.prompt('คัดลอกข้อความนี้เพื่อส่งอีเมลแจ้งปัญหา', body);
      } else {
        Alert.alert('แจ้งปัญหา', 'ไม่สามารถเปิดอีเมลได้ กรุณาติดต่ออาจารย์หรือแอดมินโดยตรง');
      }
    });
  };

  return (
    <StudentPageShell title="ช่วยเหลือ / ติดต่อ">
      <Text style={{ fontFamily: fonts.bold, fontSize: 22, color: colors.text }}>ช่วยเหลือ / ติดต่อ</Text>
      <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginTop: 4, marginBottom: 20 }}>
        กดคำถามเพื่ออ่านรายละเอียด แก้ไขโน้ตส่วนตัว หรือแจ้งปัญหาได้
      </Text>

      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 18,
          marginBottom: 20,
        }}
      >
        <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.text, marginBottom: 12 }}>ติดต่อผู้ดูแล</Text>
        {[
          { icon: 'mail-outline' as const, label: 'อีเมล', value: 'support@college.ac.th', href: 'mailto:support@college.ac.th' },
          { icon: 'call-outline' as const, label: 'โทร', value: '02-000-0000', href: 'tel:020000000' },
          { icon: 'key-outline' as const, label: 'ลืมรหัสผ่าน', value: 'ตั้งรหัสใหม่ที่หน้าเข้าสู่ระบบ', href: '' },
        ].map((c) => (
          <Pressable
            key={c.label}
            onPress={() => {
              if (c.label === 'ลืมรหัสผ่าน') {
                router.push('/(auth)/forgot-password');
                return;
              }
              void Linking.openURL(c.href);
            }}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingVertical: 10,
              opacity: pressed ? 0.85 : 1,
              cursor: 'pointer' as const,
            })}
          >
            <Ionicons name={c.icon} size={20} color={colors.primary} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted }}>{c.label}</Text>
              <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.primary }}>{c.value}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={() => router.push('/(app)/rules')}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          backgroundColor: pressed ? colors.backgroundSoft : colors.surface,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 16,
          marginBottom: 20,
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
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.text }}>กฎการสอบ</Text>
          <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
            กดเพื่ออ่านรายละเอียดแต่ละข้อ
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.primary} />
      </Pressable>

      <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.text, marginBottom: 12 }}>คำถามที่พบบ่อย</Text>
      {STUDENT_FAQ.map((item) => {
        const open = expandedId === item.id;
        const note = notes[item.id];
        return (
          <View
            key={item.id}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: open ? colors.primary : colors.border,
              marginBottom: 10,
              overflow: 'hidden',
            }}
          >
            <Pressable
              onPress={() => setExpandedId(open ? null : item.id)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                padding: 16,
                backgroundColor: pressed ? colors.backgroundSoft : colors.surface,
                cursor: 'pointer' as const,
              })}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.text }}>{item.q}</Text>
                {!open ? (
                  <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginTop: 6 }} numberOfLines={2}>
                    {item.a}
                  </Text>
                ) : null}
              </View>
              <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.primary} />
            </Pressable>

            {open ? (
              <View style={{ paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: colors.border }}>
                <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: colors.text, marginTop: 12, lineHeight: 22 }}>
                  {item.body}
                </Text>

                {note ? (
                  <View
                    style={{
                      marginTop: 12,
                      padding: 12,
                      borderRadius: 10,
                      backgroundColor: colors.backgroundSoft,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: colors.textMuted }}>โน้ตของฉัน</Text>
                    <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.text, marginTop: 4, lineHeight: 20 }}>
                      {note}
                    </Text>
                  </View>
                ) : null}

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
                  <Pressable
                    onPress={() => {
                      setEditItem(item);
                      setEditText(note ?? '');
                    }}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      minHeight: 40,
                      paddingHorizontal: 12,
                      borderRadius: 10,
                      borderWidth: 1.5,
                      borderColor: colors.primary,
                      backgroundColor: pressed ? colors.backgroundSoft : colors.surface,
                      cursor: 'pointer' as const,
                    })}
                  >
                    <Ionicons name="create-outline" size={16} color={colors.primary} />
                    <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.primary }}>แก้ไขโน้ต</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => reportFaq(item)}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      minHeight: 40,
                      paddingHorizontal: 12,
                      borderRadius: 10,
                      backgroundColor: pressed ? colors.primaryDark : colors.primary,
                      cursor: 'pointer' as const,
                    })}
                  >
                    <Ionicons name="mail-outline" size={16} color="#fff" />
                    <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: '#fff' }}>แจ้งปัญหา</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>
        );
      })}

      <Modal visible={!!editItem} transparent animationType="fade" onRequestClose={() => setEditItem(null)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', padding: 20 }}
          onPress={() => setEditItem(null)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 18,
              padding: 20,
              maxWidth: 440,
              width: '100%',
              alignSelf: 'center',
            }}
          >
            <Text style={{ fontFamily: fonts.bold, fontSize: 17, color: colors.text }}>แก้ไขโน้ต</Text>
            <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginTop: 4 }}>
              {editItem?.q}
            </Text>
            <TextInput
              value={editText}
              onChangeText={setEditText}
              multiline
              placeholder="บันทึกสิ่งที่อยากจำ หรือรายละเอียดที่จะแจ้งผู้ดูแล..."
              placeholderTextColor={colors.textMuted}
              style={{
                marginTop: 14,
                minHeight: 110,
                borderWidth: 1.5,
                borderColor: colors.border,
                borderRadius: 12,
                padding: 12,
                fontFamily: fonts.regular,
                fontSize: 14,
                color: colors.text,
                textAlignVertical: 'top',
                backgroundColor: colors.inputBg,
                outlineStyle: 'none',
              }}
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <Pressable
                onPress={() => setEditItem(null)}
                style={{
                  flex: 1,
                  minHeight: 46,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontFamily: fonts.semibold, color: colors.textMuted }}>ยกเลิก</Text>
              </Pressable>
              <Pressable
                onPress={() => editItem && void saveNote(editItem.id, editText)}
                style={{
                  flex: 1,
                  minHeight: 46,
                  borderRadius: 12,
                  backgroundColor: colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontFamily: fonts.semibold, color: '#fff' }}>บันทึก</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </StudentPageShell>
  );
}
