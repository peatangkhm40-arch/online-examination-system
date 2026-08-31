import { createElement, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { GradientButton } from '@/components/GradientButton';
import { TeacherNavbar } from '@/components/TeacherNavbar';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import type { ExamDetail, Question } from '@/types';
import { colors, fonts } from '@/theme';
import { fileToBase64 } from '@/utils/fileToBase64';

const EXAM_FILE_ACCEPT =
  '.xlsx,.xls,.json,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel';

const OPTION_LABELS = ['ก', 'ข', 'ค', 'ง'];

type DraftOption = { optionText: string; isCorrect: boolean };
type QuestionDraft = {
  id?: string;
  questionText: string;
  points: string;
  options: DraftOption[];
};

function emptyDraft(): QuestionDraft {
  return {
    questionText: '',
    points: '1',
    options: [
      { optionText: '', isCorrect: true },
      { optionText: '', isCorrect: false },
      { optionText: '', isCorrect: false },
      { optionText: '', isCorrect: false },
    ],
  };
}

function fromQuestion(q: Question): QuestionDraft {
  const opts = q.options.slice(0, 4).map((o) => ({
    optionText: o.optionText,
    isCorrect: !!o.isCorrect,
  }));
  while (opts.length < 2) opts.push({ optionText: '', isCorrect: false });
  while (opts.length < 4) opts.push({ optionText: '', isCorrect: false });
  if (!opts.some((o) => o.isCorrect)) opts[0].isCorrect = true;
  return {
    id: q.id,
    questionText: q.questionText,
    points: String(q.points ?? 1),
    options: opts,
  };
}

export default function TeacherEditExamScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { user, logout } = useAuth();
  const router = useRouter();

  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingMeta, setSavingMeta] = useState(false);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [roomOpen, setRoomOpen] = useState(true);
  const [draft, setDraft] = useState<QuestionDraft>(emptyDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    if (!id) {
      setError('ไม่พบรหัสห้องสอบ');
      setLoading(false);
      return;
    }
    try {
      const { exam: data } = await api.getExam(id);
      setExam(data);
      setSubjectName(data.title || '');
      setGradeLevel(data.gradeLevel || '');
      setRoomOpen(data.status === 'PUBLISHED');
      setError('');
    } catch (e) {
      setExam(null);
      setError(e instanceof Error ? e.message : 'โหลดห้องสอบไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const handleSaveMeta = async () => {
    if (!id) return;
    setError('');
    setSuccess('');
    if (subjectName.trim().length < 2) {
      setError('กรุณากรอกชื่อวิชาอย่างน้อย 2 ตัวอักษร');
      return;
    }
    setSavingMeta(true);
    try {
      const { message } = await api.updateExam(id, {
        subjectName: subjectName.trim(),
        gradeLevel: gradeLevel.trim() || null,
        roomStatus: roomOpen ? 'OPEN' : 'CLOSED',
      });
      setSuccess(message || 'บันทึกห้องสอบแล้ว');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'บันทึกห้องสอบไม่สำเร็จ');
    } finally {
      setSavingMeta(false);
    }
  };

  const handleDeleteExam = () => {
    if (!exam || !id) return;
    const message = `ต้องการลบ「${exam.title}」หรือไม่?\nข้อมูลข้อสอบและผลสอบจะถูกลบด้วย`;
    const doDelete = async () => {
      try {
        await api.deleteExam(id);
        router.replace('/(teacher)/manage-exam');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'ลบห้องสอบไม่สำเร็จ');
      }
    };
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(message)) void doDelete();
      return;
    }
    Alert.alert('ลบห้องสอบ', message, [
      { text: 'ยกเลิก', style: 'cancel' },
      { text: 'ลบ', style: 'destructive', onPress: () => void doDelete() },
    ]);
  };

  const startEdit = (q: Question) => {
    setEditingId(q.id);
    setDraft(fromQuestion(q));
    setError('');
    setSuccess('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(emptyDraft());
  };

  const setCorrectOption = (index: number) => {
    setDraft((prev) => ({
      ...prev,
      options: prev.options.map((o, i) => ({ ...o, isCorrect: i === index })),
    }));
  };

  const handleSaveQuestion = async () => {
    if (!id) return;
    setError('');
    setSuccess('');
    const text = draft.questionText.trim();
    if (text.length < 3) {
      setError('ข้อความคำถามต้องยาวอย่างน้อย 3 ตัวอักษร');
      return;
    }
    const options = draft.options
      .map((o) => ({ optionText: o.optionText.trim(), isCorrect: o.isCorrect }))
      .filter((o) => o.optionText.length > 0);
    if (options.length < 2) {
      setError('ต้องมีตัวเลือกอย่างน้อย 2 ข้อ');
      return;
    }
    if (!options.some((o) => o.isCorrect)) {
      setError('ต้องเลือกเฉลยอย่างน้อย 1 ข้อ');
      return;
    }

    setSavingQuestion(true);
    try {
      const payload = {
        questionText: text,
        points: Math.max(1, Number(draft.points) || 1),
        options,
      };
      if (editingId) {
        await api.updateQuestion(id, editingId, payload);
        setSuccess('บันทึกข้อสอบแล้ว');
      } else {
        await api.addQuestion(id, payload);
        setSuccess('เพิ่มข้อสอบแล้ว');
      }
      cancelEdit();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'บันทึกข้อสอบไม่สำเร็จ');
    } finally {
      setSavingQuestion(false);
    }
  };

  const handleDeleteQuestion = (q: Question) => {
    if (!id) return;
    const message = `ลบข้อสอบ「${q.questionText.slice(0, 40)}」หรือไม่?`;
    const doDelete = async () => {
      try {
        await api.deleteQuestion(id, q.id);
        if (editingId === q.id) cancelEdit();
        setSuccess('ลบข้อสอบแล้ว');
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'ลบข้อสอบไม่สำเร็จ');
      }
    };
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(message)) void doDelete();
      return;
    }
    Alert.alert('ลบข้อสอบ', message, [
      { text: 'ยกเลิก', style: 'cancel' },
      { text: 'ลบ', style: 'destructive', onPress: () => void doDelete() },
    ]);
  };

  const handleImport = async (file?: File | null) => {
    if (!id || !file) return;
    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.xlsx') && !lower.endsWith('.xls') && !lower.endsWith('.json')) {
      setError('กรุณาเลือกไฟล์ .xlsx, .xls หรือ .json เท่านั้น');
      return;
    }
    setImporting(true);
    setError('');
    setSuccess('');
    try {
      const importFileBase64 = await fileToBase64(file);
      const { message } = await api.importExamQuestions(id, {
        importFileName: file.name,
        importFileBase64,
        replaceExisting: true,
      });
      setSuccess(message);
      cancelEdit();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'นำเข้าข้อสอบไม่สำเร็จ');
    } finally {
      setImporting(false);
    }
  };

  if (!user) return null;

  return (
    <TeacherNavbar user={user} onLogout={handleLogout} title="แก้ไขห้องสอบ">
        <Pressable
          onPress={() => router.push('/(teacher)/manage-exam')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 }}
        >
          <Ionicons name="arrow-back" size={18} color={colors.primary} />
          <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.primary }}>กลับจัดการห้องสอบ</Text>
        </Pressable>

        <Text style={{ fontFamily: fonts.bold, fontSize: 24, color: colors.text, marginBottom: 4 }}>
          แก้ไขห้องสอบ / ข้อสอบ
        </Text>
        <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted, marginBottom: 20 }}>
          แก้ไขรายละเอียดห้อง เพิ่ม/แก้/ลบข้อสอบ หรือนำเข้าไฟล์แทนที่
        </Text>

        {error ? (
          <View
            style={{
              backgroundColor: '#fef2f2',
              borderRadius: 10,
              padding: 12,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: '#fecaca',
            }}
          >
            <Text style={{ color: colors.danger, fontFamily: fonts.regular, fontSize: 14 }}>{error}</Text>
          </View>
        ) : null}
        {success ? (
          <View
            style={{
              backgroundColor: '#ecfdf5',
              borderRadius: 10,
              padding: 12,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: '#a7f3d0',
            }}
          >
            <Text style={{ color: colors.success, fontFamily: fonts.regular, fontSize: 14 }}>{success}</Text>
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : !exam ? (
          <Text style={{ fontFamily: fonts.regular, color: colors.textMuted }}>ไม่พบห้องสอบ</Text>
        ) : (
          <>
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: colors.border,
                padding: 20,
                marginBottom: 20,
              }}
            >
              <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.text, marginBottom: 12 }}>
                รายละเอียดห้องสอบ
              </Text>
              <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginBottom: 12 }}>
                รหัสห้อง: {exam.classCode} · ข้อสอบ {exam._count?.questions ?? exam.questions.length} ข้อ
              </Text>

              <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.text, marginBottom: 6 }}>
                ชื่อวิชา
              </Text>
              <TextInput
                value={subjectName}
                onChangeText={setSubjectName}
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontFamily: fonts.regular,
                  marginBottom: 12,
                  backgroundColor: colors.inputBg,
                }}
              />

              <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.text, marginBottom: 6 }}>
                ระดับชั้น (ว่าง = ทุกห้อง)
              </Text>
              <TextInput
                value={gradeLevel}
                onChangeText={setGradeLevel}
                placeholder="เช่น ปวส. 2/4"
                placeholderTextColor={colors.textMuted}
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontFamily: fonts.regular,
                  marginBottom: 12,
                  backgroundColor: colors.inputBg,
                }}
              />

              <View style={{ flexDirection: 'row', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                {[
                  { open: true, label: 'เปิดสอบ' },
                  { open: false, label: 'ปิดห้อง' },
                ].map((opt) => (
                  <Pressable
                    key={String(opt.open)}
                    onPress={() => setRoomOpen(opt.open)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                  >
                    <View
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 9,
                        borderWidth: 2,
                        borderColor: colors.primary,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {roomOpen === opt.open ? (
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }} />
                      ) : null}
                    </View>
                    <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: colors.text }}>{opt.label}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
                <View style={{ flex: 1, minWidth: 160 }}>
                  <GradientButton label="บันทึกรายละเอียด" onPress={handleSaveMeta} loading={savingMeta} />
                </View>
                <Pressable
                  onPress={handleDeleteExam}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: 10,
                    backgroundColor: '#fef2f2',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.danger }}>ลบห้องสอบ</Text>
                </Pressable>
              </View>
            </View>

            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: colors.border,
                padding: 20,
                marginBottom: 20,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.text }}>
                  {editingId ? 'แก้ไขข้อสอบ' : 'เพิ่มข้อสอบใหม่'}
                </Text>
                {Platform.OS === 'web' ? (
                  <Pressable
                    onPress={() => fileInputRef.current?.click()}
                    disabled={importing}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                  >
                    <Ionicons name="cloud-upload-outline" size={18} color={colors.primary} />
                    <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.primary }}>
                      {importing ? 'กำลังนำเข้า...' : 'นำเข้าไฟล์แทนที่'}
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              {Platform.OS === 'web'
                ? createElement('input', {
                    ref: fileInputRef,
                    type: 'file',
                    accept: EXAM_FILE_ACCEPT,
                    style: { display: 'none' },
                    onChange: (event: { target: HTMLInputElement }) => {
                      const file = event.target.files?.[0] ?? null;
                      void handleImport(file);
                      event.target.value = '';
                    },
                  })
                : null}

              <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.text, marginBottom: 6 }}>
                คำถาม
              </Text>
              <TextInput
                value={draft.questionText}
                onChangeText={(v) => setDraft((p) => ({ ...p, questionText: v }))}
                multiline
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontFamily: fonts.regular,
                  marginBottom: 12,
                  minHeight: 72,
                  textAlignVertical: 'top',
                  backgroundColor: colors.inputBg,
                }}
              />

              {draft.options.map((opt, index) => (
                <View key={index} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <Pressable onPress={() => setCorrectOption(index)} style={{ width: 28, alignItems: 'center' }}>
                    <Ionicons
                      name={opt.isCorrect ? 'checkmark-circle' : 'ellipse-outline'}
                      size={22}
                      color={opt.isCorrect ? colors.success : colors.textMuted}
                    />
                  </Pressable>
                  <Text style={{ fontFamily: fonts.semibold, width: 20, color: colors.text }}>
                    {OPTION_LABELS[index] ?? index + 1}
                  </Text>
                  <TextInput
                    value={opt.optionText}
                    onChangeText={(v) =>
                      setDraft((p) => ({
                        ...p,
                        options: p.options.map((o, i) => (i === index ? { ...o, optionText: v } : o)),
                      }))
                    }
                    placeholder={`ตัวเลือก ${OPTION_LABELS[index] ?? index + 1}`}
                    placeholderTextColor={colors.textMuted}
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      fontFamily: fonts.regular,
                      backgroundColor: colors.inputBg,
                    }}
                  />
                </View>
              ))}
              <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginBottom: 12 }}>
                กดไอคอนวงกลมเพื่อเลือกเฉลย
              </Text>

              <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
                <View style={{ flex: 1, minWidth: 160 }}>
                  <GradientButton
                    label={editingId ? 'บันทึกข้อสอบ' : 'เพิ่มข้อสอบ'}
                    onPress={handleSaveQuestion}
                    loading={savingQuestion}
                  />
                </View>
                {editingId ? (
                  <Pressable
                    onPress={cancelEdit}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: colors.border,
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.textMuted }}>ยกเลิกแก้ไข</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>

            <Text style={{ fontFamily: fonts.bold, fontSize: 18, color: colors.text, marginBottom: 12 }}>
              รายการข้อสอบ ({exam.questions.length})
            </Text>
            {exam.questions.length === 0 ? (
              <Text style={{ fontFamily: fonts.regular, color: colors.textMuted }}>ยังไม่มีข้อสอบในห้องนี้</Text>
            ) : (
              exam.questions.map((q, qi) => (
                <View
                  key={q.id}
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: editingId === q.id ? colors.primary : colors.border,
                    padding: 14,
                    marginBottom: 10,
                  }}
                >
                  <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.text }}>
                    {qi + 1}. {q.questionText}
                  </Text>
                  {q.options.map((o, oi) => (
                    <Text
                      key={o.id}
                      style={{
                        fontFamily: fonts.regular,
                        fontSize: 13,
                        color: o.isCorrect ? colors.success : colors.textMuted,
                        marginTop: 4,
                      }}
                    >
                      {OPTION_LABELS[oi] ?? oi + 1}. {o.optionText}
                      {o.isCorrect ? ' ✓' : ''}
                    </Text>
                  ))}
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
                    <Pressable onPress={() => startEdit(q)}>
                      <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.primary }}>แก้ไข</Text>
                    </Pressable>
                    <Pressable onPress={() => handleDeleteQuestion(q)}>
                      <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.danger }}>ลบ</Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </>
        )}
    </TeacherNavbar>
  );
}
