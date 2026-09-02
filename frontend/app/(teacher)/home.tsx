import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatCard } from '@/components/StatCard';
import { TeacherNavbar } from '@/components/TeacherNavbar';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import type { CheatLogItem, TeacherDashboardStats } from '@/types';
import { colors, fonts } from '@/theme';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' });
}

export default function TeacherHomeScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<TeacherDashboardStats | null>(null);
  const [recentCheats, setRecentCheats] = useState<CheatLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getTeacherDashboard();
      setStats(data.stats);
      setRecentCheats(data.recentCheats);
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

  if (!user) return null;

  return (
    <TeacherNavbar
      user={user}
      onLogout={handleLogout}
      title="หน้าหลัก"
      maxContentWidth={1200}
      onRefresh={() => void load()}
      refreshing={loading}
    >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 24,
          }}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted }}>แผงควบคุมอาจารย์</Text>
            <Text style={{ fontFamily: fonts.bold, fontSize: 24, color: colors.text, marginTop: 4 }}>{user.fullName}</Text>
            <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted, marginTop: 4 }}>{user.email}</Text>
          </View>
          <Pressable
            onPress={() => void load()}
            disabled={loading}
            accessibilityLabel="รีเฟรชหน้าหลัก"
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              minHeight: 40,
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: pressed ? colors.primary : colors.border,
              backgroundColor: pressed ? colors.backgroundSoft : colors.surface,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? ('default' as const) : ('pointer' as const),
            })}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="refresh-outline" size={18} color={colors.primary} />
            )}
            <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.primary }}>รีเฟรช</Text>
          </Pressable>
        </View>

        {loading && !stats ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
              <StatCard
                title="นักเรียนที่ลงทะเบียน"
                value={stats?.studentCount ?? 0}
                icon="people-outline"
                onPress={() => router.push('/(teacher)/student-list')}
              />
              <StatCard
                title="ชุดข้อสอบในระบบ"
                value={stats?.examRoomCount ?? 0}
                icon="document-text-outline"
                onPress={() => router.push('/(teacher)/manage-exam')}
              />
              <StatCard
                title="ตรวจพบการทุจริต"
                value={stats?.cheatCount ?? 0}
                icon="warning-outline"
                accent={colors.danger}
                onPress={() => router.push('/(teacher)/summary')}
              />
            </View>

            <View style={{ backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
              <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                  <Ionicons name="notifications-outline" size={20} color={colors.primary} />
                  <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.text }}>แจ้งเตือนพฤติกรรมทุจริตล่าสุด</Text>
                </View>
              </View>

              {recentCheats.length === 0 ? (
                <View style={{ padding: 32, alignItems: 'center' }}>
                  <Ionicons name="shield-checkmark-outline" size={40} color={colors.textMuted} />
                  <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted, marginTop: 8 }}>ยังไม่พบพฤติกรรมทุจริต</Text>
                </View>
              ) : (
                recentCheats.map((log) => (
                  <View key={log.id} style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: log.isNotified ? colors.surface : '#fef2f2' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.danger }}>{log.studentName}</Text>
                      <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted }}>{formatDate(log.createdAt)}</Text>
                    </View>
                    <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.text }}>
                      {log.subjectName} ({log.classCode}) · {log.description ?? log.eventType}
                    </Text>
                    <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                      {log.gradeLevel} · เลขที่ {log.studentNumber}
                    </Text>
                  </View>
                ))
              )}
            </View>

            <Pressable onPress={() => router.push('/(teacher)/summary')} style={{ marginTop: 16, alignSelf: 'flex-end' }}>
              <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.link }}>ดูข้อมูลรวมทั้งหมด</Text>
            </Pressable>
          </>
        )}
    </TeacherNavbar>
  );
}
