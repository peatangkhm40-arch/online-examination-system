import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import type { ExamDetail } from '@/types';
import { colors, commonStyles } from '@/theme';

export default function ExamDetailScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { user } = useAuth();
  const router = useRouter();
  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

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

  const handleStart = async () => {
    if (!id) return;
    setStarting(true);
    setError('');
    try {
      const { attempt } = await api.startAttempt(id);
      router.replace(`/(app)/take/${attempt.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cannot start exam');
    } finally {
      setStarting(false);
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
        <Pressable onPress={() => router.replace('/(app)/dashboard')} style={{ marginTop: 16, marginBottom: 8 }}>
          <Text style={{ color: colors.primary }}>← กลับหน้าหลัก</Text>
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
      <View style={commonStyles.content}>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16, marginBottom: 8 }}>
          <Text style={{ color: colors.primary }}>← กลับ</Text>
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
              {exam.questions.length === 0 ? (
                <Text style={[commonStyles.error, { marginTop: 12 }]}>
                  ห้องสอบนี้ยังไม่มีข้อสอบ — รออาจารย์นำเข้าไฟล์คลังข้อสอบก่อน
                </Text>
              ) : null}
              {error ? <Text style={[commonStyles.error, { marginTop: 12 }]}>{error}</Text> : null}
              <Pressable
                style={[
                  commonStyles.button,
                  (starting || exam.questions.length === 0) && { opacity: 0.5 },
                ]}
                onPress={handleStart}
                disabled={starting || exam.questions.length === 0}
              >
                <Text style={commonStyles.buttonText}>
                  {starting ? 'กำลังเริ่ม...' : 'เริ่มทำข้อสอบ'}
                </Text>
              </Pressable>
              <Text style={{ color: colors.warning, marginTop: 12, fontSize: 13 }}>
                ⚠️ ระบบจะตรวจจับการสลับแท็บ, คัดลอก/วาง และพฤติกรรมที่น่าสงสัย
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
