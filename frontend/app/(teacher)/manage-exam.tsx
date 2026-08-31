import { createElement, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { GradientButton } from '@/components/GradientButton';
import { TeacherNavbar } from '@/components/TeacherNavbar';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import type { Exam, TeacherClassroom, TeacherSubject } from '@/types';
import { colors, fonts } from '@/theme';
import { fileToBase64 } from '@/utils/fileToBase64';

const EXAM_FILE_ACCEPT = '.xlsx,.xls,.json,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel';

export default function TeacherManageExamScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [subjectName, setSubjectName] = useState('');
  const [subjects, setSubjects] = useState<TeacherSubject[]>([]);
  const [newSubject, setNewSubject] = useState('');
  const [addingSubject, setAddingSubject] = useState(false);
  const [manageSubjects, setManageSubjects] = useState(false);
  const [classrooms, setClassrooms] = useState<TeacherClassroom[]>([]);
  const [gradeLevel, setGradeLevel] = useState(''); // '' = เปิดให้ทุกห้องเรียน
  const [examFormat, setExamFormat] = useState<'MANUAL' | 'IMPORT_FILE'>('MANUAL');
  const [roomStatus, setRoomStatus] = useState<'OPEN' | 'CLOSED'>('OPEN');
  const [examSource, setExamSource] = useState('');
  const [examFile, setExamFile] = useState<File | null>(null);
  const [importingExamId, setImportingExamId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const reimportInputRef = useRef<HTMLInputElement | null>(null);
  const reimportExamIdRef = useRef<string | null>(null);

  const openExamFilePicker = () => {
    if (Platform.OS === 'web') {
      fileInputRef.current?.click();
      return;
    }
    Alert.alert('เลือกไฟล์', 'การเลือกไฟล์จากเครื่องรองรับบนเว็บเบราว์เซอร์');
  };

  const onExamFileSelected = (file?: File | null) => {
    if (!file) return;
    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.xlsx') && !lower.endsWith('.xls') && !lower.endsWith('.json')) {
      setError('กรุณาเลือกไฟล์ .xlsx, .xls หรือ .json เท่านั้น');
      return;
    }
    setError('');
    setExamSource(file.name);
    setExamFile(file);
  };

  const openReimportPicker = (examId: string) => {
    if (Platform.OS !== 'web') {
      Alert.alert('นำเข้าข้อสอบ', 'รองรับบนเว็บเบราว์เซอร์');
      return;
    }
    reimportExamIdRef.current = examId;
    reimportInputRef.current?.click();
  };

  const handleReimportFile = async (file?: File | null) => {
    const examId = reimportExamIdRef.current;
    reimportExamIdRef.current = null;
    if (!file || !examId) return;

    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.xlsx') && !lower.endsWith('.xls') && !lower.endsWith('.json')) {
      setError('กรุณาเลือกไฟล์ .xlsx, .xls หรือ .json เท่านั้น');
      return;
    }

    setImportingExamId(examId);
    setError('');
    setSuccess('');
    try {
      const importFileBase64 = await fileToBase64(file);
      const { message } = await api.importExamQuestions(examId, {
        importFileName: file.name,
        importFileBase64,
        replaceExisting: true,
      });
      setSuccess(message);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'นำเข้าข้อสอบไม่สำเร็จ');
    } finally {
      setImportingExamId(null);
    }
  };

  const load = useCallback(async () => {
    try {
      const [{ exams: list }, { classrooms: rooms }, { subjects: mySubjects }] = await Promise.all([
        api.listExams(),
        api.listMyClassrooms().catch(() => ({ classrooms: [] as TeacherClassroom[] })),
        api.listMySubjects().catch(() => ({ subjects: [] as TeacherSubject[] })),
      ]);
      setExams(list);
      setClassrooms(rooms);
      setSubjects(mySubjects);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const handleAddSubject = async () => {
    const name = newSubject.trim();
    if (name.length < 2) {
      setError('ชื่อวิชาต้องยาวอย่างน้อย 2 ตัวอักษร');
      return;
    }
    setAddingSubject(true);
    setError('');
    try {
      const { subject } = await api.addSubject(name);
      setSubjects((prev) => [...prev, subject].sort((a, b) => a.name.localeCompare(b.name, 'th')));
      setNewSubject('');
      setSubjectName(subject.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'เพิ่มวิชาไม่สำเร็จ');
    } finally {
      setAddingSubject(false);
    }
  };

  const handleDeleteSubject = async (subject: TeacherSubject) => {
    try {
      await api.deleteSubject(subject.id);
      setSubjects((prev) => prev.filter((s) => s.id !== subject.id));
      if (subjectName === subject.name) setSubjectName('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ลบวิชาไม่สำเร็จ');
    }
  };

  const handleCreate = async () => {
    setError('');
    setSuccess('');
    if (!subjectName.trim()) {
      setError('กรุณาเลือกวิชาที่จะสอบ');
      return;
    }
    if (examFormat === 'IMPORT_FILE' && (!examFile || !examSource.trim())) {
      setError('กรุณาเลือกไฟล์คลังข้อสอบ');
      return;
    }

    setSubmitting(true);
    try {
      let importPayload:
        | { importFileName: string; importFileBase64: string; examSource: string }
        | undefined;

      if (examFormat === 'IMPORT_FILE' && examFile) {
        const importFileBase64 = await fileToBase64(examFile);
        importPayload = {
          importFileName: examFile.name,
          importFileBase64,
          examSource: examFile.name,
        };
      }

      const { exam } = await api.createExamRoom({
        subjectName: subjectName.trim(),
        gradeLevel: gradeLevel || undefined,
        examFormat,
        roomStatus,
        useRandomCode: true,
        ...importPayload,
      });

      const qCount = exam._count?.questions ?? 0;
      setSuccess(
        examFormat === 'IMPORT_FILE'
          ? `สร้างห้องสอบและนำเข้าข้อสอบ ${qCount} ข้อเรียบร้อยแล้ว`
          : 'สร้างห้องสอบเรียบร้อยแล้ว'
      );
      setExamSource('');
      setExamFile(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ไม่สามารถบันทึกได้');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (exam: Exam) => {
    const open = exam.status !== 'PUBLISHED';
    try {
      await api.updateExamStatus(exam.id, open);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ไม่สามารถเปลี่ยนสถานะได้');
    }
  };

  const handleDeleteExam = (exam: Exam) => {
    const title = exam.title || 'ห้องสอบนี้';
    const message = `ต้องการลบ「${title}」หรือไม่?\nข้อมูลข้อสอบและผลสอบที่เกี่ยวข้องจะถูกลบด้วย`;

    const doDelete = async () => {
      setError('');
      setSuccess('');
      try {
        await api.deleteExam(exam.id);
        setExams((prev) => prev.filter((e) => e.id !== exam.id));
        setSuccess(`ลบห้องสอบ ${title} แล้ว`);
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

  if (!user) return null;

  return (
    <TeacherNavbar user={user} onLogout={handleLogout} title="จัดการห้องสอบ">
        <Text style={{ fontFamily: fonts.bold, fontSize: 22, color: colors.text, marginBottom: 4 }}>จัดการห้องสอบ</Text>
        <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginBottom: 12 }}>
          สร้างห้องสอบ เลือกวิชา เลือกว่าเปิดให้ห้องเรียนไหน และกำหนดรหัสเข้าสอบ
        </Text>

        <Pressable
          onPress={() => router.push('/(teacher)/manage-classroom')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginBottom: 20,
            padding: 12,
            borderRadius: 12,
            backgroundColor: colors.backgroundSoft,
            borderWidth: 1,
            borderColor: '#c7d2fe',
          }}
        >
          <Ionicons name="school-outline" size={18} color={colors.primary} />
          <Text style={{ flex: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.text }}>
            ยังไม่มีห้องเรียน? สร้างที่หน้าจัดการห้องเรียนก่อน
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </Pressable>

        <View style={{ backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 20, marginBottom: 24 }}>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: colors.text, marginBottom: 16 }}>สร้างห้องสอบ</Text>

          {error ? <Text style={{ color: colors.danger, fontFamily: fonts.regular, marginBottom: 12 }}>{error}</Text> : null}
          {success ? <Text style={{ color: colors.success, fontFamily: fonts.regular, marginBottom: 12 }}>{success}</Text> : null}

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.text }}>เลือกวิชาที่จะสอบ *</Text>
            <Pressable onPress={() => setManageSubjects((v) => !v)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name={manageSubjects ? 'checkmark-outline' : 'create-outline'} size={15} color={colors.primary} />
              <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.primary }}>
                {manageSubjects ? 'เสร็จสิ้น' : 'จัดการวิชาที่สอน'}
              </Text>
            </Pressable>
          </View>

          {subjects.length === 0 ? (
            <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginBottom: 12 }}>
              ยังไม่มีวิชาในระบบ — เพิ่มวิชาที่สอนด้านล่างก่อน
            </Text>
          ) : (
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              {subjects.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => (manageSubjects ? undefined : setSubjectName(s.name))}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 999,
                    borderWidth: 1.5,
                    borderColor: subjectName === s.name ? colors.primary : colors.border,
                    backgroundColor: subjectName === s.name ? colors.backgroundSoft : colors.surface,
                  }}
                >
                  <Ionicons name="book-outline" size={13} color={subjectName === s.name ? colors.primary : colors.textMuted} />
                  <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: subjectName === s.name ? colors.primary : colors.textMuted }}>
                    {s.name}
                  </Text>
                  {manageSubjects ? (
                    <Pressable onPress={() => handleDeleteSubject(s)} hitSlop={6}>
                      <Ionicons name="close-circle" size={16} color={colors.danger} />
                    </Pressable>
                  ) : null}
                </Pressable>
              ))}
            </View>
          )}

          {manageSubjects || subjects.length === 0 ? (
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, alignItems: 'center' }}>
              <TextInput
                style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, fontFamily: fonts.regular, backgroundColor: colors.inputBg, outlineStyle: 'none' }}
                placeholder="เพิ่มวิชาใหม่ เช่น วิทยาศาสตร์พื้นฐาน"
                value={newSubject}
                onChangeText={setNewSubject}
                onSubmitEditing={handleAddSubject}
              />
              <Pressable
                onPress={handleAddSubject}
                disabled={addingSubject}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10, backgroundColor: colors.primary, opacity: addingSubject ? 0.6 : 1 }}
              >
                <Ionicons name="add-outline" size={16} color="#fff" />
                <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: '#fff' }}>เพิ่มวิชา</Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ marginBottom: 4 }} />
          )}

          <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.text, marginBottom: 8 }}>เปิดสอบให้ห้องเรียน</Text>
          <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginBottom: 10 }}>
            เลือกจากห้องเรียนที่สร้างไว้แล้ว — นักเรียนห้องนั้นเท่านั้นที่จะเห็นห้องสอบนี้
          </Text>
          {classrooms.length === 0 ? (
            <Pressable
              onPress={() => router.push('/(teacher)/manage-classroom')}
              style={{ marginBottom: 16, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.inputBg }}
            >
              <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.primary }}>ยังไม่มีห้องเรียน — แตะเพื่อไปสร้าง</Text>
            </Pressable>
          ) : (
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <Pressable
                onPress={() => setGradeLevel('')}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 999,
                  borderWidth: 1.5,
                  borderColor: gradeLevel === '' ? colors.primary : colors.border,
                  backgroundColor: gradeLevel === '' ? colors.backgroundSoft : colors.surface,
                }}
              >
                <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: gradeLevel === '' ? colors.primary : colors.textMuted }}>
                  ทุกห้องเรียน
                </Text>
              </Pressable>
              {classrooms.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => setGradeLevel(c.name)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 999,
                    borderWidth: 1.5,
                    borderColor: gradeLevel === c.name ? colors.primary : colors.border,
                    backgroundColor: gradeLevel === c.name ? colors.backgroundSoft : colors.surface,
                  }}
                >
                  <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: gradeLevel === c.name ? colors.primary : colors.textMuted }}>
                    {c.name} ({c.studentCount} คน)
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.text, marginBottom: 8 }}>รูปแบบข้อสอบ</Text>
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            {[
              { value: 'MANUAL' as const, label: 'พิมพ์ข้อสอบเอง' },
              { value: 'IMPORT_FILE' as const, label: 'นำไฟล์คลังข้อสอบมาวาง' },
            ].map((opt) => (
              <Pressable key={opt.value} onPress={() => setExamFormat(opt.value)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                  {examFormat === opt.value ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }} /> : null}
                </View>
                <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: colors.text }}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>

          {examFormat === 'IMPORT_FILE' ? (
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.text, marginBottom: 8 }}>
                ไฟล์คลังข้อสอบ (.xlsx, .json)
              </Text>
              {Platform.OS === 'web'
                ? createElement('input', {
                    ref: fileInputRef,
                    type: 'file',
                    accept: EXAM_FILE_ACCEPT,
                    style: { display: 'none' },
                    onChange: (event: { target: HTMLInputElement }) => {
                      const file = event.target.files?.[0] ?? null;
                      onExamFileSelected(file);
                      event.target.value = '';
                    },
                  })
                : null}
              <View
                style={{
                  borderWidth: 1,
                  borderColor: examSource ? colors.primary : colors.border,
                  borderRadius: 10,
                  backgroundColor: colors.inputBg,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Pressable
                  onPress={openExamFilePicker}
                  style={({ pressed }) => ({
                    flex: 1,
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    backgroundColor: pressed ? colors.backgroundSoft : 'transparent',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    borderRadius: 10,
                  })}
                >
                  <Ionicons name="folder-open-outline" size={20} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: examSource ? fonts.semibold : fonts.regular,
                        fontSize: 14,
                        color: examSource ? colors.text : colors.textMuted,
                      }}
                      numberOfLines={1}
                    >
                      {examSource || 'กดเพื่อเลือกไฟล์จากเครื่อง'}
                    </Text>
                    <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                      เปิด File Explorer · ระบบจะนำเข้าข้อสอบจากไฟล์ทันที
                    </Text>
                  </View>
                  {!examSource ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} /> : null}
                </Pressable>
                {examSource ? (
                  <Pressable
                    onPress={() => {
                      setExamSource('');
                      setExamFile(null);
                    }}
                    hitSlop={8}
                    accessibilityLabel="ลบไฟล์ที่เลือก"
                    style={{ paddingHorizontal: 12, paddingVertical: 12 }}
                  >
                    <Ionicons name="close-circle" size={20} color={colors.danger} />
                  </Pressable>
                ) : null}
              </View>
            </View>
          ) : null}

          <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.text, marginBottom: 8 }}>สถานะห้องสอบ</Text>
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            {[
              { value: 'OPEN' as const, label: 'เปิดให้เข้ามาทำข้อสอบ' },
              { value: 'CLOSED' as const, label: 'ปิดห้องไว้ก่อน' },
            ].map((opt) => (
              <Pressable key={opt.value} onPress={() => setRoomStatus(opt.value)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                  {roomStatus === opt.value ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }} /> : null}
                </View>
                <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: colors.text }}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>

          <GradientButton label="สร้างห้องสอบ" icon="save-outline" onPress={handleCreate} loading={submitting} />
        </View>

        <Text style={{ fontFamily: fonts.bold, fontSize: 18, color: colors.text, marginBottom: 12 }}>ห้องสอบของฉัน</Text>
        {Platform.OS === 'web'
          ? createElement('input', {
              ref: reimportInputRef,
              type: 'file',
              accept: EXAM_FILE_ACCEPT,
              style: { display: 'none' },
              onChange: (event: { target: HTMLInputElement }) => {
                const file = event.target.files?.[0] ?? null;
                void handleReimportFile(file);
                event.target.value = '';
              },
            })
          : null}
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : exams.length === 0 ? (
          <Text style={{ fontFamily: fonts.regular, color: colors.textMuted }}>ยังไม่มีห้องสอบ</Text>
        ) : (
          exams.map((exam) => {
            const questionCount = exam._count?.questions ?? 0;
            return (
            <View key={exam.id} style={{ backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 12 }}>
              {/* ห้องสอบ — แก้ไข / เปิดปิด / ลบ */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.text }}>{exam.title}</Text>
                  <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginTop: 4 }}>
                    {exam.description}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                    <Ionicons name="people-outline" size={14} color={exam.gradeLevel ? colors.primary : colors.textMuted} />
                    <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: exam.gradeLevel ? colors.primary : colors.textMuted }}>
                      {exam.gradeLevel ? `เฉพาะห้อง ${exam.gradeLevel}` : 'เปิดให้ทุกห้องเรียน'}
                    </Text>
                  </View>
                  <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: questionCount ? colors.success : colors.danger, marginTop: 6 }}>
                    {questionCount > 0 ? `${questionCount} ข้อสอบ` : 'ยังไม่มีข้อสอบ — นักเรียนเข้าทำไม่ได้'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Pressable
                    onPress={() => router.push(`/(teacher)/exam/${exam.id}`)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 8,
                      backgroundColor: colors.backgroundSoft,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Ionicons name="create-outline" size={16} color={colors.primary} />
                    <Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: colors.primary }}>แก้ไข</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => toggleStatus(exam)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 8,
                      backgroundColor: exam.status === 'PUBLISHED' ? '#ecfdf5' : colors.backgroundSoft,
                    }}
                  >
                    <Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: exam.status === 'PUBLISHED' ? colors.success : colors.textMuted }}>
                      {exam.status === 'PUBLISHED' ? 'เปิดสอบ' : 'ปิดห้อง'}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleDeleteExam(exam)}
                    hitSlop={8}
                    style={{
                      padding: 8,
                      borderRadius: 8,
                      backgroundColor: '#fef2f2',
                    }}
                    accessibilityLabel="ลบห้องสอบ"
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </Pressable>
                </View>
              </View>
              <Pressable
                  onPress={() => openReimportPicker(exam.id)}
                  disabled={importingExamId === exam.id}
                  style={{
                    marginTop: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    paddingVertical: 10,
                    borderRadius: 10,
                    backgroundColor: colors.backgroundSoft,
                    opacity: importingExamId === exam.id ? 0.7 : 1,
                  }}
                >
                  <Ionicons name="cloud-upload-outline" size={18} color={colors.primary} />
                  <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.primary }}>
                    {importingExamId === exam.id
                      ? 'กำลังนำเข้า...'
                      : questionCount === 0
                        ? 'นำเข้าข้อสอบจากไฟล์'
                        : 'นำเข้าไฟล์แทนที่ข้อสอบ'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => router.push(`/(teacher)/exam/${exam.id}`)}
                  style={{
                    marginTop: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    paddingVertical: 10,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: colors.primary,
                  }}
                >
                  <Ionicons name="enter-outline" size={18} color={colors.primary} />
                  <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.primary }}>
                    เข้าแก้ไขข้อสอบ
                  </Text>
                </Pressable>
            </View>
            );
          })
        )}
    </TeacherNavbar>
  );
}
