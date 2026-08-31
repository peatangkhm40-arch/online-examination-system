import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { TeacherNavbar } from '@/components/TeacherNavbar';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import type { StudentListItem, TeacherClassroom } from '@/types';
import { colors, fonts } from '@/theme';

const PAGE_SIZE = 10;

export default function TeacherStudentListScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [classrooms, setClassrooms] = useState<TeacherClassroom[]>([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState(''); // '' = ทุกห้องของอาจารย์
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const selectedClassroom = useMemo(
    () => classrooms.find((c) => c.id === selectedClassroomId) ?? null,
    [classrooms, selectedClassroomId]
  );

  const allRoomsCount = useMemo(
    () => classrooms.reduce((sum, c) => sum + (c.studentCount ?? 0), 0),
    [classrooms]
  );

  const loadClassrooms = useCallback(async () => {
    try {
      const { classrooms: list } = await api.listMyClassrooms();
      setClassrooms(list);
    } catch {
      setClassrooms([]);
    }
  }, []);

  const load = useCallback(async (p: number, classroomId: string) => {
    setLoading(true);
    try {
      const data = await api.listStudents(p, PAGE_SIZE, classroomId || undefined);
      setStudents(data.students);
      setPage(data.page);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await loadClassrooms();
      await load(1, '');
    })();
  }, [load, loadClassrooms]);

  const selectClassroom = (classroomId: string) => {
    setSelectedClassroomId(classroomId);
    void load(1, classroomId);
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  if (!user) return null;

  const headerCountLabel = selectedClassroom
    ? `ห้อง ${selectedClassroom.name} · ${total} คน`
    : classrooms.length === 0
      ? 'ยังไม่มีห้องเรียน'
      : `ทุกห้องเรียนของฉัน · ${total} คน`;

  return (
    <TeacherNavbar user={user} onLogout={handleLogout} title="รายชื่อผู้เข้าสอบ" maxContentWidth={1200}>
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 22, color: colors.text }}>รายชื่อผู้เข้าสอบ</Text>
          <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginTop: 4 }}>
            {headerCountLabel}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <Pressable
            onPress={() => selectClassroom('')}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 999,
              borderWidth: 1.5,
              borderColor: selectedClassroomId === '' ? colors.primary : colors.border,
              backgroundColor: selectedClassroomId === '' ? colors.backgroundSoft : colors.surface,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.medium,
                fontSize: 13,
                color: selectedClassroomId === '' ? colors.primary : colors.textMuted,
              }}
            >
              ทุกห้องเรียน ({allRoomsCount} คน)
            </Text>
          </Pressable>
          {classrooms.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => selectClassroom(c.id)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 999,
                borderWidth: 1.5,
                borderColor: selectedClassroomId === c.id ? colors.primary : colors.border,
                backgroundColor: selectedClassroomId === c.id ? colors.backgroundSoft : colors.surface,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.medium,
                  fontSize: 13,
                  color: selectedClassroomId === c.id ? colors.primary : colors.textMuted,
                }}
              >
                {c.name} ({c.studentCount} คน)
              </Text>
            </Pressable>
          ))}
        </View>

        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: colors.backgroundSoft,
              paddingVertical: 12,
              paddingHorizontal: 14,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            {['เลขที่', 'ชื่อ-นามสกุล', 'ห้องเรียน', 'อีเมล'].map((h) => (
              <Text
                key={h}
                style={{
                  flex: h === 'อีเมล' ? 1.4 : 1,
                  fontFamily: fonts.semibold,
                  fontSize: 13,
                  color: colors.text,
                }}
              >
                {h}
              </Text>
            ))}
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ margin: 32 }} />
          ) : students.length === 0 ? (
            <Text
              style={{
                padding: 24,
                textAlign: 'center',
                fontFamily: fonts.regular,
                color: colors.textMuted,
              }}
            >
              {classrooms.length === 0
                ? 'ยังไม่มีห้องเรียน — สร้างห้องที่เมนูจัดการห้องเรียน'
                : selectedClassroom
                  ? `ยังไม่มีนักเรียนในห้อง ${selectedClassroom.name}`
                  : 'ยังไม่มีนักเรียนในห้องเรียนของคุณ'}
            </Text>
          ) : (
            students.map((s) => (
              <View
                key={s.id}
                style={{
                  flexDirection: 'row',
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                }}
              >
                <Text style={{ flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.text }}>
                  {s.studentNumber}
                </Text>
                <Text style={{ flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.text }}>
                  {s.fullName}
                </Text>
                <Text style={{ flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted }}>
                  {s.classroomName || s.gradeLevel}
                </Text>
                <Text
                  style={{ flex: 1.4, fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted }}
                  numberOfLines={1}
                >
                  {s.email}
                </Text>
              </View>
            ))
          )}
        </View>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 8,
            marginTop: 16,
          }}
        >
          <Pressable
            onPress={() => page > 1 && void load(page - 1, selectedClassroomId)}
            disabled={page <= 1 || loading}
            style={{ padding: 8, opacity: page <= 1 ? 0.4 : 1 }}
          >
            <Text style={{ fontFamily: fonts.medium, color: colors.primary }}>ก่อนหน้า</Text>
          </Pressable>
          <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted }}>
            หน้า {page} / {totalPages}
          </Text>
          <Pressable
            onPress={() => page < totalPages && void load(page + 1, selectedClassroomId)}
            disabled={page >= totalPages || loading}
            style={{ padding: 8, opacity: page >= totalPages ? 0.4 : 1 }}
          >
            <Text style={{ fontFamily: fonts.medium, color: colors.primary }}>ถัดไป</Text>
          </Pressable>
        </View>
    </TeacherNavbar>
  );
}
