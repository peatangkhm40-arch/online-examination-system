import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { TeacherNavbar } from '@/components/TeacherNavbar';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import type { CheatLogItem, ExamResultRoom, StudentSummaryItem } from '@/types';
import { colors, fonts } from '@/theme';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' });
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  IN_PROGRESS: { label: 'กำลังทำ', color: '#d97706' },
  SUBMITTED: { label: 'ส่งแล้ว', color: '#059669' },
  DISQUALIFIED: { label: 'ตัดสิทธิ์', color: '#dc2626' },
};

export default function TeacherSummaryScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalCheatEvents, setTotalCheatEvents] = useState(0);
  const [cheatAlerts, setCheatAlerts] = useState<CheatLogItem[]>([]);
  const [students, setStudents] = useState<StudentSummaryItem[]>([]);
  const [results, setResults] = useState<ExamResultRoom[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [downloadMsg, setDownloadMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, { results: examResults }] = await Promise.all([
        api.getTeacherSummary(),
        api.getExamResults().catch(() => ({ results: [] as ExamResultRoom[] })),
      ]);
      setTotalStudents(data.totalStudents);
      setTotalCheatEvents(data.totalCheatEvents);
      setCheatAlerts(data.cheatAlerts);
      setStudents(data.students);
      setResults(examResults);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDownloadCsv = async (examRoomId?: string, subjectName?: string) => {
    setDownloading(true);
    setDownloadMsg('');
    try {
      const csv = await api.fetchResultsCsv(examRoomId);
      if (Platform.OS === 'web') {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `รายงานคะแนน${subjectName ? `-${subjectName}` : ''}-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        setDownloadMsg('ดาวน์โหลดรายงานแล้ว — เปิดได้ใน Excel');
      }
    } catch (e) {
      setDownloadMsg(e instanceof Error ? e.message : 'ดาวน์โหลดไม่สำเร็จ');
    } finally {
      setDownloading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  if (!user) return null;

  return (
    <TeacherNavbar
      user={user}
      onLogout={handleLogout}
      title="ข้อมูลรวม/แจ้งเตือน"
      maxContentWidth={1200}
    >
        <View style={{ marginBottom: 8 }}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 22, color: colors.text, marginBottom: 4 }}>
            ข้อมูลรวมและการแจ้งเตือน
          </Text>
          <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted }}>
            นักเรียนที่ลงทะเบียน {totalStudents} คน · เหตุการณ์ทุจริต {totalCheatEvents} ครั้ง
          </Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 10,
            marginBottom: 16,
            flexWrap: 'wrap',
          }}
        >
          <Pressable
            onPress={() => void load()}
            disabled={loading}
            accessibilityLabel="รีเฟรชการแจ้งเตือน"
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              minHeight: 44,
              minWidth: 120,
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 12,
              backgroundColor: pressed || loading ? colors.primaryDark : colors.primary,
              opacity: loading ? 0.85 : 1,
              flexShrink: 0,
              cursor: loading ? ('default' as const) : ('pointer' as const),
            })}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="refresh" size={18} color="#fff" />
            )}
            <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: '#fff' }}>
              {loading ? 'กำลังโหลด...' : 'รีเฟรช'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => handleDownloadCsv()}
            disabled={downloading || loading}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              minHeight: 44,
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 12,
              borderWidth: 1.5,
              borderColor: colors.primary,
              backgroundColor: pressed ? colors.backgroundSoft : colors.surface,
              opacity: downloading ? 0.6 : 1,
              flexShrink: 0,
              cursor: downloading ? ('default' as const) : ('pointer' as const),
            })}
          >
            <Ionicons name="download-outline" size={16} color={colors.primary} />
            <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.primary }}>
              {downloading ? 'กำลังดาวน์โหลด...' : 'ดาวน์โหลดรายงานทั้งหมด (CSV)'}
            </Text>
          </Pressable>
        </View>

        {loading && cheatAlerts.length === 0 && students.length === 0 ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* รายงานคะแนนรายห้องสอบ */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
              <Text style={{ fontFamily: fonts.bold, fontSize: 17, color: colors.text }}>รายงานคะแนนรายห้องสอบ</Text>
            </View>
            {downloadMsg ? (
              <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.success, marginBottom: 10 }}>{downloadMsg}</Text>
            ) : null}

            {results.filter((r) => r.attempts.length > 0).length === 0 ? (
              <View style={{ backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 20, marginBottom: 24 }}>
                <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted, textAlign: 'center' }}>
                  ยังไม่มีนักเรียนทำข้อสอบ — คะแนนจะบันทึกอัตโนมัติเมื่อนักเรียนกดส่งข้อสอบ
                </Text>
              </View>
            ) : (
              results
                .filter((r) => r.attempts.length > 0)
                .map(({ room, attempts }) => (
                  <View key={room.id} style={{ backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 20, overflow: 'hidden' }}>
                    <View style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <View>
                        <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.text }}>
                          {room.subjectName} ({room.classCode})
                        </Text>
                        <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                          {room.gradeLevel ? `ห้อง ${room.gradeLevel}` : 'ทุกห้องเรียน'} · {room.questionCount} ข้อ · ทำแล้ว {attempts.length} คน
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => handleDownloadCsv(room.id, room.subjectName)}
                        disabled={downloading}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1.5, borderColor: colors.primary }}
                      >
                        <Ionicons name="download-outline" size={13} color={colors.primary} />
                        <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.primary }}>CSV ห้องนี้</Text>
                      </Pressable>
                    </View>

                    <View style={{ flexDirection: 'row', backgroundColor: colors.backgroundSoft, paddingVertical: 10, paddingHorizontal: 14 }}>
                      {['เลขที่', 'ชื่อ-นามสกุล', 'ห้องเรียน', 'คะแนน', 'สถานะ', 'ทุจริต', 'ส่งเมื่อ'].map((h) => (
                        <Text key={h} style={{ flex: h === 'ชื่อ-นามสกุล' ? 1.6 : 1, fontFamily: fonts.semibold, fontSize: 12, color: colors.text }}>{h}</Text>
                      ))}
                    </View>

                    {attempts.map((a) => {
                      const status = STATUS_LABEL[a.status] ?? { label: a.status, color: colors.textMuted };
                      return (
                        <View
                          key={a.attemptId}
                          style={{
                            flexDirection: 'row',
                            paddingVertical: 11,
                            paddingHorizontal: 14,
                            borderBottomWidth: 1,
                            borderBottomColor: colors.border,
                            backgroundColor: a.status === 'DISQUALIFIED' ? '#fef2f2' : colors.surface,
                          }}
                        >
                          <Text style={{ flex: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.text }}>{a.studentNumber}</Text>
                          <Text style={{ flex: 1.6, fontFamily: fonts.medium, fontSize: 13, color: colors.text }} numberOfLines={1}>{a.fullName}</Text>
                          <Text style={{ flex: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted }}>{a.gradeLevel}</Text>
                          <Text style={{ flex: 1, fontFamily: fonts.semibold, fontSize: 13, color: colors.text }}>
                            {a.score != null && a.maxScore != null ? `${a.score}/${a.maxScore}` : '-'}
                          </Text>
                          <Text style={{ flex: 1, fontFamily: fonts.semibold, fontSize: 13, color: status.color }}>{status.label}</Text>
                          <Text style={{ flex: 1, fontFamily: fonts.regular, fontSize: 13, color: a.cheatCount > 0 ? colors.danger : colors.success }}>
                            {a.cheatCount > 0 ? `${a.cheatCount} ครั้ง` : 'ปกติ'}
                          </Text>
                          <Text style={{ flex: 1, fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted }}>
                            {a.submittedAt ? formatDate(a.submittedAt) : '-'}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                ))
            )}

            <View style={{ backgroundColor: '#fef2f2', borderRadius: 16, borderWidth: 1, borderColor: '#fecaca', marginBottom: 24, overflow: 'hidden' }}>
              <View style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: '#fecaca' }}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.danger }}>แจ้งเตือนการทุจริต</Text>
              </View>
              {cheatAlerts.length === 0 ? (
                <Text style={{ padding: 20, fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center' }}>ไม่พบการทุจริต</Text>
              ) : (
                cheatAlerts.map((log) => (
                  <View key={log.id} style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: '#fecaca' }}>
                    <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.danger }}>
                      {log.studentName} — {log.subjectName} ({log.classCode})
                    </Text>
                    <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.text, marginTop: 4 }}>
                      {log.description ?? log.eventType}
                    </Text>
                    <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                      {formatDate(log.createdAt)} · {log.gradeLevel} เลขที่ {log.studentNumber}
                    </Text>
                  </View>
                ))
              )}
            </View>

            <View style={{ backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
              <View style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.text }}>สรุปคะแนนนักเรียน</Text>
                <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 }}>คะแนนคิดเป็น % รวมจากทุกห้องสอบของคุณ</Text>
              </View>

              <View style={{ flexDirection: 'row', backgroundColor: colors.backgroundSoft, paddingVertical: 10, paddingHorizontal: 14 }}>
                {['เลขที่', 'ชื่อ-นามสกุล', 'ระดับชั้น', 'คะแนน', 'ทุจริต'].map((h) => (
                  <Text key={h} style={{ flex: 1, fontFamily: fonts.semibold, fontSize: 12, color: colors.text }}>{h}</Text>
                ))}
              </View>

              {students.map((s) => (
                <View
                  key={s.id}
                  style={{
                    flexDirection: 'row',
                    paddingVertical: 11,
                    paddingHorizontal: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                    backgroundColor: s.isCheating ? '#fef2f2' : colors.surface,
                  }}
                >
                  <Text style={{ flex: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.text }}>{s.studentNumber}</Text>
                  <Text style={{ flex: 1, fontFamily: fonts.medium, fontSize: 13, color: colors.text }} numberOfLines={1}>{s.fullName}</Text>
                  <Text style={{ flex: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted }}>{s.gradeLevel}</Text>
                  <Text style={{ flex: 1, fontFamily: fonts.semibold, fontSize: 13, color: s.score != null ? colors.text : colors.textMuted }}>
                    {s.score != null ? `${s.score}%` : '-'}
                  </Text>
                  <Text style={{ flex: 1, fontFamily: fonts.semibold, fontSize: 13, color: s.isCheating ? colors.danger : colors.success }}>
                    {s.cheatCount > 0 ? `${s.cheatCount} ครั้ง` : 'ปกติ'}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
    </TeacherNavbar>
  );
}
