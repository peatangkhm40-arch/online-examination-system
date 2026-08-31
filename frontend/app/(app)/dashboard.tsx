import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ExamCard } from '@/components/ExamCard';
import { ExamRulesNotice } from '@/components/ExamRulesNotice';
import { StudentNavbar } from '@/components/StudentNavbar';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import type { Exam } from '@/types';
import { colors, fonts, gradients } from '@/theme';
import { isTeacher } from '@/utils/routing';

const rulesNoticeKey = (userId: string) => `exam_rules_notice_${userId}`;
const waitingRoomKey = (userId: string) => `waiting_classroom_${userId}`;

function hasSeenRulesNotice(userId: string) {
  if (Platform.OS === 'web' && typeof sessionStorage !== 'undefined') {
    return sessionStorage.getItem(rulesNoticeKey(userId)) === '1';
  }
  return false;
}

function markRulesNoticeSeen(userId: string) {
  if (Platform.OS === 'web' && typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(rulesNoticeKey(userId), '1');
  }
}

function saveWaitingRoom(userId: string, info: WaitingRoom) {
  if (Platform.OS === 'web' && typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(waitingRoomKey(userId), JSON.stringify(info));
  }
}

function loadWaitingRoom(userId: string): WaitingRoom | null {
  if (Platform.OS === 'web' && typeof sessionStorage !== 'undefined') {
    try {
      const raw = sessionStorage.getItem(waitingRoomKey(userId));
      return raw ? (JSON.parse(raw) as WaitingRoom) : null;
    } catch {
      return null;
    }
  }
  return null;
}

type WaitingRoom = {
  name: string;
  joinCode: string;
  teacherName: string;
};

