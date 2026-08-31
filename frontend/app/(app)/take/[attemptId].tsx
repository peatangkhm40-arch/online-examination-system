import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { useAntiCheat } from '@/hooks/useAntiCheat';
import type { CheatEventType, ExamDetail } from '@/types';
import { colors, fonts, gradients } from '@/theme';

const CHOICE_LABELS = ['ก', 'ข', 'ค', 'ง', 'จ', 'ฉ'] as const;

/** ตัด prefix ก. / A) ที่อาจติดมากับข้อความตัวเลือก */
function cleanOptionText(text: string): string {
  return text.replace(/^(?:[กขคงจฉabcdef]|[1-6])[).:\-、\s]+\s*/i, '').trim() || text;
}

/** ตัดท้ายคำถามที่แปะตัวเลือกซ้ำในวงเล็บจากไฟล์ Excel */
function cleanQuestionText(text: string): string {
  let q = text.trim();
  // ตัดบล็อก (ก. ... / ข. ... / ค. ... / ง. ...)
  q = q.replace(/\s*[\(（]\s*[กขคงabcd].*[\)）]\s*$/is, '').trim();
  // ตัดบรรทัดตัวเลือกที่ต่อท้ายโจทย์
  q = q.replace(/\n\s*[กขคงabcd][).:\-].*$/gim, '').trim();
  return q || text.trim();
}

