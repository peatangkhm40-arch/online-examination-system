import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StudentPageShell } from '@/components/StudentPageShell';
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
  return new Date(iso).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' });
}

export default function ExamHistoryScreen() {
  const router = useRouter();
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
    <StudentPageShell title="ประวัติการสอบ">
      <Text style={{ fontFamily: fonts.bold, fontSize: 22, color: colors.text }}>ประวัติการสอบ</Text>
      <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginTop: 4, marginBottom: 20 }}>
        รายการห้องสอบที่คุณเคยเข้าทำ
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : error ? (
        <Text style={{ fontFamily: fonts.regular, color: colors.danger }}>{error}</Text>
      ) : attempts.length === 0 ? (
        <View style={{ padding: 32, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}>
          <Ionicons name="time-outline" size={40} color={colors.textMuted} />
          <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.text, marginTop: 12 }}>ยังไม่มีประวัติการสอบ</Text>
          <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginTop: 4, textAlign: 'center' }}>
            เมื่อเข้าทำข้อสอบแล้ว ประวัติจะแสดงที่นี่
          </Text>
          <Pressable
            onPress={() => router.push('/(app)/dashboard')}
            style={{ marginTop: 16, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.primary }}
          >
            <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: '#fff' }}>ไปหน้าข้อสอบที่เปิด</Text>
          </Pressable>
        </View>
      ) : (
        attempts.map((a) => {
          const st = STATUS[a.status] ?? { label: a.status, color: colors.textMuted };
          return (
            <Pressable
              key={a.id}
              onPress={() => {
                if (a.status === 'IN_PROGRESS') router.push(`/(app)/take/${a.id}`);
                else router.push(`/(app)/result/${a.id}`);
              }}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: colors.border,
                padding: 16,
                marginBottom: 12,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.text }}>{a.subjectName}</Text>
                  <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginTop: 4 }}>
                    รหัสห้อง {a.classCode}
                    {a.gradeLevel ? ` · ${a.gradeLevel}` : ''}
                  </Text>
                </View>
                <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: `${st.color}18` }}>
                  <Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: st.color }}>{st.label}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', marginTop: 12, gap: 16, flexWrap: 'wrap' }}>
                <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted }}>
                  เริ่ม {formatDate(a.startedAt)}
                </Text>
                <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted }}>
                  ส่ง {formatDate(a.submittedAt)}
                </Text>
                {a.cheatFlags > 0 ? (
                  <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.danger }}>ทุจริต {a.cheatFlags} ครั้ง</Text>
                ) : null}
              </View>
            </Pressable>
          );
        })
      )}
    </StudentPageShell>
  );
}
