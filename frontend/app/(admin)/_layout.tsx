import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { colors } from '@/theme';
import { getHomeRoute, isAdmin } from '@/utils/routing';

export default function AdminLayout() {
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

    if (!isAdmin(user.role)) {
      router.replace(getHomeRoute(user.role));
      setReady(false);
      return;
    }

    setReady(true);

    if (verifiedRef.current) return;
    verifiedRef.current = true;

    let cancelled = false;
    void (async () => {
      try {
        const { user: me } = await api.me();
        if (cancelled) return;
        setUserState(me);
        if (!isAdmin(me.role)) {
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

  if (loading || !ready || !user || !isAdmin(user.role)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.shellBg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="home" />
      <Stack.Screen name="exam/[id]" />
    </Stack>
  );
}