export default function TakeExamScreen() {
  const { attemptId } = useLocalSearchParams<{ attemptId: string }>();
  const router = useRouter();
  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [cheatFlags, setCheatFlags] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lockWarning, setLockWarning] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const submittingRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);

  const loadAttempt = useCallback(async () => {
    if (!attemptId) return;
    try {
      const { attempt } = await api.getAttempt(attemptId);
      setCheatFlags(attempt.cheatFlags);

      const { exam: examData } = await api.getExam(attempt.examId);
      setExam(examData);
      setCurrentIndex(0);

      const durationSec = examData.durationMinutes * 60;
      const elapsed = Math.floor((Date.now() - new Date(attempt.startedAt).getTime()) / 1000);
      setTimeLeft(Math.max(0, durationSec - elapsed));
    } catch {
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถโหลดข้อสอบได้');
      router.replace('/(app)/dashboard');
    } finally {
      setLoading(false);
    }
  }, [attemptId, router]);

  useEffect(() => {
    loadAttempt();
  }, [loadAttempt]);

  const doSubmit = useCallback(async () => {
    if (!attemptId || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      await api.submitAttempt(attemptId);
      router.replace(`/(app)/result/${attemptId}`);
    } catch (e) {
      Alert.alert('ข้อผิดพลาด', e instanceof Error ? e.message : 'ส่งข้อสอบไม่สำเร็จ');
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [attemptId, router]);

  useEffect(() => {
    if (timeLeft <= 0 || !exam) return;
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer);
          void doSubmit();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, exam, doSubmit]);

  const handleCheatEvent = useCallback(
    async (eventType: CheatEventType, metadata?: Record<string, unknown>) => {
      if (!attemptId || locked) return;
      try {
        const result = (await api.reportCheatEvent(attemptId, eventType, metadata)) as {
          cheatFlags: number;
          disqualified?: boolean;
          warning?: string;
        };
        setCheatFlags(result.cheatFlags);
        if (result.disqualified) {
          setLocked(true);
          setLockWarning(
            result.warning ?? 'ตรวจพบการทุจริต ระบบได้ล็อกและตัดสิทธิ์การสอบของคุณทันที'
          );
        }
      } catch {
        // ถ้า report ไม่สำเร็จ แต่ตรวจจับได้ฝั่ง client — ยังแสดงคำเตือนล็อกไว้ก่อน
        setLocked(true);
        setLockWarning('ตรวจพบพฤติกรรมทุจริต ระบบได้ล็อกหน้าสอบของคุณ');
      }
    },
    [attemptId, locked]
  );

  useAntiCheat({
    attemptId: attemptId ?? '',
    onEvent: handleCheatEvent,
    enabled: !!attemptId && !submitting && !locked,
  });

  const handleSelect = async (questionId: string, optionId: string) => {
    if (locked) return;
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
    if (attemptId) {
      try {
        await api.saveAnswer(attemptId, questionId, optionId);
      } catch {
        // silent
      }
    }
  };

  const goToQuestion = (index: number) => {
    if (!exam) return;
    if (index < 0 || index >= exam.questions.length) return;
    setCurrentIndex(index);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleSubmit = () => {
    if (!attemptId || submitting) return;
    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการส่งคำตอบ?')) void doSubmit();
      return;
    }
    Alert.alert('ยืนยันส่งข้อสอบ', 'คุณแน่ใจหรือไม่ว่าต้องการส่งคำตอบ?', [
      { text: 'ยกเลิก', style: 'cancel' },
      { text: 'ส่ง', onPress: () => void doSubmit() },
    ]);
  };

  const timeDisplay = useMemo(() => {
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }, [timeLeft]);

  const totalQuestions = exam?.questions.length ?? 0;
  const question = exam?.questions[currentIndex] ?? null;
  const isFirst = currentIndex === 0;
  const isLast = totalQuestions > 0 && currentIndex >= totalQuestions - 1;
  const answeredCount = exam
    ? exam.questions.filter((q) => !!answers[q.id]).length
    : 0;
  const progressPct = ((currentIndex + 1) / Math.max(totalQuestions, 1)) * 100;
  const timeUrgent = timeLeft < 60;

  if (loading || !exam || !question) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={{ fontFamily: fonts.medium, color: colors.textMuted, marginTop: 12 }}>กำลังโหลดข้อสอบ...</Text>
      </View>
    );
  }

  const choices = question.options.slice(0, 4);
  const questionTitle = cleanQuestionText(question.questionText);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Modal visible={!!lockWarning} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.72)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 420,
              backgroundColor: colors.surface,
              borderRadius: 20,
              padding: 24,
              borderWidth: 1,
              borderColor: '#fecaca',
            }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: '#fef2f2',
                alignItems: 'center',
                justifyContent: 'center',
                alignSelf: 'center',
                marginBottom: 14,
              }}
            >
              <Ionicons name="lock-closed" size={28} color={colors.danger} />
            </View>
            <Text
              style={{
                fontFamily: fonts.bold,
                fontSize: 20,
                color: colors.danger,
                textAlign: 'center',
                marginBottom: 8,
              }}
            >
              ระบบล็อกการสอบแล้ว
            </Text>
            <Text
              style={{
                fontFamily: fonts.regular,
                fontSize: 15,
                color: colors.text,
                textAlign: 'center',
                lineHeight: 24,
                marginBottom: 20,
              }}
            >
              {lockWarning}
            </Text>
            <Pressable
              onPress={() => {
                if (attemptId) router.replace(`/(app)/result/${attemptId}`);
              }}
              style={{
                backgroundColor: colors.danger,
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontFamily: fonts.bold, color: '#fff', fontSize: 15 }}>ดูผลการสอบ</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <LinearGradient
        colors={[...gradients.primarySoft]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 220 }}
      />

      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={{ width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 20 }}>
          {/* Header */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 20,
              padding: 20,
              marginBottom: 14,
              borderWidth: 1,
              borderColor: colors.border,
              shadowColor: '#4338ca',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.08,
              shadowRadius: 20,
              elevation: 3,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 22, color: colors.text }}>{exam.title}</Text>
                <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted, marginTop: 4 }}>
                  ข้อที่ {currentIndex + 1} จาก {totalQuestions} · ตอบแล้ว {answeredCount}/{totalQuestions}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 999,
                    backgroundColor: timeUrgent ? '#fef2f2' : colors.backgroundSoft,
                  }}
                >
                  <Ionicons name="time-outline" size={15} color={timeUrgent ? colors.danger : colors.primary} />
                  <Text
                    style={{
                      fontFamily: fonts.bold,
                      fontSize: 14,
                      color: timeUrgent ? colors.danger : colors.primary,
                    }}
                  >
                    {timeDisplay}
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 999,
                    backgroundColor: locked || cheatFlags > 0 ? '#fef2f2' : colors.inputBg,
                  }}
                >
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={13}
                    color={locked || cheatFlags > 0 ? colors.danger : colors.textMuted}
                  />
                  <Text
                    style={{
                      fontFamily: fonts.medium,
                      fontSize: 12,
                      color: locked || cheatFlags > 0 ? colors.danger : colors.textMuted,
                    }}
                  >
                    {locked ? 'ถูกล็อก' : 'ทุจริต = ตัดสิทธิ์ทันที'}
                  </Text>
                </View>
              </View>
            </View>

            <View
              style={{
                marginTop: 16,
                height: 8,
                borderRadius: 999,
                backgroundColor: colors.backgroundSoft,
                overflow: 'hidden',
              }}
            >
              <LinearGradient
                colors={[...gradients.button]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ width: `${progressPct}%`, height: '100%', borderRadius: 999 }}
              />
            </View>
          </View>

          {/* เลขข้อ */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 14 }}
            contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
          >
            {exam.questions.map((q, i) => {
              const answered = !!answers[q.id];
              const active = i === currentIndex;
              return (
                <Pressable
                  key={q.id}
                  onPress={() => goToQuestion(i)}
                  style={({ pressed }) => ({
                    minWidth: 40,
                    height: 40,
                    paddingHorizontal: 8,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: active ? colors.primary : answered ? '#e0e7ff' : colors.surface,
                    borderWidth: 1,
                    borderColor: active ? colors.primary : answered ? '#c7d2fe' : colors.border,
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <Text
                    style={{
                      fontFamily: fonts.bold,
                      fontSize: 14,
                      color: active ? '#fff' : answered ? colors.primaryDark : colors.textMuted,
                    }}
                  >
                    {i + 1}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* คำถาม + ตัวเลือก */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 22,
              padding: 22,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: colors.border,
              shadowColor: '#312e81',
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.07,
              shadowRadius: 24,
              elevation: 3,
            }}
          >
            <View
              style={{
                alignSelf: 'flex-start',
                paddingHorizontal: 12,
                paddingVertical: 5,
                borderRadius: 999,
                backgroundColor: colors.backgroundSoft,
                marginBottom: 14,
              }}
            >
              <Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: colors.primary }}>
                ข้อ {currentIndex + 1}
              </Text>
            </View>

            <Text
              style={{
                fontFamily: fonts.bold,
                fontSize: 18,
                lineHeight: 30,
                color: colors.text,
                marginBottom: 20,
              }}
            >
              {questionTitle}
            </Text>

            <View style={{ gap: 10 }}>
              {choices.map((opt, i) => {
                const selected = answers[question.id] === opt.id;
                const label = CHOICE_LABELS[i] ?? String(i + 1);
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => handleSelect(question.id, opt.id)}
                    style={({ pressed }) => ({
                      paddingVertical: 14,
                      paddingHorizontal: 14,
                      borderRadius: 14,
                      borderWidth: 1.5,
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: selected ? '#eef2ff' : pressed ? colors.inputBg : colors.surface,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 14,
                    })}
                  >
                    <View
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: selected ? colors.primary : colors.backgroundSoft,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: fonts.bold,
                          fontSize: 16,
                          color: selected ? '#fff' : colors.primaryDark,
                        }}
                      >
                        {label}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontFamily: fonts.medium,
                        color: colors.text,
                        fontSize: 15,
                        flex: 1,
                        lineHeight: 24,
                      }}
                    >
                      {cleanOptionText(opt.optionText)}
                    </Text>
                    {selected ? (
                      <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* นำทาง */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
            <Pressable
              onPress={() => goToQuestion(currentIndex - 1)}
              disabled={isFirst}
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 6,
                opacity: isFirst ? 0.4 : 1,
              }}
            >
              <Ionicons name="chevron-back" size={18} color={colors.text} />
              <Text style={{ fontFamily: fonts.semibold, color: colors.text }}>ข้อก่อนหน้า</Text>
            </Pressable>
            <Pressable
              onPress={() => goToQuestion(currentIndex + 1)}
              disabled={isLast}
              style={{
                flex: 1,
                borderRadius: 14,
                overflow: 'hidden',
                opacity: isLast ? 0.4 : 1,
              }}
            >
              <LinearGradient
                colors={isLast ? [colors.border, colors.border] : [...gradients.button]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  paddingVertical: 14,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Text style={{ fontFamily: fonts.semibold, color: isLast ? colors.textMuted : '#fff' }}>
                  ข้อถัดไป
                </Text>
                <Ionicons name="chevron-forward" size={18} color={isLast ? colors.textMuted : '#fff'} />
              </LinearGradient>
            </Pressable>
          </View>

          {/* ส่งข้อสอบ — เด่นตอนข้อสุดท้าย */}
          <Pressable
            onPress={handleSubmit}
            disabled={submitting}
            style={{
              borderRadius: 14,
              overflow: 'hidden',
              opacity: submitting ? 0.7 : 1,
              borderWidth: isLast ? 0 : 1,
              borderColor: colors.border,
            }}
          >
            {isLast ? (
              <LinearGradient
                colors={[...gradients.button]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
              >
                <Ionicons name="send-outline" size={18} color="#fff" />
                <Text style={{ fontFamily: fonts.bold, color: '#fff', fontSize: 16 }}>
                  {submitting ? 'กำลังส่ง...' : 'ส่งข้อสอบ'}
                </Text>
              </LinearGradient>
            ) : (
              <View
                style={{
                  paddingVertical: 14,
                  alignItems: 'center',
                  backgroundColor: colors.surface,
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Ionicons name="send-outline" size={16} color={colors.textMuted} />
                <Text style={{ fontFamily: fonts.semibold, color: colors.textMuted, fontSize: 14 }}>
                  {submitting ? 'กำลังส่ง...' : 'ส่งข้อสอบก่อนครบทุกข้อ'}
                </Text>
              </View>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
