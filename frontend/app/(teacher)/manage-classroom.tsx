import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { GradientButton } from '@/components/GradientButton';
import { SelectField } from '@/components/SelectField';
import { TeacherNavbar } from '@/components/TeacherNavbar';
import { GRADE_LEVEL_OPTIONS } from '@/constants/gradeLevels';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import type { TeacherClassroom, TeacherSubject } from '@/types';
import { colors, fonts } from '@/theme';

function randomJoinCode() {
  return `CLASS${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export default function TeacherManageClassroomScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [classrooms, setClassrooms] = useState<TeacherClassroom[]>([]);
  const [subjects, setSubjects] = useState<TeacherSubject[]>([]);
  const [subjectId, setSubjectId] = useState('');
  const [newSubjectName, setNewSubjectName] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [useRandomCode, setUseRandomCode] = useState(true);
  const [joinCode, setJoinCode] = useState(randomJoinCode());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copiedId, setCopiedId] = useState('');

  const load = useCallback(async () => {
    try {
      const [{ classrooms: list }, { subjects: subjectList }] = await Promise.all([
        api.listMyClassrooms(),
        api.listMySubjects(),
      ]);
      setClassrooms(list);
      setSubjects(subjectList);
      setError('');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'โหลดห้องเรียนไม่สำเร็จ';
      if (msg.includes('สิทธิ์') || msg.includes('permissions')) {
        setError('เซสชันหมดอายุหรือไม่ได้เข้าสู่ระบบด้วยบัญชีอาจารย์ กรุณาออกจากระบบแล้วเข้าใหม่ด้วยบัญชีอาจารย์');
      } else {
        setError(msg);
      }
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

  const handleCreate = async () => {
    setError('');
    setSuccess('');
    const subjectName = newSubjectName.trim();
    const useNewSubject = !subjectId || subjectId === '__new__';
    if (useNewSubject && subjectName.length < 1) {
      setError('กรุณาเลือกหรือระบุประเภทวิชาของห้องเรียน');
      return;
    }
    if (!gradeLevel) {
      setError('กรุณาเลือกว่าห้องนี้อยู่ชั้นไหน / ห้องไหน');
      return;
    }
    if (!useRandomCode && joinCode.trim().length < 3) {
      setError('กรุณาระบุรหัสเข้าห้องเรียนอย่างน้อย 3 ตัวอักษร');
      return;
    }
    setSubmitting(true);
    try {
      const { classroom } = await api.addClassroom({
        subjectId: useNewSubject ? undefined : subjectId,
        subjectName: useNewSubject ? subjectName : undefined,
        gradeLevel,
        joinCode: useRandomCode ? undefined : joinCode.trim().toUpperCase(),
        useRandomCode,
      });
      setSubjectId('');
      setNewSubjectName('');
      setGradeLevel('');
      setJoinCode(randomJoinCode());
      setUseRandomCode(true);
      setSuccess(`สร้างห้องเรียนเรียบร้อยแล้ว — รหัสเข้าห้อง: ${classroom.joinCode}`);
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'สร้างห้องเรียนไม่สำเร็จ';
      if (msg.includes('สิทธิ์') || msg.includes('permissions')) {
        setError('เซสชันหมดอายุหรือไม่ได้เข้าสู่ระบบด้วยบัญชีอาจารย์ กรุณาออกจากระบบแล้วเข้าใหม่ด้วยบัญชีอาจารย์');
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (classroom: TeacherClassroom) => {
    setError('');
    setSuccess('');
    try {
      await api.deleteClassroom(classroom.id);
      setClassrooms((prev) => prev.filter((c) => c.id !== classroom.id));
      setSuccess(`ลบห้องเรียน ${classroom.name} แล้ว`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ลบห้องเรียนไม่สำเร็จ');
    }
  };

  const copyCode = async (classroom: TeacherClassroom) => {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(classroom.joinCode);
      }
      setCopiedId(classroom.id);
      setTimeout(() => setCopiedId(''), 1500);
    } catch {
      // ignore
    }
  };

  if (!user) return null;

  const subjectOptions = [
    ...subjects.map((s) => ({ label: s.name, value: s.id })),
    { label: '+ เพิ่มวิชาใหม่', value: '__new__' },
  ];

  return (
    <TeacherNavbar user={user} onLogout={handleLogout} title="จัดการห้องเรียน" maxContentWidth={900}>
      <Text style={{ fontFamily: fonts.bold, fontSize: 22, color: colors.text, marginBottom: 4 }}>จัดการห้องเรียน</Text>
      <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginBottom: 20 }}>
        สร้างห้องเรียนตามประเภทวิชา แล้วระบุว่าเปิดให้ชั้นไหน/ห้องไหน — นักเรียนเข้าได้หลายห้อง (หลายวิชา)
        แต่ต้องชั้นตรงกับตอนสมัคร
      </Text>

      <View style={{ backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 20, marginBottom: 24 }}>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: colors.text, marginBottom: 8 }}>สร้างห้องเรียนใหม่</Text>
        <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginBottom: 14 }}>
          ขั้นตอน: 1) เลือกวิชา 2) เลือกระดับชั้น/ห้อง 3) แจกรหัสให้นักเรียน
        </Text>

        {error ? <Text style={{ color: colors.danger, fontFamily: fonts.regular, marginBottom: 12 }}>{error}</Text> : null}
        {success ? <Text style={{ color: colors.success, fontFamily: fonts.regular, marginBottom: 12 }}>{success}</Text> : null}

        <SelectField
          label="ประเภทวิชา *"
          value={subjectId === '__new__' ? '__new__' : subjectId}
          options={subjectOptions.length ? subjectOptions : [{ label: '+ เพิ่มวิชาใหม่', value: '__new__' }]}
          onChange={(v) => {
            setSubjectId(v);
            if (v !== '__new__') setNewSubjectName('');
          }}
          placeholder="เลือกวิชา"
        />

        {subjectId === '__new__' || (!subjectId && subjects.length === 0) ? (
          <>
            <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.text, marginBottom: 8 }}>ชื่อวิชาใหม่ *</Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 10,
                padding: 12,
                marginBottom: 16,
                fontFamily: fonts.regular,
                backgroundColor: colors.inputBg,
                outlineStyle: 'none',
              }}
              placeholder="เช่น คณิตศาสตร์, ภาษาอังกฤษ"
              value={newSubjectName}
              onChangeText={setNewSubjectName}
            />
          </>
        ) : null}

        <SelectField
          label="ระดับชั้น / ห้อง *"
          value={gradeLevel}
          options={GRADE_LEVEL_OPTIONS}
          onChange={setGradeLevel}
          placeholder="เลือกชั้นและห้อง เช่น ปวส. 2/4"
        />

        <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.text, marginBottom: 8 }}>รหัสเข้าห้องเรียน *</Text>
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          {[
            { random: true, label: 'สุ่มรหัสอัตโนมัติ' },
            { random: false, label: 'กำหนดรหัสเอง' },
          ].map((opt) => (
            <Pressable
              key={String(opt.random)}
              onPress={() => setUseRandomCode(opt.random)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                {useRandomCode === opt.random ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }} /> : null}
              </View>
              <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: colors.text }}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, alignItems: 'center' }}>
          <TextInput
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 10,
              padding: 12,
              fontFamily: fonts.semibold,
              backgroundColor: useRandomCode ? colors.backgroundSoft : colors.inputBg,
              color: colors.primary,
              outlineStyle: 'none',
              letterSpacing: 1,
            }}
            value={joinCode}
            onChangeText={(t) => setJoinCode(t.toUpperCase())}
            editable={!useRandomCode}
            autoCapitalize="characters"
            placeholder="CLASSXXXX"
          />
          <Pressable onPress={() => setJoinCode(randomJoinCode())} style={{ padding: 12, borderRadius: 10, backgroundColor: colors.backgroundSoft }}>
            <Ionicons name="refresh-outline" size={20} color={colors.primary} />
          </Pressable>
        </View>

        <GradientButton label="สร้างห้องเรียน" icon="add-outline" onPress={handleCreate} loading={submitting} />
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ fontFamily: fonts.bold, fontSize: 18, color: colors.text }}>ห้องเรียนของฉัน</Text>
        <Pressable onPress={() => void load()} style={{ padding: 8 }}>
          <Ionicons name="refresh-outline" size={20} color={colors.primary} />
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : classrooms.length === 0 ? (
        <Text style={{ fontFamily: fonts.regular, color: colors.textMuted }}>ยังไม่มีห้องเรียน</Text>
      ) : (
        classrooms.map((classroom) => (
          <View
            key={classroom.id}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 16,
              marginBottom: 12,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: colors.text }}>{classroom.name}</Text>
                <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginTop: 4 }}>
                  {(classroom.subjectName ? `วิชา ${classroom.subjectName} · ` : '') +
                    `ชั้น ${classroom.gradeLevel || '-'} · ${classroom.studentCount} คน`}
                </Text>
                <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.primary, marginTop: 6 }}>
                  รหัส: {classroom.joinCode}
                </Text>
              </View>
              <Pressable onPress={() => void copyCode(classroom)} style={{ padding: 10, borderRadius: 10, backgroundColor: colors.backgroundSoft }}>
                <Ionicons name={copiedId === classroom.id ? 'checkmark' : 'copy-outline'} size={18} color={colors.primary} />
              </Pressable>
              <Pressable onPress={() => void handleDelete(classroom)} style={{ padding: 10, borderRadius: 10, backgroundColor: '#fef2f2' }}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </Pressable>
            </View>
          </View>
        ))
      )}
    </TeacherNavbar>
  );
}