export default function DashboardScreen() {
  const { user, loading: authLoading, logout, setUserState, refreshUser } = useAuth();
  const router = useRouter();
  const layout = useResponsiveLayout();

  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showRulesNotice, setShowRulesNotice] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [waitingRoom, setWaitingRoom] = useState<WaitingRoom | null>(null);
  const [showWaitingModal, setShowWaitingModal] = useState(false);
  const [examReadyModal, setExamReadyModal] = useState<Exam | null>(null);
  const prevExamCount = useRef(0);

  const loadExams = useCallback(async () => {
    // คนเพิ่งสมัคร / ยังไม่ยืนยันวิทยาลัย → ไม่โหลดรายการข้อสอบ
    if (user && user.role === 'STUDENT' && user.isCollegeVerified === false) {
      setExams([]);
      setLoading(false);
      return [] as Exam[];
    }
    try {
      const { exams: list } = await api.listExams();
      setExams(list);
      setError('');
      return list;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ไม่สามารถโหลดรายการข้อสอบได้');
      return [] as Exam[];
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/(auth)/login');
      return;
    }
    if (isTeacher(user.role)) {
      router.replace('/(teacher)/home');
      return;
    }

    const saved = loadWaitingRoom(user.id);
    if (saved) {
      setWaitingRoom(saved);
    } else if (user.classroomName) {
      const info = {
        name: user.classroomName,
        joinCode: user.classroomJoinCode ?? '',
        teacherName: 'อาจารย์',
      };
      setWaitingRoom(info);
      saveWaitingRoom(user.id, info);
    }

    loadExams().then((list) => {
      prevExamCount.current = list.length;
      // ถ้าเข้าห้องแล้วแต่ยังไม่มีข้อสอบ → เด้งหน้ารอเข้าสอบ
      if ((saved || user.classroomName) && list.length === 0) {
        setShowWaitingModal(true);
      }
    });

    if (!hasSeenRulesNotice(user.id)) {
      setShowRulesNotice(true);
    }
  }, [user, authLoading, router, loadExams]);

  useEffect(() => {
    if (authLoading || !user || isTeacher(user.role)) return;
    refreshUser().catch(() => undefined);
  }, [authLoading]);

  // โพลล์ข้อสอบทุก 8 วินาที ตอนอยู่ในห้องรอสอบ (เฉพาะที่ยืนยันวิทยาลัยแล้ว)
  useEffect(() => {
    if (!user || isTeacher(user.role)) return;
    if (user.isCollegeVerified === false) return;
    if (!waitingRoom && !user.classroomName) return;

    const timer = setInterval(async () => {
      const list = await loadExams();
      if (prevExamCount.current === 0 && list.length > 0) {
        setExamReadyModal(list[0]);
        setShowWaitingModal(false);
      }
      prevExamCount.current = list.length;
    }, 8000);

    return () => clearInterval(timer);
  }, [user, waitingRoom, loadExams]);

  const acceptRulesNotice = () => {
    if (user) markRulesNoticeSeen(user.id);
    setShowRulesNotice(false);
  };

  const handleLogout = async () => {
    if (user && Platform.OS === 'web' && typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(rulesNoticeKey(user.id));
      sessionStorage.removeItem(waitingRoomKey(user.id));
    }
    await logout();
    router.replace('/(auth)/login');
  };

  const enterWaitingRoom = (info: WaitingRoom, examCount: number) => {
    setWaitingRoom(info);
    if (user) saveWaitingRoom(user.id, info);
    prevExamCount.current = examCount;
    setShowRulesNotice(false);
    setShowWaitingModal(true);
  };

  const handleJoinByCode = async () => {
    const code = joinCode.trim();
    if (!code) {
      setJoinError('กรุณาวางหรือกรอกรหัสเข้าห้องเรียนจากอาจารย์');
      return;
    }

    setJoining(true);
    setJoinError('');
    try {
      // ยืนยันเซสชันกับเซิร์ฟเวอร์ก่อน — กันโทเคนอาจารย์ค้างแต่หน้าจอยังเป็นนักเรียน
      try {
        const { user: me } = await api.me();
        setUserState(me);
        if (isTeacher(me.role) || me.role !== 'STUDENT') {
          setJoinError('เซสชันปัจจุบันไม่ใช่บัญชีนักเรียน กรุณาออกจากระบบแล้วเข้าใหม่ด้วยบัญชีนักเรียน');
          return;
        }
      } catch {
        await logout();
        router.replace('/(auth)/login');
        return;
      }

      const result = await api.joinByCode(code);
      if (result.user) setUserState(result.user);
      setJoinCode('');

      if (result.type === 'exam' && result.examId) {
        router.replace(`/(app)/exam/${result.examId}`);
        return;
      }

      const info: WaitingRoom = {
        name: result.classroom?.name ?? 'ห้องเรียน',
        joinCode: result.classroom?.joinCode ?? code,
        teacherName: result.classroom?.teacherName ?? 'อาจารย์',
      };

      // เด้งหน้าต่างรอเข้าสอบทันที
      enterWaitingRoom(info, 0);
      setLoading(true);
      const list = await loadExams();
      prevExamCount.current = list.length;
      if (list.length > 0) {
        setShowWaitingModal(false);
        setExamReadyModal(list[0]);
      }
    } catch (e) {
      setJoinError(e instanceof Error ? e.message : 'ไม่สามารถเข้าห้องเรียนด้วยรหัสนี้ได้');
    } finally {
      setJoining(false);
    }
  };

  const cardGap = 16;
  const containerWidth = Math.min(layout.width - layout.contentPadding * 2, layout.maxContentWidth);
  const cardWidth =
    layout.columns === 1
      ? containerWidth
      : (containerWidth - cardGap * (layout.columns - 1)) / layout.columns;

  const inWaitingRoom = !!(waitingRoom || user?.classroomName);
  const waitingName = waitingRoom?.name ?? user?.classroomName ?? '';

  if (authLoading || !user) {
    return (
      <LinearGradient colors={['#ede9fe', '#f0f4ff']} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </LinearGradient>
    );
  }

  return (
    <StudentNavbar user={user} onLogout={handleLogout} title="หน้าหลัก" maxContentWidth={layout.maxContentWidth}>
      {user.role === 'STUDENT' && user.isCollegeVerified === false ? (
        <View
          style={{
            marginBottom: 12,
            backgroundColor: '#fff7ed',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#fed7aa',
            padding: 14,
          }}
        >
          <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: '#c2410c' }}>
            รอแอดมินยืนยันว่าเป็นนักเรียนวิทยาลัย
          </Text>
          <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginTop: 4 }}>
            บัญชีของคุณใช้อีเมลจริงแล้ว แต่ยังเข้าห้องเรียน/เข้าสอบไม่ได้ จนกว่าแอดมินจะกดยืนยันในระบบ
            (ตรวจจากชื่อ ระดับชั้น เลขที่ และอีเมล)
          </Text>
        </View>
      ) : null}
      <ExamRulesNotice visible={showRulesNotice && !showWaitingModal} onAccept={acceptRulesNotice} />

      {/* เด้งขึ้นหลังเข้าห้องเรียน — รอเข้าสอบ */}
      <Modal visible={showWaitingModal} transparent animationType="fade" onRequestClose={() => setShowWaitingModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(30,27,75,0.55)', justifyContent: 'center', padding: 24 }}>
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 20,
              padding: 24,
              maxWidth: 440,
              width: '100%',
              alignSelf: 'center',
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 18,
                backgroundColor: colors.backgroundSoft,
                alignItems: 'center',
                justifyContent: 'center',
                alignSelf: 'center',
                marginBottom: 16,
              }}
            >
              <Ionicons name="hourglass-outline" size={34} color={colors.primary} />
            </View>
            <Text style={{ fontFamily: fonts.bold, fontSize: 22, color: colors.text, textAlign: 'center' }}>
              เข้าห้องเรียนแล้ว
            </Text>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 17, color: colors.primary, textAlign: 'center', marginTop: 8 }}>
              {waitingRoom?.name}
            </Text>
            <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 6 }}>
              อาจารย์ {waitingRoom?.teacherName}
              {waitingRoom?.joinCode ? ` · รหัส ${waitingRoom.joinCode}` : ''}
            </Text>

            <View
              style={{
                marginTop: 18,
                padding: 16,
                borderRadius: 14,
                backgroundColor: '#fff7ed',
                borderWidth: 1,
                borderColor: '#fdba74',
              }}
            >
              <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.text, textAlign: 'center' }}>
                กำลังรอเข้าสอบ
              </Text>
              <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 20 }}>
                รออาจารย์เปิดห้องสอบ เมื่อเปิดแล้ว ระบบจะแจ้งเตือนและแสดงข้อสอบให้อัตโนมัติ
              </Text>
            </View>

            <Pressable
              onPress={() => setShowWaitingModal(false)}
              style={({ pressed }) => ({
                marginTop: 18,
                backgroundColor: pressed ? colors.primaryDark : colors.primary,
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center',
              })}
            >
              <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: '#fff' }}>รอในห้องเรียน</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* เด้งเมื่ออาจารย์เปิดข้อสอบแล้ว */}
      <Modal visible={!!examReadyModal} transparent animationType="fade" onRequestClose={() => setExamReadyModal(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(30,27,75,0.55)', justifyContent: 'center', padding: 24 }}>
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 20,
              padding: 24,
              maxWidth: 440,
              width: '100%',
              alignSelf: 'center',
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 18,
                backgroundColor: '#ecfdf5',
                alignItems: 'center',
                justifyContent: 'center',
                alignSelf: 'center',
                marginBottom: 16,
              }}
            >
              <Ionicons name="checkmark-circle" size={36} color={colors.success} />
            </View>
            <Text style={{ fontFamily: fonts.bold, fontSize: 22, color: colors.text, textAlign: 'center' }}>
              พร้อมเข้าสอบแล้ว
            </Text>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: colors.primary, textAlign: 'center', marginTop: 8 }}>
              {examReadyModal?.title}
            </Text>
            <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 8 }}>
              อาจารย์เปิดห้องสอบแล้ว กดเพื่อเข้าทำข้อสอบ
            </Text>
            <Pressable
              onPress={() => {
                const id = examReadyModal?.id;
                setExamReadyModal(null);
                if (id) router.push(`/(app)/exam/${id}`);
              }}
              style={({ pressed }) => ({
                marginTop: 20,
                backgroundColor: pressed ? colors.primaryDark : colors.primary,
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center',
              })}
            >
              <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: '#fff' }}>เข้าสอบเลย</Text>
            </Pressable>
            <Pressable onPress={() => setExamReadyModal(null)} style={{ marginTop: 12, paddingVertical: 10, alignItems: 'center' }}>
              <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.textMuted }}>ดูรายการข้อสอบก่อน</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

        <View style={{ marginTop: 20, marginBottom: 20 }}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 24, color: colors.text }}>{user.fullName}</Text>
          {user.gradeLevel ? (
            <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted, marginTop: 4 }}>
              ระดับชั้น {user.gradeLevel}
              {user.studentNumber ? ` · เลขที่ ${user.studentNumber}` : ''}
            </Text>
          ) : null}
        </View>

        {/* สถานะรอเข้าสอบ — แสดงค้างหลังเข้าห้องแล้ว */}
        {inWaitingRoom ? (
          <Pressable
            onPress={() => {
              if (waitingRoom) setShowWaitingModal(true);
              else {
                setWaitingRoom({
                  name: user.classroomName ?? 'ห้องเรียน',
                  joinCode: user.classroomJoinCode ?? '',
                  teacherName: 'อาจารย์',
                });
                setShowWaitingModal(true);
              }
            }}
            style={{
              marginBottom: 20,
              borderRadius: 16,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: exams.length > 0 ? '#a7f3d0' : '#c7d2fe',
            }}
          >
            <LinearGradient
              colors={exams.length > 0 ? (['#059669', '#10b981'] as const) : [...gradients.hero]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 18 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name={exams.length > 0 ? 'checkmark-circle' : 'hourglass-outline'} size={26} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>
                    {exams.length > 0 ? 'พร้อมเข้าสอบ' : 'กำลังรอเข้าสอบ'}
                  </Text>
                  <Text style={{ fontFamily: fonts.bold, fontSize: 17, color: '#fff', marginTop: 2 }}>{waitingName}</Text>
                  <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>
                    {exams.length > 0
                      ? `มีข้อสอบเปิด ${exams.length} ห้อง — แตะเพื่อเปิดหน้าต่างเข้าสอบ`
                      : 'รออาจารย์เปิดห้องสอบ — แตะเพื่อดูสถานะ'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#fff" />
              </View>
            </LinearGradient>
          </Pressable>
        ) : null}

        {!inWaitingRoom ? (
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 16,
              marginBottom: 28,
            }}
          >
            <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.text, marginBottom: 4 }}>
              เข้าห้องเรียนด้วยรหัส
            </Text>
            <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginBottom: 12 }}>
              วางรหัสเข้าห้องเรียนที่อาจารย์แจก แล้วระบบจะพาไปหน้ารอเข้าสอบ
            </Text>

            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <View
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: colors.inputBg,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: joinError ? colors.danger : colors.border,
                  paddingHorizontal: 12,
                }}
              >
                <Ionicons name="key-outline" size={20} color={colors.textMuted} />
                <TextInput
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    paddingHorizontal: 10,
                    fontSize: 15,
                    fontFamily: fonts.semibold,
                    color: colors.text,
                    letterSpacing: 1,
                    outlineStyle: 'none',
                  }}
                  placeholder="เช่น CLASS24"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="characters"
                  value={joinCode}
                  onChangeText={(t) => {
                    setJoinCode(t.toUpperCase());
                    setJoinError('');
                  }}
                  onSubmitEditing={handleJoinByCode}
                  editable={!joining}
                />
              </View>
              <Pressable
                onPress={handleJoinByCode}
                disabled={joining}
                style={({ pressed }) => ({
                  backgroundColor: pressed || joining ? colors.primaryDark : colors.primary,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 13,
                  opacity: joining ? 0.8 : 1,
                })}
              >
                <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: '#fff' }}>
                  {joining ? 'กำลังเข้า...' : 'เข้าห้อง'}
                </Text>
              </Pressable>
            </View>

            {joinError ? (
              <View style={{ marginTop: 12, padding: 12, borderRadius: 10, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' }}>
                <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.danger }}>{joinError}</Text>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={{ marginBottom: 20 }}>
            <Pressable
              onPress={() => {
                setWaitingRoom(null);
                if (user && Platform.OS === 'web' && typeof sessionStorage !== 'undefined') {
                  sessionStorage.removeItem(waitingRoomKey(user.id));
                }
              }}
            >
              <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.link }}>เข้าห้องด้วยรหัสอื่น</Text>
            </Pressable>
          </View>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <View>
            <Text style={{ fontFamily: fonts.bold, fontSize: 20, color: colors.text }}>ข้อสอบที่เปิดให้ทำ</Text>
            <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginTop: 2 }}>
              {user.isCollegeVerified === false
                ? 'รอการยืนยันก่อนจึงจะเห็นห้องสอบ'
                : `${exams.length} ห้องสอบ พร้อมเข้าสอบ`}
            </Text>
          </View>
          <Pressable
            onPress={() => {
              setLoading(true);
              loadExams();
            }}
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: colors.backgroundSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="refresh-outline" size={22} color={colors.primary} />
          </Pressable>
        </View>

        {loading ? (
          <View style={{ paddingVertical: 48, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted, marginTop: 12 }}>
              กำลังโหลดรายการข้อสอบ...
            </Text>
          </View>
        ) : error ? (
          <View style={{ padding: 24, borderRadius: 16, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', alignItems: 'center' }}>
            <Ionicons name="alert-circle-outline" size={32} color={colors.danger} />
            <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.danger, marginTop: 8, textAlign: 'center' }}>{error}</Text>
          </View>
        ) : exams.length === 0 ? (
          <View style={{ padding: 40, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}>
            <Ionicons name="time-outline" size={48} color={colors.primary} />
            <Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: colors.text, marginTop: 12 }}>
              {user.isCollegeVerified === false
                ? 'ยังไม่พร้อมเข้าสอบ'
                : inWaitingRoom
                  ? 'กำลังรอเข้าสอบ'
                  : 'ยังไม่มีข้อสอบที่เปิดให้ทำ'}
            </Text>
            <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginTop: 4, textAlign: 'center', lineHeight: 20 }}>
              {user.isCollegeVerified === false
                ? 'คนที่เพิ่งลงทะเบียนจะยังไม่เห็นห้องสอบ\nรอแอดมินยืนยัน แล้วเข้าห้องเรียนด้วยรหัสจากอาจารย์ก่อน'
                : inWaitingRoom
                  ? `คุณอยู่ในห้อง ${waitingName} แล้ว\nรออาจารย์เปิดห้องสอบ — ระบบจะเด้งแจ้งเมื่อพร้อม`
                  : 'กรอกรหัสเข้าห้องเรียนด้านบนก่อน แล้วรออาจารย์เปิดห้องสอบ'}
            </Text>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: cardGap }}>
            {exams.map((exam) => (
              <ExamCard key={exam.id} exam={exam} cardWidth={cardWidth} onPress={() => router.push(`/(app)/exam/${exam.id}`)} />
            ))}
          </View>
        )}
    </StudentNavbar>
  );
}

