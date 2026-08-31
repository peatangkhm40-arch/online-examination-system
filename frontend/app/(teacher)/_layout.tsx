import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { colors } from '@/theme';
import { getHomeRoute, isTeacher } from '@/utils/routing';

export default function TeacherLayout() {
  const { user, loading, setUserState, logout } = useAuth();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const verifiedRef = useRef(false);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/(auth)/login');
      setReady(false);
      return;
    }

    if (!isTeacher(user.role)) {
      router.replace(getHomeRoute(user.role));
      setReady(false);
      return;
    }

    // เชื่อ user จาก login ทันที — ไม่รอ api.me (ลดกระพริบ)
    setReady(true);

    if (verifiedRef.current) return;
    verifiedRef.current = true;

    let cancelled = false;
    void (async () => {
      try {
        const { user: me } = await api.me();
        if (cancelled) return;
        setUserState(me);
        if (!isTeacher(me.role)) {
          router.replace(getHomeRoute(me.role));
        }
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : '';
        if (msg.includes('429') || msg.includes('มากเกินไป')) return;
        await logout();
        router.replace('/(auth)/login');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, user, router, setUserState, logout]);

  if (loading || !ready || !user || !isTeacher(user.role)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.shellBg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="home" />
      <Stack.Screen name="student-list" />
      <Stack.Screen name="manage-classroom" />
      <Stack.Screen name="manage-exam" />
      <Stack.Screen name="exam/[id]" />
      <Stack.Screen name="summary" />
    </Stack>
  );
}
