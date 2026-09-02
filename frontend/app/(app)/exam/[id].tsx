import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ExamRulesNotice } from '@/components/ExamRulesNotice';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import type { ExamDetail } from '@/types';
import { colors, commonStyles, fonts } from '@/theme';

const rulesNoticeKey = (userId: string) => `exam_rules_notice_v2_${userId}`;

function hasSeenRulesNotice(userId: string) {
  if (Platform.OS === 'web' && typeof sessionStorage !== 'undefined') {
    return sessionStorage.getItem(rulesNoticeKey(userId)) === '1';
  }
  return false;
}

function markRulesNoticeSeen(userId: string) {
  if (Platform.OS === 'web' && typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(rulesNoticeKey(userId), '1');
  }
}

export default function ExamDetailScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { user } = useAuth();
  const router = useRouter();
  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [showRules, setShowRules] = useState(false);
  const [pendingStart, setPendingStart] = useState(false);

  const loadExam = useCallback(async () => {
    if (!id) {
      setError('ไม่พบรหัสห้องสอบ');
      setLoading(false);
      return;
    }
    try {
      const { exam: data } = await api.getExam(id);
      setExam(data);
      setError('');
    } catch (e) {
      setExam(null);
      setError(e instanceof Error ? e.message : 'โหลดข้อสอบไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadExam();
  }, [loadExam]);

  const startExam = async () => {
    if (!id) return;
    setStarting(true);
    setError('');
    try {
      const { attempt } = await api.startAttempt(id);
      router.replace(`/(app)/take/${attempt.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cannot start exam');
      setStarting(false);
    }
  };

  const handleStart = async () => {
    if (!id || !user) return;
    if (user.role === 'STUDENT' && !hasSeenRulesNotice(user.id)) {
      setPendingStart(true);
      setShowRules(true);
      return;
    }
    await startExam();
  };

  const acceptRules = () => {
    if (user) markRulesNoticeSeen(user.id);
    setShowRules(false);
    if (pendingStart) {
      setPendingStart(false);
      void startExam();
    }
  };

  if (loading) {
    return (
      <View style={[commonStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!exam) {
    return (
      <View style={commonStyles.content}>
        <Pressable
          onPress={() => router.replace('/(app)/dashboard')}
          accessibilityLabel="กลับหน้าหลัก"
          style={({ pressed }) => ({
            alignSelf: 'flex-start',
            flexDirection: 'row',
            alignItems: 'center',
            minHeight: 44,
            paddingHorizontal: 14,
            paddingVertical: 10,
            marginTop: 16,
            marginBottom: 12,
            borderRadius: 12,
            backgroundColor: pressed ? colors.backgroundSoft : colors.surface,
            borderWidth: 1.5,
            borderColor: colors.primary,
            cursor: 'pointer' as const,
          })}
        >
          <Text style={{ color: colors.primary, fontFamily: fonts.semibold, fontSize: 15 }}>← กลับหน้าหลัก</Text>
        </Pressable>
        <Text style={commonStyles.error}>{error || 'ไม่พบข้อสอบ'}</Text>
        <Text style={{ color: colors.textMuted, marginTop: 8, fontSize: 13 }}>
          ลองเข้าห้องเรียนด้วยรหัสจากอาจารย์อีกครั้ง หรือรีเฟรชหน้ารายการข้อสอบ
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={commonStyles.container}>
      <ExamRulesNotice visible={user?.role === 'STUDENT' && showRules} onAccept={acceptRules} />

      <View style={commonStyles.content}>
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="ย้อนกลับ"
          style={({ pressed }) => ({
            alignSelf: 'flex-start',
            flexDirection: 'row',
            alignItems: 'center',
            minHeight: 44,
            paddingHorizontal: 14,
            paddingVertical: 10,
            marginTop: 16,
            marginBottom: 12,
            borderRadius: 12,
            backgroundColor: pressed ? colors.backgroundSoft : colors.surface,
            borderWidth: 1.5,
            borderColor: colors.primary,
            cursor: 'pointer' as const,
          })}
        >
          <Text style={{ color: colors.primary, fontFamily: fonts.semibold, fontSize: 15 }}>← ย้อนกลับ</Text>
        </Pressable>

        <View style={commonStyles.card}>
          <Text style={commonStyles.title}>{exam.title}</Text>
          {exam.description ? <Text style={commonStyles.subtitle}>{exam.description}</Text> : null}
          <Text style={{ color: colors.textMuted }}>
            ระยะเวลา {exam.durationMinutes} นาที · เกณฑ์ผ่าน {exam.passingScore}% ·{' '}
            {exam.questions.length} ข้อ
          </Text>

          {user?.role === 'STUDENT' ? (
            <>
              <Pressable
                onPress={() => {
                  setPendingStart(false);
                  setShowRules(true);
                }}
                style={({ pressed }) => ({
                  marginTop: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  padding: 14,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: colors.primary,
                  backgroundColor: pressed ? colors.backgroundSoft : colors.backgroundSoft,
                  cursor: 'pointer' as const,
                })}
              >
                <Text style={{ flex: 1, fontFamily: fonts.semibold, fontSize: 14, color: colors.primary }}>
                  อ่านกฎการสอบก่อนเริ่มทำ
                </Text>
                <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.primary }}>กดเข้าไปอ่าน →</Text>
              </Pressable>

              {exam.questions.length === 0 ? (
                <Text style={[commonStyles.error, { marginTop: 12 }]}>
                  ห้องสอบนี้ยังไม่มีข้อสอบ — รออาจารย์นำเข้าไฟล์คลังข้อสอบก่อน
                </Text>
              ) : null}
              {error ? <Text style={[commonStyles.error, { marginTop: 12 }]}>{error}</Text> : null}
              <Pressable
                style={[
                  commonStyles.button,
                  { minHeight: 52, marginTop: 16 },
                  (starting || exam.questions.length === 0) && { opacity: 0.5 },
                ]}
                onPress={handleStart}
                disabled={starting || exam.questions.length === 0}
              >
                <Text style={[commonStyles.buttonText, { fontSize: 16 }]}>
                  {starting ? 'กำลังเริ่ม...' : 'เริ่มทำข้อสอบ'}
                </Text>
              </Pressable>
              <Text style={{ color: colors.warning, marginTop: 12, fontSize: 13, lineHeight: 20 }}>
                ระบบจะตัดสิทธิ์ทันทีหากสลับแอป/แท็บ เปิดแชทลอย หรือออกจากหน้าข้อสอบ
              </Text>
            </>
          ) : (
            <View style={{ marginTop: 16 }}>
              <Text style={{ fontWeight: '600', marginBottom: 8 }}>คำถาม ({exam.questions.length})</Text>
              {exam.questions.map((q, i) => (
                <Text key={q.id} style={{ color: colors.textMuted, marginBottom: 4 }}>
                  {i + 1}. {q.questionText}
                </Text>
              ))}
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
