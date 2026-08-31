import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { colors, commonStyles } from '@/theme';
import { getHomeRoute } from '@/utils/routing';

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace(getHomeRoute(user.role));
    } else {
      router.replace('/(auth)/login');
    }
  }, [user, loading, router]);

  return (
    <View style={[commonStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}
