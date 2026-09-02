import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StudentPageShell } from '@/components/StudentPageShell';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { api } from '@/lib/api';
import type { StudentAttemptItem } from '@/types';
import { colors, fonts } from '@/theme';

const STATUS: Record<string, { label: string; color: string }> = {
  IN_PROGRESS: { label: 'กำลังทำ', color: '#d97706' },
  SUBMITTED: { label: 'ส่งแล้ว', color: '#059669' },
  DISQUALIFIED: { label: 'ถูกตัดสิทธิ์', color: '#dc2626' },
};

function formatDate(iso: string | null) {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function ExamHistoryScreen() {
  const router = useRouter();
  const { isMobile } = useResponsiveLayout();
  const [attempts, setAttempts] = useState<StudentAttemptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.listMyAttempts();
      setAttempts(data.attempts);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดประวัติไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <StudentPageShell title="ประวัติการสอบ" contentPadding={isMobile ? 16 : 24}>
      <View style={{ width: '100%', maxWidth: 720, alignSelf: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontFamily: fonts.bold, fontSize: isMobile ? 20 : 22, color: colors.text }}>ประวัติการสอบ</Text>
            <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginTop: 4 }}>
              รายการห้องสอบที่คุณเคยเข้าทำ
            </Text>
          </View>
          <Pressable
            onPress={() => void load()}
            accessibilityLabel="รีเฟรช"
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: pressed ? colors.backgroundSoft : colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              cursor: 'pointer' as const,
            })}
          >
            <Ionicons name="refresh-outline" size={20} color={colors.primary} />
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : error ? (
          <View style={{ padding: 16, borderRadius: 12, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' }}>
            <Text style={{ fontFamily: fonts.regular, color: colors.danger }}>{error}</Text>
            <Pressable onPress={() => void load()} style={{ marginTop: 12 }}>
              <Text style={{ fontFamily: fonts.semibold, color: colors.primary }}>ลองอีกครั้ง</Text>
            </Pressable>
          </View>
        ) : attempts.length === 0 ? (
          <View
            style={{
              padding: isMobile ? 24 : 32,
              borderRadius: 16,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: 'center',
            }}
          >
            <Ionicons name="time-outline" size={40} color={colors.textMuted} />
            <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.text, marginTop: 12 }}>ยังไม่มีประวัติการสอบ</Text>
            <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginTop: 4, textAlign: 'center', lineHeight: 20 }}>
              เมื่อเข้าทำข้อสอบแล้ว ประวัติจะแสดงที่นี่
            </Text>
            <Pressable
              onPress={() => router.push('/(app)/dashboard')}
              style={({ pressed }) => ({
                marginTop: 16,
                minHeight: 44,
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: pressed ? colors.primaryDark : colors.primary,
                cursor: 'pointer' as const,
              })}
            >
              <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: '#fff' }}>ไปหน้าข้อสอบที่เปิด</Text>
            </Pressable>
          </View>
        ) : (
          attempts.map((a) => {
            const st = STATUS[a.status] ?? { label: a.status, color: colors.textMuted };
            const scoreText =
              a.score != null && a.maxScore != null
                ? `${a.score}/${a.maxScore}${a.percent != null ? ` (${a.percent}%)` : ''}`
                : a.status === 'IN_PROGRESS'
                  ? 'ยังไม่ส่ง'
                  : '-';

            return (
              <Pressable
                key={a.id}
                onPress={() => {
                  if (a.status === 'IN_PROGRESS') router.push(`/(app)/take/${a.id}`);
                  else router.push(`/(app)/result/${a.id}`);
                }}
                style={({ pressed }) => ({
                  width: '100%',
                  backgroundColor: pressed ? colors.backgroundSoft : colors.surface,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: isMobile ? 14 : 16,
                  marginBottom: 12,
                  // กัน layout พังต่างกันระหว่าง Android / iOS WebView
                  ...(Platform.OS === 'web' ? ({ WebkitTapHighlightColor: 'transparent' } as object) : null),
                  cursor: 'pointer' as const,
                })}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.text }}
                      numberOfLines={2}
                    >
                      {a.subjectName}
                    </Text>
                    <Text
                      style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginTop: 4 }}
                      numberOfLines={2}
                    >
                      รหัสห้อง {a.classCode}
                      {a.gradeLevel ? ` · ${a.gradeLevel}` : ''}
                    </Text>
                  </View>
                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 8,
                      backgroundColor: `${st.color}18`,
                      flexShrink: 0,
                    }}
                  >
                    <Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: st.color }}>{st.label}</Text>
                  </View>
                </View>

                <View
                  style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                    gap: 6,
                  }}
                >
                  <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.text }}>
                    คะแนน {scoreText}
                  </Text>
                  <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted }}>
                    เริ่ม {formatDate(a.startedAt)}
                  </Text>
                  <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted }}>
                    ส่ง {formatDate(a.submittedAt)}
                  </Text>
                  {a.cheatFlags > 0 ? (
                    <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.danger }}>
                      ทุจริต {a.cheatFlags} ครั้ง
                    </Text>
                  ) : null}
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 10, gap: 4 }}>
                  <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.primary }}>
                    {a.status === 'IN_PROGRESS' ? 'เข้าทำต่อ' : 'ดูผลสอบ'}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                </View>
              </Pressable>
            );
          })
        )}
      </View>
    </StudentPageShell>
  );
}
