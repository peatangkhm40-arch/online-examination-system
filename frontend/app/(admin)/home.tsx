import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AdminNavbar } from '@/components/AdminNavbar';
import { AuthInput, PasswordInput } from '@/components/AuthInput';
import { GradientButton } from '@/components/GradientButton';
import { useAuth } from '@/context/AuthContext';
import { isValidPassword, PASSWORD_RULES_MESSAGE } from '@/constants/auth';
import { api } from '@/lib/api';
import type {
  AdminClassroomItem,
  AdminExamItem,
  AdminStudentAccount,
  TeacherAccount,
} from '@/types';
import { colors, fonts } from '@/theme';
import { STAFF_EMAIL_HINT, validateStaffEmail } from '@/utils/emailPolicy';

type TabKey = 'teachers' | 'students' | 'exams' | 'classrooms';

const TABS: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'teachers', label: 'อาจารย์', icon: 'school-outline' },
  { key: 'students', label: 'นักเรียน', icon: 'people-outline' },
  { key: 'exams', label: 'ห้องสอบ', icon: 'document-text-outline' },
  { key: 'classrooms', label: 'ห้องเรียน', icon: 'business-outline' },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' });
}

function confirmAction(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    if (window.confirm(`${title}\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'ยกเลิก', style: 'cancel' },
    { text: 'ยืนยัน', style: 'destructive', onPress: onConfirm },
  ]);
}

export default function AdminHomeScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>('teachers');
  const [refreshHovered, setRefreshHovered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [studentFilter, setStudentFilter] = useState<'all' | 'pending' | 'verified'>('all');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const [teachers, setTeachers] = useState<TeacherAccount[]>([]);
  const [students, setStudents] = useState<AdminStudentAccount[]>([]);
  const [exams, setExams] = useState<AdminExamItem[]>([]);
  const [classrooms, setClassrooms] = useState<AdminClassroomItem[]>([]);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [editTeacherName, setEditTeacherName] = useState('');
  const [editTeacherEmail, setEditTeacherEmail] = useState('');
  const [editTeacherPassword, setEditTeacherPassword] = useState('');

  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editStudentFirst, setEditStudentFirst] = useState('');
  const [editStudentLast, setEditStudentLast] = useState('');
  const [editStudentEmail, setEditStudentEmail] = useState('');
  const [editStudentGrade, setEditStudentGrade] = useState('');
  const [editStudentNumber, setEditStudentNumber] = useState('');
  const [editStudentPassword, setEditStudentPassword] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [t, s, e, c] = await Promise.all([
        api.listTeachers(),
        api.listAdminStudents(),
        api.listAdminExams(),
        api.listAdminClassrooms(),
      ]);
      setTeachers(t.teachers);
      setStudents(s.students);
      setExams(e.exams);
      setClassrooms(c.classrooms);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'โหลดข้อมูลแอดมินไม่สำเร็จ');
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

  const flash = (msg: string) => {
    setSuccess(msg);
    setError('');
  };

  const handleCreateTeacher = async () => {
    setError('');
    setSuccess('');
    const name = fullName.trim();
    const mail = email.trim().toLowerCase();
    if (name.length < 2) {
      setError('กรุณากรอกชื่อ-นามสกุลอาจารย์');
      return;
    }
    if (!mail.includes('@')) {
      setError('กรุณากรอกอีเมลให้ถูกต้อง');
      return;
    }
    const staffEmailError = validateStaffEmail(mail);
    if (staffEmailError) {
      setError(staffEmailError);
      return;
    }
    if (!isValidPassword(password)) {
      setError(PASSWORD_RULES_MESSAGE);
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.createTeacher({ fullName: name, email: mail, password });
      flash(res.message);
      setFullName('');
      setEmail('');
      setPassword('');
      setTeachers((prev) => [res.teacher, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'สร้างบัญชีอาจารย์ไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveTeacher = async (id: string) => {
    setError('');
    try {
      const payload: { fullName?: string; email?: string; password?: string } = {
        fullName: editTeacherName.trim(),
        email: editTeacherEmail.trim().toLowerCase(),
      };
      if (editTeacherPassword) {
        if (!isValidPassword(editTeacherPassword)) {
          setError(PASSWORD_RULES_MESSAGE);
          return;
        }
        payload.password = editTeacherPassword;
      }
      const res = await api.updateTeacher(id, payload);
      flash(res.message);
      setTeachers((prev) => prev.map((t) => (t.id === id ? res.teacher : t)));
      setEditingTeacherId(null);
      setEditTeacherPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'บันทึกอาจารย์ไม่สำเร็จ');
    }
  };

  const handleToggleTeacher = async (teacher: TeacherAccount) => {
    try {
      const res = await api.setTeacherActive(teacher.id, !teacher.isActive);
      flash(res.message);
      setTeachers((prev) => prev.map((t) => (t.id === teacher.id ? res.teacher : t)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'อัปเดตสถานะไม่สำเร็จ');
    }
  };

  const handleDeleteTeacher = (teacher: TeacherAccount) => {
    confirmAction('ลบอาจารย์', `ลบ「${teacher.fullName}」หรือไม่?`, () => {
      void (async () => {
        try {
          const res = await api.deleteTeacher(teacher.id);
          flash(res.message);
          setTeachers((prev) => prev.filter((t) => t.id !== teacher.id));
        } catch (err) {
          setError(err instanceof Error ? err.message : 'ลบอาจารย์ไม่สำเร็จ');
        }
      })();
    });
  };

  const handleSaveStudent = async (id: string) => {
    setError('');
    try {
      const payload: Parameters<typeof api.updateAdminStudent>[1] = {
        firstName: editStudentFirst.trim(),
        lastName: editStudentLast.trim(),
        email: editStudentEmail.trim().toLowerCase(),
        gradeLevel: editStudentGrade.trim(),
        studentNumber: Number(editStudentNumber),
      };
      if (editStudentPassword) {
        if (!isValidPassword(editStudentPassword)) {
          setError(PASSWORD_RULES_MESSAGE);
          return;
        }
        payload.password = editStudentPassword;
      }
      const res = await api.updateAdminStudent(id, payload);
      flash(res.message);
      setStudents((prev) => prev.map((s) => (s.id === id ? res.student : s)));
      setEditingStudentId(null);
      setEditStudentPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'บันทึกนักเรียนไม่สำเร็จ');
    }
  };

  const handleToggleStudent = async (student: AdminStudentAccount) => {
    try {
      const res = await api.updateAdminStudent(student.id, { isActive: !student.isActive });
      flash(res.message);
      setStudents((prev) => prev.map((s) => (s.id === student.id ? res.student : s)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'อัปเดตสถานะนักเรียนไม่สำเร็จ');
    }
  };

  const handleVerifyStudent = async (student: AdminStudentAccount, verified: boolean) => {
    try {
      const res = await api.updateAdminStudent(student.id, { isCollegeVerified: verified });
      flash(
        verified
          ? `ยืนยันแล้วว่า「${student.fullName}」เป็นนักเรียนวิทยาลัย`
          : `ยกเลิกการยืนยันของ「${student.fullName}」แล้ว`
      );
      setStudents((prev) => prev.map((s) => (s.id === student.id ? res.student : s)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ยืนยันนักเรียนไม่สำเร็จ');
    }
  };

  const handleDeleteStudent = (student: AdminStudentAccount) => {
    confirmAction('ลบนักเรียน', `ลบ「${student.fullName}」หรือไม่?`, () => {
      void (async () => {
        try {
          const res = await api.deleteAdminStudent(student.id);
          flash(res.message);
          setStudents((prev) => prev.filter((s) => s.id !== student.id));
        } catch (err) {
          setError(err instanceof Error ? err.message : 'ลบนักเรียนไม่สำเร็จ');
        }
      })();
    });
  };

  const handleToggleExam = async (exam: AdminExamItem) => {
    try {
      const open = exam.status !== 'PUBLISHED';
      const res = await api.setAdminExamOpen(exam.id, open);
      flash(res.message);
      setExams((prev) =>
        prev.map((e) =>
          e.id === exam.id ? { ...e, status: open ? 'PUBLISHED' : 'DRAFT' } : e
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เปลี่ยนสถานะห้องสอบไม่สำเร็จ');
    }
  };

  const handleDeleteExam = (exam: AdminExamItem) => {
    confirmAction('ลบห้องสอบ', `ลบ「${exam.subjectName}」หรือไม่?`, () => {
      void (async () => {
        try {
          const res = await api.deleteAdminExam(exam.id);
          flash(res.message);
          setExams((prev) => prev.filter((e) => e.id !== exam.id));
        } catch (err) {
          setError(err instanceof Error ? err.message : 'ลบห้องสอบไม่สำเร็จ');
        }
      })();
    });
  };

  const handleDeleteClassroom = (room: AdminClassroomItem) => {
    confirmAction('ลบห้องเรียน', `ลบ「${room.name}」หรือไม่?`, () => {
      void (async () => {
        try {
          const res = await api.deleteAdminClassroom(room.id);
          flash(res.message);
          setClassrooms((prev) => prev.filter((c) => c.id !== room.id));
        } catch (err) {
          setError(err instanceof Error ? err.message : 'ลบห้องเรียนไม่สำเร็จ');
        }
      })();
    });
  };

  const pendingStudents = students.filter((s) => !s.isCollegeVerified && s.isActive);
  const pendingCount = pendingStudents.length;

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return students.filter((s) => {
      if (studentFilter === 'pending' && s.isCollegeVerified) return false;
      if (studentFilter === 'verified' && !s.isCollegeVerified) return false;
      if (!q) return true;
      return (
        s.fullName.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.gradeLevel.toLowerCase().includes(q) ||
        String(s.studentNumber).includes(q) ||
        (s.classroomName ?? '').toLowerCase().includes(q)
      );
    });
  }, [students, searchQuery, studentFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pagedStudents = filteredStudents.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(''), 4000);
    return () => clearTimeout(t);
  }, [success]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, studentFilter, tab]);

  if (!user) return null;

  return (
    <AdminNavbar user={user} onLogout={handleLogout} title="จัดการระบบทั้งหมด" maxContentWidth={1100}>
        <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted }}>แผงควบคุมผู้ดูแลระบบ</Text>
        <Text style={{ fontFamily: fonts.bold, fontSize: 24, color: colors.text, marginTop: 4 }}>
          จัดการระบบทั้งหมด
        </Text>
        <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted, marginTop: 4, marginBottom: 16 }}>
          ค้นหา ยืนยัน แก้ไข ระงับ และลบข้อมูลได้ครบ — แยกหมวดหมู่ชัดเจนพร้อมแบ่งหน้า
        </Text>

        {pendingCount > 0 ? (
          <Pressable
            onPress={() => {
              setTab('students');
              setStudentFilter('pending');
            }}
            style={{
              marginBottom: 16,
              backgroundColor: '#fff7ed',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#fed7aa',
              padding: 14,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <Ionicons name="notifications" size={22} color="#c2410c" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: '#c2410c' }}>
                งานค้าง: รอยืนยันนักเรียน {pendingCount} คน
              </Text>
              <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                กดเพื่อไปยังรายการรอตรวจสอบ — แจ้งเตือนนี้จะหายเมื่อยืนยันครบแล้ว
              </Text>
            </View>
          </Pressable>
        ) : null}

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 20,
            flexWrap: 'wrap',
          }}
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, flex: 1, minWidth: 0, alignItems: 'center' }}>
            {TABS.map((item) => {
              const active = tab === item.key;
              const badge = item.key === 'students' && pendingCount > 0 ? pendingCount : 0;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => setTab(item.key)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 10,
                    backgroundColor: active ? colors.primary : pressed ? colors.backgroundSoft : colors.surface,
                    borderWidth: 1,
                    borderColor: active ? colors.primary : colors.border,
                    cursor: 'pointer' as const,
                  })}
                >
                  <Ionicons name={item.icon} size={16} color={active ? '#fff' : colors.text} />
                  <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: active ? '#fff' : colors.text }}>
                    {item.label}
                  </Text>
                  {badge > 0 ? (
                    <View style={{ backgroundColor: active ? '#fff' : colors.danger, borderRadius: 999, minWidth: 20, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ fontFamily: fonts.semibold, fontSize: 11, color: active ? colors.danger : '#fff', textAlign: 'center' }}>
                        {badge}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={() => void load()}
            accessibilityLabel="รีเฟรช"
            onHoverIn={() => setRefreshHovered(true)}
            onHoverOut={() => setRefreshHovered(false)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              alignSelf: 'center',
              paddingHorizontal: 14,
              paddingVertical: 10,
              minHeight: 40,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: pressed || refreshHovered ? colors.primary : colors.border,
              backgroundColor: pressed || refreshHovered ? colors.backgroundSoft : colors.surface,
              cursor: 'pointer' as const,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.primary }}>รีเฟรช</Text>
          </Pressable>
        </View>

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
        ) : null}

        {!loading && tab === 'teachers' ? (
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
                สร้างบัญชีอาจารย์
              </Text>
              <AuthInput label="ชื่อ-นามสกุล" required value={fullName} onChangeText={setFullName} />
              <AuthInput
                label="อีเมล"
                required
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="somchai@college.ac.th"
                value={email}
                onChangeText={setEmail}
              />
              <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: -8, marginBottom: 12 }}>
                {STAFF_EMAIL_HINT}
              </Text>
              <PasswordInput label="รหัสผ่าน" required value={password} onChangeText={setPassword} />
              <GradientButton label="สร้างบัญชีอาจารย์" onPress={handleCreateTeacher} loading={submitting} />
            </View>

            {teachers.map((teacher) => (
              <View
                key={teacher.id}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: 14,
                  marginBottom: 10,
                }}
              >
                {editingTeacherId === teacher.id ? (
                  <>
                    <AuthInput label="ชื่อ" value={editTeacherName} onChangeText={setEditTeacherName} />
                    <AuthInput
                      label="อีเมล"
                      autoCapitalize="none"
                      value={editTeacherEmail}
                      onChangeText={setEditTeacherEmail}
                    />
                    <PasswordInput
                      label="รหัสผ่านใหม่ (ว่าง = ไม่เปลี่ยน)"
                      value={editTeacherPassword}
                      onChangeText={setEditTeacherPassword}
                    />
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <Pressable onPress={() => void handleSaveTeacher(teacher.id)}>
                        <Text style={{ fontFamily: fonts.semibold, color: colors.primary }}>บันทึก</Text>
                      </Pressable>
                      <Pressable onPress={() => setEditingTeacherId(null)}>
                        <Text style={{ fontFamily: fonts.medium, color: colors.textMuted }}>ยกเลิก</Text>
                      </Pressable>
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.text }}>
                      {teacher.fullName}
                    </Text>
                    <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted }}>
                      {teacher.email} · {teacher.isActive ? 'ใช้งานอยู่' : 'ระงับแล้ว'} ·{' '}
                      {formatDate(teacher.createdAt)}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 14, marginTop: 10, flexWrap: 'wrap' }}>
                      <Pressable
                        onPress={() => {
                          setEditingTeacherId(teacher.id);
                          setEditTeacherName(teacher.fullName);
                          setEditTeacherEmail(teacher.email);
                          setEditTeacherPassword('');
                        }}
                      >
                        <Text style={{ fontFamily: fonts.medium, color: colors.primary }}>แก้ไข</Text>
                      </Pressable>
                      <Pressable onPress={() => void handleToggleTeacher(teacher)}>
                        <Text style={{ fontFamily: fonts.medium, color: teacher.isActive ? colors.danger : colors.success }}>
                          {teacher.isActive ? 'ระงับ' : 'เปิดใช้'}
                        </Text>
                      </Pressable>
                      <Pressable onPress={() => handleDeleteTeacher(teacher)}>
                        <Text style={{ fontFamily: fonts.medium, color: colors.danger }}>ลบ</Text>
                      </Pressable>
                    </View>
                  </>
                )}
              </View>
            ))}
          </>
        ) : null}

        {!loading && tab === 'students' ? (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {(
                [
                  { key: 'all' as const, label: `ทั้งหมด (${students.length})` },
                  { key: 'pending' as const, label: `รอตรวจสอบ (${pendingCount})` },
                  { key: 'verified' as const, label: 'ยืนยันแล้ว' },
                ] as const
              ).map((f) => (
                <Pressable
                  key={f.key}
                  onPress={() => setStudentFilter(f.key)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: studentFilter === f.key ? colors.primary : colors.border,
                    backgroundColor: studentFilter === f.key ? colors.backgroundSoft : colors.surface,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.medium,
                      fontSize: 13,
                      color: studentFilter === f.key ? colors.primary : colors.textMuted,
                    }}
                  >
                    {f.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="ค้นหาชื่อ อีเมล ชั้น เลขที่ หรือห้องเรียน..."
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 12,
                marginBottom: 12,
                fontFamily: fonts.regular,
                backgroundColor: colors.inputBg,
                outlineStyle: 'none',
              }}
            />

            <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginBottom: 12 }}>
              แสดง {pagedStudents.length} จาก {filteredStudents.length} คน · หน้า {pageSafe}/{totalPages}
            </Text>

          {filteredStudents.length === 0 ? (
            <Text style={{ fontFamily: fonts.regular, color: colors.textMuted }}>ไม่พบนักเรียนตามเงื่อนไข</Text>
          ) : (
            pagedStudents.map((student) => (
              <View
                key={student.id}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: 14,
                  marginBottom: 10,
                }}
              >
                {editingStudentId === student.id ? (
                  <>
                    <AuthInput label="ชื่อ" value={editStudentFirst} onChangeText={setEditStudentFirst} />
                    <AuthInput label="นามสกุล" value={editStudentLast} onChangeText={setEditStudentLast} />
                    <AuthInput
                      label="อีเมล"
                      autoCapitalize="none"
                      value={editStudentEmail}
                      onChangeText={setEditStudentEmail}
                    />
                    <AuthInput label="ระดับชั้น" value={editStudentGrade} onChangeText={setEditStudentGrade} />
                    <AuthInput
                      label="เลขที่"
                      keyboardType="number-pad"
                      value={editStudentNumber}
                      onChangeText={setEditStudentNumber}
                    />
                    <PasswordInput
                      label="รหัสผ่านใหม่ (ว่าง = ไม่เปลี่ยน)"
                      value={editStudentPassword}
                      onChangeText={setEditStudentPassword}
                    />
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <Pressable onPress={() => void handleSaveStudent(student.id)}>
                        <Text style={{ fontFamily: fonts.semibold, color: colors.primary }}>บันทึก</Text>
                      </Pressable>
                      <Pressable onPress={() => setEditingStudentId(null)}>
                        <Text style={{ fontFamily: fonts.medium, color: colors.textMuted }}>ยกเลิก</Text>
                      </Pressable>
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.text }}>
                      {student.fullName}
                    </Text>
                    <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted }}>
                      {student.email} · {student.gradeLevel} เลขที่ {student.studentNumber}
                      {student.classroomName ? ` · ห้อง ${student.classroomName}` : ''} ·{' '}
                      {student.isActive ? 'ใช้งานอยู่' : 'ระงับแล้ว'} ·{' '}
                      {student.isCollegeVerified ? 'ยืนยันวิทยาลัยแล้ว' : 'รอตรวจสอบ'}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 14, marginTop: 10, flexWrap: 'wrap' }}>
                      <Pressable
                        onPress={() => {
                          setEditingStudentId(student.id);
                          setEditStudentFirst(student.firstName);
                          setEditStudentLast(student.lastName);
                          setEditStudentEmail(student.email);
                          setEditStudentGrade(student.gradeLevel);
                          setEditStudentNumber(String(student.studentNumber));
                          setEditStudentPassword('');
                        }}
                      >
                        <Text style={{ fontFamily: fonts.medium, color: colors.primary }}>แก้ไข</Text>
                      </Pressable>
                      <Pressable onPress={() => void handleVerifyStudent(student, !student.isCollegeVerified)}>
                        <Text
                          style={{
                            fontFamily: fonts.medium,
                            color: student.isCollegeVerified ? colors.warning : colors.success,
                          }}
                        >
                          {student.isCollegeVerified ? 'ยกเลิกยืนยัน' : 'ยืนยันว่าเป็น นศ.วิทยาลัย'}
                        </Text>
                      </Pressable>
                      <Pressable onPress={() => void handleToggleStudent(student)}>
                        <Text
                          style={{
                            fontFamily: fonts.medium,
                            color: student.isActive ? colors.danger : colors.success,
                          }}
                        >
                          {student.isActive ? 'ระงับ' : 'เปิดใช้'}
                        </Text>
                      </Pressable>
                      <Pressable onPress={() => handleDeleteStudent(student)}>
                        <Text style={{ fontFamily: fonts.medium, color: colors.danger }}>ลบ</Text>
                      </Pressable>
                    </View>
                  </>
                )}
              </View>
            ))
          )}

          {totalPages > 1 ? (
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 8, marginBottom: 16 }}>
              <Pressable
                onPress={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pageSafe <= 1}
                style={{ opacity: pageSafe <= 1 ? 0.4 : 1, padding: 10 }}
              >
                <Text style={{ fontFamily: fonts.semibold, color: colors.primary }}>ก่อนหน้า</Text>
              </Pressable>
              <Text style={{ fontFamily: fonts.medium, color: colors.text }}>
                {pageSafe} / {totalPages}
              </Text>
              <Pressable
                onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={pageSafe >= totalPages}
                style={{ opacity: pageSafe >= totalPages ? 0.4 : 1, padding: 10 }}
              >
                <Text style={{ fontFamily: fonts.semibold, color: colors.primary }}>ถัดไป</Text>
              </Pressable>
            </View>
          ) : null}
          </>
        ) : null}

        {!loading && tab === 'exams' ? (
          exams.length === 0 ? (
            <Text style={{ fontFamily: fonts.regular, color: colors.textMuted }}>ยังไม่มีห้องสอบ</Text>
          ) : (
            exams.map((exam) => (
              <View
                key={exam.id}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: 14,
                  marginBottom: 10,
                }}
              >
                <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.text }}>
                  {exam.subjectName}
                </Text>
                <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted }}>
                  รหัส {exam.classCode} · อาจารย์ {exam.teacherName} · {exam.questionCount} ข้อ ·{' '}
                  {exam.gradeLevel || 'ทุกห้อง'} · {exam.status === 'PUBLISHED' ? 'เปิดสอบ' : 'ปิดห้อง'}
                </Text>
                <View style={{ flexDirection: 'row', gap: 14, marginTop: 10 }}>
                  <Pressable onPress={() => void handleToggleExam(exam)}>
                    <Text style={{ fontFamily: fonts.medium, color: colors.primary }}>
                      {exam.status === 'PUBLISHED' ? 'ปิดห้อง' : 'เปิดสอบ'}
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => router.push(`/(admin)/exam/${exam.id}`)}>
                    <Text style={{ fontFamily: fonts.medium, color: colors.link }}>ดู/แก้ไขข้อสอบ</Text>
                  </Pressable>
                  <Pressable onPress={() => handleDeleteExam(exam)}>
                    <Text style={{ fontFamily: fonts.medium, color: colors.danger }}>ลบ</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )
        ) : null}

        {!loading && tab === 'classrooms' ? (
          classrooms.length === 0 ? (
            <Text style={{ fontFamily: fonts.regular, color: colors.textMuted }}>ยังไม่มีห้องเรียน</Text>
          ) : (
            classrooms.map((room) => (
              <View
                key={room.id}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: 14,
                  marginBottom: 10,
                }}
              >
                <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.text }}>{room.name}</Text>
                <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted }}>
                  รหัส {room.joinCode} · อาจารย์ {room.teacherName} · นักเรียน {room.studentCount} คน ·{' '}
                  {formatDate(room.createdAt)}
                </Text>
                <Pressable onPress={() => handleDeleteClassroom(room)} style={{ marginTop: 10 }}>
                  <Text style={{ fontFamily: fonts.medium, color: colors.danger }}>ลบห้องเรียน</Text>
                </Pressable>
              </View>
            ))
          )
        ) : null}
    </AdminNavbar>
  );
}
