import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { GradientButton } from '@/components/GradientButton';
import { TeacherNavbar } from '@/components/TeacherNavbar';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import type { TeacherClassroom } from '@/types';
import { colors, fonts } from '@/theme';

function randomJoinCode() {
  return `CLASS${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export default function TeacherManageClassroomScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [classrooms, setClassrooms] = useState<TeacherClassroom[]>([]);
  const [name, setName] = useState('');
  const [useRandomCode, setUseRandomCode] = useState(true);
  const [joinCode, setJoinCode] = useState(randomJoinCode());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copiedId, setCopiedId] = useState('');

  const load = useCallback(async () => {
    try {
      const { classrooms: list } = await api.listMyClassrooms();
      setClassrooms(list);
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
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError('กรุณาระบุชื่อห้องเรียน เช่น ปวส. 2/4');
      return;
    }
    if (!useRandomCode && joinCode.trim().length < 3) {
      setError('กรุณาระบุรหัสเข้าห้องเรียนอย่างน้อย 3 ตัวอักษร');
      return;
    }
    setSubmitting(true);
    try {
      const { classroom } = await api.addClassroom({
        name: trimmed,
        joinCode: useRandomCode ? undefined : joinCode.trim().toUpperCase(),
        useRandomCode,
      });
      setName('');
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

  return (
    <TeacherNavbar user={user} onLogout={handleLogout} title="จัดการห้องเรียน" maxContentWidth={900}>
        <Text style={{ fontFamily: fonts.bold, fontSize: 22, color: colors.text, marginBottom: 4 }}>จัดการห้องเรียน</Text>
        <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginBottom: 20 }}>
          สร้างห้องเรียนพร้อมรหัสเข้าห้อง — แจกรหัสให้นักเรียนเพื่อเข้าห้องเรียนของคุณ
        </Text>

        <View style={{ backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 20, marginBottom: 24 }}>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: colors.text, marginBottom: 8 }}>สร้างห้องเรียนใหม่</Text>
          <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginBottom: 14 }}>
            ตั้งชื่อห้องให้สื่อความหมายได้ เช่น ปวส. 2/4 — นักเรียนเข้าด้วยรหัสด้านล่าง โดยระดับชั้นตอนสมัครจะไม่ถูกเปลี่ยน
          </Text>

          {error ? <Text style={{ color: colors.danger, fontFamily: fonts.regular, marginBottom: 12 }}>{error}</Text> : null}
          {success ? <Text style={{ color: colors.success, fontFamily: fonts.regular, marginBottom: 12 }}>{success}</Text> : null}

          <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.text, marginBottom: 8 }}>ชื่อห้องเรียน *</Text>
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
            placeholder="เช่น ปวส. 2/4"
            value={name}
            onChangeText={setName}
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
          <Pressable
            onPress={() => router.push('/(teacher)/manage-exam')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.primary }}>ไปสร้างห้องสอบ</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.primary} />
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : classrooms.length === 0 ? (
          <View style={{ padding: 28, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}>
            <Ionicons name="school-outline" size={36} color={colors.textMuted} />
            <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.text, marginTop: 10 }}>ยังไม่มีห้องเรียน</Text>
            <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginTop: 4, textAlign: 'center' }}>
              สร้างห้องเรียนพร้อมรหัสเข้าห้องด้านบนก่อน
            </Text>
          </View>
        ) : (
          classrooms.map((c) => (
            <View
              key={c.id}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                padding: 16,
                marginBottom: 10,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                  <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: colors.backgroundSoft, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="people-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.text }}>{c.name}</Text>
                    <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginTop: 2 }}>
                      นักเรียนที่ตรงระดับชั้น {c.studentCount} คน
                    </Text>
                  </View>
                </View>
                <Pressable onPress={() => handleDelete(c)} hitSlop={8} style={{ padding: 8 }}>
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </Pressable>
              </View>

              <View
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 10,
                  backgroundColor: colors.backgroundSoft,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <View>
                  <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted }}>รหัสเข้าห้องเรียน</Text>
                  <Text style={{ fontFamily: fonts.bold, fontSize: 18, color: colors.primary, letterSpacing: 1.5, marginTop: 2 }}>
                    {c.joinCode}
                  </Text>
                </View>
                <Pressable
                  onPress={() => copyCode(c)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 8,
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Ionicons name={copiedId === c.id ? 'checkmark' : 'copy-outline'} size={15} color={colors.primary} />
                  <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.primary }}>
                    {copiedId === c.id ? 'คัดลอกแล้ว' : 'คัดลอก'}
                  </Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
    </TeacherNavbar>
  );
}
