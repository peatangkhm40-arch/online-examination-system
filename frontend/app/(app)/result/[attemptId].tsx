import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { colors, commonStyles } from '@/theme';

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

  if (loading) {
    return (
      <View style={[commonStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!attempt) {
    return (
      <View style={commonStyles.content}>
        <Text style={commonStyles.error}>ไม่พบผลสอบ</Text>
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
    <ScrollView style={commonStyles.container}>
      <View style={commonStyles.content}>
        <View style={[commonStyles.card, { marginTop: 24 }]}>
          <Text style={commonStyles.title}>ผลการสอบ</Text>
          <Text style={commonStyles.subtitle}>{attempt.exam?.title}</Text>

          {attempt.status === 'DISQUALIFIED' ? (
            <Text style={{ color: colors.danger, fontSize: 18, fontWeight: '600' }}>
              ❌ ถูกตัดสิทธิ์ (พฤติกรรมไม่เหมาะสม {attempt.cheatFlags} ครั้ง)
            </Text>
          ) : (
            <>
              <Text
                style={{
                  fontSize: 48,
                  fontWeight: '700',
                  color: passed ? colors.success : colors.danger,
                  textAlign: 'center',
                  marginVertical: 16,
                }}
              >
                {attempt.score ?? '-'}{attempt.maxScore ? ` / ${attempt.maxScore}` : ''}
              </Text>
              {percent !== undefined ? (
                <Text style={{ textAlign: 'center', color: colors.textMuted }}>
                  คิดเป็น {percent}% — {passed ? '✅ ผ่านเกณฑ์' : '❌ ไม่ผ่านเกณฑ์'} (เกณฑ์ {passingScore}%)
                </Text>
              ) : null}
              <Text style={{ textAlign: 'center', color: colors.textMuted, marginTop: 8, fontSize: 13 }}>
                คะแนนถูกบันทึกและส่งให้อาจารย์แล้ว
              </Text>
            </>
          )}

          {attempt.cheatFlags > 0 && attempt.status !== 'DISQUALIFIED' ? (
            <Text style={{ color: colors.warning, marginTop: 12, textAlign: 'center' }}>
              ⚠️ มีการเตือนพฤติกรรม {attempt.cheatFlags} ครั้ง
            </Text>
          ) : null}

          <Pressable style={commonStyles.button} onPress={() => router.replace('/(app)/dashboard')}>
            <Text style={commonStyles.buttonText}>กลับหน้าหลัก</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
