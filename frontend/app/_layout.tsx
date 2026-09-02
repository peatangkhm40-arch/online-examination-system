import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router';
import Head from 'expo-router/head';
import { StatusBar } from 'expo-status-bar';
import {
  Sarabun_400Regular,
  Sarabun_500Medium,
  Sarabun_600SemiBold,
  Sarabun_700Bold,
  useFonts,
} from '@expo-google-fonts/sarabun';
import { AuthProvider } from '@/context/AuthContext';
import { APP_NAME } from '@/constants/app';
import { colors } from '@/theme';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Sarabun_400Regular,
    Sarabun_500Medium,
    Sarabun_600SemiBold,
    Sarabun_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <AuthProvider>
      <Head>
        <title>{APP_NAME}</title>
      </Head>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(auth)/register" />
        <Stack.Screen name="(auth)/forgot-password" />
        <Stack.Screen name="(app)/dashboard" />
        <Stack.Screen name="(app)/history" />
        <Stack.Screen name="(app)/help" />
        <Stack.Screen name="(app)/rules" />
        <Stack.Screen name="(app)/profile" />
        <Stack.Screen name="(app)/exam/[id]" />
        <Stack.Screen name="(app)/take/[attemptId]" />
        <Stack.Screen name="(app)/result/[attemptId]" />
        <Stack.Screen name="(teacher)" />
        <Stack.Screen name="(admin)" />
      </Stack>
    </AuthProvider>
  );
}
