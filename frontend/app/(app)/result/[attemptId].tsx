import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { colors, fonts } from '@/theme';

interface AttemptResult {
  id: string;
  status: string;
  score?: number;
  maxScore?: number;
  cheatFlags: number;
  exam?: { title: string; passingScore?: number };
}

export default function ResultScreen() {
  const { attemptId } = useLocalSearchParams<{ attemptId: string }>();
  const router = useRouter();
  const [attempt, setAttempt] = useState<AttemptResult | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!attemptId) return;
    try {
      const { attempt: data } = await api.getAttempt(attemptId);
      setAttempt(data as AttemptResult);
    } finally {
      setLoading(false);
    }
  }, [attemptId]);

  useEffect(() => {
    load();
  }, [load]);

  const goHome = () => router.replace('/(app)/dashboard');

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!attempt) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, padding: 24, justifyContent: 'center' }}>
        <Text style={{ color: colors.danger, fontFamily: fonts.medium, fontSize: 16, textAlign: 'center' }}>
          ไม่พบผลสอบ
        </Text>
        <Pressable
          onPress={goHome}
          style={({ pressed }) => ({
            marginTop: 24,
            minHeight: 52,
            borderRadius: 14,
            backgroundColor: pressed ? colors.primaryDark : colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
            cursor: 'pointer' as const,
          })}
        >
          <Ionicons name="home-outline" size={20} color="#fff" />
          <Text style={{ color: '#fff', fontFamily: fonts.semibold, fontSize: 16 }}>กลับหน้าหลัก</Text>
        </Pressable>
      </View>
    );
  }

  const percent =
    attempt.score !== undefined && attempt.maxScore
      ? Math.round((attempt.score / attempt.maxScore) * 100)
      : undefined;
  const passingScore = attempt.exam?.passingScore ?? 50;
  const passed = attempt.status !== 'DISQUALIFIED' && percent !== undefined && percent >= passingScore;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ flexGrow: 1 }}>
      <View style={{ flex: 1, padding: 20, paddingTop: 28, maxWidth: 520, width: '100%', alignSelf: 'center' }}>
        <Pressable
          onPress={goHome}
          accessibilityLabel="กลับหน้าหลัก"
          style={({ pressed }) => ({
            alignSelf: 'flex-start',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            minHeight: 44,
            paddingHorizontal: 14,
            paddingVertical: 10,
            marginBottom: 16,
            borderRadius: 12,
            backgroundColor: pressed ? colors.backgroundSoft : colors.surface,
            borderWidth: 1.5,
            borderColor: colors.primary,
            cursor: 'pointer' as const,
          })}
        >
          <Ionicons name="arrow-back" size={20} color={colors.primary} />
          <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.primary }}>กลับหน้าหลัก</Text>
        </Pressable>

        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 20,
            padding: 24,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ fontFamily: fonts.bold, fontSize: 24, color: colors.text }}>ผลการสอบ</Text>
          <Text style={{ fontFamily: fonts.regular, fontSize: 15, color: colors.textMuted, marginTop: 6 }}>
            {attempt.exam?.title}
          </Text>

          {attempt.status === 'DISQUALIFIED' ? (
            <View
              style={{
                marginTop: 20,
                padding: 16,
                borderRadius: 14,
                backgroundColor: '#fef2f2',
                borderWidth: 1,
                borderColor: '#fecaca',
              }}
            >
              <Text style={{ fontFamily: fonts.bold, fontSize: 17, color: colors.danger, textAlign: 'center' }}>
                ถูกตัดสิทธิ์การสอบ
              </Text>
              <Text
                style={{
                  fontFamily: fonts.regular,
                  fontSize: 14,
                  color: colors.danger,
                  textAlign: 'center',
                  marginTop: 8,
                  lineHeight: 22,
                }}
              >
                ตรวจพบพฤติกรรมทุจริตระหว่างสอบ {attempt.cheatFlags} ครั้ง
                {'\n'}
                (สลับแอป/แท็บ เปิดแชท หรือออกจากหน้าข้อสอบ)
              </Text>
            </View>
          ) : (
            <>
              <Text
                style={{
                  fontFamily: fonts.bold,
                  fontSize: 48,
                  color: passed ? colors.success : colors.danger,
                  textAlign: 'center',
                  marginVertical: 16,
                }}
              >
                {attempt.score ?? '-'}
                {attempt.maxScore ? ` / ${attempt.maxScore}` : ''}
              </Text>
              {percent !== undefined ? (
                <Text style={{ textAlign: 'center', color: colors.textMuted, fontFamily: fonts.regular }}>
                  คิดเป็น {percent}% — {passed ? 'ผ่านเกณฑ์' : 'ไม่ผ่านเกณฑ์'} (เกณฑ์ {passingScore}%)
                </Text>
              ) : null}
              <Text
                style={{
                  textAlign: 'center',
                  color: colors.textMuted,
                  marginTop: 8,
                  fontSize: 13,
                  fontFamily: fonts.regular,
                }}
              >
                คะแนนถูกบันทึกและส่งให้อาจารย์แล้ว
              </Text>
            </>
          )}

          {attempt.cheatFlags > 0 && attempt.status !== 'DISQUALIFIED' ? (
            <Text
              style={{
                color: colors.warning,
                marginTop: 12,
                textAlign: 'center',
                fontFamily: fonts.medium,
              }}
            >
              มีการเตือนพฤติกรรม {attempt.cheatFlags} ครั้ง
            </Text>
          ) : null}

          <Pressable
            onPress={goHome}
            style={({ pressed }) => ({
              marginTop: 28,
              minHeight: 54,
              borderRadius: 14,
              backgroundColor: pressed ? colors.primaryDark : colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 10,
              cursor: 'pointer' as const,
            })}
          >
            <Ionicons name="home" size={22} color="#fff" />
            <Text style={{ color: '#fff', fontFamily: fonts.semibold, fontSize: 17 }}>กลับหน้าหลัก</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
